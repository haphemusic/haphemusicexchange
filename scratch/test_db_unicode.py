import urllib.request

url = "https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works?select=*"
headers = {
    "apikey": "sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-",
    "Authorization": "Bearer sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        raw_data = response.read()
        # Let's decode as utf-8, ignoring or replacing errors, and see what the raw bytes are.
        print("Raw length:", len(raw_data))
        text = raw_data.decode('utf-8', errors='replace')
        
        # Let's print characters and their repr around the first occurrence of non-ASCII
        for i, char in enumerate(text[:3000]):
            if ord(char) > 127:
                # print 30 chars around it
                start = max(0, i - 15)
                end = min(len(text), i + 15)
                print(f"Context: {text[start:end]!r}")
                print(f"Non-ASCII char: {char!r} (code: {ord(char)})")
                print("---")
except Exception as e:
    print("Error:", e)
