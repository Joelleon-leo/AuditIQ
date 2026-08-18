import React, { useState } from "react";
import {
  FileText,
  ChevronDown,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  Settings,
  Activity,
  Layers,
} from "lucide-react";

export const Navbar = ({
  activeTab,
  setActiveTab,
  activePolicy,
  allPolicies = [],
  onSelectPolicy,
  apiConnected,
  apiLatency,
  onOpenApiSettings,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-linear-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-xs">
              <span className="text-white font-bold text-xs tracking-wider">A.IQ</span>
            </div>
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
                  <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
                    {allPolicies.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400">
                        <Layers className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-xs">No policies ingested yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Upload a policy to get started</p>
                      </div>
                    ) : (
                      allPolicies.map((p) => {
                        const isSelected = activePolicy?.policy_id === (p.policy_id || p.id);
                        return (
                          <button
                            key={p.policy_id || p.id}
                            id={`select-policy-${p.policy_id || p.id}`}
                            onClick={() => {
                              onSelectPolicy(p);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer ${
                              isSelected ? "bg-indigo-50/70 text-indigo-900" : "text-slate-700"
                            }`}
                          >
                            <FileText
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                isSelected ? "text-indigo-600" : "text-slate-400"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate text-slate-800">{p.filename}</p>
                              <p className="text-[11px] text-slate-400">
                                {p.controls?.length || p.extracted_controls_count || 0} Controls ·{" "}
                                {String(p.policy_id || p.id || "").slice(0, 14)}...
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                          </button>
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

            {/* API Settings / Status Trigger */}
            {onOpenApiSettings && (
              <button
                type="button"
                id="open-api-settings-btn"
                onClick={onOpenApiSettings}
                className="p-2 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer bg-white shadow-2xs"
                title="API & Backend Settings"
              >
                <div className="relative">
                  <Settings className="w-4 h-4" />
                  <span
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                      apiConnected ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                </div>
              </button>
            )}
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
    </header>
  );
};

