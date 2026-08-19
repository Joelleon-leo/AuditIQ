import React, { useState } from "react";
import {
  FileText,
  ChevronDown,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  Layers,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export const Navbar = ({
  activeTab,
  setActiveTab,
  activePolicy,
  allPolicies = [],
  onSelectPolicy,
  onDeletePolicy,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);

  const confirmDelete = () => {
    if (!policyToDelete || !onDeletePolicy) return;
    onDeletePolicy(policyToDelete);
    setPolicyToDelete(null);
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0 shadow-xs"
    >
      {/* Dropdown Backdrop to close on mobile/desktop tap outside */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 transition-opacity"
          onClick={() => setDropdownOpen(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Navbar Top Row */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <img
              src="/auditiq-logo.svg"
              alt="AuditIQ Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs shrink-0"
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                AuditIQ
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                AI Compliance
              </span>
            </div>
          </div>

          {/* Right Section: Active Policy Selector & Desktop Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Policy Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                id="active-policy-selector-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl hover:bg-slate-50 border border-slate-200 text-left transition-colors cursor-pointer max-w-[170px] xs:max-w-[210px] sm:max-w-xs bg-white shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0 hidden xs:block" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 leading-none truncate w-full">
                    Active Policy
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[180px]">
                    {activePolicy ? activePolicy.filename : "Select Policy"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>

              {/* Policy Dropdown Menu */}
              {dropdownOpen && (
                <div
                  id="policy-dropdown-menu"
                  className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 text-xs animate-in fade-in zoom-in-95"
                >
                  <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>Ingested Policies ({allPolicies.length})</span>
                    <span className="text-indigo-600 font-mono text-[9px]">AuditIQ Ready</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                    {allPolicies.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400">
                        <Layers className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-xs">No policies ingested yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Upload a policy to get started</p>
                      </div>
                    ) : (
                      allPolicies.map((p) => {
                        const isSelected =
                          activePolicy?.policy_id === (p.policy_id || p.id) ||
                          activePolicy?.id === (p.policy_id || p.id);
                        return (
                          <div
                            key={p.policy_id || p.id}
                            className={`group relative flex items-center justify-between p-2 rounded-xl transition-all border ${
                              isSelected
                                ? "bg-indigo-50/90 border-indigo-200 text-indigo-950 shadow-2xs"
                                : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-700"
                            }`}
                          >
                            {/* Left Area: Click to select policy */}
                            <button
                              type="button"
                              id={`select-policy-${p.policy_id || p.id}`}
                              onClick={() => {
                                onSelectPolicy(p);
                                setDropdownOpen(false);
                              }}
                              className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer pr-2"
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs truncate leading-tight text-slate-900">
                                  {p.filename}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                                  <span className="text-slate-500">
                                    {p.controls?.length || p.extracted_controls_count || 0} Controls
                                  </span>
                                  <span>·</span>
                                  <span className="font-mono">
                                    {String(p.policy_id || p.id || "").slice(0, 8)}...
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* Right Area: Status Badge & Delete Button */}
                            <div className="flex items-center gap-1 shrink-0">
                              {isSelected && (
                                <span
                                  className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0"
                                  title="Active Selected Policy"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </span>
                              )}

                              {onDeletePolicy && (
                                <button
                                  type="button"
                                  id={`delete-policy-btn-${p.policy_id || p.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPolicyToDelete(p);
                                  }}
                                  title={`Delete ${p.filename}`}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                id="nav-tab-controls"
                onClick={() => setActiveTab("controls")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "controls"
                    ? "text-white bg-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Controls</span>
                {activePolicy?.controls?.length ? (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeTab === "controls"
                        ? "bg-indigo-700 text-indigo-100"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {activePolicy.controls.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                id="nav-tab-scanner"
                onClick={() => setActiveTab("scanner")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "scanner"
                    ? "text-white bg-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Compliance Scanner</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar (Visible on screens < md) */}
        <div className="md:hidden pb-2.5 pt-1">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              id="mobile-nav-tab-controls"
              onClick={() => setActiveTab("controls")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "controls"
                  ? "text-white bg-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Controls</span>
              {activePolicy?.controls?.length ? (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === "controls"
                      ? "bg-indigo-700 text-indigo-100"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {activePolicy.controls.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              id="mobile-nav-tab-scanner"
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "scanner"
                  ? "text-white bg-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">Compliance Scanner</span>
            </button>
          </div>
        </div>
      </div>
     

      {/* Policy Delete Confirmation Modal */}
      {policyToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              Delete Policy Document?
            </h4>
            <p className="text-xs font-semibold text-slate-700 mt-1 truncate">
              {policyToDelete.filename}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              This will permanently delete the uploaded PDF file, all {policyToDelete.controls?.length || policyToDelete.extracted_controls_count || 0} extracted compliance controls, and associated scan logs.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPolicyToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-policy-btn"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

