/**
 * Upload page for thermal image analysis
 * Handles file upload, validation, and displays analysis results
 */

import React, { useState } from 'react';
import { Upload, FileText, MapPin, Thermometer, AlertCircle, Clock, CheckCircle, Zap } from 'lucide-react';
import { uploadThermalImage, uploadThermalImagesBatch } from '../utils/api';
import { useAlert } from '../contexts/AlertContext';
import { validateImageFile, formatTemperature, formatDistance, getFaultLevelBadgeClasses, getPriorityBadgeClasses } from '../utils/helpers';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const { success, error } = useAlert();

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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    if (files.length === 1) {
      handleFileSelect(files[0]);
    } else {
      const valid = [];
      for (const f of files) {
        const v = validateImageFile(f);
        if (!v.valid) { error(v.error); return; }
        valid.push(f);
      }
      setSelectedFiles(valid);
      setSelectedFile(null);
      setAnalysisResult(null);
      setBatchResult(null);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.length === 1) {
      handleFileSelect(files[0]);
    } else {
      const valid = [];
      for (const f of files) {
        const v = validateImageFile(f);
        if (!v.valid) { error(v.error); return; }
        valid.push(f);
      }
      setSelectedFiles(valid);
      setSelectedFile(null);
      setAnalysisResult(null);
      setBatchResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && selectedFiles.length === 0) {
      error('Please select at least one file');
      return;
    }

    setUploading(true);
    try {
      if (selectedFile) {
        const result = await uploadThermalImage(selectedFile);
        setBatchResult(null);
        setAnalysisResult(result);
        if (result.fault_level === 'CRITICAL') success('🚨 CRITICAL alert detected! Email notification sent.', 8000);
        else if (result.fault_level === 'WARNING') success('⚠️ Warning level detected. Review recommended.', 6000);
        else success('✅ Analysis completed successfully. Normal thermal condition.', 4000);
      } else {
        const batch = await uploadThermalImagesBatch(selectedFiles);
        setAnalysisResult(null);
        setBatchResult(batch);
        success(`Processed ${batch.total} images. CRITICAL: ${batch.critical}, WARNING: ${batch.warning}, NORMAL: ${batch.normal}`);
        // Persist combined PDF path for Dashboard quick access
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
    setAnalysisResult(null);
    setBatchResult(null);
    setSelectedFiles([]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Thermal Image Analysis</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload FLIR thermal images for automated analysis. Our AI-powered system extracts temperature readings, 
          identifies nearest towers, and provides comprehensive fault classification with dynamic thresholds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Upload className="h-5 w-5 mr-2 text-primary-600" />
              Upload Thermal Image
            </h2>
            
            {/* Drag & Drop Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
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
                <div className="space-y-3">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    {selectedFile ? (
                      <>
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">{selectedFiles.length} files selected</p>
                        <p className="text-sm text-gray-500">Total ~{(selectedFiles.reduce((s,f)=>s+f.size,0)/(1024*1024)).toFixed(2)} MB</p>
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
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">Drop thermal image(s) here</p>
                    <p className="text-gray-500">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports JPG, JPEG, PNG • Max 10MB per file
                  </p>
                </div>
              )}
              
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={(selectedFiles.length === 0 && !selectedFile) || uploading}
              className={`w-full mt-4 py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
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
                  <span>{selectedFiles.length > 0 ? `Analyze ${selectedFiles.length} Images` : 'Analyze Thermal Image'}</span>
                </>
              )}
            </button>
          </div>

          {/* System Features */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Analysis Features</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>EasyOCR temperature extraction</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>GPS coordinate extraction from EXIF</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>Dynamic temperature thresholds</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>Nearest tower identification</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>Critical alert email notifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {analysisResult ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Analysis Results
              </h2>

              {/* Status Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className={getFaultLevelBadgeClasses(analysisResult.fault_level)}>
                    {analysisResult.fault_level}
                  </span>
                  {analysisResult.priority && (
                    <span className={getPriorityBadgeClasses(analysisResult.priority)}>
                      {analysisResult.priority} Priority
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(analysisResult.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {/* Temperature Analysis */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Thermometer className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Image Temperature</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {formatTemperature(analysisResult.image_temp)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Thermometer className="h-4 w-4 text-blue-600" />
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
                    <span className="text-sm font-medium text-gray-700">Temperature Excess</span>
                    <span className={`text-lg font-bold ${
                      analysisResult.delta_t > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {analysisResult.delta_t > 0 ? '+' : ''}{analysisResult.delta_t.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Dynamic threshold: {formatTemperature(analysisResult.threshold_used)}
                  </div>
                </div>
              )}

              {/* Tower Information */}
              {analysisResult.tower_name && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-600" />
                    Nearest Tower
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tower:</span>
                      <span className="font-medium">{analysisResult.tower_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Camp:</span>
                      <span className="font-medium">{analysisResult.camp_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium">{formatDistance(analysisResult.distance_km)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voltage:</span>
                      <span className="font-medium">{analysisResult.voltage_kv}kV</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium">{analysisResult.capacity_amps}A</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Status */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    analysisResult.analysis_status === 'success' ? 'bg-green-400' : 
                    analysisResult.analysis_status === 'partial' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-gray-600">
                    Analysis Status: <span className="font-medium capitalize">{analysisResult.analysis_status}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : batchResult ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Batch Analysis Results
              </h2>
              <div className="text-sm text-gray-600 mb-4">
                Processed {batchResult.total} images • CRITICAL: {batchResult.critical} • WARNING: {batchResult.warning} • NORMAL: {batchResult.normal} • Failed: {batchResult.failed}
              </div>
              {batchResult.pdf_path && (
                <a
                  href={batchResult.pdf_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700"
                >
                  <FileText className="h-4 w-4" />
                  <span>Open Combined PDF</span>
                </a>
              )}
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Temp</th>
                      <th className="py-2 pr-4">ΔT</th>
                      <th className="py-2 pr-4">Threshold</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Tower</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.results.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-2 pr-4">{r.id}</td>
                        <td className="py-2 pr-4">{formatTemperature(r.image_temp)}</td>
                        <td className="py-2 pr-4">{r.delta_t !== null && r.delta_t !== undefined ? `${r.delta_t.toFixed(1)}°C` : 'N/A'}</td>
                        <td className="py-2 pr-4">{formatTemperature(r.threshold_used)}</td>
                        <td className="py-2 pr-4">
                          <span className={getFaultLevelBadgeClasses(r.fault_level)}>{r.fault_level}</span>
                        </td>
                        <td className="py-2 pr-4">{r.tower_name} {r.camp_name ? `(${r.camp_name})` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Yet</h3>
                <p className="text-gray-500">
                  Upload one or multiple thermal images to see detailed analysis results here.
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
