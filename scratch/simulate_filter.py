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

def matches_tag(wi, tag):
    if not wi.get('instrument_id'):
        return False
    inst = wi['instrument_id']
    name = (inst.get('name') or '').lower()
    variant = (inst.get('variant') or '').lower()
    family = (inst.get('family') or '').lower()
    t = tag.lower()
    return t in name or t in variant or t in family or name in t

def test_filter(active_tags, exclusive):
    results = []
    for w in works:
        wi_list = w.get('work_instruments') or []
        if not active_tags:
            results.append(w)
            continue
        
        if exclusive:
            if not wi_list:
                continue
            all_match = True
            for wi in wi_list:
                # check if this instrument matches at least one active tag
                any_tag_match = any(matches_tag(wi, tag) for tag in active_tags)
                if not any_tag_match:
                    all_match = False
                    break
            if all_match:
                results.append(w)
        else:
            any_match = False
            for wi in wi_list:
                if any(matches_tag(wi, tag) for tag in active_tags):
                    any_match = True
                    break
            if any_match:
                results.append(w)
    return results

print("=== Standard match (exclusive=False) for ['flute'] ===")
res = test_filter(['flute'], False)
for w in sorted(res, key=lambda x: x['id']):
    insts = [wi['instrument_id']['name'] for wi in w.get('work_instruments', []) if wi.get('instrument_id')]
    print(f"ID {w['id']} | Title: '{w['title']}' | Instruments: {insts}")

print("\n=== Exclusive match (exclusive=True) for ['flute'] ===")
res = test_filter(['flute'], True)
for w in sorted(res, key=lambda x: x['id']):
    insts = [wi['instrument_id']['name'] for wi in w.get('work_instruments', []) if wi.get('instrument_id')]
    print(f"ID {w['id']} | Title: '{w['title']}' | Instruments: {insts}")

print("\n=== Exclusive match (exclusive=True) for ['flute', 'horn'] ===")
res = test_filter(['flute', 'horn'], True)
for w in sorted(res, key=lambda x: x['id']):
    insts = [wi['instrument_id']['name'] for wi in w.get('work_instruments', []) if wi.get('instrument_id')]
    print(f"ID {w['id']} | Title: '{w['title']}' | Instruments: {insts}")
