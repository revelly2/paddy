import urllib.request
url = 'https://www.agweb.com/index.rss'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
}
req = urllib.request.Request(url, headers=headers)
try:
    content = urllib.request.urlopen(req).read().decode('utf-8')
    import re
    matches = re.findall(r'<media:content[^>]*>', content)
    if matches:
        print("Found media:content tags:")
        for m in matches[:5]:
            print(m)
    else:
        print("No media:content tags.")

    img_matches = re.findall(r'<img[^>]*>', content)
    if img_matches:
        print("Found img tags:")
        for m in img_matches[:5]:
            print(m)
    else:
        print("No img tags.")
        
    enclosures = re.findall(r'<enclosure[^>]*>', content)
    if enclosures:
        print("Found enclosures:")
        for m in enclosures[:5]:
            print(m)
    else:
        print("No enclosures.")

except Exception as e:
    print(e)
