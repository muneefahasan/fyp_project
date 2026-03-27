import cv2
import easyocr
from ultralytics import YOLO
import re
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import io
from fastapi.middleware.cors import CORSMiddleware # Import CORS

# ==============================
# 1. Load Models (Do this ONCE on startup)
# ==============================
print("Loading YOLO model...")
try:
    # Make sure num.pt is in the same folder
    model = YOLO("num.pt") 
except Exception as e:
    print(f"Error loading YOLO model 'num.pt': {e}")
    model = None

print("Loading EasyOCR...")
try:
    # This will download models on its first run
    reader = easyocr.Reader(['en']) 
except Exception as e:
    print(f"Error loading EasyOCR: {e}")
    reader = None

print("Models loaded. Starting API...")
app = FastAPI()

# ==============================
# 2. Add CORS Middleware (THE FIX)
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins (your frontend)
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (including OPTIONS and POST)
    allow_headers=["*"], # Allows all headers (like Authorization)
)

# ==============================
# 3. Define API Response Model
# ==============================
class RecognitionResponse(BaseModel):
    plates: list[str]

# ==============================
# 4. Create the API Endpoint
# ==============================
@app.post("/recognize-plate", response_model=RecognitionResponse)
async def recognize_plate(file: UploadFile = File(...)):
    if not model or not reader:
        raise HTTPException(status_code=500, detail="Models are not loaded correctly. Check server logs.")

    # Read image from upload
    contents = await file.read()
    
    # Convert bytes to OpenCV image
    try:
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

    # --- 5. Your Detection & OCR Logic ---
    plates_found = []
    
    try:
        results = model(img)
        
        for r in results:
            for box in r.boxes:
                # Get bounding box
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                # Crop the plate
                plate = img[y1:y2, x1:x2]

                # 6. OCR with EasyOCR
                ocr_result = reader.readtext(plate)

                # Combine all detected texts
                plate_texts = []
                for (bbox, text, prob) in ocr_result:
                    cleaned = re.sub(r'[^A-Za-z0-9]', '', text)
                    if cleaned:
                        plate_texts.append(cleaned)

                final_plate = ''.join(plate_texts)

                if final_plate:
                    plates_found.append(final_plate)
                    print(f"✅ Found Plate: {final_plate}") # Server-side log

    except Exception as e:
        print(f"Error during processing: {e}")
        raise HTTPException(status_code=500, detail=f"Error during AI processing: {e}")

    # ==============================
    # 7. Return JSON (replaces cv2.imshow)
    # ==============================
    return {"plates": plates_found}