import os
import json
import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from supabase_client import get_supabase_admin

logger = logging.getLogger("paddy.admin")

CONTENT_FILE_PATH = os.path.join(os.path.dirname(__file__), "data", "content.json")

# Ensure data directory exists
os.makedirs(os.path.dirname(CONTENT_FILE_PATH), exist_ok=True)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ContentItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str = "General Advisory"  # e.g. Harvest Scheduling, Agronomy, Pest Management, Post-Harvest
    summary: str
    content: str
    author: str = "Provincial Agricultural Office"
    status: str = "Published"  # "Published" | "Draft"
    priority: str = "Normal"   # "High" | "Normal" | "Low"
    target_municipality: Optional[str] = "Abra Province (General)"
    image_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class AdminUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    region: Optional[str] = None
    farm_name: Optional[str] = None
    scan_count: int = 0
    created_at: str
    last_sign_in_at: Optional[str] = None

class AdminStats(BaseModel):
    total_users: int
    total_scans: int
    ready_for_harvest_count: int
    nearly_mature_count: int
    immature_count: int
    avg_confidence_pct: float
    active_municipalities_count: int
    model_ready: bool
    total_content_items: int
    published_content_items: int

# ---------------------------------------------------------------------------
# Default Seed Content for Abra Thesis
# ---------------------------------------------------------------------------

DEFAULT_CONTENT = [
    {
        "id": "content-abra-001",
        "title": "Wet Season 2026 Peak Harvest Scheduling Advisory",
        "category": "Harvest Scheduling",
        "summary": "Agro-climatic calibration indicates main crop harvesting in Abra peaks between October 15 and November 25.",
        "content": "Farmers across Abra Province (especially low-lying fields in Bangued, Tayum, and Peñarrubia) are advised to begin field readiness scans 10 days ahead of expected harvest. When 80–85% of grains on the panicle turn golden yellow, terminal drainage should be completed immediately to minimize shattering loss during mechanical or manual reaping.",
        "author": "Abra Rice Research Extension Team",
        "status": "Published",
        "priority": "High",
        "target_municipality": "Abra Province (General)",
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
        "created_at": "2026-10-01T08:00:00Z",
        "updated_at": "2026-10-01T08:00:00Z"
    },
    {
        "id": "content-abra-002",
        "title": "Panicle Color & Moisture Thresholds for Inbred Varieties",
        "category": "Agronomy",
        "summary": "Guidelines for calibrating visual panicle ripeness against 20–24% target grain moisture.",
        "content": "For prominent Abra varieties including NSIC Rc 222, Rc 160, and Rc 216, harvesting at grain moisture between 20% and 24% achieves the highest head rice recovery during milling. Harvesting too early results in chalky, immature kernels; delaying past full maturity causes severe sun-checking and fissure cracks.",
        "author": "Rice Phenology Advisory Desk",
        "status": "Published",
        "priority": "Normal",
        "target_municipality": "Lagangilang, Abra",
        "image_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
        "created_at": "2026-10-05T09:30:00Z",
        "updated_at": "2026-10-05T09:30:00Z"
    },
    {
        "id": "content-abra-003",
        "title": "Post-Harvest Sun-Drying Protocol in CAR Mountain Corridors",
        "category": "Post-Harvest",
        "summary": "Preventing aflatoxin and grain cracking through gradual moisture reduction on communal solar pavements.",
        "content": "In mountain valleys where afternoon humidity spikes abruptly, spread freshly threshed paddy at a layer thickness of 3–5 cm. Turn grain layers every 30 minutes. Avoid drying on bare soil or unwashed roadsides to preserve grade 1 commercial cleanliness standards.",
        "author": "Department of Agriculture - CAR",
        "status": "Published",
        "priority": "Normal",
        "target_municipality": "Abra Province (General)",
        "image_url": "https://images.unsplash.com/photo-1599818457788-b7ebbaef6b3f?auto=format&fit=crop&w=800&q=80",
        "created_at": "2026-10-12T14:00:00Z",
        "updated_at": "2026-10-12T14:00:00Z"
    },
    {
        "id": "content-abra-004",
        "title": "Dry Season (Tag-araw) Irrigation Planning Notice",
        "category": "Agronomy",
        "summary": "Draft notice for communal irrigation system maintenance starting December 2026.",
        "content": "Communal irrigation associations (CIS) across Abra River catchment basins should schedule canal silt removal prior to second-crop seeding in late December.",
        "author": "Abra Irrigators Council",
        "status": "Draft",
        "priority": "Low",
        "target_municipality": "Bucay, Abra",
        "image_url": None,
        "created_at": "2026-10-18T16:00:00Z",
        "updated_at": "2026-10-18T16:00:00Z"
    }
]

