import urllib.request
import json

tables = ['profiles', 'instruments', 'works']
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
        encoded = text.encode('latin-1')
        decoded = encoded.decode('utf-8')
        if decoded != text:
            return decoded
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return text

for table in tables:
    url = f"https://xidiihjezddpbgiexbph.supabase.co/rest/v1/{table}?select=*"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"\n--- Checking table: {table} ({len(data)} rows) ---")
            
            mojibake_count = 0
            for row in data:
                row_id = row.get('id')
                changes = []
                for k, v in row.items():
                    if isinstance(v, str):
                        fixed = fix_mojibake(v)
                        if fixed != v:
                            changes.append((k, v, fixed))
                if changes:
                    mojibake_count += 1
                    print(f"Row ID {row_id} has mojibake:")
                    for field, old, new in changes:
                        print(f"  Field '{field}': {old!r} -> {new!r}")
            
            if mojibake_count == 0:
                print(f"No mojibake detected in table {table}.")
    except Exception as e:
        print(f"Error checking table {table}:", e)
