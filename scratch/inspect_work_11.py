import urllib.request
import json

url = "https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works?id=eq.11"
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        works = json.loads(response.read().decode('utf-8'))
        w = works[0]
        subtitle = w.get('subtitle')
        print("Subtitle from DB:", repr(subtitle))
        for char in subtitle:
            print(f"  {char!r} : {ord(char)}")
            
        # Try fixing
        encoded = subtitle.encode('latin-1')
        print("Encoded to latin-1:", encoded)
        decoded = encoded.decode('utf-8')
        print("Decoded as utf-8:", repr(decoded))
        for char in decoded:
            print(f"  {char!r} : {ord(char)}")
except Exception as e:
    print("Error:", e)
