"""Optimize the nine supplied gallery images without cropping or changing composition."""
import pathlib
import sys
from PIL import Image, ImageOps

root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1])
output = root / 'assets' / 'prepared'
groups = {
    'immunity': ['image-gen-1(20260923-230139).png', 'image-gen-2(20260923-230140).png', 'image-gen-3(20260923-230140).png'],
    'broth': ['image-gen-4(20260923-230141).png', 'image-gen-5(3).png', 'image-gen-6(3).png'],
    'digestive': ['Nova Health Digestive Tonic.png', 'Nova Health Synergy Digestive Tonic Still Life.png', 'Rustic Herbal Tonic Apothecary Still Life.png'],
}
for product, files in groups.items():
    for number, filename in enumerate(files, 1):
        with Image.open(source / filename) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            name = product + '-scene-' + str(number)
            image.save(output / (name + '.webp'), quality=90, method=6)
            image.thumbnail((224, 280), Image.Resampling.LANCZOS)
            image.save(output / (name + '-thumb.webp'), quality=82, method=6)
        print(name)
