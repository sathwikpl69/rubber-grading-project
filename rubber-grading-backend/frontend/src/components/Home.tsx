import {
  AlertCircle,
  Award,
  CheckCircle,
  Droplets,
  TreePine,
  Upload,
  Menu,
  X,
  User,
  MapPin,
  Camera, // Added Camera icon
  XCircle, // Added Close icon
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

// We removed the auth props, so no more Link, etc.

export default function Home() {
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // UI State
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<{prediction: string, confidence: string} | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Webcam State & Refs ---
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // ---

  // Get API base URL from environment variables
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

  // --- Utility Functions ---
  const clearErrors = () => {
    setApiError(null);
    setCameraError(null);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setClassificationResult(null);
    clearErrors();
  };

  // --- File Handling ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      clearErrors();
      setSelectedFile(file);
      setClassificationResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      clearErrors();
      setSelectedFile(file);
      setClassificationResult(null);
    }
  };

  // --- Webcam Functions ---

  // Function to stop the camera stream
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Function to start the camera
  const startCamera = async () => {
    clearSelection();
    setCameraError(null);

    // Check for mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported by your browser.");
      return;
    }

    try {
      // Request camera access (prefer rear camera on mobile)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraStream(stream);
      setShowCamera(true); // Show the camera modal/view
    } catch (err) {
      console.error("Camera access error:", err);
      // Handle common errors
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera permission was denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera found on your device.");
        } else {
          setCameraError("An error occurred while accessing the camera.");
        }
      } else {
        setCameraError("An unknown error occurred while accessing the camera.");
      }
    }
  };

  // Effect to link stream to video element when it becomes available
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
    // Cleanup function to stop stream when component unmounts
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera, cameraStream]);

  // Function to capture an image from the video stream
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame onto the canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to a File object
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const fileName = `capture-${timestamp}.jpg`;
          const imageFile = new File([blob], fileName, { type: 'image/jpeg' });
          
          setSelectedFile(imageFile); // Set the captured image as the selected file
          stopCameraStream(); // Close the camera
        }
      }, 'image/jpeg', 0.95); // 95% quality JPEG
    }
  };

  // --- API Call ---
  const handleClassify = async () => {
    // --- Input Validation ---
    if (!name.trim() || !location.trim()) {
      setApiError("Please enter your Name and Location before classifying.");
      return;
    }
    if (!selectedFile) {
      setApiError("Please select an image file or capture one first.");
      return;
    }
    // --- End Validation ---

    setIsClassifying(true);
    setClassificationResult(null);
    clearErrors();

    try {
      // --- Step 1: Register User (Send name and location) ---
      const registerResponse = await fetch(`${API_BASE_URL}/register_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), location: location.trim() }),
      });

      if (!registerResponse.ok) {
        let errorMsg = `Registration failed (${registerResponse.status})`;
        try {
          const errorData = await registerResponse.json();
          errorMsg = errorData.error ? `Registration Error: ${errorData.error}` : errorMsg;
        } catch (e) { console.error("Could not parse registration error JSON:", e); }
        throw new Error(errorMsg);
      }
      
      console.log("User registered successfully");

      // --- Step 2: Predict Grade (Send image file) ---
      const formData = new FormData();
      formData.append('file', selectedFile);

      const predictResponse = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!predictResponse.ok) {
        let errorMsg = `Prediction failed (${predictResponse.status})`;
        try {
          const errorData = await predictResponse.json();
          errorMsg = errorData.error ? `Prediction Error: ${errorData.error}` : errorMsg;
        } catch (e) { console.error("Could not parse prediction error JSON:", e); }
        throw new Error(errorMsg);
      }

      const result = await predictResponse.json();
      
      if (!result || typeof result.prediction !== 'string' || typeof result.confidence !== 'string') {
        console.error("Invalid prediction response structure:", result);
        throw new Error("Received an invalid response format from the server.");
      }
      
      setClassificationResult(result);

    } catch (error: any) {
      console.error("API call failed:", error);
      setApiError(error.message || "An unexpected error occurred. Check the console.");
    } finally {
      setIsClassifying(false);
    }
  };

  // --- Static Data ---
  const infoCards = [
    {
      icon: <TreePine className="w-8 h-8 text-emerald-600" />,
      title: "What is Para Rubber?",
      description:
        "Para Rubber – High-grade natural latex with superior elasticity and tensile strength for industrial applications. It's the primary source of natural rubber latex, harvested through tapping."
    },
    {
      icon: <Award className="w-8 h-8 text-emerald-600" />,
      title: "Importance of Grading",
      description:
        "Rubber grading ensures quality control and fair pricing. Grade A rubber has superior properties like higher tensile strength and purity, while Grade B may have minor impurities or lower quality characteristics."
    },
    {
      icon: <Droplets className="w-8 h-8 text-emerald-600" />,
      title: "Rubber Tapping Process",
      description:
        "Rubber tapping involves making diagonal cuts in the bark to allow latex to flow into collection cups. This sustainable process can be repeated every few days without harming the tree."
    }
  ];

  // --- JSX Return ---
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation (Simplified) */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <TreePine className="w-8 h-8 text-emerald-600" />
              <span className="text-xl font-bold text-emerald-600">RubberGrade AI</span>
            </div>

            {/* Desktop Menu (No Auth Buttons) */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Home</a>
              <a href="#about" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">About</a>
              <a href="#video" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Process</a>
              <a href="#demo" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Demo</a>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-emerald-600 hover:text-emerald-800 transition">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu (Simplified) */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg transition-all">
              <a href="#home" onClick={()=>setMobileMenuOpen(false)} className="block text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Home</a>
              <a href="#about" onClick={()=>setMobileMenuOpen(false)} className="block text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">About</a>
              <a href="#video" onClick={()=>setMobileMenuOpen(false)} className="block text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Process</a>
              <a href="#demo" onClick={()=>setMobileMenuOpen(false)} className="block text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Demo</a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-24 md:pt-16 relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-emerald-50">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/img1.webp')" }} />
        <div className="relative z-10 text-center text-gray-900 px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-emerald-800 drop-shadow-md">Automation of Rubber Grading</h1>
          <p className="text-xl md:text-2xl mb-8 leading-relaxed text-gray-700">
            Revolutionizing rubber quality assessment through advanced machine learning and computer vision technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#demo" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition transform hover:scale-105 shadow-md hover:shadow-lg">Try Demo</a>
            <a href="#about" className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition transform hover:scale-105">Learn More</a>
          </div>
        </div>
      </section>

      {/* --- Other sections (About, Info, Video) remain the same --- */}
      {/* About Section */}
      <section id="about" className="relative py-20 bg-white">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-gray-800">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-6">About Para Rubber</h2>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed text-gray-600">
              Understanding the science and process behind natural rubber production and the critical importance of quality grading.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="group relative overflow-hidden rounded-2xl shadow-lg w-full h-80 md:h-96">
              <img
                src="/images/img2.jpg"
                alt="Rubber trees in plantation"
                className="w-full h-full object-cover rounded-2xl transform transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <div className="prose lg:prose-lg max-w-none text-gray-700">
              <h3 className="text-3xl font-bold text-emerald-700 mb-4">The Natural Rubber Industry</h3>
              <p className="mb-4">
                Natural rubber is one of the most vital agricultural commodities globally. Para rubber trees (Hevea brasiliensis) produce latex, a milky fluid that becomes the foundation for countless essential products, ranging from vehicle tires and industrial components to medical equipment like gloves and catheters.
              </p>
              <p>
                Our project leverages cutting-edge AI to automate the crucial process of rubber sheet grading. This system ensures consistent, objective quality assessment, empowering farmers and manufacturers to maintain the highest standards while significantly improving efficiency and reducing the potential for human error inherent in manual inspection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards */}
       <section id="info" className="relative py-20 bg-gray-50">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {infoCards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-md p-8 text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-lg cursor-pointer group border border-gray-100 hover:border-emerald-200">
              <div className="flex justify-center items-center w-16 h-16 bg-emerald-100 rounded-full shadow-sm mx-auto mb-6 transition-transform duration-300 group-hover:scale-110">
                {card.icon}
              </div>
              <h3 className="text-2xl font-bold text-emerald-800 mb-4">{card.title}</h3>
              <p className="text-gray-600 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </section>


      {/* Video Section */}
       <section id="video" className="relative py-20 bg-emerald-900 text-white">
         <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/images/img1.webp')" }}/>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">The Rubber Process</h2>
                <p className="text-xl max-w-3xl mx-auto leading-relaxed opacity-90">
                Watch how natural rubber latex is tapped, processed, and prepared into sheets.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {[1, 2, 3].map((num) => (
                <div key={num} className="group bg-black/30 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-emerald-500/30">
                    <video
                    className="w-full aspect-video rounded-t-2xl"
                    src={`/videos/video${num}.mp4`}
                    controls
                    preload="metadata"
                    />
                     <div className="p-4">
                        <h4 className="font-semibold text-lg mb-1">{`Step ${num}: ${num === 1 ? 'Tapping Latex' : num === 2 ? 'Coagulation' : 'Sheet Rolling'}`}</h4>
                        <p className="text-sm opacity-80">
                            {num === 1 ? 'Extracting raw latex from the Para rubber tree.' : num === 2 ? 'Adding acid to solidify the latex in trays.' : 'Pressing coagulated rubber into thin sheets.'}
                        </p>
                    </div>
                </div>
                ))}
            </div>
        </div>
       </section>

      {/* --- Demo Section (Modified for Webcam) --- */}
      <section id="demo" className="relative py-20 bg-gray-100">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-6">AI Grading Demo</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Enter your details, upload an image of a rubber sheet, and our AI will automatically classify its grade.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200">

              {/* User Details Form */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter your city or area"
                  />
                </div>
              </div>

              {/* --- File Upload / Camera Toggle --- */}
              {!showCamera && (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 md:p-10 text-center transition-all ${dragActive ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Upload Rubber Sheet Image <span className="text-red-500">*</span></h3>
                  <p className="text-gray-600 mb-6 text-sm md:text-base">Drag & drop, or choose from gallery</p>
                  
                  {/* Hidden input for gallery/drag-drop */}
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="file-upload-gallery" />
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <label htmlFor="file-upload-gallery" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" />
                      Choose File
                    </label>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Use Camera
                    </button>
                  </div>
                </div>
              )}

              {/* --- Webcam View (Modal-like) --- */}
              {showCamera && (
                <div className="relative p-4 bg-black rounded-lg shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto rounded-md"
                  />
                  <button
                    onClick={stopCameraStream}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/75"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={captureImage}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Camera Error Display */}
              {cameraError && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {cameraError}
                </div>
              )}

              {/* Selected File & Classify Button */}
              {selectedFile && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 break-all">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClassify}
                    disabled={isClassifying}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 flex-shrink-0"
                  >
                    {isClassifying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Classifying...</span>
                      </>
                    ) : (
                      <span>Classify</span>
                    )}
                  </button>
                </div>
              )}

              {/* API Error Display */}
              {apiError && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  <p className="font-semibold">Error:</p>
                  <p>{apiError}</p>
                </div>
              )}

              {/* Classification Result (Handles 3 Classes) */}
              {classificationResult && (
                <div className={`mt-6 p-6 rounded-xl border-2 ${
                  classificationResult.prediction === 'Grade_A' ? 'border-green-200 bg-green-50' :
                  classificationResult.prediction === 'Grade_B' ? 'border-amber-200 bg-amber-50' :
                  'border-red-200 bg-red-50' // Style for Not_Rubber
                }`}>
                  <div className="flex items-center space-x-3">
                    {/* Icon based on prediction */}
                    {classificationResult.prediction === 'Grade_A' ? <CheckCircle className="w-8 h-8 text-green-600" /> :
                     classificationResult.prediction === 'Grade_B' ? <AlertCircle className="w-8 h-8 text-amber-600" /> :
                     <XCircle className="w-8 h-8 text-red-600" />}
                    
                    <div>
                      <h3 className={`text-2xl font-bold ${
                        classificationResult.prediction === 'Grade_A' ? 'text-green-800' :
                        classificationResult.prediction === 'Grade_B' ? 'text-amber-800' :
                        'text-red-800'
                      }`}>
                        {/* Format class name for display */}
                        Classification: {classificationResult.prediction.replace('_', ' ')}
                      </h3>
                      <p className={`mt-1 ${
                        classificationResult.prediction === 'Grade_A' ? 'text-green-700' :
                        classificationResult.prediction === 'Grade_B' ? 'text-amber-700' :
                        'text-red-700'
                      }`}>
                        {/* Text based on prediction */}
                        {
                          classificationResult.prediction === 'Grade_A' ? `High quality rubber detected.` :
                          classificationResult.prediction === 'Grade_B' ? `Standard quality rubber detected.` :
                          `This does not appear to be a rubber sheet.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-10 text-center text-gray-600">
        &copy; {new Date().getFullYear()} RubberGrade. All rights reserved.
      </footer>
      
      {/* Hidden Canvas for Webcam Capture */}
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
}