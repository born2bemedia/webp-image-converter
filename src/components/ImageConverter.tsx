'use client';

import { useState, useRef } from 'react';
import JSZip from 'jszip';

interface ConversionResult {
  originalName: string;
  fileName: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  webpBuffer: string;
}

interface BatchConversionResult {
  success: boolean;
  results: (ConversionResult | { originalName: string; error: string })[];
  totalFiles: number;
  successfulConversions: number;
  failedConversions: number;
}

export default function ImageConverter() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [result, setResult] = useState<BatchConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadMode, setDownloadMode] = useState<'individual' | 'zip'>('individual');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        setError(`Unsupported file formats: ${invalidFiles.map(f => f.name).join(', ')}. Only JPEG, JPG and PNG are supported`);
        return;
      }
      
      setSelectedFiles(files);
      setError(null);
      setResult(null);
      setConversionProgress(0);
    }
  };

  const convertToWebP = async (file: File): Promise<{ blob: Blob; originalSize: number; convertedSize: number }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                originalSize: file.size,
                convertedSize: blob.size
              });
            } else {
              reject(new Error('Failed to convert to WebP'));
            }
          },
          'image/webp',
          quality / 100
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;

    setIsConverting(true);
    setError(null);
    setConversionProgress(0);

    try {
      const results: (ConversionResult | { originalName: string; error: string })[] = [];
      let successfulConversions = 0;
      let failedConversions = 0;

      if (downloadMode === 'zip') {
        // Create ZIP archive
        const zip = new JSZip();
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          
          try {
            const { blob, originalSize, convertedSize } = await convertToWebP(file);
            
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}.webp`;
            
            // Add file to ZIP
            zip.file(fileName, blob);

            results.push({
              originalName: file.name,
              fileName,
              originalSize,
              convertedSize,
              compressionRatio: ((originalSize - convertedSize) / originalSize) * 100,
              webpBuffer: '' // Not needed for client-side
            });
            
            successfulConversions++;
          } catch (error) {
            results.push({
              originalName: file.name,
              error: error instanceof Error ? error.message : 'Conversion error'
            });
            failedConversions++;
          }

          // Update progress
          setConversionProgress(((i + 1) / selectedFiles.length) * 100);
        }

        // Generate and download ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const zipFileName = `webp-conversion-${timestamp}.zip`;
        
        const url = window.URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

      } else {
        // Individual downloads
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          
          try {
            const { blob, originalSize, convertedSize } = await convertToWebP(file);
            
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}.webp`;
            
            // Download the file
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            results.push({
              originalName: file.name,
              fileName,
              originalSize,
              convertedSize,
              compressionRatio: ((originalSize - convertedSize) / originalSize) * 100,
              webpBuffer: '' // Not needed for client-side
            });
            
            successfulConversions++;
          } catch (error) {
            results.push({
              originalName: file.name,
              error: error instanceof Error ? error.message : 'Conversion error'
            });
            failedConversions++;
          }

          // Update progress
          setConversionProgress(((i + 1) / selectedFiles.length) * 100);
        }
      }

      setResult({
        success: true,
        results,
        totalFiles: selectedFiles.length,
        successfulConversions,
        failedConversions
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion error');
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = (): number => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        setError(`Unsupported file formats: ${invalidFiles.map(f => f.name).join(', ')}. Only JPEG, JPG and PNG are supported`);
        return;
      }
      
      setSelectedFiles(files);
      setError(null);
      setResult(null);
      setConversionProgress(0);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setResult(null);
    setError(null);
    setConversionProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl mb-6 glow">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
            WebP Image Converter
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Convert images to optimized WebP format locally in your browser - no server limits!
          </p>
        </div>

        {/* Upload Zone */}
        <div
          className={`relative group transition-all duration-300 ${
            selectedFiles.length > 0
              ? 'scale-105'
              : 'hover:scale-102'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className={`absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-3xl blur-xl transition-opacity duration-300 ${
            selectedFiles.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
          }`}></div>
          
          <div className={`relative backdrop-blur-sm border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
            selectedFiles.length > 0
              ? 'border-blue-400 bg-green-900/20 shadow-2xl shadow-green-500/20'
              : 'border-gray-600 bg-gray-800/80 hover:border-blue-400 hover:bg-gray-800/90 shadow-xl hover:shadow-2xl'
          }`}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFiles.length === 0 ? (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl glow">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Upload your images
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Drag files here or click to select
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-400 mb-8">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      JPG
                    </span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      PNG
                    </span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      JPEG
                    </span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200 glow"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Select Files
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl glow">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedFiles.length} files ready
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Total size: <span className="font-semibold text-blue-400">{formatFileSize(getTotalSize())}</span>
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={clearAllFiles}
                      className="px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors duration-200 shadow-lg"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors duration-200 shadow-lg"
                    >
                      Add More
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-gray-700/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                Selected Files
              </h3>
              <span className="px-4 py-2 bg-blue-900/50 text-blue-300 font-semibold rounded-full text-sm border border-blue-700/50">
                {selectedFiles.length} files
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-3 custom-scrollbar">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700/50 to-blue-900/30 rounded-2xl border border-gray-600/50 hover:shadow-lg hover:border-gray-500/50 transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white truncate max-w-xs">{file.name}</p>
                      <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded-xl transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {selectedFiles.length > 0 && (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-gray-700/20">
            <h3 className="text-xl font-bold text-white mb-6">
              Conversion Settings
            </h3>
            <div className="space-y-8">
              {/* Download Mode */}
              <div>
                <label className="block text-lg font-semibold text-gray-200 mb-4">
                  Download Mode
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`relative cursor-pointer group ${
                    downloadMode === 'individual' ? '' : ''
                  }`}>
                    <input
                      type="radio"
                      value="individual"
                      checked={downloadMode === 'individual'}
                      onChange={(e) => setDownloadMode(e.target.value as 'individual' | 'zip')}
                      className="sr-only"
                    />
                    <div className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                      downloadMode === 'individual'
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-gray-600 bg-gray-700/50 hover:border-blue-400 hover:bg-gray-700/70'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          downloadMode === 'individual'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Individual Files</h4>
                          <p className="text-sm text-gray-400">{selectedFiles.length} downloads</p>
                        </div>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`relative cursor-pointer group ${
                    downloadMode === 'zip' ? '' : ''
                  }`}>
                    <input
                      type="radio"
                      value="zip"
                      checked={downloadMode === 'zip'}
                      onChange={(e) => setDownloadMode(e.target.value as 'individual' | 'zip')}
                      className="sr-only"
                    />
                    <div className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                      downloadMode === 'zip'
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-gray-600 bg-gray-700/50 hover:border-blue-400 hover:bg-gray-700/70'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          downloadMode === 'zip'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">ZIP Archive</h4>
                          <p className="text-sm text-gray-400">1 download</p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quality Slider */}
              <div>
                <label className="block text-lg font-semibold text-gray-200 mb-4">
                  WebP Quality: <span className="text-blue-400">{quality}%</span>
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-3 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-2">
                    <span>High compression</span>
                    <span>High quality</span>
                  </div>
                </div>
              </div>

              {/* Convert Button */}
              <button
                onClick={handleConvert}
                disabled={isConverting}
                className={`w-full py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
                  isConverting
                    ? 'bg-gray-600 cursor-not-allowed scale-95'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl hover:shadow-3xl hover:scale-105 glow'
                }`}
              >
                {isConverting ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Converting {selectedFiles.length} files...</span>
                  </div>
                                 ) : (
                   <div className="flex items-center justify-center space-x-3">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                     <span>
                       {downloadMode === 'zip' 
                         ? `Convert ${selectedFiles.length} files to WebP (ZIP)`
                         : `Convert ${selectedFiles.length} files to WebP`
                       }
                     </span>
                   </div>
                 )}
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        {isConverting && (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-gray-700/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">Conversion in progress...</span>
                <span className="text-blue-400 font-bold">{conversionProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${conversionProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 backdrop-blur-sm border border-red-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-gray-700/20">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl glow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">
                Conversion completed! 🎉
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 p-6 rounded-2xl border border-blue-700/30">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{result.totalFiles}</div>
                  <div className="text-gray-300">Total files</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 p-6 rounded-2xl border border-green-700/30">
                  <div className="text-3xl font-bold text-green-400 mb-2">{result.successfulConversions}</div>
                  <div className="text-gray-300">Successfully converted</div>
                </div>
                <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 p-6 rounded-2xl border border-red-700/30">
                  <div className="text-3xl font-bold text-red-400 mb-2">{result.failedConversions}</div>
                  <div className="text-gray-300">Errors</div>
                </div>
              </div>
              
              {result.failedConversions > 0 && (
                <div className="bg-red-900/30 rounded-2xl p-6 border border-red-700/30">
                  <h4 className="font-semibold text-red-300 mb-3">Files with errors:</h4>
                  <div className="space-y-2">
                    {result.results
                      .filter(r => 'error' in r)
                      .map((r, index) => (
                        <div key={index} className="text-sm text-red-300 bg-red-900/50 p-3 rounded-xl border border-red-700/30">
                          • {r.originalName}: {r.error}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
                             <p className="text-green-400 font-medium">
                 {downloadMode === 'zip' 
                   ? 'ZIP archive with all converted files has been downloaded to your computer.'
                   : 'All successfully converted files have been automatically downloaded to your computer.'
                 }
               </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
