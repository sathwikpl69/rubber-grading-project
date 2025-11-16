import os
import numpy as np
import pymongo
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from dotenv import load_dotenv
from model_loader import model  # Import the globally loaded model
from image_processor import preprocess_image # Import the processor
from datetime import datetime # Import datetime for a proper timestamp

# Load environment variables from .env file
load_dotenv()

# Initialize Flask App
app = Flask(__name__)
# Enable CORS for all routes, allowing your frontend to connect
CORS(app) 

# --- Database Connection ---
MONGO_URI = os.getenv("MONGO_URI")
db = None
if not MONGO_URI:
    print("FATAL: MONGO_URI is not set. Check your .env file.")
else:
    try:
        client = pymongo.MongoClient(MONGO_URI)
        # Get (or create) the database
        db = client.get_database("rubber_grading_db") 
        # Get (or create) the collection
        user_collection = db.get_collection("users") 
        print("MongoDB connected successfully.")
    except Exception as e:
        print(f"FATAL: Could not connect to MongoDB. {e}")
        
# --- Class Labels ---
# --- THIS IS THE KEY CHANGE ---
# These MUST match the order your model was trained on (from train_gen.class_indices)
CLASS_NAMES = ["Grade_A", "Grade_B", "Not_Rubber"]
# ---

# --- API Routes ---

@app.route('/')
def index():
    """A simple route to check if the server is running."""
    return render_template_string("<h1>Rubber Grading Backend is running! (3-Class Model)</h1>")


@app.route('/api/register_user', methods=['POST'])
def register_user():
    """
    Receives user data (name, location) as JSON,
    stores it in MongoDB, and returns a success message.
    """
    if db is None: # Corrected check
        return jsonify({"error": "Database not connected"}), 500
        
    try:
        data = request.get_json()
        if not data:
             return jsonify({"error": "No JSON data provided."}), 400
             
        name = data.get('name')
        location = data.get('location')

        if not name or not location:
            return jsonify({"error": "Name and location are required."}), 400

        # Insert the new user into the 'users' collection
        user_collection.insert_one({
            "name": name,
            "location": location,
            "timestamp": datetime.utcnow() # Use a real UTC timestamp
        })
        
        return jsonify({"message": f"User {name} from {location} registered."}), 201

    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Receives an image file, processes it,
    runs it through the model, and returns the prediction.
    """
    if not model:
        return jsonify({"error": "Model is not loaded."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400

    image_file = request.files['file']

    if image_file.filename == '':
        return jsonify({"error": "No file selected."}), 400

    if image_file:
        try:
            # Read the file's bytes into a numpy array
            image_bytes = image_file.read()
            image_np = np.frombuffer(image_bytes, np.uint8)
            
            # Process the image using our utility
            image = preprocess_image(image_np)

            if image is None:
                return jsonify({"error": "Could not process the image."}), 400
            
            # --- Model Prediction ---
            # Add a "batch" dimension (from 224,224,3 to 1,224,224,3)
            image_batch = np.expand_dims(image, axis=0) 
            
            # Get the model's raw prediction (will be an array of 3 probabilities)
            prediction = model.predict(image_batch)
            
            # Find the index with the highest probability (0, 1, or 2)
            result_index = int(np.argmax(prediction[0]))
            
            # Get the class name using the index
            predicted_class = CLASS_NAMES[result_index]
            
            # Get the confidence score
            confidence = float(prediction[0][result_index])
            
            # Send the result back as JSON
            return jsonify({
                "prediction": predicted_class,
                "confidence": f"{confidence * 100:.2f}%"
            }), 200

        except Exception as e:
            # Provide more detail for debugging
            print(f"Error during prediction: {e}")
            return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


# --- Main Entry Point ---
if __name__ == '__main__':
    # Run the Flask app
    # host='0.0.0.0' makes it accessible on your network
    app.run(host='0.0.0.0', port=5000, debug=True)