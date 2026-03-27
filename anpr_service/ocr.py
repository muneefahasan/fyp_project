import cv2
import easyocr
from ultralytics import YOLO
import re

# ==============================
# 1. Load YOLO model
# ==============================
model = YOLO("num.pt")  # replace with your trained YOLOv8 model

# ==============================
# 2. Load EasyOCR
# ==============================
reader = easyocr.Reader(['en'])  # English OCR

# ==============================
# 3. Load image
# ==============================
img = cv2.imread("8.jpg")


# ==============================
# 4. Detect license plates
# ==============================
results = model(img)

for r in results:
    for box in r.boxes:
        # Get bounding box
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        plate = img[y1:y2, x1:x2]

        # ==============================
        # 5. OCR with EasyOCR
        # ==============================
        ocr_result = reader.readtext(plate)

        # Combine all detected texts into one line
        plate_texts = []
        
        for (bbox, text, prob) in ocr_result:
            # Keep only alphanumeric characters
            cleaned = re.sub(r'[^A-Za-z0-9]', '', text)
            if cleaned:
                plate_texts.append(cleaned)

        final_plate = ' '.join(plate_texts)

        print(f"✅ Final Detected Plate: {final_plate}")

        # Draw rectangle and put combined text
        cv2.rectangle(img, (x1, y1), (x2, y2), (0,255,0), 2)
        if final_plate:
            cv2.putText(img, final_plate, (x1, y1-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

# ==============================
# 6. Show final result
# ==============================
cv2.imshow("License Plate Detection", img)
cv2.waitKey(0)
cv2.destroyAllWindows()
