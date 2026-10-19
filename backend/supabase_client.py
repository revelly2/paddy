"""
supabase_client.py
==================
Initialises the Supabase Python client using environment variables.

Two clients are provided:
  - `supabase_client`  : Uses the anon key (respects Row Level Security)
  - `supabase_admin`   : Uses the service role key (bypasses RLS — server-only)

The admin client is used for:
  - Uploading files to Storage on behalf of the user
  - Inserting classification results with the correct user_id

NEVER expose the service role key to the frontend or any client-side code.
"""

import os
import logging
import httpx
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

# Ensure .env is loaded regardless of import order
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Read environment variables
# ---------------------------------------------------------------------------
SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY    = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET  = os.getenv("SUPABASE_JWT_SECRET", "")


def _validate_env() -> None:
    missing = [k for k, v in {
        "SUPABASE_URL":         SUPABASE_URL,
        "SUPABASE_ANON_KEY":    SUPABASE_ANON_KEY,
        "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY,
    }.items() if not v]

    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Copy backend/.env.example to backend/.env and fill in your Supabase credentials."
        )


def _build_client_options() -> ClientOptions:
    """
    Builds robust client options with resilient timeouts to prevent
    'The read operation timed out' on high-latency connections.
    """
    return ClientOptions(
        postgrest_client_timeout=60,
        storage_client_timeout=60,
        function_client_timeout=30,
        httpx_client=httpx.Client(timeout=30.0),
    )


def get_supabase_client() -> Client:
    """
    Returns a Supabase client using the ANON key.
    Suitable for reads that go through Row Level Security.
    """
    _validate_env()
    global supabase_client
    if supabase_client is None:
        supabase_client = create_client(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            options=_build_client_options(),
        )
    return supabase_client


def get_supabase_admin() -> Client:
    """
    Returns a Supabase client using the SERVICE ROLE key.
    Bypasses RLS — use only in secure server-side code.
    """
    _validate_env()
    global supabase_admin
    if supabase_admin is None:
        supabase_admin = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_KEY,
            options=_build_client_options(),
        )
    return supabase_admin


# ---------------------------------------------------------------------------
# Module-level clients — initialised lazily to avoid startup errors
# if env vars aren't set yet during import-time testing.
# ---------------------------------------------------------------------------
def _make_clients():
    try:
        _validate_env()
        anon  = create_client(SUPABASE_URL, SUPABASE_ANON_KEY, options=_build_client_options())
        admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY, options=_build_client_options())
        return anon, admin
    except EnvironmentError as e:
        logger.warning("Supabase client not initialised: %s", e)
        return None, None


supabase_client, supabase_admin = _make_clients()
