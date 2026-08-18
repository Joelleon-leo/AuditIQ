import React, { useState, useMemo } from "react";
import { Search, Download } from "lucide-react";

export const ResultsTable = ({
  scanResult,
  onSelectResult,
  onSuccessToast,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAssetType, setSelectedAssetType] = useState("ALL");

  if (!scanResult || !scanResult.results) return null;

  const results = scanResult.results;

  const assetTypes = useMemo(() => {
    const types = new Set(results.map((r) => r.asset_type));
    return Array.from(types);
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "FAILED" && item.verdict === "NON_COMPLIANT") ||
        (statusFilter === "PASSED" && item.verdict === "COMPLIANT") ||
        item.verdict === statusFilter;

      const matchesAssetType =
        selectedAssetType === "ALL" || item.asset_type === selectedAssetType;

      const matchesSearch =
        item.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.control_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.control_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reasoning.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesAssetType && matchesSearch;
    });
  }, [results, statusFilter, selectedAssetType, searchTerm]);

  const renderVerdictBadge = (verdict) => {
    switch (verdict) {
      case "COMPLIANT":
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
            PASSED
          </span>
        );
      case "NON_COMPLIANT":
        return (
          <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded uppercase">
            FAILED
          </span>
        );
      case "INSUFFICIENT_EVIDENCE":
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase">
            INSUFFICIENT
          </span>
        );
      case "NOT_EVALUABLE":
      default:
        return (
          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase">
            UNVERIFIED
          </span>
        );
    }
  };

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(scanResult, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `compliance-audit-${scanResult.scan_id}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onSuccessToast("Audit Report Exported", "Downloaded JSON report.");
  };

  return (
    <div id="results-table-panel" className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      {/* Header with Title and Filter Buttons */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
          Detailed Audit Results
        </h3>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <input
              id="results-search-input"
              type="text"
              placeholder="Filter rules, assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="filter-status-all"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              id="filter-status-non-compliant"
              onClick={() => setStatusFilter("FAILED")}
              className={`px-3 py-1 text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer ${
                statusFilter === "FAILED"
                  ? "bg-rose-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Failed Only
            </button>
            <button
              type="button"
              id="filter-status-compliant"
              onClick={() => setStatusFilter("PASSED")}
              className={`px-3 py-1 text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer ${
                statusFilter === "PASSED"
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Passed
            </button>
          </div>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            title="Export JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table id="audit-results-table" className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100 bg-white">
              <th className="px-6 py-3">STATUS</th>
              <th className="px-6 py-3">CONTROL / RULE</th>
              <th className="px-6 py-3">TARGET ASSET</th>
              <th className="px-6 py-3">OBSERVED / EXPECTED</th>
              <th className="px-6 py-3">EVALUATION & REASON</th>
              <th className="px-6 py-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <p className="font-semibold text-slate-700">No matching audit checks</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Try clearing the filter or search query.
                  </p>
                </td>
              </tr>
            ) : (
              filteredResults.map((item) => {
                const isFail = item.verdict === "NON_COMPLIANT";

                return (
                  <tr
                    key={item.result_id}
                    id={`result-row-${item.result_id}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isFail ? "bg-rose-50/20" : ""
                    }`}
                  >
                    {/* Status Badge */}
                    <td className="px-6 py-3.5 align-top">
                      {renderVerdictBadge(item.verdict)}
                    </td>

                    {/* Evaluated Control */}
                    <td className="px-6 py-3.5 align-top">
                      <div className="font-bold text-slate-800">{item.control_title}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>{item.control_id}</span>
                        {item.similarity_score !== undefined && item.similarity_score !== null && (
                          <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                            {Math.round(item.similarity_score * 100)}% match
                          </span>
                        )}
                        {item.confidence !== undefined && item.confidence !== null && (
                          <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                            {Math.round(item.confidence * 100)}% conf
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Asset ID & Type */}
                    <td className="px-6 py-3.5 align-top">
                      <div className="font-semibold text-slate-800 font-mono">{item.asset_id}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.asset_type}
                      </div>
                    </td>

                    {/* Actual vs Expected */}
                    <td className="px-6 py-3.5 align-top font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px] uppercase">Got:</span>
                        <span
                          className={`font-bold ${
                            isFail
                              ? "text-rose-600 font-semibold"
                              : "text-emerald-700 font-semibold"
                          }`}
                        >
                          {String(item.actual_value)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Req: {item.expected_condition}
                      </div>
                    </td>

                    {/* Reasoning */}
                    <td className="px-6 py-3.5 align-top max-w-sm">
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">
                        {item.reasoning}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-3.5 align-top text-right whitespace-nowrap">
                      <button
                        id={`view-audit-reasoning-${item.result_id}`}
                        type="button"
                        onClick={() => onSelectResult(item)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        View Reason
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] font-medium text-slate-400 flex items-center justify-between">
        <span>
          Showing {filteredResults.length} of {results.length} checks
        </span>
        <span className="text-slate-500">
          Click "View Reason" for full policy definition & remediation
        </span>
      </div>
    </div>
  );
};
