import urllib.request
import json

url = "https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works?select=*"
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        raw_data = response.read()
        works = json.loads(raw_data.decode('utf-8'))
        for w in works:
            unusual = w.get('unusual_preparations')
            if unusual and 'sordina' in unusual.lower():
                print("Found sordina work:")
                print("Title:", w.get('title'))
                print("unusual_preparations:", repr(w.get('unusual_preparations')))
                # Let's print each character's unicode code point in unusual_preparations
                for char in w.get('unusual_preparations'):
                    print(f"  {char!r} : {ord(char)}")
except Exception as e:
    print("Error:", e)
