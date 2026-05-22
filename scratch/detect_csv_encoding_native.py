with open(r'c:\Users\manue\OneDrive\Escritorio\contemporania\datos\obra_completa_ejemplo.csv', 'rb') as f:
    raw_data = f.read()
    
    print("Raw bytes length:", len(raw_data))
    
    # Try decoding as utf-8 and prints chars
    try:
        utf8_decoded = raw_data.decode('utf-8')
        print("Successfully decoded as UTF-8!")
        print("Sample with accents:")
        if "sordina" in utf8_decoded:
            idx = utf8_decoded.index("sordina")
            print(repr(utf8_decoded[idx-20:idx+60]))
            for char in utf8_decoded[idx-10:idx+40]:
                print(f"  {char!r} : {ord(char)}")
    except Exception as e:
        print("Failed UTF-8 decode:", e)
        
    try:
        # Check raw bytes containing 'sordina'
        idx = raw_data.find(b'sordina')
        if idx != -1:
            print("Raw bytes around 'sordina':")
            print(raw_data[idx-20:idx+60])
    except Exception as e:
        print("Error checking raw bytes:", e)
