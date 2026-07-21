import os
import sys
import argparse
from .vision_model import load_model, infer_image
import cv2


def main():
    parser = argparse.ArgumentParser(description="Run vision model on a single image.")
    parser.add_argument("image", help="Path to the input image")
    args = parser.parse_args()

    img_path = args.image
    if not os.path.exists(img_path):
        print(f"Image not found: {img_path}")
        sys.exit(2)

    model = load_model()
    img = cv2.imread(img_path)
    if img is None:
        print("Failed to read image")
        sys.exit(2)

    detections = infer_image(model, img)
    print("Detections:")
    for d in detections:
        print(d)


if __name__ == "__main__":
    main()
