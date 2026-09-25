import os
import httpx
import base64
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ROBOFLOW_API_KEY")
URL = "https://serverless.roboflow.com/markdaluson30-gmail-com/workflows/rice-classification-t1-vrice-classification-t1-1-vit-base-patch16-224-in21k-t1-logic"

with open("test_image.png", "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "inputs": {
        "image": {
            "type": "base64",
            "value": img_b64
        }
    }
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

with httpx.Client() as client:
    response = client.post(URL, json=payload, headers=headers, timeout=30.0)
    print("Status:", response.status_code)
    print("Body:", json.dumps(response.json(), indent=2))
