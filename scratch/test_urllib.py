import urllib.request
import json

supabase_url = 'https://xidiihjezddpbgiexbph.supabase.co'
anon_key = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-'

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
}

req = urllib.request.Request(
    f"{supabase_url}/rest/v1/",
    headers=headers
)
try:
    with urllib.request.urlopen(req) as response:
        spec = json.loads(response.read().decode('utf-8'))
        works_definition = spec.get('definitions', {}).get('works', {})
        print("Works definition in OpenAPI:")
        print(json.dumps(works_definition, indent=2))
except Exception as e:
    print("Error:", e)
