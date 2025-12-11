import os
import numpy as np
import pymongo
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from dotenv import load_dotenv
from model_loader import model  # Import the globally loaded model
from image_processor import preprocess_image # Import the processor
from datetime import datetime # Import datetime

# Load environment variables
load_dotenv()

# Initialize Flask App
app = Flask(__name__)
CORS(app) 

# --- Database Connection ---
MONGO_URI = os.getenv("MONGO_URI")
db = None
if not MONGO_URI:
    print("FATAL: MONGO_URI is not set. Check your .env file.")
else:
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client.get_database("rubber_grading_db") 
        user_collection = db.get_collection("users") 
        # New collection for saving prediction history if needed
        history_collection = db.get_collection("history")
        print("MongoDB connected successfully.")
    except Exception as e:
        print(f"FATAL: Could not connect to MongoDB. {e}")
        
# --- Class Labels ---
CLASS_NAMES = ["Grade_A", "Grade_B", "Not_Rubber"]

# --- API Routes ---

@app.route('/')
def index():
    return render_template_string("<h1>Rubber Grading Backend is running! (Batch Support Added)</h1>")

@app.route('/api/register_user', methods=['POST'])
def register_user():
    """ Registers a user (Same as before) """
    if db is None: 
        return jsonify({"error": "Database not connected"}), 500
        
    try:
        data = request.get_json()
        if not data: return jsonify({"error": "No JSON data provided."}), 400
             
        name = data.get('name')
        location = data.get('location')

        if not name or not location:
            return jsonify({"error": "Name and location are required."}), 400

        user_collection.insert_one({
            "name": name,
            "location": location,
            "timestamp": datetime.utcnow()
        })
        
        return jsonify({"message": f"User {name} registered."}), 201

    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    UPDATED: Receives MULTIPLE image files, processes them in a loop,
    and returns a list of predictions.
    """
    if not model:
        return jsonify({"error": "Model is not loaded."}), 500

    # 'file' is the key we will use in FormData on the frontend
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400

    # getlist() retrieves all files uploaded with the key 'file'
    files = request.files.getlist('file')

    if not files or files[0].filename == '':
        return jsonify({"error": "No files selected."}), 400

    results = []

    try:
        for file in files:
            # Safe check for filename
            filename = file.filename
            
            # Read bytes
            image_bytes = file.read()
            image_np = np.frombuffer(image_bytes, np.uint8)
            
            # Process
            image = preprocess_image(image_np)

            if image is None:
                results.append({
                    "filename": filename,
                    "error": "Could not process image"
                })
                continue
            
            # Predict
            image_batch = np.expand_dims(image, axis=0) 
            prediction = model.predict(image_batch)
            result_index = int(np.argmax(prediction[0]))
            
            predicted_class = CLASS_NAMES[result_index]
            confidence = float(prediction[0][result_index])
            
            # Add to results list
            results.append({
                "filename": filename,
                "prediction": predicted_class,
                "confidence": f"{confidence * 100:.2f}%"
            })

        return jsonify({"results": results}), 200

    except Exception as e:
        print(f"Error during batch prediction: {e}")
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)