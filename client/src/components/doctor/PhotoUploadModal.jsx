import { useState, useRef } from 'react';
import { XMarkIcon, CameraIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const PhotoUploadModal = ({ isOpen, onClose, patient, onPhotoUpdated }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoName, setPhotoName] = useState('');

  // Detect if device is iPad/iOS for better user guidance
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Test camera permissions
  const testCameraPermissions = async () => {
    try {
      console.log('🧪 Testing camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('✅ Camera test successful!');
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      alert('✅ Camera access works! You can now use the "Take Photo" feature.');
    } catch (error) {
      console.error('❌ Camera test failed:', error);
      alert(`❌ Camera test failed: ${error.message}\n\nTry the troubleshooting steps below.`);
    }
  };

  // Helper function to get full photo URL
  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;

    // If it's already a full URL, return as is
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }

    // If it's a relative path, prepend the server URL
    const serverUrl = 'http://localhost:5001';
    return `${serverUrl}${photoPath}`;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChooseFileClick = () => {
    // Directly trigger file input
    document.getElementById('photo-file-input').click();
  };

  const startCamera = async () => {
    try {
      setError('');
      console.log('🎥 Starting camera access...');
      console.log('🌐 Current URL protocol:', window.location.protocol);
      console.log('🔒 Is HTTPS:', window.location.protocol === 'https:');

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices) {
        console.error('❌ navigator.mediaDevices not available');
        throw new Error('Camera API not supported. Try using HTTPS or a different browser.');
      }

      if (!navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia not available');
        throw new Error('Camera access not supported. Try using HTTPS or a different browser.');
      }

      // Check current permissions
      try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        console.log('📹 Camera permission status:', permission.state);

        if (permission.state === 'denied') {
          throw new Error('Camera permission denied. Please enable camera access in browser settings.');
        }
      } catch (permError) {
        console.log('⚠️ Could not check camera permissions:', permError.message);
      }

      // Check if any video input devices are available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('📱 Available video devices:', videoDevices.length);
        console.log('📱 Video devices:', videoDevices.map(d => ({ label: d.label, deviceId: d.deviceId })));

        if (videoDevices.length === 0) {
          throw new Error('No camera found on this device');
        }
      } catch (deviceError) {
        console.log('⚠️ Could not enumerate devices:', deviceError.message);
        // Continue anyway, as some browsers may not support enumerateDevices
      }

      let mediaStream = null;

      // Try different camera configurations for better compatibility
      const cameraConfigs = [
        // First try: Basic video with front camera preference
        {
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        // Second try: Any camera with basic constraints
        {
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          }
        },
        // Third try: Most basic - just video
        { video: true },
        // Fourth try: Environment camera (back camera) as fallback
        {
          video: {
            facingMode: 'environment'
          }
        },
        // Fifth try: Very basic with minimal constraints
        {
          video: {
            width: 640,
            height: 480
          }
        }
      ];

      // Try each configuration until one works
      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          console.log(`🔄 Trying camera config ${i + 1}/${cameraConfigs.length}:`, JSON.stringify(cameraConfigs[i]));
          mediaStream = await navigator.mediaDevices.getUserMedia(cameraConfigs[i]);
          console.log(`✅ Camera access successful with config ${i + 1}!`);
          break;
        } catch (configError) {
          console.log(`❌ Camera config ${i + 1} failed:`, configError.name, '-', configError.message);
          if (i === cameraConfigs.length - 1) {
            // Try legacy getUserMedia as final fallback
            console.log('🔄 Trying legacy getUserMedia...');
            try {
              const legacyGetUserMedia = navigator.getUserMedia ||
                                       navigator.webkitGetUserMedia ||
                                       navigator.mozGetUserMedia ||
                                       navigator.msGetUserMedia;

              if (legacyGetUserMedia) {
                mediaStream = await new Promise((resolve, reject) => {
                  legacyGetUserMedia.call(navigator, { video: true }, resolve, reject);
                });
                console.log('✅ Legacy camera access successful!');
                break;
              }
            } catch (legacyError) {
              console.log('❌ Legacy camera access failed:', legacyError.message);
            }

            throw configError; // If all configs fail, throw the last error
          }
        }
      }

      if (mediaStream) {
        setStream(mediaStream);
        setShowCamera(true);

        // Wait for video element to be available and set up properly for iPad
        setTimeout(() => {
          if (videoRef.current) {
            const video = videoRef.current;

            // Set up video element for better iPad compatibility
            video.srcObject = mediaStream;
            video.setAttribute('playsinline', true); // Important for iOS
            video.setAttribute('webkit-playsinline', true); // For older iOS versions
            video.muted = true; // Prevent audio feedback

            // Handle video loading
            video.onloadedmetadata = () => {
              console.log('Video metadata loaded, attempting to play');
              video.play().catch(playError => {
                console.error('Error playing video:', playError);
                setError('Unable to start camera preview. Please try again.');
              });
            };

            // Handle video errors
            video.onerror = (e) => {
              console.error('Video element error:', e);
              setError('Camera preview error. Please try again.');
            };
          }
        }, 100);
      }
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      let errorMessage = 'Unable to access camera. ';
      let troubleshooting = '';

      if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
        troubleshooting = 'Make sure your device has a camera and it\'s not being used by another app.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied.';
        troubleshooting = window.location.protocol === 'https:'
          ? 'Click the camera icon in your browser\'s address bar and allow camera access.'
          : 'Camera requires HTTPS. Try accessing the site with https:// or allow camera in browser settings.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported on this device.';
        troubleshooting = 'Try using a different browser (Chrome, Safari, or Firefox work best).';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
        troubleshooting = 'Close other apps that might be using the camera and try again.';
      } else if (error.message.includes('HTTPS')) {
        errorMessage += 'Camera requires secure connection.';
        troubleshooting = 'Camera access requires HTTPS. Please use https:// in the URL or enable camera in browser settings.';
      } else {
        errorMessage += 'Please check camera permissions and try again.';
        troubleshooting = window.location.protocol === 'http:'
          ? 'Try using https:// instead of http:// or enable camera permissions in browser settings.'
          : 'Check browser settings and ensure camera permissions are enabled for this site.';
      }

      setError(`${errorMessage} ${troubleshooting}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob and show naming interface
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedPhoto(blob);
          setPreview(URL.createObjectURL(blob));
          setPhotoName(`${patient?.firstName || 'Patient'}_Photo_${new Date().toLocaleDateString().replace(/\//g, '-')}`);
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const confirmCapturedPhoto = () => {
    if (capturedPhoto && photoName.trim()) {
      const fileName = `${photoName.trim()}.jpg`;
      const file = new File([capturedPhoto], fileName, { type: 'image/jpeg' });
      setSelectedFile(file);
      setCapturedPhoto(null);
      setPhotoName('');
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setPhotoName('');
    setPreview(null);
    startCamera();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('profilePic', selectedFile);

      const token = localStorage.getItem('userToken');
      const response = await axios.post(`/api/patients/${patient._id}/photo`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        onPhotoUpdated(response.data.profilePicUrl);
        handleClose();
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      setError(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setSelectedFile(null);
    setPreview(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <CameraIcon className="h-5 w-5 mr-2" />
            Update Patient Photo
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Current Photo */}
        <div className="text-center mb-4">
          <div className="inline-block">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-600"
              />
            ) : patient?.profilePic ? (
              <img
                src={getPhotoUrl(patient.profilePic)}
                alt={`${patient.firstName} ${patient.lastName}`}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-600"
                onError={(e) => {
                  console.error('Failed to load patient photo in modal:', patient.profilePic);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center border-4 border-gray-600">
                <span className="text-white text-2xl font-bold">
                  {patient?.firstName?.charAt(0)?.toUpperCase()}{patient?.lastName?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Camera View */}
        {showCamera && (
          <div className="mb-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                webkit-playsinline="true"
                className="w-full h-64 object-cover"
                style={{ objectFit: 'cover' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                <button
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center"
                >
                  <CameraIcon className="h-5 w-5 mr-2" />
                  Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Photo Naming Interface */}
        {capturedPhoto && (
          <div className="mb-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Name Your Photo</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Photo Name</label>
                  <input
                    type="text"
                    value={photoName}
                    onChange={(e) => setPhotoName(e.target.value)}
                    placeholder="Enter a name for this photo..."
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={retakePhoto}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Retake Photo
                  </button>
                  <button
                    onClick={confirmCapturedPhoto}
                    disabled={!photoName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Use This Photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Input Options */}
        {!showCamera && !capturedPhoto && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add New Photo
            </label>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="photo-file-input"
                  />
                  <button
                    onClick={handleChooseFileClick}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    <PhotoIcon className="h-5 w-5 mr-2" />
                    Choose File
                  </button>
                </div>
                <button
                  onClick={startCamera}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  <VideoCameraIcon className="h-5 w-5 mr-2" />
                  Take Photo
                </button>
              </div>

            {/* Device-specific guidance and troubleshooting */}
            <div className="mt-2 space-y-2">
              {isIPad && (
                <div className="p-2 bg-blue-900 bg-opacity-50 rounded text-xs text-blue-200">
                  <strong>iPad Users:</strong> Camera works best in Safari. Enable camera in Settings → Safari → Camera.
                </div>
              )}

              {window.location.protocol === 'http:' && (
                <div className="p-2 bg-yellow-900 bg-opacity-50 rounded text-xs text-yellow-200">
                  <strong>Security Notice:</strong> Camera requires HTTPS. If camera doesn't work, try using https:// in the URL.
                </div>
              )}

              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer hover:text-gray-300">Camera Troubleshooting</summary>
                <div className="mt-2 p-2 bg-gray-700 rounded space-y-2">
                  <div className="space-y-1">
                    <div>• <strong>Permission denied:</strong> Click camera icon in address bar to allow access</div>
                    <div>• <strong>No camera found:</strong> Check if another app is using the camera</div>
                    <div>• <strong>Not working:</strong> Try Chrome, Safari, or Firefox browsers</div>
                    <div>• <strong>Still issues:</strong> Use "Choose File" button instead</div>
                  </div>
                  <button
                    onClick={testCameraPermissions}
                    className="w-full px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                  >
                    🧪 Test Camera Access
                  </button>
                </div>
              </details>
            </div>
            {selectedFile && (
              <p className="text-sm text-gray-400 mt-2">
                Selected: {selectedFile.name}
              </p>
            )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        {!showCamera && !capturedPhoto && (
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Upload Photo
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoUploadModal;
