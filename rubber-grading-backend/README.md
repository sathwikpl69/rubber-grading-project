Automated Rubber Sheet Grading using Deep Learning

This is a full-stack web application for our final year project, designed to automatically classify the grade of Para rubber sheets from an uploaded image. It uses a deep learning model served by a Python Flask backend and a modern React frontend.

Team Members:

Sathwik P L

Shama C

Shivagni A R

Shivani C Ail

📋 Project Structure

The project is organized into two main parts: a backend folder for the server and API, and a frontend folder for the user interface.

/rubber-grading-project/
|
|-- /backend/
|   |-- /models/
|   |   |-- rubber_model.h5     (The trained 3-class model)
|   |
|   |-- /venv/
|   |-- .env                    (Backend MongoDB credentials)
|   |-- image_processor.py
|   |-- model_loader.py
|   |-- requirements.txt
|   |-- run.py                  (Flask server)
|   |-- train_3_class_model.py  (Script to train the model)
|
|-- /frontend/
|   |-- /public/
|   |   |-- /images/
|   |   |-- /videos/
|   |
|   |-- /src/
|   |   |-- /components/
|   |   |   |-- Home.tsx        (Main UI and logic)
|   |   |-- App.tsx             (React router setup)
|   |   |-- main.tsx            (React entry point)
|   |
|   |-- .env                    (Frontend API URL)
|   |-- package.json
|   |-- vite.config.ts
|
|-- .gitignore                  (Root gitignore for both projects)
|-- README.md                   (This file)


🛠️ Tech Stack

Backend: Python, Flask, PyMongo, TensorFlow/Keras

Database: MongoDB Atlas

Frontend: React, TypeScript, Vite, Tailwind CSS

ML Model: ResNet152 (trained on 3 classes: Grade_A, Grade_B, Not_Rubber)

🚀 How to Run This Project

You must run both the backend and frontend servers simultaneously in two separate terminals.

1. Running the Backend (Terminal 1)

Navigate to the Backend:

cd backend


Create and Activate Virtual Environment:

# Create the environment (only need to do this once)
python -m venv venv

# Activate the environment
.\venv\Scripts\activate


Install Dependencies:

pip install -r requirements.txt


Create .env File:

Create a file named .env inside the backend folder.

Add your MongoDB connection string to it:
MONGO_URI="mongodb+srv://your_user:your_password@your_cluster..."

Place Your Model:

Make sure your best-trained model (from the 80-epoch run) is named rubber_model.h5 and is placed inside the backend/models/ folder.

Run the Server:

python run.py


The backend server will start and run on http://127.0.0.1:5000.

2. Running the Frontend (Terminal 2)

Navigate to the Frontend:

# From the root project folder
cd frontend


Install Dependencies:

npm install


(If npm doesn't work, try pnpm install)

Create .env File:

Create a file named .env inside the frontend folder.

Add this line to tell the frontend where the backend is:
VITE_API_BASE_URL=http://127.0.0.1:5000/api

Run the App:

npm run dev


A browser window will open to http://localhost:5173 (or a similar port).

The application is now running and connected to your backend.

API Endpoints

The backend provides two main API endpoints:

1. Register User (Usage Tracking)

URL: POST /api/register_user

Body (JSON):

{
    "name": "Sathwik",
    "location": "Bantwal"
}


Description: This endpoint is called just before prediction. It logs the user's name and location to the MongoDB database for usage tracking.

2. Get Prediction

URL: POST /api/predict

Body (Form-Data):

file: The image file of the rubber sheet to be classified.

Description: Receives an image, processes it, and returns the model's classification.

Success Response:

{
    "prediction": "Grade_B",
    "confidence": "60.00%"
}


Failure Response (e.g., Not Rubber):

{
    "prediction": "Not_Rubber",
    "confidence": "99.85%"
}
