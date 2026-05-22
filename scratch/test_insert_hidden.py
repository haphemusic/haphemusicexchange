import requests
import json

supabase_url = 'https://xidiihjezddpbgiexbph.supabase.co'
anon_key = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-'

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Try to insert a temporary work with status 'hidden'
test_payload = {
    "title": "Temporary Test Work for Hidden Status",
    "year": 2026,
    "status": "hidden",
    "submitted_by": "00000000-0000-0000-0000-000000000000" # Let's fetch a real profile id first
}

# First, get a valid user profile id
response = requests.get(f"{supabase_url}/rest/v1/profiles?limit=1", headers=headers)
profiles = response.json()
if not profiles:
    print("No profiles found")
    exit(1)

user_id = profiles[0]['id']
print(f"Using profile ID: {user_id}")

test_payload["submitted_by"] = user_id

response = requests.post(f"{supabase_url}/rest/v1/works", json=test_payload, headers=headers)
print(f"Response status code: {response.status_code}")
print(f"Response body: {response.text}")
