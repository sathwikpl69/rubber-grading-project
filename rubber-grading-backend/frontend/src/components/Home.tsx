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
  Camera,
  XCircle,
  Trash2, // Added for deleting images
  Plus // Added for adding more images
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

export default function Home() {
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  
  // CHANGED: Now storing an ARRAY of files for batch processing
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // UI State
  const [isClassifying, setIsClassifying] = useState(false);
  
  // CHANGED: Results are now an ARRAY of objects
  const [classificationResults, setClassificationResults] = useState<Array<{
    filename: string, 
    prediction: string, 
    confidence: string, 
    error?: string
  }> | null>(null);
  
  const [apiError, setApiError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Webcam State & Refs ---
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get API base URL from environment variables
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

  // --- Utility Functions ---
  const clearErrors = () => {
    setApiError(null);
    setCameraError(null);
  };

  // Function to remove a specific file from the list
  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    // Clear results if the file list changes to avoid confusion
    if (classificationResults) setClassificationResults(null);
  };

  // --- File Handling ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      clearErrors();
      // Add new files to the existing list instead of replacing
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setClassificationResults(null);
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
    if (e.dataTransfer.files) {
      clearErrors();
      // Filter for images and append to list
      const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setClassificationResults(null);
    }
  };

  // --- Webcam Functions ---
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    // We do NOT clear selection here, so users can add camera photos to uploaded files

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported by your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Could not access camera. Check permissions.");
    }
  };

  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera, cameraStream]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `capture-${timestamp}.jpg`;
          const imageFile = new File([blob], fileName, { type: 'image/jpeg' });
          
          // Append capture to the list
          setSelectedFiles(prev => [...prev, imageFile]);
          
          // Note: We do NOT stop the stream here, allowing continuous shooting
        }
      }, 'image/jpeg', 0.95);
    }
  };

  // --- API Call ---
  const handleClassify = async () => {
    if (!name.trim() || !location.trim()) {
      setApiError("Please enter your Name and Location before classifying.");
      return;
    }
    if (selectedFiles.length === 0) {
      setApiError("Please select or capture at least one image.");
      return;
    }

    setIsClassifying(true);
    setClassificationResults(null);
    clearErrors();

    try {
      // Step 1: Register User
      const registerResponse = await fetch(`${API_BASE_URL}/register_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), location: location.trim() }),
      });

      if (!registerResponse.ok) {
        throw new Error("Registration failed. Please check connection.");
      }

      // Step 2: Predict (Batch)
      const formData = new FormData();
      // Append ALL files to the 'file' key
      selectedFiles.forEach(file => {
        formData.append('file', file);
      });

      const predictResponse = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!predictResponse.ok) {
        throw new Error(`Prediction failed (${predictResponse.status})`);
      }

      const result = await predictResponse.json();
      
      // Expecting { results: [...] }
      if (result.results && Array.isArray(result.results)) {
        setClassificationResults(result.results);
      } else {
        throw new Error("Invalid response format from server.");
      }

    } catch (error: any) {
      console.error("API call failed:", error);
      setApiError(error.message || "An unexpected error occurred.");
    } finally {
      setIsClassifying(false);
    }
  };

  // --- Static Data (PRESERVED EXACTLY AS ORIGINAL) ---
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <TreePine className="w-8 h-8 text-emerald-600" />
              <span className="text-xl font-bold text-emerald-600">RubberGrade AI</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Home</a>
              <a href="#about" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">About</a>
              <a href="#video" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Process</a>
              <a href="#demo" className="text-emerald-600 font-semibold text-lg hover:text-emerald-800 transition">Demo</a>
            </div>
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-emerald-600 hover:text-emerald-800 transition">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
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

      {/* About Section (PRESERVED) */}
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

      {/* Info Cards (PRESERVED) */}
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

      {/* Video Section (PRESERVED) */}
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

      {/* --- Demo Section (UPDATED FOR BATCH PROCESSING) --- */}
      <section id="demo" className="relative py-20 bg-gray-100">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-6">AI Grading Demo</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Enter your details, upload multiple rubber sheet images, and classify them all at once.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200">

              {/* User Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Upload Rubber Sheet Images <span className="text-red-500">*</span></h3>
                  <p className="text-gray-600 mb-6 text-sm md:text-base">Drag & drop multiple files, or choose from gallery</p>
                  
                  {/* 'multiple' attribute allows selecting multiple files */}
                  <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" id="file-upload-gallery" />
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <label htmlFor="file-upload-gallery" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add Images
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

              {/* --- Webcam View --- */}
              {showCamera && (
                <div className="relative p-4 bg-black rounded-lg shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-h-[60vh] object-contain rounded-md"
                  />
                  
                  {/* Camera Controls */}
                  <div className="flex justify-between items-center mt-4 px-4 pb-2">
                    <span className="text-white font-medium">{selectedFiles.length} photos taken</span>
                    <div className="flex gap-4">
                      <button 
                        onClick={captureImage} 
                        className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 active:scale-95 transition-transform"
                      >
                        Capture
                      </button>
                      <button 
                        onClick={stopCameraStream} 
                        className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold hover:bg-emerald-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Error Display */}
              {cameraError && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {cameraError}
                </div>
              )}

              {/* --- SELECTED IMAGES PREVIEW GRID --- */}
              {selectedFiles.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold text-gray-700 mb-3 flex justify-between items-center">
                    <span>Selected Images ({selectedFiles.length})</span>
                    <button onClick={() => {setSelectedFiles([]); setClassificationResults(null)}} className="text-red-500 text-sm hover:underline font-medium">Clear All</button>
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleClassify}
                      disabled={isClassifying}
                      className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:bg-gray-400 w-full md:w-auto flex justify-center items-center gap-2 transition-colors shadow-md"
                    >
                      {isClassifying && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {isClassifying ? "Processing Batch..." : `Classify ${selectedFiles.length} Images`}
                    </button>
                  </div>
                </div>
              )}

              {/* API Error Display */}
              {apiError && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  <p className="font-semibold">Error:</p>
                  <p>{apiError}</p>
                </div>
              )}

              {/* --- RESULTS GRID --- */}
              {classificationResults && (
                <div className="mt-10 border-t pt-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Batch Results</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {classificationResults.map((res, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border-l-8 shadow-sm flex items-center justify-between transition-all hover:shadow-md ${
                        res.prediction === 'Grade_A' ? 'bg-green-50 border-green-500' :
                        res.prediction === 'Grade_B' ? 'bg-amber-50 border-amber-500' :
                        'bg-red-50 border-red-500'
                      }`}>
                        <div className="flex items-center gap-4">
                           {/* Thumbnail of the specific file if available in selectedFiles */}
                           {selectedFiles[idx] && (
                             <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={URL.createObjectURL(selectedFiles[idx])} className="w-full h-full object-cover" alt="thumb"/>
                             </div>
                           )}
                           
                           <div>
                              <div className="flex items-center gap-2">
                                {res.prediction === 'Grade_A' ? <CheckCircle className="w-5 h-5 text-green-600"/> : 
                                 res.prediction === 'Grade_B' ? <AlertCircle className="w-5 h-5 text-amber-600"/> : 
                                 <XCircle className="w-5 h-5 text-red-600"/>}
                                <p className="font-bold text-gray-900 text-lg">{res.prediction?.replace('_', ' ') || 'Error'}</p>
                              </div>
                              <p className="text-sm text-gray-600 truncate max-w-[200px] sm:max-w-xs">{res.filename}</p>
                           </div>
                        </div>
                        
                        {/* <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                             res.prediction === 'Grade_A' ? 'bg-green-200 text-green-800' :
                             res.prediction === 'Grade_B' ? 'bg-amber-200 text-amber-800' :
                             'bg-red-200 text-red-800'
                          }`}>
                            {res.confidence || 'Failed'}
                          </span>
                        </div> */}
                      </div>
                    ))}
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