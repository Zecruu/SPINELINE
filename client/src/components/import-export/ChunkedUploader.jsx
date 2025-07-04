import { useState } from 'react';
import { CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ChunkedUploader = ({ file, onComplete, onError }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState(null);

  const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks

  const startChunkedUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const chunks = Math.ceil(file.size / CHUNK_SIZE);
      setTotalChunks(chunks);

      // Initialize chunked upload
      const token = localStorage.getItem('userToken');
      const initResponse = await fetch('/api/import-export/chunked-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          totalSize: file.size,
          totalChunks: chunks,
          fileType: file.type || 'application/zip'
        })
      });

      const initResult = await initResponse.json();
      if (!initResult.success) {
        throw new Error(initResult.message);
      }

      setUploadId(initResult.uploadId);

      // Upload chunks sequentially
      for (let i = 0; i < chunks; i++) {
        await uploadChunk(initResult.uploadId, i, chunks);
        setCurrentChunk(i + 1);
        setUploadProgress(Math.round(((i + 1) / chunks) * 100));
      }

      // Notify completion
      onComplete({
        uploadId: initResult.uploadId,
        fileName: file.name,
        totalSize: file.size,
        totalChunks: chunks
      });

    } catch (error) {
      console.error('Chunked upload error:', error);
      onError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadChunk = async (uploadId, chunkIndex, totalChunks) => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());

    const token = localStorage.getItem('userToken');
    const response = await fetch('/api/import-export/upload-chunk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    return result;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-700/30 rounded-lg p-6">
      <h4 className="text-sm font-medium text-white mb-4">Large File Upload</h4>
      
      {file && (
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <CloudArrowUpIcon className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-white">{file.name}</span>
            <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
          </div>
          
          {file.size > 50 * 1024 * 1024 && (
            <div className="flex items-center space-x-2 mb-3">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">
                File is larger than 50MB. Using chunked upload for better reliability.
              </span>
            </div>
          )}
        </div>
      )}

      {!uploading && !uploadId && (
        <button
          onClick={startChunkedUpload}
          disabled={!file}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Start Upload
        </button>
      )}

      {uploading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              Uploading chunk {currentChunk} of {totalChunks}
            </span>
            <span className="text-sm text-gray-400">{uploadProgress}%</span>
          </div>
          
          <div className="bg-gray-600 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-gray-400 text-center">
            {formatFileSize(currentChunk * CHUNK_SIZE)} / {formatFileSize(file.size)} uploaded
          </div>
        </div>
      )}

      {uploadId && !uploading && (
        <div className="flex items-center space-x-2 text-green-400">
          <CheckCircleIcon className="h-5 w-5" />
          <span className="text-sm">Upload completed successfully!</span>
        </div>
      )}
    </div>
  );
};

export default ChunkedUploader;
