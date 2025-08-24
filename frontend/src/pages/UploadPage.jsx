/**
 * Dedicated Upload page for thermal image processing
 * Professional interface for single and batch image uploads
 */

import React, { useState } from 'react';
import { Upload, FileText, Zap, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import { uploadThermalImage, uploadThermalImagesBatch } from '../utils/api';
import { useAlert } from '../contexts/AlertContext';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const { success, error } = useAlert();

  const validateImageFile = (file) => {
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'Please select an image file' };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }
    return { valid: true };
  };

  const handleFileSelect = (file) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      error(validation.error);
      return;
    }
    setSelectedFile(file);
    setSelectedFiles([]);
    setAnalysisResult(null);
    setBatchResult(null);
  };

  const handleMultipleFileSelect = (files) => {
    const validFiles = [];
    for (const file of files) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        error(`${file.name}: ${validation.error}`);
      }
    }
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setSelectedFile(null);
      setAnalysisResult(null);
      setBatchResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 1) {
      handleFileSelect(files[0]);
    } else if (files.length > 1) {
      handleMultipleFileSelect(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 1) {
      handleFileSelect(files[0]);
    } else if (files.length > 1) {
      handleMultipleFileSelect(files);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && selectedFiles.length === 0) return;

    setUploading(true);
    try {
      if (selectedFile) {
        const result = await uploadThermalImage(selectedFile);
        setBatchResult(null);
        setAnalysisResult(result);
        if (result.fault_level === 'CRITICAL') {
          success('🚨 CRITICAL alert detected! Email notification sent.', 8000);
        } else if (result.fault_level === 'WARNING') {
          success('⚠️ Warning level detected. Review recommended.', 6000);
        } else {
          success('✅ Analysis completed successfully. Normal thermal condition.', 4000);
        }
      } else {
        const batch = await uploadThermalImagesBatch(selectedFiles);
        setAnalysisResult(null);
        setBatchResult(batch);
        success(`Processed ${batch.total} images. CRITICAL: ${batch.critical}, WARNING: ${batch.warning}, NORMAL: ${batch.normal}`);
        if (batch.pdf_path) {
          try { localStorage.setItem('lastCombinedPdf', batch.pdf_path); } catch (e) {}
        }
      }
    } catch (err) {
      error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setAnalysisResult(null);
    setBatchResult(null);
  };

  const formatTemperature = (temp) => {
    return temp !== null && temp !== undefined ? `${temp.toFixed(1)}°C` : 'N/A';
  };

  const getFaultLevelColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-700 bg-red-100 border-red-200';
      case 'WARNING': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'NORMAL': return 'text-green-700 bg-green-100 border-green-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Upload & Scan</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Upload thermal images for AI-powered analysis and fault detection
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-primary-600" />
                Upload Thermal Images
              </h2>
              {(selectedFile || selectedFiles.length > 0) && (
                <button
                  onClick={clearSelection}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
            
            {/* Drag & Drop Area */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragOver 
                  ? 'border-primary-400 bg-primary-50' 
                  : (selectedFile || selectedFiles.length > 0)
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              {selectedFile || selectedFiles.length > 0 ? (
                <div className="space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    {selectedFile ? (
                      <>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFiles.length} files selected</p>
                        <p className="text-sm text-gray-500">
                          Total ~{(selectedFiles.reduce((s,f)=>s+f.size,0)/(1024*1024)).toFixed(2)} MB
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-primary-600 hover:text-primary-700 underline"
                  >
                    Choose different file(s)
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Drop thermal image(s) here</p>
                    <p className="text-gray-500">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports JPG, JPEG, PNG • Max 10MB per file • Single or multiple files
                  </p>
                </div>
              )}
              
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={(selectedFiles.length === 0 && !selectedFile) || uploading}
              className={`w-full mt-6 py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
                (selectedFiles.length === 0 && !selectedFile) || uploading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg'
              }`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>
                    {selectedFiles.length > 0 
                      ? `Analyze ${selectedFiles.length} Images` 
                      : 'Analyze Thermal Image'
                    }
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Features */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              AI Analysis Capabilities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-blue-700">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>EasyOCR temperature extraction</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>GPS coordinate extraction from EXIF</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>Dynamic temperature thresholds</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>Nearest tower identification</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>Critical alert email notifications</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>Professional PDF report generation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {analysisResult ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Analysis Results
              </h2>

              {/* Status Badge */}
              <div className="flex items-center justify-between mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getFaultLevelColor(analysisResult.fault_level)}`}>
                  {analysisResult.fault_level}
                </span>
                <div className="text-sm text-gray-500">
                  {new Date(analysisResult.timestamp).toLocaleString()}
                </div>
              </div>

              {/* Temperature Analysis */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium text-orange-800">Image Temperature</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {formatTemperature(analysisResult.image_temp)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">Ambient Temperature</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatTemperature(analysisResult.ambient_temp)}
                  </div>
                </div>
              </div>

              {/* Temperature Delta */}
              {analysisResult.delta_t !== null && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Temperature Excess (ΔT)</span>
                    <span className={`text-lg font-bold ${
                      analysisResult.delta_t > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {analysisResult.delta_t > 0 ? '+' : ''}{analysisResult.delta_t.toFixed(1)}°C
                    </span>
                  </div>
                </div>
              )}

              {/* Tower Information */}
              {analysisResult.tower_name && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Nearest Tower</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Tower:</span>
                      <span className="font-medium">{analysisResult.tower_name}</span>
                    </div>
                    {analysisResult.camp_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Camp:</span>
                        <span className="font-medium">{analysisResult.camp_name}</span>
                      </div>
                    )}
                    {analysisResult.distance_km !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Distance:</span>
                        <span className="font-medium">{analysisResult.distance_km.toFixed(3)} km</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : batchResult ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Batch Analysis Results
              </h2>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{batchResult.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{batchResult.critical}</div>
                  <div className="text-xs text-red-500">Critical</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{batchResult.warning}</div>
                  <div className="text-xs text-yellow-500">Warning</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{batchResult.normal}</div>
                  <div className="text-xs text-green-500">Normal</div>
                </div>
              </div>

              {batchResult.pdf_path && (
                <a
                  href={batchResult.pdf_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 mb-4"
                >
                  <FileText className="h-4 w-4" />
                  <span>Open Combined PDF Report</span>
                </a>
              )}

              {/* Results Preview */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-300 border-b">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Temp</th>
                      <th className="py-2 pr-4">ΔT</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Tower</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.results.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-2 pr-4">{r.id}</td>
                        <td className="py-2 pr-4">{formatTemperature(r.image_temp)}</td>
                        <td className="py-2 pr-4">
                          {r.delta_t !== null && r.delta_t !== undefined ? `${r.delta_t.toFixed(1)}°C` : 'N/A'}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-1 rounded text-xs ${getFaultLevelColor(r.fault_level)}`}>
                            {r.fault_level}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{r.tower_name || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batchResult.results.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing first 5 of {batchResult.results.length} results
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Ready for Analysis</h3>
                <p className="text-gray-500">
                  Upload thermal images to see detailed analysis results here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
