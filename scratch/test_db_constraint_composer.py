import urllib.request
import urllib.parse
import json
import random

supabase_url = 'https://xidiihjezddpbgiexbph.supabase.co'
anon_key = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-'

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json"
}

# 1. Sign up a new user
email = f"testcomposer{random.randint(1000, 9999)}@gmail.com"
password = "TestPassword123!"
signup_payload = {
    "email": email,
    "password": password
}

req_signup = urllib.request.Request(
    f"{supabase_url}/auth/v1/signup",
    data=json.dumps(signup_payload).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req_signup) as response:
        signup_res = json.loads(response.read().decode('utf-8'))
        print("Signup response:", signup_res)
        access_token = signup_res['access_token']
        user_id = signup_res['user']['id']
        print(f"Signed up! User ID: {user_id}")
except Exception as e:
    if hasattr(e, 'read'):
        print("Signup error:", e.read().decode('utf-8'))
    else:
        print("Signup error:", e)
    exit(1)

# Now use user's access token for auth header
user_headers = headers.copy()
user_headers["Authorization"] = f"Bearer {access_token}"

# 2. Update user profile to set role = 'composer'
profile_payload = {
    "role": "composer",
    "name": "Test Composer",
    "is_complete": True
}

req_profile = urllib.request.Request(
    f"{supabase_url}/rest/v1/profiles?id=eq.{user_id}",
    data=json.dumps(profile_payload).encode('utf-8'),
    headers=user_headers,
    method='PATCH'
)

try:
    with urllib.request.urlopen(req_profile) as response:
        print("Profile updated successfully, status:", response.status)
except Exception as e:
    if hasattr(e, 'read'):
        print("Profile update error:", e.read().decode('utf-8'))
    else:
        print("Profile update error:", e)
    exit(1)

# 3. Test insert work with status = 'hidden'
work_payload_hidden = {
    "title": "Hidden Work Test",
    "year": 2026,
    "status": "hidden",
    "submitted_by": user_id
}

req_work_hidden = urllib.request.Request(
    f"{supabase_url}/rest/v1/works",
    data=json.dumps(work_payload_hidden).encode('utf-8'),
    headers=user_headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req_work_hidden) as response:
        print("Inserted work with status 'hidden' successfully:", response.status)
except urllib.error.HTTPError as e:
    print("HTTPError status:", e.code)
    print("HTTPError body:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)

# 4. Test insert work with status = 'pending'
work_payload_pending = {
    "title": "Pending Work Test",
    "year": 2026,
    "status": "pending",
    "submitted_by": user_id
}

req_work_pending = urllib.request.Request(
    f"{supabase_url}/rest/v1/works",
    data=json.dumps(work_payload_pending).encode('utf-8'),
    headers=user_headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req_work_pending) as response:
        print("Inserted work with status 'pending' successfully:", response.status)
except urllib.error.HTTPError as e:
    print("HTTPError status:", e.code)
    print("HTTPError body:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
