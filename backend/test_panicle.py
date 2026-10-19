import os, json, base64
from dotenv import load_dotenv
load_dotenv()
from classifier import classifier

classifier.load()
print("Ready:", classifier.ready)

with open(r"..\ml\dataset\train\Ready_for_Harvest\773735426_1960781525299700_2311290359722768774_n.jpg", "rb") as f:
    img = f.read()
print(f"Image: {len(img)} bytes")

result = classifier.classify(img)
out = {k: v for k, v in result.items() if k != "annotated_image_b64"}
print(json.dumps(out, indent=2))

ann = result.get("annotated_image_b64")
if ann:
    with open(r"..\ml\test_annotated.jpg", "wb") as f:
        f.write(base64.b64decode(ann))
    print("Saved annotated image to ml/test_annotated.jpg")
