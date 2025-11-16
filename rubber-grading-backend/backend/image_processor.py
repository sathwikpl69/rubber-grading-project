import numpy as np
import cv2  # Import OpenCV

def preprocess_image(image_data_bytes):
    """
    Takes raw image bytes, decodes, resizes, and normalizes it.
    Returns a numpy array ready for the model.
    """
    try:
        # Decode the image from the byte buffer
        # The image_data_bytes is already a numpy array from np.frombuffer()
        image = cv2.imdecode(image_data_bytes, cv2.IMREAD_COLOR)
        
        if image is None:
            print("ERROR: Could not decode image. It may be corrupt.")
            return None

        # Convert from BGR (OpenCV's default) to RGB (Keras model's default)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize to the model's expected input size (224x224)
        image_resized = cv2.resize(image_rgb, (224, 224))
        
        # Normalize the pixel values from [0, 255] to [0.0, 1.0]
        image_normalized = image_resized / 255.0
        
        # Return the processed image
        return image_normalized
        
    except Exception as e:
        print(f"ERROR: Image processing failed. {e}")
        return None

