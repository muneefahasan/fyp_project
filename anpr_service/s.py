import cv2
import easyocr
from ultralytics import YOLO
import re

model = YOLO("num.pt")  # Your YOLOv8 model
reader = easyocr.Reader(['en'])  # English OCR

img = cv2.imread("4.jpg")
results = model(img)

best_text = None
best_conf = 0
best_coords = None

# Define a regex pattern for number plates (Sri Lanka example: letters + numbers)
plate_pattern = re.compile(r'[A-Z]{1,3}\s?\d{1,4}', re.IGNORECASE)

for r in results:
    for box in r.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        plate = img[y1:y2, x1:x2]

        cv2.imwrite("cropped_plate.jpg", plate)  # Check cropped image

        ocr_results = reader.readtext(plate)

        for ocr in ocr_results:
            text, prob = ocr[1], ocr[2]
            if plate_pattern.match(text.replace(" ", "")):  # Validate format
                print(f"Detected Plate-like Text: {text} (Confidence: {prob:.2f}) at {x1,y1,x2,y2}")
                if prob > best_conf:
                    best_conf = prob
                    best_text = text
                    best_coords = (x1, y1, x2, y2)

# Draw best prediction on image
if best_text:
    x1, y1, x2, y2 = best_coords
    cv2.rectangle(img, (x1, y1), (x2, y2), (0,255,0), 2)
    cv2.putText(img, best_text, (x1, y1-10),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)
    print(f"\n✅ Most Relevant Plate Prediction: {best_text} (Confidence: {best_conf:.2f})")
else:
    print("⚠️ No plate detected or no valid number plate format found.")

cv2.imshow("License Plate Detection", img)
cv2.waitKey(0)
cv2.destroyAllWindows()