def _read_content_store() -> List[Dict[str, Any]]:
    if not os.path.exists(CONTENT_FILE_PATH):
        with open(CONTENT_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONTENT, f, indent=2)
        return DEFAULT_CONTENT
    try:
        with open(CONTENT_FILE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading content file: {e}")
        return DEFAULT_CONTENT

def _write_content_store(items: List[Dict[str, Any]]) -> None:
    with open(CONTENT_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

# ---------------------------------------------------------------------------
# Content Management Service
# ---------------------------------------------------------------------------

def list_content(category: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None) -> List[ContentItem]:
    items = _read_content_store()
    results = []
    for raw in items:
        if category and raw.get("category") != category:
            continue
        if status and raw.get("status") != status:
            continue
        if search:
            q = search.lower()
            t = raw.get("title", "").lower()
            s = raw.get("summary", "").lower()
            c = raw.get("content", "").lower()
            if q not in t and q not in s and q not in c:
                continue
        results.append(ContentItem(**raw))
    # Sort newest first
    results.sort(key=lambda x: x.created_at, reverse=True)
    return results

def get_content_item(item_id: str) -> Optional[ContentItem]:
    items = _read_content_store()
    for raw in items:
        if raw.get("id") == item_id:
            return ContentItem(**raw)
    return None

def create_content_item(data: Dict[str, Any]) -> ContentItem:
    items = _read_content_store()
    new_id = data.get("id") or f"content-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()
    
    item_dict = {
        "id": new_id,
        "title": data.get("title", "Untitled Advisory"),
        "category": data.get("category", "General Advisory"),
        "summary": data.get("summary", ""),
        "content": data.get("content", ""),
        "author": data.get("author", "Provincial Agricultural Office"),
        "status": data.get("status", "Published"),
        "priority": data.get("priority", "Normal"),
        "target_municipality": data.get("target_municipality", "Abra Province (General)"),
        "image_url": data.get("image_url"),
        "created_at": now,
        "updated_at": now
    }
    items.insert(0, item_dict)
    _write_content_store(items)
    return ContentItem(**item_dict)

def update_content_item(item_id: str, updates: Dict[str, Any]) -> Optional[ContentItem]:
    items = _read_content_store()
    found = False
    for i, raw in enumerate(items):
        if raw.get("id") == item_id:
            raw.update(updates)
            raw["updated_at"] = datetime.utcnow().isoformat()
            items[i] = raw
            found = True
            break
    if not found:
        return None
    _write_content_store(items)
    return ContentItem(**raw)

def delete_content_item(item_id: str) -> bool:
    items = _read_content_store()
    initial_len = len(items)
    items = [x for x in items if x.get("id") != item_id]
    if len(items) == initial_len:
        return False
    _write_content_store(items)
    return True

# ---------------------------------------------------------------------------
# User Management Service
# ---------------------------------------------------------------------------

def list_admin_users() -> List[AdminUser]:
    admin = get_supabase_admin()
    
    # 1. Fetch Supabase auth users
    try:
        auth_users = admin.auth.admin.list_users()
    except Exception as e:
        logger.error(f"Error listing auth users: {e}")
        auth_users = []

    # 2. Fetch profiles
    try:
        profiles_res = admin.table("profiles").select("*").execute()
        profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
    except Exception as e:
        logger.warning(f"Error fetching profiles: {e}")
        profiles_map = {}

    # 3. Fetch scan counts per user
    try:
        scans_res = admin.table("classifications").select("user_id").execute()
        counts_map: Dict[str, int] = {}
        for row in (scans_res.data or []):
            uid = row.get("user_id")
            if uid:
                counts_map[uid] = counts_map.get(uid, 0) + 1
    except Exception as e:
        logger.warning(f"Error counting scans: {e}")
        counts_map = {}

    user_list: List[AdminUser] = []
    for u in auth_users:
        uid = str(u.id)
        profile = profiles_map.get(uid, {})
        
        # Determine full_name
        full_name = profile.get("full_name") or u.user_metadata.get("full_name") or (u.email.split("@")[0] if u.email else "Farmer")
        
        # Determine role (user_metadata > app_metadata > profile > default)
        role = u.user_metadata.get("role") or u.app_metadata.get("role") or profile.get("role") or "user"
        
        user_list.append(AdminUser(
            id=uid,
            email=u.email or "",
            full_name=full_name,
            role=role,
            region=profile.get("region"),
            farm_name=profile.get("farm_name"),
            scan_count=counts_map.get(uid, 0),
            created_at=str(u.created_at or datetime.utcnow().isoformat()),
            last_sign_in_at=str(u.last_sign_in_at) if u.last_sign_in_at else None,
        ))

    # Sort users by scan count then created_at
    user_list.sort(key=lambda x: (x.scan_count, x.created_at), reverse=True)
    return user_list

def update_admin_user(user_id: str, updates: Dict[str, Any]) -> Optional[AdminUser]:
    admin = get_supabase_admin()
    
    # 1. Update auth user metadata (role, full_name)
    user_meta_updates = {}
    if "role" in updates:
        user_meta_updates["role"] = updates["role"]
    if "full_name" in updates:
        user_meta_updates["full_name"] = updates["full_name"]

    if user_meta_updates:
        try:
            admin.auth.admin.update_user_by_id(user_id, {"user_metadata": user_meta_updates})
        except Exception as e:
            logger.error(f"Error updating auth user {user_id}: {e}")

    # 2. Update profile table if exists
    profile_updates = {}
    if "full_name" in updates:
        profile_updates["full_name"] = updates["full_name"]
    if "region" in updates:
        profile_updates["region"] = updates["region"]
    if "farm_name" in updates:
        profile_updates["farm_name"] = updates["farm_name"]
    if "role" in updates:
        profile_updates["role"] = updates["role"]

    if profile_updates:
        try:
            admin.table("profiles").update(profile_updates).eq("id", user_id).execute()
        except Exception as e:
            # If role column doesn't exist, retry without role
            if "role" in profile_updates:
                del profile_updates["role"]
                if profile_updates:
                    try:
                        admin.table("profiles").update(profile_updates).eq("id", user_id).execute()
                    except Exception:
                        pass

    # Fetch updated user
    all_users = list_admin_users()
    for u in all_users:
        if u.id == user_id:
            return u
    return None

def create_admin_user(data: Dict[str, Any]) -> AdminUser:
    admin = get_supabase_admin()
    email = data["email"]
    password = data["password"]
    full_name = data.get("full_name", "Farmer")
    role = data.get("role", "user")
    region = data.get("region")
    farm_name = data.get("farm_name")
    
    new_user = admin.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "full_name": full_name,
            "role": role,
        },
        "app_metadata": {
            "role": role,
        }
    })
    uid = str(new_user.user.id)
    
    # Update profile if needed
    p_updates = {"full_name": full_name}
    if region:
        p_updates["region"] = region
    if farm_name:
        p_updates["farm_name"] = farm_name
        
    try:
        admin.table("profiles").update(p_updates).eq("id", uid).execute()
    except Exception as e:
        logger.warning(f"Error updating profile for new user {uid}: {e}")
        
    return AdminUser(
        id=uid,
        email=email,
        full_name=full_name,
        role=role,
        region=region,
        farm_name=farm_name,
        scan_count=0,
        created_at=str(new_user.user.created_at or datetime.utcnow().isoformat()),
        last_sign_in_at=None,
    )

