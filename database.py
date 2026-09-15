import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE, override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise Exception("SUPABASE_URL is missing in .env")
if not SUPABASE_KEY:
    raise Exception("SUPABASE_KEY is missing in .env")

# NOTE: use the SERVICE_ROLE key here, not the publishable/anon key.
# The backend needs to read/write freely and enforces its own security
# rules in code (role checks, ownership checks). The service_role key
# must never be sent to the frontend/browser.
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)