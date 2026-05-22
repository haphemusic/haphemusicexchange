import urllib.request
import json

url = 'https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works?select=*,composer:composer_id(*),submitter:submitted_by(*),work_instruments(*,instrument_id(*))'
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-"
}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    works = json.loads(response.read().decode('utf-8'))

print(f"Total works fetched: {len(works)}")

# Show first 5 works with their instruments
for w in works[:10]:
    instruments = [wi.get('instrument_id', {}).get('name') for wi in w.get('work_instruments', []) if wi.get('instrument_id')]
    print(f"Work ID {w['id']}: '{w['title']}' | Instruments: {instruments}")
