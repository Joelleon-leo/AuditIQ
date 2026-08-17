import React, { useState } from "react";
import {
  Clock,
  Hash,
  Copy,
  Check
} from "lucide-react";

export const ExecutiveSummary = ({ scanResult }) => {
  const [copied, setCopied] = useState(false);

  if (!scanResult) return null;

  const isCompliant = scanResult.overall_verdict === "COMPLIANT";
  const passRate =
    scanResult.total_checks > 0
      ? Math.round((scanResult.passed_count / scanResult.total_checks) * 100)
      : 0;

  const handleCopyScanId = () => {
    navigator.clipboard.writeText(scanResult.scan_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="executive-summary-banner" className="space-y-4 animate-in fade-in duration-200">
      {/* Sleek Executive Verdict Banner */}
      <div
        className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-xl p-6 shadow-xs border ${
          isCompliant
            ? "bg-emerald-50 border-emerald-200"
            : "bg-rose-50 border-rose-200"
        }`}
      >
        <div className="flex items-start sm:items-center gap-4 flex-1">
          {/* Big Circular Icon */}
          <div
            className={`w-14 sm:w-16 h-14 sm:h-16 rounded-full flex items-center justify-center text-white shrink-0 shadow-md ${
              isCompliant
                ? "bg-emerald-600 shadow-emerald-200"
                : "bg-rose-500 shadow-rose-200"
            }`}
          >
            {isCompliant ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <div>
            <h3
              id="overall-verdict-heading"
              className={`text-2xl font-black leading-tight uppercase tracking-tight ${
                isCompliant ? "text-emerald-900" : "text-rose-900"
              }`}
            >
              {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
            </h3>
            <p
              className={`text-sm mt-0.5 max-w-xl ${
                isCompliant ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {isCompliant
                ? `Evaluation complete. All ${scanResult.passed_count} controls evaluated meet policy requirements in ${scanResult.policy_name}.`
                : `Evaluation complete. ${scanResult.failed_count} critical violations detected across ${scanResult.total_checks} control checkpoints.`}
            </p>

            <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-slate-700">{scanResult.scan_id}</span>
                <button
                  onClick={handleCopyScanId}
                  className="hover:text-slate-900 p-0.5 cursor-pointer"
                  title="Copy Scan ID"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{new Date(scanResult.executed_at).toLocaleTimeString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3 Stats Columns */}
        <div className="grid grid-cols-3 gap-6 sm:gap-8 md:pr-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-200/60">
          <div className="text-center">
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isCompliant ? "text-emerald-600" : "text-rose-400"
              }`}
            >
              Passed
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {String(scanResult.passed_count).padStart(2, "0")}
            </p>
          </div>

          <div className="text-center">
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isCompliant ? "text-emerald-600" : "text-rose-400"
              }`}
            >
              Failed
            </p>
            <p
              className={`text-2xl font-bold ${
                isCompliant ? "text-slate-800" : "text-rose-600"
              }`}
            >
              {String(scanResult.failed_count).padStart(2, "0")}
            </p>
          </div>

          <div className="text-center">
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isCompliant ? "text-emerald-600" : "text-rose-400"
              }`}
            >
              Score
            </p>
            <p className="text-2xl font-bold text-slate-800">{passRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
