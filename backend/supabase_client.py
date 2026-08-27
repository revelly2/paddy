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
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Read environment variables (loaded by python-dotenv in main.py)
# ---------------------------------------------------------------------------
SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY    = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


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


def get_supabase_client() -> Client:
    """
    Returns a Supabase client using the ANON key.
    Suitable for reads that go through Row Level Security.
    """
    _validate_env()
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_supabase_admin() -> Client:
    """
    Returns a Supabase client using the SERVICE ROLE key.
    Bypasses RLS — use only in secure server-side code.
    """
    _validate_env()
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ---------------------------------------------------------------------------
# Module-level clients — initialised lazily to avoid startup errors
# if env vars aren't set yet during import-time testing.
# ---------------------------------------------------------------------------
def _make_clients():
    try:
        _validate_env()
        anon  = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        return anon, admin
    except EnvironmentError as e:
        logger.warning("Supabase client not initialised: %s", e)
        return None, None


supabase_client, supabase_admin = _make_clients()
