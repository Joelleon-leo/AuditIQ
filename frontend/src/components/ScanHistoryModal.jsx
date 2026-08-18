import React, { useState, useEffect } from "react";
import { History, X, CheckCircle, AlertTriangle, Clock, FileText, ArrowRight, Loader2 } from "lucide-react";
import { complianceApi } from "../services/api";

export const ScanHistoryModal = ({
  isOpen,
  onClose,
  activePolicy,
  onSelectScan,
  activeScanId,
}) => {
  const [scans, setScans] = useState([]);
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'policy'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchScans = async () => {
      setLoading(true);
      setError(null);
      try {
        let data = [];
        if (filterMode === "policy" && activePolicy?.id) {
          data = await complianceApi.getPolicyScans(activePolicy.id);
        } else {
          data = await complianceApi.getRecentScans(50);
        }
        setScans(data || []);
      } catch (err) {
        console.error("Failed to load scan history:", err);
        setError("Failed to load scan audit history from database.");
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [isOpen, filterMode, activePolicy]);

  if (!isOpen) return null;

  const formatDate = (isoStr) => {
    if (!isoStr) return "N/A";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="scan-history-modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Compliance Scan Audit Trail</h3>
              <p className="text-xs text-slate-500">
                Persisted scans loaded directly from Neon PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterMode === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Scans ({filterMode === "all" ? scans.length : "..."})
            </button>
            {activePolicy && (
              <button
                onClick={() => setFilterMode("policy")}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterMode === "policy"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Current Policy Scans
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {scans.length} historical records
          </span>
        </div>

        {/* Scan List */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs">Querying Neon PostgreSQL audit records...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-500 text-xs">
              {error}
            </div>
          ) : scans.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">No Compliance Scans Found</p>
              <p className="text-xs text-slate-400 mt-1">
                Execute a compliance scan to create persistent audit records in PostgreSQL.
              </p>
            </div>
          ) : (
            scans.map((scan) => {
              const isSelected = activeScanId === (scan.scan_id || scan.id);
              const isCompliant =
                (scan.overall_status || scan.overall_verdict) === "COMPLIANT";

              return (
                <div
                  key={scan.scan_id || scan.id}
                  onClick={() => {
                    onSelectScan(scan.scan_id || scan.id);
                    onClose();
                  }}
                  className={`py-3.5 px-3 rounded-xl flex items-center justify-between gap-4 hover:bg-slate-50 transition-all cursor-pointer ${
                    isSelected ? "bg-indigo-50/70 border border-indigo-200" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                        isCompliant
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {isCompliant ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {scan.scan_id || scan.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            isCompliant
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {scan.overall_status || scan.overall_verdict}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold uppercase">
                            Active in View
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-xs font-medium text-slate-700">
                            {scan.policy_name || "All Ingested Policies"}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(scan.executed_at || scan.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[11px] hidden sm:block">
                      <span className="text-slate-400">Checks: </span>
                      <span className="font-bold text-emerald-600">
                        {scan.passed_count || 0} passed
                      </span>
                      {scan.failed_count > 0 && (
                        <span className="font-bold text-rose-600 ml-1.5">
                          / {scan.failed_count} failed
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Click any scan to inspect its complete persisted evaluation results.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
