import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Activity,
} from "lucide-react";

export const LandingPage = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white relative overflow-x-hidden flex flex-col justify-between">
      {/* Soft Ambient Light Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[25%] w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] bg-indigo-200/40 rounded-full blur-[140px]" />
        <div className="absolute top-[-10%] right-[25%] w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] bg-blue-200/40 rounded-full blur-[140px]" />
      </div>

      {/* Subtle Light Grid Pattern Background */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* ========================================================================= */}
      {/* 1. CLEAN LIGHT NAVBAR (Without Get Started button)                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <img
              src="/auditiq-logo.svg"
              alt="AuditIQ Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900">
                AuditIQ
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                ENTERPRISE
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 2. CENTERED LIGHT HERO SECTION                                            */}
        {/* ========================================================================= */}
        <section id="hero" className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
              <span>POLICY-TO-EVIDENCE COMPLIANCE</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Turn complex policies into{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700">
                actionable compliance insights.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-slate-600 text-sm sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto">
              AuditIQ accepts governance policy PDFs, extracts machine-testable security controls using AI, 
              evaluates real telemetry evidence against them, and produces explainable, audit-ready compliance verdicts.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-sm sm:text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>

              <button
                type="button"
                onClick={() => scrollToSection("how-it-works")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 text-sm sm:text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Explore How It Works</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. 4-STEP WORKFLOW SECTION (Crisp Light Theme)                            */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="relative z-10 py-16 sm:py-24 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
              <span className="text-xs font-mono font-bold tracking-widest text-indigo-700 uppercase bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                4-STEP WORKFLOW
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                How AuditIQ Evaluates Compliance
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                A transparent, connected pipeline designed for automated policy auditing.
              </p>
            </div>

            {/* Connected Flow Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
              
              {/* Step 1 */}
              <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">STEP 01</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Upload Policy</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Provide your security or infrastructure policy PDF document directly through the ingestion interface.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">STEP 02</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Extract Controls</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    LangChain & LLMs parse unstructured sentences into testable technical rules with metrics and threshold benchmarks.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">STEP 03</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Evaluate Evidence</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload runtime telemetry JSON. The hybrid engine matches metrics semantically and mathematically evaluates conditions.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">STEP 04</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Understand Results</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Inspect pass/fail results, detailed audit reasoning, confidence scores, and engineer remediation guidance.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 4. LIGHT MINIMAL FOOTER                                                   */}
      {/* ========================================================================= */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-8 sm:py-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <img
              src="/auditiq-logo.svg"
              alt="AuditIQ Logo"
              className="w-7 h-7 rounded-lg shadow-2xs"
            />
            <div>
              <span className="font-bold text-slate-900 text-sm">AuditIQ</span>
              <p className="text-xs text-slate-500">Policy-to-Evidence Compliance Evaluation</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link to="/app" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
              Launch App →
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
