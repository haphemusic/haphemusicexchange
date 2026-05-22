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
        data = response.read().decode('utf-8')
        works = json.loads(data)
        if works:
            print("First work:")
            for k, v in works[0].items():
                print(f"  {k}: {v}")
        else:
            print("No works found")
except Exception as e:
    print("Error:", e)
