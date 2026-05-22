import urllib.request
import json

url = "https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works?select=*"
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-"
}

def fix_mojibake(text):
    if not text:
        return text
    if not isinstance(text, str):
        return text
    try:
        # Try encoding to latin-1 and decoding as utf-8
        encoded = text.encode('latin-1')
        decoded = encoded.decode('utf-8')
        if decoded != text:
            return decoded
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return text

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        raw_data = response.read()
        works = json.loads(raw_data.decode('utf-8'))
        
        print(f"Loaded {len(works)} works. Checking for mojibake...")
        
        for w in works:
            id_ = w.get('id')
            title = w.get('title')
            
            changes = {}
            for k, v in w.items():
                if isinstance(v, str):
                    fixed = fix_mojibake(v)
                    if fixed != v:
                        changes[k] = (v, fixed)
            
            if changes:
                print(f"\nWork ID {id_} ({title}):")
                for field, (old, new) in changes.items():
                    print(f"  Field '{field}':")
                    print(f"    Old: {old!r}")
                    print(f"    New: {new!r}")
                    
except Exception as e:
    print("Error:", e)
