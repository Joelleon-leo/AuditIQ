import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Server,
  Code,
  Sparkles,
  Copy,
  Check
} from "lucide-react";

export const AuditDrawer = ({
  result,
  onClose,
  onSuccessToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const isCompliant = result.verdict === "COMPLIANT";
  const isNonCompliant = result.verdict === "NON_COMPLIANT";

  const handleCopyReasoning = () => {
    const textToCopy = `Audit Check: ${result.control_title} (${result.control_id})
Asset: ${result.asset_id} [${result.asset_type}]
Verdict: ${result.verdict}
Observed Value: ${JSON.stringify(result.actual_value)}
Expected: ${result.expected_condition}
Reasoning: ${result.reasoning}
Remediation: ${result.remediation || "N/A"}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onSuccessToast("Reasoning Copied", "Automated audit justification copied to clipboard.");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        id="audit-drawer-panel"
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 border-l border-slate-200"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCompliant
                  ? "bg-emerald-100 text-emerald-700"
                  : isNonCompliant
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isCompliant ? (
                <ShieldCheck className="w-6 h-6" />
              ) : isNonCompliant ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {result.control_id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isCompliant
                      ? "bg-emerald-100 text-emerald-800"
                      : isNonCompliant
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {result.verdict}
                </span>
                {result.similarity_score !== undefined && result.similarity_score !== null && (
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    Similarity: {Math.round(result.similarity_score * 100)}%
                  </span>
                )}
                {result.confidence !== undefined && result.confidence !== null && (
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                    AI Confidence: {Math.round(result.confidence * 100)}%
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-0.5 line-clamp-1">
                {result.control_title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            id="close-audit-drawer-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* Target Asset Information Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              Evaluated Infrastructure Asset
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Asset Identifier</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{result.asset_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Resource Type</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{result.asset_type}</span>
              </div>
            </div>
          </div>

          {/* Condition Comparison Metrics */}
          <div>
            <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Rule Condition Verification
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px] mb-1 font-medium">Observed Value</span>
                <div className="font-mono text-sm font-bold text-slate-900 bg-slate-50 p-2 rounded border border-slate-200 truncate">
                  {JSON.stringify(result.actual_value)}
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px] mb-1 font-medium">Expected Rule Condition</span>
                <div className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50/70 p-2 rounded border border-indigo-100 truncate">
                  {result.expected_condition}
                </div>
              </div>
            </div>
          </div>

          {/* Natural Language Automated Reasoning */}
          <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/80">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] uppercase font-bold text-indigo-900 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Audit Engine Justification
              </h4>
              <button
                type="button"
                id="copy-reasoning-btn"
                onClick={handleCopyReasoning}
                className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">{result.reasoning}</p>
          </div>

          {/* Remediation Guide */}
          {result.remediation && (
            <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/60">
              <h4 className="text-[11px] uppercase font-bold text-amber-900 tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Recommended Remediation Steps
              </h4>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {result.remediation}
              </p>
            </div>
          )}

          {/* Raw Evidence Snapshot */}
          {result.raw_evidence && (
            <div>
              <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-slate-500" />
                Raw Ingested Evidence Snapshot
              </h4>
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 border border-slate-800">
                <pre>{JSON.stringify(result.raw_evidence, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Check ID: {result.result_id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
