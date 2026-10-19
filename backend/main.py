"""
main.py
=======
FastAPI backend for the Paddy Rice Harvesting Time Classification System.

Endpoints
---------
POST   /api/classify              Upload image → Roboflow panicle detection
                                   + HSV colour analysis → store in DB
GET    /api/classifications       Paginated list of the authenticated user's history
GET    /api/classifications/{id}  Single classification detail
DELETE /api/classifications/{id}  Delete a classification record + its stored image
GET    /api/stats                 Aggregate stats for the authenticated user
GET    /health                    Health check (model status, Supabase connectivity)

Authentication
--------------
All /api/* endpoints require a valid Supabase JWT in the Authorization header:
    Authorization: Bearer <supabase_access_token>

The user's JWT is decoded to extract their user_id, which is used for all
Supabase queries (enforcing per-farmer data isolation).

Running
-------
    cd paddy/backend
    uvicorn main:app --reload --port 8000
"""

import io
import os
import uuid
import logging
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
import time
import urllib.request
import xml.etree.ElementTree as ET
import jwt

import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))  # Load .env BEFORE importing modules that read env vars

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Query, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from classifier import classifier
from supabase_client import get_supabase_admin, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
import admin_service

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("paddy.api")

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
STORAGE_BUCKET  = os.getenv("STORAGE_BUCKET", "rice-images")
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000,https://paddy-orpin.vercel.app",
).split(",")
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in raw_origins if o.strip()]

# Max upload size: 10 MB
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/webp"}


