import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { complianceApi } from "../services/api";

export const PolicyUploader = ({
  allPolicies = [],
  onUploadSuccess,
  isUploading,
  setIsUploading,
  onSuccessToast,
  onErrorToast,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const validExtensions = [".pdf", ".docx", ".txt", ".csv", ".json", ".md"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      onErrorToast(
        "Unsupported File Format",
        `Only ${validExtensions.join(", ")} files are supported.`
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      onErrorToast("File Too Large", "Maximum supported policy file size is 25MB.");
      return;
    }

    // Duplicate Check against ingested policies
    const isDuplicate = allPolicies.some(
      (p) => p.filename?.trim().toLowerCase() === file.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      onErrorToast(
        "Duplicate Policy Document",
        `"${file.name}" has already been uploaded. Duplicate policy documents are not allowed.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Double check before upload
    const isDuplicate = allPolicies.some(
      (p) => p.filename?.trim().toLowerCase() === selectedFile.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      onErrorToast(
        "Duplicate Policy Document",
        `"${selectedFile.name}" has already been uploaded. Duplicate policy documents are not allowed.`
      );
      setSelectedFile(null);
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + 15;
      });
    }, 200);

    try {
      setUploadProgress(90);

      const uploadedPolicy = await complianceApi.uploadPolicy(selectedFile);

      setUploadProgress(100);
      setTimeout(() => {
        clearInterval(progressInterval);
        setIsUploading(false);
        setUploadProgress(0);
        setSelectedFile(null);

        const normalizedPolicy = {
          ...uploadedPolicy,
          policy_id: uploadedPolicy.policy_id || uploadedPolicy.id,
          controls: uploadedPolicy.controls || [],
          extracted_controls_count: uploadedPolicy.total_controls_extracted ?? (uploadedPolicy.controls || []).length,
          uploaded_at: uploadedPolicy.uploaded_at || new Date().toISOString(),
        };

        onUploadSuccess(normalizedPolicy);
        onSuccessToast(
          "Policy Ingested Successfully",
          `Extracted ${normalizedPolicy.extracted_controls_count} verifiable controls from ${normalizedPolicy.filename}`
        );
      }, 400);
    } catch (err) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
      onErrorToast("Upload Failed", err.message || "Failed to process policy file.");
    }
  };

  const getFileIcon = (filename) => {
    if (filename.endsWith(".pdf")) return <FileText className="w-8 h-8 text-rose-500" />;
    if (filename.endsWith(".docx")) return <FileText className="w-8 h-8 text-indigo-500" />;
    if (filename.endsWith(".csv")) return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    return <FileCode className="w-8 h-8 text-indigo-500" />;
  };

  return (
    <div id="policy-uploader-card" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            Upload & Ingest Compliance Policy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest security frameworks (PDF, DOCX, CSV, TXT) to automatically extract machine-evaluable control rules.
          </p>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        id="policy-dropzone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          dragActive
            ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]"
            : selectedFile
            ? "border-emerald-400 bg-emerald-50/20"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70"
        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.csv,.json,.md"
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center">
              {getFileIcon(selectedFile.name)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {(selectedFile.size / 1024).toFixed(1)} KB · Ready to parse
              </p>
            </div>
            {!isUploading && (
              <span className="text-xs text-indigo-600 font-semibold underline mt-1">
                Click or drop another file to replace
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Drag and drop your compliance policy document here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF, DOCX, TXT, CSV, or Markdown (up to 25MB)
              </p>
            </div>
            <button
              type="button"
              id="browse-files-btn"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Browse Files
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-5 max-w-md mx-auto">
            <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1.5">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                Extracting Controls 
              </span>
              <span className="font-mono text-indigo-600">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-indigo-500 to-indigo-600 transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls / Sample Presets */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        
        {/* Ingest Action Button */}
        <button
          type="button"
          id="confirm-policy-upload-btn"
          disabled={!selectedFile || isUploading}
          onClick={handleUpload}
          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Parsing Document...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Ingest & Extract Controls</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
