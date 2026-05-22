import urllib.request
try:
    response = urllib.request.urlopen('http://127.0.0.1:8000')
    print("STATUS CODE:", response.getcode())
    print("HEADERS:\n", response.headers)
except Exception as e:
    print("ERROR CONNECTING:", e)
