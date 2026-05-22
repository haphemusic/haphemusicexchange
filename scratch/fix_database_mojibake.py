import urllib.request
import json

url_base = "https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works"
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def fix_mojibake(text):
    if not text:
        return text
    if not isinstance(text, str):
        return text
    try:
        # Check if encoding as latin-1 and decoding as utf-8 yields a different string
        encoded = text.encode('latin-1')
        decoded = encoded.decode('utf-8')
        if decoded != text:
            return decoded
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return text

def main():
    # 1. Fetch all works
    fetch_url = f"{url_base}?select=*"
    req = urllib.request.Request(fetch_url, headers={
        "apikey": headers["apikey"],
        "Authorization": headers["Authorization"]
    })
    
    try:
        with urllib.request.urlopen(req) as response:
            works = json.loads(response.read().decode('utf-8'))
            
        print(f"Loaded {len(works)} works. Processing updates...")
        
        updated_count = 0
        for w in works:
            id_ = w.get('id')
            title = w.get('title')
            
            changes = {}
            for k, v in w.items():
                if isinstance(v, str):
                    fixed = fix_mojibake(v)
                    if fixed != v:
                        changes[k] = fixed
                        
            if changes:
                print(f"\nUpdating Work ID {id_} ({title}):")
                for field, val in changes.items():
                    print(f"  {field} -> {val!r}")
                
                # Make PATCH request
                patch_url = f"{url_base}?id=eq.{id_}"
                data_bytes = json.dumps(changes).encode('utf-8')
                
                patch_req = urllib.request.Request(
                    patch_url,
                    data=data_bytes,
                    headers=headers,
                    method='PATCH'
                )
                
                with urllib.request.urlopen(patch_req) as patch_response:
                    res_status = patch_response.status
                    print(f"  Response Status: {res_status}")
                    if res_status in (200, 201, 204):
                        updated_count += 1
                        
        print(f"\nDatabase update finished. Successfully updated {updated_count} rows.")
        
    except Exception as e:
        print("Error during update:", e)

if __name__ == "__main__":
    main()
