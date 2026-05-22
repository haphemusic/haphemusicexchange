import chardet

with open(r'c:\Users\manue\OneDrive\Escritorio\contemporania\datos\obra_completa_ejemplo.csv', 'rb') as f:
    raw_data = f.read()
    print("Detected encoding:", chardet.detect(raw_data))
    
    # Try decoding as utf-8 and prints chars
    try:
        utf8_decoded = raw_data.decode('utf-8')
        print("Successfully decoded as UTF-8")
        print("Sample with accents:")
        if "sordina" in utf8_decoded:
            idx = utf8_decoded.index("sordina")
            print(utf8_decoded[idx-20:idx+60])
    except Exception as e:
        print("Failed UTF-8 decode:", e)
        
    try:
        latin1_decoded = raw_data.decode('latin-1')
        print("Successfully decoded as Latin-1")
    except Exception as e:
        print("Failed Latin-1 decode:", e)
