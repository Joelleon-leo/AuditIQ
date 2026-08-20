import React, { useState, useEffect } from "react";
import {
  FileText,
  X,
  Download,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  Shield,
  Layers,
  Calendar,
  HardDrive,
  Loader2,
} from "lucide-react";
import { complianceApi } from "../services/api";

export const PolicyDocumentModal = ({ policy, onClose, onSuccessToast, onErrorToast }) => {
  const [activeView, setActiveView] = useState("pdf"); // 'pdf' | 'text'
  const [copied, setCopied] = useState(false);
  const [rawText, setRawText] = useState(policy?.raw_text || "");
  const [isLoadingText, setIsLoadingText] = useState(false);

  const policyId = policy?.id || policy?.policy_id;
  const fileUrl = policyId ? complianceApi.getPolicyFileUrl(policyId) : "";
  const isPdf = policy?.filename?.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    if (policy?.raw_text) {
      setRawText(policy.raw_text);
    } else if (policyId) {
      setIsLoadingText(true);
      complianceApi
        .getPolicyById(policyId)
        .then((data) => {
          if (data && data.raw_text) {
            setRawText(data.raw_text);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch policy raw text:", err);
        })
        .finally(() => {
          setIsLoadingText(false);
        });
    }
  }, [policy, policyId]);

  if (!policy) return null;

  const handleCopyText = async () => {
    if (!rawText) {
      if (onErrorToast) onErrorToast("Copy Failed", "No extracted text available for this policy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      if (onSuccessToast) onSuccessToast("Copied to Clipboard", "Policy document text copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (onErrorToast) onErrorToast("Copy Failed", "Could not copy text to clipboard.");
    }
  };

  const handleDownload = () => {
    window.open(fileUrl, "_blank");
  };

  return (
    <div
      id="policy-document-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full h-[90vh] max-h-[900px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  {policy.filename}
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  {String(policyId).slice(0, 8)}...
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-500" />
                  {policy.controls?.length || policy.extracted_controls_count || 0} Controls Extracted
                </span>
                {policy.file_size_bytes ? (
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    {(policy.file_size_bytes / 1024).toFixed(1)} KB
                  </span>
                ) : null}
                {policy.created_at && (
                  <span className="hidden md:flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(policy.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action & Close buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Open or download document in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab</span>
            </button>

            <button
              type="button"
              id="close-policy-document-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs Bar */}
        <div className="px-4 sm:px-6 py-2 border-b border-slate-100 bg-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView("pdf")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeView === "pdf"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isPdf ? "Interactive PDF Viewer" : "Original File Preview"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("text")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeView === "text"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Extracted Policy Text</span>
            </button>
          </div>

          {activeView === "text" && (
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Text"}</span>
            </button>
          )}
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 min-h-0 bg-slate-100 relative overflow-hidden flex flex-col">
          {activeView === "pdf" ? (
            <div className="w-full h-full flex flex-col bg-slate-200">
              <iframe
                id="policy-pdf-iframe"
                src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                type="application/pdf"
                title={policy.filename}
                className="w-full h-full border-none flex-1 bg-white"
              />
            </div>
          ) : (
            <div className="w-full h-full p-4 sm:p-6 overflow-y-auto bg-slate-100/60 font-mono text-xs leading-relaxed text-slate-800 flex justify-center">
              <div className="max-w-3xl w-full bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 my-2">
                {isLoadingText ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                    <p className="font-semibold text-slate-700 text-xs">Loading extracted policy text...</p>
                  </div>
                ) : rawText ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800 leading-relaxed select-text">
                    {rawText}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <FileText className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No raw text recorded</p>
                    <p className="text-[11px] text-slate-400">Please switch to the PDF viewer tab</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Document Ingested & Verified</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
