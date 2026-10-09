import requests
try:
    resp = requests.get('http://localhost:8000/api/news')
    print(resp.status_code)
    print(resp.json()['items'][0] if resp.status_code == 200 else resp.text)
except Exception as e:
    print(e)
