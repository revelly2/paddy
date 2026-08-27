"""
main.py
=======
FastAPI backend for the Paddy Rice Harvesting Time Classification System.

Endpoints
---------
POST   /api/classify              Upload image → CNN prediction → store in DB
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

from dotenv import load_dotenv
load_dotenv()  # Load .env BEFORE importing modules that read env vars

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from classifier import classifier
from supabase_client import get_supabase_admin, SUPABASE_URL, SUPABASE_ANON_KEY

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
MODEL_PATH      = os.getenv("MODEL_PATH", "../ml/saved_model/paddy_cnn.keras")
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

# Max upload size: 10 MB
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/webp"}


# ---------------------------------------------------------------------------
# FastAPI lifespan — load model at startup, clean up at shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the CNN model when the server starts."""
    logger.info("Starting Paddy Rice API …")
    classifier.load(MODEL_PATH)
    if classifier.ready:
        logger.info("✓ CNN model loaded and ready for inference.")
    else:
        logger.warning(
            "⚠ CNN model NOT loaded. Train the model first: python ml/train.py"
        )
    yield
    logger.info("Shutting down Paddy Rice API.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Paddy Rice Harvest Time Classification API",
    description=(
        "CNN-powered REST API that classifies paddy rice images into "
        "Immature / Nearly Mature / Ready for Harvest."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic response schemas
# ---------------------------------------------------------------------------

class ProbabilityMap(BaseModel):
    Immature:          float
    Nearly_Mature:     float
    Ready_for_Harvest: float


class ClassificationResponse(BaseModel):
    id:              str
    label:           str
    label_key:       str
    confidence:      float
    probabilities:   ProbabilityMap
    advice:          str
    image_url:       Optional[str]
    image_path:      str
    notes:           Optional[str]
    location:        Optional[str]
    created_at:      str


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
    status:        str
    model_loaded:  bool
    supabase_url:  str
    timestamp:     str


# ---------------------------------------------------------------------------
# Auth dependency — decode Supabase JWT to get user_id
# ---------------------------------------------------------------------------
async def get_current_user_id(authorization: str = Header(...)) -> str:
    """
    Extract and verify the Supabase JWT from the Authorization header.

    Supabase tokens are validated by calling the Supabase Auth API.
    We use supabase-py's built-in get_user() which validates server-side.

    Parameters
    ----------
    authorization : "Bearer <token>" header value

    Returns
    -------
    user_id : str (UUID)
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format.")

    token = authorization.split(" ", 1)[1]

    try:
        admin = get_supabase_admin()
        user_response = admin.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        return user_response.user.id
    except Exception as e:
        logger.warning("Auth failure: %s", e)
        raise HTTPException(status_code=401, detail="Authentication failed.")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Returns API health status: model readiness and Supabase connectivity.
    No authentication required — useful for monitoring.
    """
    return HealthResponse(
        status="ok",
        model_loaded=classifier.ready,
        supabase_url=SUPABASE_URL,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/api/classify", response_model=ClassificationResponse, tags=["Classification"])
async def classify_image(
    file:     UploadFile = File(..., description="Rice paddy image (JPEG/PNG/BMP/WEBP)"),
    notes:    Optional[str] = None,
    location: Optional[str] = None,
    user_id:  str = Depends(get_current_user_id),
):
    """
    Main classification endpoint.

    Flow
    ----
    1. Validate uploaded file (type + size).
    2. Run CNN inference on the raw bytes.
    3. Upload image to Supabase Storage under user's folder.
    4. Insert classification record into Supabase DB.
    5. Return prediction + metadata.

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

    # ---- 2. CNN inference ------------------------------------------------
    if not classifier.ready:
        raise HTTPException(
            status_code=503,
            detail=(
                "The classification model is not yet available. "
                "Please train the model first (python ml/train.py) and restart the server."
            ),
        )

    try:
        prediction = classifier.classify(image_bytes)
    except Exception as e:
        logger.error("Inference error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail="Classification failed. See server logs.")

    # ---- 3. Upload image to Supabase Storage ------------------------------
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
        # Non-fatal — still store the record without a URL
        image_url = None

    # ---- 4. Store classification in DB ------------------------------------
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
        # Return the prediction anyway — don't fail the whole request
        db_row = row

    # ---- 5. Build response -----------------------------------------------
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
        logger.error("DB query error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve classifications.")

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
