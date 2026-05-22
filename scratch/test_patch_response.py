import urllib.request
import json

url_base = "https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works"
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

changes = {"subtitle": "para Flauta y Electrónica en Vivo"} # wait, let's use a raw string with code 243 for 'ó'
# 'ó' is \u00f3
changes["subtitle"] = "para Flauta y Electr\u00f3nica en Vivo"

patch_url = f"{url_base}?id=eq.11"
data_bytes = json.dumps(changes).encode('utf-8')

req = urllib.request.Request(
    patch_url,
    data=data_bytes,
    headers=headers,
    method='PATCH'
)

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        body = response.read().decode('utf-8')
        print("Response body:", body)
except Exception as e:
    print("Error:", e)
