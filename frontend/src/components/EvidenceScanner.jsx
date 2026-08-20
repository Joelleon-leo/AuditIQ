import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  AlertCircle,
  Sparkles,
  FileCode,
  Loader2,
  Copy,
  Check
} from "lucide-react";

const PRESET_SAMPLE_EVIDENCE = {
  compliant: {
    metadata: {
      scan_id: "SCAN-882-B",
      env: "production-east-1",
    },
    assets: [
      {
        id: "db-prod-cluster-01",
        type: "database_server",
        cpu_utilization: 62.4,
        encryption_at_rest: true,
        backup_retention_days: 35,
        mfa_enforced: true,
      },
      {
        id: "s3-customer-archive-vault",
        type: "storage_bucket",
        encryption_at_rest: true,
        public_access_blocked: true,
        versioning_enabled: true,
      },
      {
        id: "apigw-edge-ingress-v2",
        type: "api_gateway",
        auto_scaling_enabled: true,
        tls_version: 1.3,
        waf_active: true,
      },
      {
        id: "k8s-worker-node-alpha",
        type: "container_node",
        critical_cve_count: 0,
        os_version: "Bottlerocket-1.18",
        kernel_hardened: true,
      },
    ],
  },
  violations: {
    metadata: {
      scan_id: "SCAN-882-B",
      env: "production-east-1",
    },
    assets: [
      {
        id: "db-prod-master",
        type: "rds_instance",
        encrypted: false,
        backup_retention: 3,
        cpu_utilization: 94.8,
        encryption_at_rest: false,
        backup_retention_days: 14,
      },
      {
        id: "bucket-customer-data",
        type: "s3_bucket",
        public_access: true,
        encryption_at_rest: false,
        public_access_blocked: false,
      },
      {
        id: "app-service-v1",
        type: "kubernetes_pod",
        critical_cve_count: 3,
        auto_scaling_enabled: false,
        tls_version: 1.0,
      },
    ],
  },
};

export const EvidenceScanner = ({
  activePolicy,
  onExecuteScan,
  onOpenHistory,
  isScanning,
  onErrorToast,
  onSuccessToast,
}) => {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(PRESET_SAMPLE_EVIDENCE.violations, null, 2)
  );
  const [jsonStatus, setJsonStatus] = useState({
    valid: true,
    lineCount: 0,
    assetCount: 3,
  });

  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  // Validate JSON on every change
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const lines = jsonText.split("\n").length;
      let assetsCount = 0;

      if (Array.isArray(parsed)) {
        assetsCount = parsed.length;
      } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.assets)) {
        assetsCount = parsed.assets.length;
      } else if (parsed && typeof parsed === "object") {
        assetsCount = Object.keys(parsed).length;
      }

      setJsonStatus({
        valid: true,
        lineCount: lines,
        assetCount: assetsCount,
      });
    } catch (err) {
      setJsonStatus({
        valid: false,
        lineCount: jsonText.split("\n").length,
        assetCount: 0,
        errorMsg: err.message,
      });
    }
  }, [jsonText]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        const parsed = JSON.parse(content);
        setJsonText(JSON.stringify(parsed, null, 2));
        onSuccessToast("Evidence Loaded", `Loaded ${file.name} successfully into editor.`);
      } catch (err) {
        onErrorToast("Invalid Evidence JSON", "Selected file does not contain valid JSON syntax.");
      }
    };
    reader.readAsText(file);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      onSuccessToast("JSON Formatted", "Evidence payload formatted cleanly.");
    } catch (err) {
      onErrorToast("Formatting Failed", "Fix syntax errors before formatting.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onSuccessToast("Copied", "Evidence payload copied to clipboard.");
  };

  const handleExecuteScan = () => {
    if (!jsonStatus.valid) {
      onErrorToast("Syntax Error", "Cannot execute scan with invalid JSON evidence.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      onExecuteScan(parsed);
    } catch (err) {
      onErrorToast("Scan Error", "Failed to parse evidence before scanning.");
    }
  };

  return (
    <div id="evidence-scanner-panel" className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-700 text-xs sm:text-sm">Evidence Ingestion</h2>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono uppercase font-medium">
            JSON
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="preset-violations-btn"
              onClick={() => setJsonText(JSON.stringify(PRESET_SAMPLE_EVIDENCE.violations, null, 2))}
              className="text-[10px] sm:text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-rose-700 rounded font-medium transition-colors cursor-pointer"
            >
              Violations
            </button>
            <button
              type="button"
              id="preset-compliant-btn"
              onClick={() => setJsonText(JSON.stringify(PRESET_SAMPLE_EVIDENCE.compliant, null, 2))}
              className="text-[10px] sm:text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-emerald-700 rounded font-medium transition-colors cursor-pointer"
            >
              Compliant
            </button>
          </div>

          <button
            type="button"
            onClick={handleFormat}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors text-xs cursor-pointer"
            title="Format JSON"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            title="Copy Evidence JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Box */}
      <div className="relative bg-slate-900 p-4 font-mono text-xs text-indigo-300 overflow-hidden leading-relaxed">
        <textarea
          id="evidence-json-textarea"
          rows={10}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
          className="w-full bg-transparent text-indigo-300 font-mono text-xs leading-relaxed focus:outline-hidden resize-y selection:bg-indigo-700 selection:text-white"
          placeholder="Paste JSON evidence telemetry payload..."
        />
        {!jsonStatus.valid && jsonStatus.errorMsg && (
          <div className="mt-2 p-2.5 bg-rose-950/80 border border-rose-800 rounded text-rose-200 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Syntax Error: {jsonStatus.errorMsg}</span>
          </div>
        )}
      </div>

      {/* Footer / Actions Bar */}
      <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="upload-evidence-json-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Evidence (.json)</span>
          </button>

          {onOpenHistory && (
            <button
              type="button"
              id="open-scan-history-btn"
              onClick={onOpenHistory}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              title="View Scan History in Neon PostgreSQL"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Past Scans</span>
            </button>
          )}
        </div>

        <button
          id="run-compliance-scan-btn"
          type="button"
          disabled={!jsonStatus.valid || isScanning}
          onClick={handleExecuteScan}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Semantic Search & LLM Evaluation...</span>
            </>
          ) : (
            <span>Run Compliance Scan</span>
          )}
        </button>
      </div>
    </div>
  );
};
