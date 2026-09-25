import sys
import os
import json
import base64

# Add backend to path so we can import classifier
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from backend.classifier import classifier
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

def test_inference(image_path):
    print(f"Testing with image: {image_path}")
    
    with open(image_path, "rb") as f:
        image_bytes = f.read()
        
    classifier.load()
    
    if not classifier.ready:
        print("Classifier failed to load.")
        return
        
    result = classifier.classify(image_bytes)
    
    annotated_b64 = result.pop("annotated_image_b64", None)
    
    print(json.dumps(result, indent=2))
    
    if annotated_b64:
        out_path = "test_annotated_result.jpg"
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(annotated_b64))
        print(f"Saved annotated image to {out_path}")
    else:
        print("No annotated image returned.")

if __name__ == "__main__":
    test_inference(r"c:\Users\Admin\Desktop\THESIS\paddy\ml\dataset\val\Ready_for_Harvest\dummy_0.jpg")
