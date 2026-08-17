import React, { useState } from "react";
import { FileText, Server, ChevronDown, CheckCircle } from "lucide-react";

export const Navbar = ({
  activeTab,
  setActiveTab,
  activePolicy,
  allPolicies,
  onSelectPolicy,
  apiConnected,
  apiLatency,
  onOpenApiSettings,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white border-b border-slate-200 shrink-0 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs">
              <span className="text-white font-bold text-xs tracking-wider">A.IQ</span>
            </div>
            <h1 className="font-bold text-lg tracking-tight text-slate-800 flex items-center">
              AuditIQ
            </h1>
          </div>

          {/* Right Section: Active Policy & Tabs */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Active Policy Selector Dropdown */}
            <div className="relative">
              <button
                id="active-policy-selector-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 text-left transition-colors cursor-pointer max-w-xs"
              >
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                    Active Policy
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-indigo-600 truncate max-w-[140px] sm:max-w-[200px]">
                    {activePolicy ? activePolicy.filename : "Select Policy"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {dropdownOpen && (
                <div
                  id="policy-dropdown-menu"
                  className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 text-xs animate-in fade-in zoom-in-95"
                >
                  <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>Ingested Policies ({allPolicies.length})</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {allPolicies.map((p) => {
                      const isSelected = activePolicy?.policy_id === p.policy_id;
                      return (
                        <button
                          key={p.policy_id}
                          id={`select-policy-${p.policy_id}`}
                          onClick={() => {
                            onSelectPolicy(p);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer ${isSelected ? "bg-indigo-50/70 text-indigo-900" : "text-slate-700"
                            }`}
                        >
                          <FileText
                            className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? "text-indigo-600" : "text-slate-400"
                              }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-slate-800">{p.filename}</p>
                            <p className="text-[11px] text-slate-400">
                              {p.controls?.length || 0} Controls · {p.policy_id.slice(0, 14)}...
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />

            {/* Segmented Navigation Tab Buttons */}
            <div className="flex space-x-1.5">
              <button
                id="nav-tab-controls"
                onClick={() => setActiveTab("controls")}
                className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer ${activeTab === "controls"
                    ? "text-white bg-indigo-600 shadow-xs font-semibold"
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                  }`}
              >
                Controls
              </button>

              <button
                id="nav-tab-scanner"
                onClick={() => setActiveTab("scanner")}
                className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer ${activeTab === "scanner"
                    ? "text-white bg-indigo-600 shadow-xs font-semibold"
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                  }`}
              >
                Compliance Scanner
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
