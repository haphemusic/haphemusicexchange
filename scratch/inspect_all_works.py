import urllib.request
import json

url = 'https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works?select=id,title,scoring_category,num_performers,performer_combination,soloist_instrument,work_instruments(instrument_id(*))'
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-"
}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    works = json.loads(response.read().decode('utf-8'))

for w in sorted(works, key=lambda x: x['id']):
    insts = [wi['instrument_id']['name'] for wi in w.get('work_instruments', []) if wi.get('instrument_id')]
    print(f"ID {w['id']} | Title: '{w['title']}' | Scoring: {w.get('scoring_category')} | Instruments: {insts}")
