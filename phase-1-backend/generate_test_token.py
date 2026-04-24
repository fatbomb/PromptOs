import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

secret = os.environ.get("SUPABASE_JWT_SECRET")
if not secret:
    print("Error: SUPABASE_JWT_SECRET not found in .env")
    exit(1)

# Generate a mock Supabase token
payload = {
    "aud": "authenticated",
    "exp": int((datetime.now(timezone.utc) + timedelta(days=365)).timestamp()),
    "sub": "00000000-0000-0000-0000-000000000000",
    "email": "dev@example.com",
    "role": "authenticated"
}

token = jwt.encode(payload, secret, algorithm="HS256")
print(f"\nYour Dev JWT Token:\n{token}\n")
print("Run the following command in the phase-2-cli directory:")
print(f"node index.js dev-login {token}\n")