def delete_admin_user(user_id: str) -> bool:
    admin = get_supabase_admin()
    try:
        # Delete classifications first
        admin.table("classifications").delete().eq("user_id", user_id).execute()
        # Delete profile
        admin.table("profiles").delete().eq("id", user_id).execute()
        # Delete auth user
        admin.auth.admin.delete_user(user_id)
        return True
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        return False

# ---------------------------------------------------------------------------
# Admin Stats Service
# ---------------------------------------------------------------------------

def get_admin_system_stats(classifier_ready: bool) -> AdminStats:
    admin = get_supabase_admin()
    
    # 1. User count
    try:
        users = admin.auth.admin.list_users()
        total_users = len(users)
    except Exception:
        total_users = 1

    # 2. Scans aggregate
    total_scans = 0
    ready_count = 0
    nearly_count = 0
    immature_count = 0
    conf_sum = 0.0
    municipalities_set = set()

    try:
        res = admin.table("classifications").select("label, confidence, location").execute()
        rows = res.data or []
        total_scans = len(rows)
        for r in rows:
            label = r.get("label")
            conf = float(r.get("confidence") or 0.0)
            conf_sum += conf
            if label == "Ready for Harvest":
                ready_count += 1
            elif label == "Nearly Mature":
                nearly_count += 1
            else:
                immature_count += 1

            loc = r.get("location")
            if loc:
                municipalities_set.add(loc.strip().lower())
    except Exception as e:
        logger.warning(f"Error fetching system scan stats: {e}")

    avg_conf = round((conf_sum / max(total_scans, 1)) * 100, 1) if total_scans > 0 else 0.0

    # Content stats
    all_content = _read_content_store()
    total_content = len(all_content)
    published_content = len([x for x in all_content if x.get("status") == "Published"])

    return AdminStats(
        total_users=total_users,
        total_scans=total_scans,
        ready_for_harvest_count=ready_count,
        nearly_mature_count=nearly_count,
        immature_count=immature_count,
        avg_confidence_pct=avg_conf,
        active_municipalities_count=len(municipalities_set),
        model_ready=classifier_ready,
        total_content_items=total_content,
        published_content_items=published_content,
    )
