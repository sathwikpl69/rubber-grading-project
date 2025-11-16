import os
# We import numpy here just in case Keras needs it in scope,
# which can solve some strange loading errors.
import numpy as np 
from tensorflow.keras.models import load_model

def load_model_on_startup():
    """Loads the compiled Keras model on server startup."""
    
    # Construct the full path to the model file
    MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'rubber_model.h5')
    
    print(f"Loading model from {MODEL_PATH}...")
    
    if not os.path.exists(MODEL_PATH):
        print(f"FATAL: Model file not found at {MODEL_PATH}")
        print("Please make sure 'rubber_model.h5' is inside the 'models' folder.")
        return None
        
    try:
        # Load the compiled model
        # The 'compile=False' flag is often safer for inference-only models
        # and can bypass issues with custom optimizers.
        # Let's try loading with compile=False.
        model = load_model(MODEL_PATH, compile=False)
        print("Model loaded successfully.")
        return model
    except Exception as e:
        print(f"FATAL: Could not load model. {e}")
        return None

# Load the model globally when this module is imported
# This ensures it's loaded only once.
model = load_model_on_startup()