# ---------------------------------------------------------------------------
# FastAPI lifespan — load model at startup, clean up at shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise the Roboflow client when the server starts."""
    logger.info("Starting Paddy Rice API …")
    classifier.load()  # reads ROBOFLOW_API_KEY / ROBOFLOW_MODEL_ID from env
    if classifier.ready:
        logger.info("✓ Roboflow panicle detection client ready.")
    else:
        logger.warning(
            "⚠ Roboflow client NOT ready. "
            "Set ROBOFLOW_API_KEY in .env and restart."
        )
    yield
    logger.info("Shutting down Paddy Rice API.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Paddy Rice Harvest Time Classification API",
    description=(
        "Roboflow panicle-detection + HSV colour analysis API that "
        "classifies paddy rice images into "
        "Immature / Nearly Mature / Ready for Harvest."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Ensure all unhandled 500 exceptions still return CORS headers so browsers
    can read the actual error message instead of failing with 'Failed to fetch'.
    """
    logger.error("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    origin = request.headers.get("origin", "")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Allow-Methods"] = "*"

    return JSONResponse(
        status_code=500,
        content={"detail": f"Backend Error: {str(exc)}"},
        headers=headers,
    )


# ---------------------------------------------------------------------------
# Pydantic response schemas
# ---------------------------------------------------------------------------

class ProbabilityMap(BaseModel):
    Immature:          float
    Nearly_Mature:     float
    Ready_for_Harvest: float


class PanicleDetail(BaseModel):
    id:              int
    bbox:            list[int]
    detection_conf:  float
    green_ratio:     float
    mature_ratio:    float
    label:           str
    label_key:       str
    confidence:      float


class ClassificationResponse(BaseModel):
    id:                   str
    label:                str
    label_key:            str
    confidence:           float
    probabilities:        ProbabilityMap
    advice:               str
    image_url:            Optional[str]
    image_path:           str
    notes:                Optional[str]
    location:             Optional[str]
    created_at:           str
    panicle_count:        Optional[int] = None
    panicle_details:      Optional[list[PanicleDetail]] = None
    annotated_image_url:  Optional[str] = None


class ClassificationListResponse(BaseModel):
    data:  list[ClassificationResponse]
    total: int
    page:  int
    limit: int


class StatsResponse(BaseModel):
    total_scans:           int
    ready_for_harvest:     int
    nearly_mature:         int
    immature:              int
    avg_confidence_pct:    float
    last_scan_at:          Optional[str]


class HealthResponse(BaseModel):
    status:                str
    model_loaded:          bool
    supabase_url:          str
    supabase_admin_ready:  bool = False
    error:                 Optional[str] = None
    timestamp:             str


# ---------------------------------------------------------------------------
# Auth dependency — decode Supabase JWT to get user_id
# ---------------------------------------------------------------------------
async def get_current_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.split(" ")[1]
    
    # 1. Fast local verification if SUPABASE_JWT_SECRET is configured
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            if user_id:
                return user_id
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Local JWT secret check failed: {e}; falling back to Supabase auth client.")

    # 2. Verify via Supabase Auth Admin client
    try:
        admin = get_supabase_admin()
    except Exception as e:
        logger.error(f"Failed to get Supabase admin client: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Database configuration error: {str(e)}. Please check SUPABASE_SERVICE_KEY in hosting environment variables."
        )

    try:
        user_response = admin.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        logger.warning(f"Supabase auth check encountered error: {err_msg}")

        # Check for expired token indicators first
        if "expired" in err_msg.lower():
            raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")

        # If network read or connection timed out, fallback to validating unexpired JWT claims locally
        is_timeout = any(term in err_msg.lower() for term in ["timed out", "timeout", "connecterror", "readerror", "connection refused"])
        if is_timeout:
            try:
                payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": True})
                user_id = payload.get("sub")
                role = payload.get("role")
                if user_id and role in ("authenticated", "anon", "service_role"):
                    logger.warning(
                        f"Supabase auth server timed out ({err_msg}). Falling back to unexpired token claims for user {user_id}."
                    )
                    return user_id
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
            except Exception as jwt_err:
                logger.error(f"Fallback JWT parsing failed: {jwt_err}")
                raise HTTPException(status_code=401, detail="Authentication server timed out and token could not be verified.")

        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {err_msg}")
 
 
async def require_admin_user(authorization: str = Header(None)) -> str:
    user_id = await get_current_user_id(authorization)
    try:
        admin = get_supabase_admin()
        u = admin.auth.admin.get_user_by_id(user_id)
        if u and u.user:
            role = (u.user.user_metadata or {}).get("role") or (u.user.app_metadata or {}).get("role")
            if role == "admin":
                return user_id
    except Exception as e:
        logger.warning(f"Admin auth check error: {e}")

    try:
        admin = get_supabase_admin()
        res = admin.table("profiles").select("role").eq("id", user_id).maybe_single().execute()
        if res.data and res.data.get("role") == "admin":
            return user_id
    except Exception as e:
        logger.warning(f"Admin profile check error: {e}")

    raise HTTPException(status_code=403, detail="Admin privileges required for this action.")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Returns API health status: model readiness and Supabase connectivity.
    No authentication required — useful for monitoring.
    """
    admin_ready = False
    admin_error = None
    try:
        get_supabase_admin()
        admin_ready = True
    except Exception as e:
        admin_error = str(e)

    return HealthResponse(
        status="ok" if (classifier.ready and admin_ready) else "degraded",
        model_loaded=classifier.ready,
        supabase_url=SUPABASE_URL,
        supabase_admin_ready=admin_ready,
        error=admin_error,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/api/classify", response_model=ClassificationResponse, tags=["Classification"])
async def classify_image(
    request:  Request,
    file:     UploadFile = File(..., description="Rice paddy image (JPEG/PNG/BMP/WEBP)"),
    notes:    Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    user_id:  str = Depends(get_current_user_id),
):
    """
    Main classification endpoint.

    Flow
    ----
    1. Validate uploaded file (type + size).
    2. Run Roboflow panicle detection + HSV colour analysis.
    3. Upload original image to Supabase Storage.
    3b. Upload annotated image (with detection overlays) to Storage.
    4. Insert classification record into Supabase DB.
    5. Return prediction + metadata + annotated image URL.

    The image is stored at: rice-images/<user_id>/<uuid>.<ext>
    """
    # ---- 1. Validate file ------------------------------------------------
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(image_bytes) / 1024:.0f} KB). Max: 10 MB.",
        )

    # ---- 1b. Validate location (Mandatory requirement) -------------------
    clean_location = (location or "").strip()
    if not clean_location:
        query_loc = request.query_params.get("location", "").strip()
        if query_loc:
            clean_location = query_loc

    if not clean_location:
        raise HTTPException(
            status_code=422,
            detail="Field location is required for harvest maturity classification. Please provide your Abra municipality or barangay.",
        )
    location = clean_location

    # ---- 2. Roboflow panicle detection + colour analysis -----------------
    if not classifier.ready:
        raise HTTPException(
            status_code=503,
            detail=(
                "The Roboflow panicle detection client is not ready. "
                "Set ROBOFLOW_API_KEY in .env and restart the server."
            ),
        )

    try:
        prediction = classifier.classify(image_bytes)
    except Exception as e:
        logger.error("Inference error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail="Classification failed. See server logs.")

    # ---- 3. Upload original image to Supabase Storage ---------------------
    ext         = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    record_id   = str(uuid.uuid4())
    image_path  = f"{user_id}/{record_id}.{ext}"

    try:
        admin = get_supabase_admin()
        admin.storage.from_(STORAGE_BUCKET).upload(
            path=image_path,
            file=image_bytes,
            file_options={"content-type": file.content_type},
        )
        # Build a signed URL (valid 1 year) for the frontend to display the image
        signed = admin.storage.from_(STORAGE_BUCKET).create_signed_url(
            image_path, expires_in=31_536_000
        )
        image_url = signed.get("signedURL") or signed.get("signed_url") or None
    except Exception as e:
        logger.error("Storage upload error: %s", e)
        image_url = None

    # ---- 3b. Upload annotated image (with detection boxes) ---------------
    annotated_image_url = None
    annotated_b64 = prediction.get("annotated_image_b64")
    if annotated_b64:
        try:
            import base64
            annotated_bytes = base64.b64decode(annotated_b64)
            annotated_path = f"{user_id}/{record_id}_annotated.jpg"
            admin.storage.from_(STORAGE_BUCKET).upload(
                path=annotated_path,
                file=annotated_bytes,
                file_options={"content-type": "image/jpeg"},
            )
            signed_ann = admin.storage.from_(STORAGE_BUCKET).create_signed_url(
                annotated_path, expires_in=31_536_000
            )
            annotated_image_url = (
                signed_ann.get("signedURL")
                or signed_ann.get("signed_url")
                or None
            )
        except Exception as e:
            logger.warning("Annotated image upload error: %s", e)

    # ---- 4. Store classification in DB ------------------------------------
    panicle_count = prediction.get("panicle_count", 0)
    try:
        row = {
            "id":                       record_id,
            "user_id":                  user_id,
            "image_path":               image_path,
            "image_url":                image_url,
            "label":                    prediction["label"],
            "confidence":               prediction["confidence"],
            "prob_immature":            prediction["probabilities"].get("Immature"),
            "prob_nearly_mature":       prediction["probabilities"].get("Nearly_Mature"),
            "prob_ready_for_harvest":   prediction["probabilities"].get("Ready_for_Harvest"),
            "notes":                    notes,
            "location":                 location,
        }
        result = admin.table("classifications").insert(row).execute()
        db_row = result.data[0] if result.data else row
    except Exception as e:
        logger.error("DB insert error: %s", e)
        db_row = row

    # ---- 5. Build response -----------------------------------------------
    # Convert panicle_details dicts to PanicleDetail models
    raw_details = prediction.get("panicle_details", [])
    panicle_detail_models = [
        PanicleDetail(**pd) for pd in raw_details
    ] if raw_details else None

    return ClassificationResponse(
        id=record_id,
        label=prediction["label"],
        label_key=prediction["label_key"],
        confidence=prediction["confidence"],
        probabilities=ProbabilityMap(**prediction["probabilities"]),
        advice=prediction["advice"],
        image_url=image_url,
        image_path=image_path,
        notes=notes,
        location=location,
        created_at=db_row.get("created_at", datetime.utcnow().isoformat()),
        panicle_count=panicle_count,
        panicle_details=panicle_detail_models,
        annotated_image_url=annotated_image_url,
    )


@app.get("/api/classifications", response_model=ClassificationListResponse, tags=["Classification"])
async def list_classifications(
    page:    int = Query(default=1, ge=1),
    limit:   int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    """
    Return a paginated list of the authenticated farmer's classification history.
    Sorted by most recent first.
    """
    offset = (page - 1) * limit

    try:
        admin = get_supabase_admin()
        result = (
            admin.table("classifications")
            .select("*", count="exact")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
    except Exception as e:
        import traceback
        logger.error("DB query error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to retrieve classifications: {type(e).__name__} - {str(e)}")

    items = [
        ClassificationResponse(
            id=row["id"],
            label=row["label"],
            label_key=row["label"].replace(" ", "_"),
            confidence=float(row["confidence"]),
            probabilities=ProbabilityMap(
                Immature=float(row.get("prob_immature") or 0),
                Nearly_Mature=float(row.get("prob_nearly_mature") or 0),
                Ready_for_Harvest=float(row.get("prob_ready_for_harvest") or 0),
            ),
            advice="",
            image_url=row.get("image_url"),
            image_path=row.get("image_path", ""),
            notes=row.get("notes"),
            location=row.get("location"),
            created_at=row.get("created_at", ""),
        )
        for row in (result.data or [])
    ]

    return ClassificationListResponse(
        data=items,
        total=result.count or 0,
        page=page,
        limit=limit,
    )


@app.get("/api/classifications/{classification_id}", response_model=ClassificationResponse, tags=["Classification"])
async def get_classification(
    classification_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Return a single classification record. Only the owning user can access it."""
    try:
        admin = get_supabase_admin()
        result = (
            admin.table("classifications")
            .select("*")
            .eq("id", classification_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Classification not found.")

    row = result.data
    if not row:
        raise HTTPException(status_code=404, detail="Classification not found.")

    return ClassificationResponse(
        id=row["id"],
        label=row["label"],
        label_key=row["label"].replace(" ", "_"),
        confidence=float(row["confidence"]),
        probabilities=ProbabilityMap(
            Immature=float(row.get("prob_immature") or 0),
            Nearly_Mature=float(row.get("prob_nearly_mature") or 0),
            Ready_for_Harvest=float(row.get("prob_ready_for_harvest") or 0),
        ),
        advice="",
        image_url=row.get("image_url"),
        image_path=row.get("image_path", ""),
        notes=row.get("notes"),
        location=row.get("location"),
        created_at=row.get("created_at", ""),
    )


@app.delete("/api/classifications/{classification_id}", tags=["Classification"])
async def delete_classification(
    classification_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Delete a classification record and its associated image from Supabase Storage.
    Only the owning user can delete their own records.
    """
    admin = get_supabase_admin()

    # Fetch the record first to get the image_path
    try:
        result = (
            admin.table("classifications")
            .select("image_path")
            .eq("id", classification_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Classification not found.")

    row = result.data
    if not row:
        raise HTTPException(status_code=404, detail="Classification not found.")

    # Remove the image from Storage
    try:
        admin.storage.from_(STORAGE_BUCKET).remove([row["image_path"]])
    except Exception as e:
        logger.warning("Failed to delete image from storage: %s", e)

    # Delete the DB record
    admin.table("classifications").delete().eq("id", classification_id).execute()

    return {"message": "Classification deleted successfully."}


@app.get("/api/stats", response_model=StatsResponse, tags=["Statistics"])
async def get_stats(user_id: str = Depends(get_current_user_id)):
    """
    Return aggregate statistics for the authenticated farmer's scan history.
    Used by the dashboard / home page.
    """
    try:
        admin = get_supabase_admin()
        result = (
            admin.table("user_classification_summary")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        logger.error("Stats query error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics.")

    rows = result.data or []
    if not rows:
        return StatsResponse(
            total_scans=0, ready_for_harvest=0,
            nearly_mature=0, immature=0,
            avg_confidence_pct=0.0, last_scan_at=None,
        )

    row = rows[0]
    return StatsResponse(
        total_scans=row.get("total_scans", 0),
        ready_for_harvest=row.get("ready_for_harvest_count", 0),
        nearly_mature=row.get("nearly_mature_count", 0),
        immature=row.get("immature_count", 0),
        avg_confidence_pct=float(row.get("avg_confidence_pct") or 0),
        last_scan_at=row.get("last_scan_at"),
    )


class NewsItem(BaseModel):
    title: str
    link: str
    description: str
    pubDate: str
    image_url: Optional[str] = None


class NewsResponse(BaseModel):
    status: str
    items: list[NewsItem]


@app.get("/api/news", response_model=NewsResponse, tags=["News"])
async def get_ag_news():
    """
    Fetch the latest agricultural news from AgWeb RSS feed.
    """
    url = 'https://www.agweb.com/index.rss'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        response = urllib.request.urlopen(req, timeout=10)
        content = response.read().decode('utf-8')
        
        root = ET.fromstring(content)
        items = []
        for item in root.findall('.//item'):
            title = item.find('title')
            link = item.find('link')
            desc = item.find('description')
            pub_date = item.find('pubDate')
            
            title_text = title.text if title is not None else ""
            link_text = link.text if link is not None else ""
            desc_text = desc.text if desc is not None else ""
            pub_date_text = pub_date.text if pub_date is not None else ""
            
            # Clean HTML tags from description
            import re
            desc_clean = re.sub(r'<[^>]+>', '', desc_text).strip()
            
            # Find image using media:content namespace
            image_url = None
            media_content = item.find('{http://search.yahoo.com/mrss/}content')
            if media_content is not None and media_content.get('url'):
                image_url = media_content.get('url')
            
            if title_text and link_text:
                items.append(NewsItem(
                    title=title_text,
                    link=link_text,
                    description=desc_clean,
                    pubDate=pub_date_text,
                    image_url=image_url
                ))
        
        return NewsResponse(status="ok", items=items)
    except Exception as e:
        logger.warning("Failed to fetch RSS news: %s. Returning fallback.", e)
        return NewsResponse(
            status="ok",
            items=[
                NewsItem(
                    title="Best Management Practices for Rice Harvesting",
                    link="https://www.irri.org",
                    description="Optimizing paddy harvest time minimizes yield losses and ensures high milling quality and grain recovery.",
                    pubDate="Notice",
                    image_url=None
                )
            ]
        )


# ---------------------------------------------------------------------------
# Admin & Content Management Endpoints
# ---------------------------------------------------------------------------

class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Farmer"
    role: Optional[str] = "user"
    region: Optional[str] = None
    farm_name: Optional[str] = None


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    region: Optional[str] = None
    farm_name: Optional[str] = None


class CreateContentRequest(BaseModel):
    title: str
    category: str = "General Advisory"
    summary: str
    content: str
    author: Optional[str] = "Provincial Agricultural Office"
    status: Optional[str] = "Published"
    priority: Optional[str] = "Normal"
    target_municipality: Optional[str] = "Abra Province (General)"
    image_url: Optional[str] = None


class UpdateContentRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    target_municipality: Optional[str] = None
    image_url: Optional[str] = None


@app.get("/api/admin/stats", tags=["Admin"])
async def get_admin_stats(_admin_id: str = Depends(require_admin_user)):
    """Return province-wide system statistics, user breakdown, and scan aggregates."""
    return admin_service.get_admin_system_stats(classifier.ready)


@app.get("/api/admin/users", tags=["Admin"])
async def get_admin_users(_admin_id: str = Depends(require_admin_user)):
    """List all registered users, roles, and scan counts."""
    return admin_service.list_admin_users()


@app.post("/api/admin/users", tags=["Admin"])
async def create_admin_user_endpoint(payload: CreateUserRequest, _admin_id: str = Depends(require_admin_user)):
    """Create a new user account (Farmer or Admin)."""
    try:
        user = admin_service.create_admin_user(payload.dict())
        return user
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/admin/users/{user_id}", tags=["Admin"])
async def update_admin_user_endpoint(user_id: str, payload: UpdateUserRequest, _admin_id: str = Depends(require_admin_user)):
    """Update user role, name, region or farm details."""
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    updated = admin_service.update_admin_user(user_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found or update failed")
    return updated


@app.delete("/api/admin/users/{user_id}", tags=["Admin"])
async def delete_admin_user_endpoint(user_id: str, _admin_id: str = Depends(require_admin_user)):
    """Delete a user account and associated classification records."""
    success = admin_service.delete_admin_user(user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete user")
    return {"message": "User deleted successfully."}


@app.get("/api/content", tags=["Content"])
async def list_content_public(
    category: Optional[str] = None,
    search: Optional[str] = None,
    _user_id: str = Depends(get_current_user_id)
):
    """Retrieve published agricultural advisories and guides for farmers."""
    return admin_service.list_content(category=category, status="Published", search=search)


@app.get("/api/content/{item_id}", tags=["Content"])
async def get_content_item_endpoint(item_id: str, _user_id: str = Depends(get_current_user_id)):
    """Retrieve details for a single advisory item."""
    item = admin_service.get_content_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Advisory not found")
    return item


@app.get("/api/admin/content", tags=["Admin Content"])
async def list_admin_content(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    _admin_id: str = Depends(require_admin_user)
):
    """List all content items including drafts and unpublished advisories."""
    return admin_service.list_content(category=category, status=status, search=search)


@app.post("/api/admin/content", tags=["Admin Content"])
async def create_admin_content(payload: CreateContentRequest, _admin_id: str = Depends(require_admin_user)):
    """Create a new agricultural advisory or harvest notice."""
    return admin_service.create_content_item(payload.dict())


@app.patch("/api/admin/content/{item_id}", tags=["Admin Content"])
async def update_admin_content(item_id: str, payload: UpdateContentRequest, _admin_id: str = Depends(require_admin_user)):
    """Update existing advisory title, text, category, or publish status."""
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    item = admin_service.update_content_item(item_id, updates)
    if not item:
        raise HTTPException(status_code=404, detail="Advisory item not found")
    return item


@app.delete("/api/admin/content/{item_id}", tags=["Admin Content"])
async def delete_admin_content(item_id: str, _admin_id: str = Depends(require_admin_user)):
    """Delete an advisory item."""
    success = admin_service.delete_content_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Advisory not found or delete failed")
    return {"message": "Content deleted successfully."}
