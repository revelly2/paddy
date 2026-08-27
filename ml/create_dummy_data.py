import os
from PIL import Image
import numpy as np

classes = ['Immature', 'Nearly_Mature', 'Ready_for_Harvest']
splits = {'train': 10, 'val': 2}
base_dir = 'dataset'

for split, count in splits.items():
    for cls in classes:
        dir_path = os.path.join(base_dir, split, cls)
        os.makedirs(dir_path, exist_ok=True)
        for i in range(count):
            img_array = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            img = Image.fromarray(img_array)
            img.save(os.path.join(dir_path, f'dummy_{i}.jpg'))
print('Dummy dataset created!')
