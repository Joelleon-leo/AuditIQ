import React, { useState } from "react";
import {
  Server,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Globe,
  Database
} from "lucide-react";
import { setApiBaseUrl, resetApiBaseUrl, complianceApi } from "../services/api";

export const ApiSettingsModal = ({
  currentBaseUrl,
  onUpdateBaseUrl,
  onClose,
  onSuccessToast,
  onErrorToast,
}) => {
  const [urlInput, setUrlInput] = useState(currentBaseUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const originalUrl = currentBaseUrl;
    try {
      setApiBaseUrl(urlInput);
      const res = await complianceApi.checkHealth();
      setTestResult({
        success: true,
        message: `Connected successfully! Latency: ${res.latencyMs}ms (API Version ${res.version})`,
        latency: res.latencyMs,
      });
      onSuccessToast("API Connected", `Health check passed (${res.latencyMs}ms)`);
    } catch (err) {
      setApiBaseUrl(originalUrl);
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message}`,
      });
      onErrorToast("Connection Failed", err.message || "Endpoint unreachable");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      onErrorToast("Validation Error", "API Base URL cannot be empty.");
      return;
    }

    onUpdateBaseUrl(urlInput.trim());
    onSuccessToast("Configuration Saved", `API endpoint set to ${urlInput.trim()}`);
    onClose();
  };

  const handleResetDefault = () => {
    resetApiBaseUrl();
    setUrlInput("/api/v1");
    setTestResult(null);
    onSuccessToast("Reset to Default", "Endpoint reset to standard `/api/v1` routes.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        id="api-settings-modal-dialog"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Compliance API Server Configuration
              </h3>
              <p className="text-[11px] text-slate-500">
                Connect FLYYY.AI to your enterprise compliance backend
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
              <span>API Base URL Endpoint</span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                Reset to Default
              </button>
            </label>
            <div className="relative">
              <input
                type="text"
                id="api-base-url-input"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://api.compliance.enterprise.com/api/v1"
                className="w-full pl-9 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                id="test-connection-btn"
                disabled={isTesting}
                onClick={handleTestConnection}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {isTesting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                <span>Test Ping</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports relative paths (e.g., <code className="text-slate-600">/api/v1</code>) or absolute cross-origin HTTPS endpoints.
            </p>
          </div>

          {/* Test Result Message Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[11px]">{testResult.message}</p>
                {testResult.latency !== undefined && (
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Server ping latency: {testResult.latency} ms
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Supported API Contract Reference */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-700 text-[11px] mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              Implemented REST API Contract Endpoints:
            </h4>
            <div className="space-y-1 font-mono text-[10px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600">GET</span>
                <span>/health</span>
                <span className="text-slate-400 text-[9px] ml-auto">Health & Ping Check</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">POST</span>
                <span>/policies/upload</span>
                <span className="text-slate-400 text-[9px] ml-auto">Upload & Ingest Policy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600">GET</span>
                <span>/policies</span>
                <span className="text-slate-400 text-[9px] ml-auto">List Policies</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">POST</span>
                <span>/policies/:id/controls</span>
                <span className="text-slate-400 text-[9px] ml-auto">Create Rule</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-600">POST</span>
                <span>/scans/run</span>
                <span className="text-slate-400 text-[9px] ml-auto">Run Compliance Scan</span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-api-url-btn"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
