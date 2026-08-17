import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { PolicyUploader } from "./components/PolicyUploader";
import { ControlsTable } from "./components/ControlsTable";
import { EvidenceScanner } from "./components/EvidenceScanner";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { ResultsTable } from "./components/ResultsTable";
import { AuditDrawer } from "./components/AuditDrawer";
import { ApiSettingsModal } from "./components/ApiSettingsModal";
import { ToastContainer } from "./components/ToastContainer";
import { complianceApi, API_BASE_URL } from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState("controls");
  const [allPolicies, setAllPolicies] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const [selectedAuditItem, setSelectedAuditItem] = useState(null);
  const [apiSettingsOpen, setApiSettingsOpen] = useState(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState(API_BASE_URL);
  const [apiConnected, setApiConnected] = useState(true);
  const [apiLatency, setApiLatency] = useState(14);

  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const normalizeControl = (c) => ({
    ...c,
    asset_type: c.asset_type || c.target_asset_type || "all",
    target_metric: c.target_metric || c.metric_path || "compliance_status",
    threshold: c.threshold !== undefined ? c.threshold : (c.threshold_value !== undefined ? c.threshold_value : "true"),
  });

  const selectAndLoadPolicy = async (policy) => {
    if (!policy) {
      setActivePolicy(null);
      return;
    }
    const policyId = policy.id || policy.policy_id;
    try {
      const fullPolicy = await complianceApi.getPolicyById(policyId);
      const normalized = {
        ...fullPolicy,
        id: fullPolicy.id || fullPolicy.policy_id,
        policy_id: fullPolicy.id || fullPolicy.policy_id,
        controls: (fullPolicy.controls || []).map(normalizeControl),
      };
      setActivePolicy(normalized);
    } catch (error) {
      console.error("Failed to fetch policy details:", error);
      setActivePolicy({
        ...policy,
        id: policyId,
        policy_id: policyId,
        controls: (policy.controls || []).map(normalizeControl),
      });
    }
  };

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await complianceApi.checkHealth();
        setApiConnected(res.status === "ok");
        setApiLatency(res.latencyMs);
      } catch {
        setApiConnected(false);
        setApiLatency(null);
      }
    };

    const loadPolicies = async () => {
      try {
        const policies = await complianceApi.getPolicies();

        if (!Array.isArray(policies)) {
          throw new Error("Invalid policies response");
        }

        const normalizedList = policies.map((p) => ({
          ...p,
          id: p.id || p.policy_id,
          policy_id: p.id || p.policy_id,
        }));

        setAllPolicies(normalizedList);

        if (normalizedList.length > 0) {
          await selectAndLoadPolicy(normalizedList[0]);
        } else {
          setActivePolicy(null);
        }
      } catch (error) {
        console.error("Failed to load policies:", error);
        setAllPolicies([]);
        setActivePolicy(null);
      }
    };

    checkApi();
    loadPolicies();
  }, [apiBaseUrl]);

  const handlePolicyUploaded = (newPolicy) => {
    const normalized = {
      ...newPolicy,
      id: newPolicy.id || newPolicy.policy_id,
      policy_id: newPolicy.policy_id || newPolicy.id,
      controls: (newPolicy.controls || []).map(normalizeControl),
    };
    setAllPolicies((prev) => [normalized, ...prev]);
    setActivePolicy(normalized);
    setActiveTab("controls");
  };

  const handleAddControl = async (newControl) => {
    if (!activePolicy) return;
    const policyId = activePolicy.id || activePolicy.policy_id;
    try {
      const createdControl = await complianceApi.createControl(policyId, {
        control_id: newControl.control_id,
        title: newControl.title,
        description: newControl.description,
        target_asset_type: newControl.asset_type || "all",
        metric_path: newControl.target_metric || "compliance_status",
        operator: newControl.operator || "EQUALS",
        threshold_value: newControl.threshold || "true",
        severity: newControl.severity || "HIGH",
        category: newControl.category || "Custom Rule",
        remediation: newControl.remediation || "",
      });

      const formatted = {
        ...createdControl,
        asset_type: createdControl.target_asset_type || newControl.asset_type,
        target_metric: createdControl.metric_path || newControl.target_metric,
        threshold: createdControl.threshold_value || newControl.threshold,
      };

      const updated = {
        ...activePolicy,
        controls: [...(activePolicy.controls || []), formatted],
        controls_count: (activePolicy.controls?.length || 0) + 1,
      };
      setActivePolicy(updated);
      setAllPolicies((prev) =>
        prev.map((p) =>
          (p.id || p.policy_id) === policyId ? updated : p
        )
      );
      addToast("success", "Rule Saved", `Custom rule ${formatted.control_id} persisted to database.`);
    } catch (err) {
      console.error("Failed to persist new control:", err);
      addToast("error", "Save Failed", "Could not save custom control to database.");
    }
  };

  const handleUpdateControl = async (updatedControl) => {
    if (!activePolicy) return;
    const policyId = activePolicy.id || activePolicy.policy_id;
    const targetControlId = updatedControl.id || updatedControl.control_id;

    try {
      const savedControl = await complianceApi.updateControl(targetControlId, {
        title: updatedControl.title,
        description: updatedControl.description,
        target_asset_type: updatedControl.asset_type || updatedControl.target_asset_type,
        metric_path: updatedControl.target_metric || updatedControl.metric_path,
        operator: updatedControl.operator,
        threshold_value: updatedControl.threshold || updatedControl.threshold_value,
        severity: updatedControl.severity,
        category: updatedControl.category,
        remediation: updatedControl.remediation,
      });

      const formatted = {
        ...savedControl,
        asset_type: savedControl.target_asset_type || updatedControl.asset_type,
        target_metric: savedControl.metric_path || updatedControl.target_metric,
        threshold: savedControl.threshold_value || updatedControl.threshold,
      };

      const updated = {
        ...activePolicy,
        controls: (activePolicy.controls || []).map((c) =>
          c.control_id === updatedControl.control_id || c.id === targetControlId ? formatted : c
        ),
      };
      setActivePolicy(updated);
      setAllPolicies((prev) =>
        prev.map((p) =>
          (p.id || p.policy_id) === policyId ? updated : p
        )
      );
      addToast("success", "Rule Updated", `Rule ${formatted.control_id} changes persisted to database.`);
    } catch (err) {
      console.error("Failed to update control:", err);
      addToast("error", "Update Failed", "Could not update control in database.");
    }
  };

  const handleDeleteControl = async (controlId) => {
    if (!activePolicy) return;
    const policyId = activePolicy.id || activePolicy.policy_id;

    try {
      await complianceApi.deleteControl(controlId);

      const updated = {
        ...activePolicy,
        controls: (activePolicy.controls || []).filter(
          (c) => c.control_id !== controlId && c.id !== controlId
        ),
        controls_count: Math.max(0, (activePolicy.controls?.length || 1) - 1),
      };
      setActivePolicy(updated);
      setAllPolicies((prev) =>
        prev.map((p) =>
          (p.id || p.policy_id) === policyId ? updated : p
        )
      );
      addToast("success", "Rule Removed", `Rule ${controlId} deleted from database.`);
    } catch (err) {
      console.error("Failed to delete control:", err);
      addToast("error", "Delete Failed", "Could not delete control from database.");
    }
  };

  const evaluateControlAgainstAsset = (control, asset) => {
    const assetId = asset.id || asset.asset_id || "unknown-asset";
    const assetType = asset.type || asset.asset_type || "";

    const typeNormalized = assetType.toLowerCase().replace(/[-_]/g, "");
    const controlTypeNormalized = (control?.asset_type || "").toLowerCase().replace(/[-_]/g, "");

    const typeMatches =
      typeNormalized === controlTypeNormalized ||
      (controlTypeNormalized.includes("database") && (typeNormalized.includes("db") || typeNormalized.includes("rds"))) ||
      (controlTypeNormalized.includes("storage") && (typeNormalized.includes("s3") || typeNormalized.includes("bucket"))) ||
      (controlTypeNormalized.includes("gateway") && (typeNormalized.includes("apigw") || typeNormalized.includes("gateway"))) ||
      (controlTypeNormalized.includes("container") && (typeNormalized.includes("k8s") || typeNormalized.includes("pod") || typeNormalized.includes("node")));

    if (!typeMatches) {
      return null;
    }

    const metricKey = control.target_metric;
    let actualValue = undefined;

    if (asset.metrics && asset.metrics[metricKey] !== undefined) {
      actualValue = asset.metrics[metricKey];
    } else if (asset[metricKey] !== undefined) {
      actualValue = asset[metricKey];
    } else {
      const aliases = {
        encryption_at_rest: ["encrypted", "encryption", "is_encrypted"],
        backup_retention_days: ["backup_retention", "backup_days", "retention_days"],
        public_access_blocked: ["block_public", "public_blocked", "is_private"],
        tls_version: ["tls", "min_tls_version", "ssl_version"],
        critical_cve_count: ["cve_count", "vulnerabilities", "critical_cves"],
      };

      const possibleKeys = aliases[metricKey] || [];
      for (const k of possibleKeys) {
        if (asset.metrics && asset.metrics[k] !== undefined) {
          actualValue = asset.metrics[k];
          break;
        } else if (asset[k] !== undefined) {
          actualValue = asset[k];
          break;
        }
      }
    }

    if (actualValue === undefined) {
      return {
        result_id: `res-${Math.random().toString(36).slice(2, 9)}`,
        control_id: control.control_id,
        control_title: control.title,
        severity: control.severity,
        asset_id: assetId,
        asset_type: assetType,
        verdict: "NOT_EVALUABLE",
        actual_value: "Metric Missing in Payload",
        expected_condition: `${control.operator} ${control.threshold}`,
        reasoning: `The evidence payload did not include the required telemetry metric '${metricKey}' for resource ${assetId}.`,
        remediation: control.remediation,
        raw_evidence: asset,
      };
    }

    let isPassed = false;
    const operator = control.operator;
    const thresholdStr = String(control.threshold).toLowerCase();

    if (typeof actualValue === "boolean" || thresholdStr === "true" || thresholdStr === "false") {
      const boolActual = Boolean(actualValue);
      const boolExpected = thresholdStr === "true";
      isPassed = operator === "EQUALS" ? boolActual === boolExpected : boolActual !== boolExpected;
    } else if (typeof actualValue === "number" || !isNaN(Number(thresholdStr))) {
      const numActual = Number(actualValue);
      const numExpected = Number(thresholdStr);

      switch (operator) {
        case "EQUALS":
          isPassed = numActual === numExpected;
          break;
        case "NOT_EQUALS":
          isPassed = numActual !== numExpected;
          break;
        case "GREATER_THAN":
          isPassed = numActual > numExpected;
          break;
        case "GREATER_THAN_OR_EQUAL":
          isPassed = numActual >= numExpected;
          break;
        case "LESS_THAN":
          isPassed = numActual < numExpected;
          break;
        case "LESS_THAN_OR_EQUAL":
          isPassed = numActual <= numExpected;
          break;
        default:
          isPassed = numActual === numExpected;
      }
    } else {
      isPassed = String(actualValue).toLowerCase() === thresholdStr;
    }

    const verdict = isPassed ? "COMPLIANT" : "NON_COMPLIANT";
    const reasoning = isPassed
      ? `Asset ${assetId} passed verification: observed ${metricKey} = '${actualValue}', meeting policy requirement (${operator} ${control.threshold}).`
      : `VIOLATION on ${assetId}: observed ${metricKey} = '${actualValue}', violating mandatory rule threshold (${operator} ${control.threshold}). Immediate remediation required.`;

    return {
      result_id: `res-${Math.random().toString(36).slice(2, 9)}`,
      control_id: control.control_id,
      control_title: control.title,
      severity: control.severity,
      asset_id: assetId,
      asset_type: assetType,
      verdict,
      actual_value: actualValue,
      expected_condition: `${operator} ${control.threshold}`,
      reasoning,
      remediation: control.remediation,
      raw_evidence: asset,
    };
  };

  const handleExecuteScan = async (evidencePayload) => {
    if (!activePolicy || (!activePolicy.controls && !activePolicy.id)) {
      addToast("error", "No Controls Found", "The active policy contains no controls to evaluate.");
      return;
    }

    setIsScanning(true);

    try {
      const report = await complianceApi.runComplianceScan(
        activePolicy.id || activePolicy.policy_id,
        evidencePayload
      );

      setScanResult(report);
      setIsScanning(false);

      if (report.overall_verdict === "COMPLIANT") {
        addToast(
          "success",
          "Compliance Scan Passed",
          `All ${report.passed_count} checks passed policy evaluation. Audit record saved to database.`
        );
      } else {
        addToast(
          "error",
          "Compliance Violations Detected",
          `Found ${report.failed_count} non-compliant findings. Audit record saved to database.`
        );
      }
    } catch (error) {
      console.warn("Backend API scan call failed, running local evaluation:", error);
      let rawAssets = [];
      if (Array.isArray(evidencePayload)) {
        rawAssets = evidencePayload;
      } else if (evidencePayload && Array.isArray(evidencePayload.assets)) {
        rawAssets = evidencePayload.assets;
      } else if (evidencePayload && typeof evidencePayload === "object") {
        rawAssets = Object.values(evidencePayload).filter(
          (val) => val && typeof val === "object" && (val.id || val.asset_id || val.type)
        );
        if (rawAssets.length === 0) {
          rawAssets = [evidencePayload];
        }
      }

      const evaluationResults = [];
      for (const asset of rawAssets) {
        for (const ctrl of (activePolicy.controls || [])) {
          const evalRes = evaluateControlAgainstAsset(ctrl, asset);
          if (evalRes) {
            evaluationResults.push(evalRes);
          }
        }
      }

      const passed = evaluationResults.filter((r) => r.verdict === "COMPLIANT").length;
      const failed = evaluationResults.filter((r) => r.verdict === "NON_COMPLIANT").length;
      const notEval = evaluationResults.filter((r) => r.verdict === "NOT_EVALUABLE").length;

      const overallVerdict = failed === 0 && passed > 0 ? "COMPLIANT" : "NON_COMPLIANT";

      const scanData = {
        scan_id: `SCAN-${Date.now().toString(36).toUpperCase()}`,
        policy_id: activePolicy.id || activePolicy.policy_id,
        policy_name: activePolicy.filename,
        overall_verdict: overallVerdict,
        passed_count: passed,
        failed_count: failed,
        not_evaluable_count: notEval,
        total_checks: evaluationResults.length,
        executed_at: new Date().toISOString(),
        results: evaluationResults,
      };

      setScanResult(scanData);
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePolicy={activePolicy}
        allPolicies={allPolicies}
        onSelectPolicy={(p) => selectAndLoadPolicy(p)}
        apiConnected={apiConnected}
        apiLatency={apiLatency}
        onOpenApiSettings={() => setApiSettingsOpen(true)}
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* TAB 1: Policy Ingestion & Controls Management */}
        {activeTab === "controls" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PolicyUploader
              onUploadSuccess={handlePolicyUploaded}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              onSuccessToast={(title, msg) => addToast("success", title, msg)}
              onErrorToast={(title, msg) => addToast("error", title, msg)}
            />

            {activePolicy && (
              <ControlsTable
                controls={activePolicy.controls || []}
                policyName={activePolicy.filename}
                onAddControl={handleAddControl}
                onUpdateControl={handleUpdateControl}
                onDeleteControl={handleDeleteControl}
                onSuccessToast={(title, msg) => addToast("success", title, msg)}
                onErrorToast={(title, msg) => addToast("error", title, msg)}
              />
            )}
          </div>
        )}

        {/* TAB 2: Compliance Scanner & Audit Dashboard */}
        {activeTab === "scanner" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Split Row: Evidence Ingestion Left, Executive Summary Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Evidence Scanner JSON Editor */}
              <div className="lg:col-span-6">
                <EvidenceScanner
                  activePolicy={activePolicy}
                  onExecuteScan={handleExecuteScan}
                  isScanning={isScanning}
                  onErrorToast={(title, msg) => addToast("error", title, msg)}
                  onSuccessToast={(title, msg) => addToast("success", title, msg)}
                />
              </div>

              {/* Executive Summary Cards */}
              <div className="lg:col-span-6">
                {scanResult ? (
                  <ExecutiveSummary scanResult={scanResult} />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                    <h3 className="font-bold text-slate-700 text-sm">Awaiting Scan Execution</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Click <strong>"Run Compliance Scan"</strong> to evaluate the evidence payload against active rules.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Full Width Asset-Level Results Table */}
            {scanResult && (
              <ResultsTable
                scanResult={scanResult}
                onSelectResult={(item) => setSelectedAuditItem(item)}
                onSuccessToast={(title, msg) => addToast("success", title, msg)}
              />
            )}
          </div>
        )}
      </main>

      {/* Slide-over Audit Reasoning Drawer */}
      <AuditDrawer
        result={selectedAuditItem}
        onClose={() => setSelectedAuditItem(null)}
        onSuccessToast={(title, msg) => addToast("success", title, msg)}
      />

      {/* API Configuration Modal */}
      {apiSettingsOpen && (
        <ApiSettingsModal
          currentBaseUrl={apiBaseUrl}
          onUpdateBaseUrl={(newUrl) => setApiBaseUrlState(newUrl)}
          onClose={() => setApiSettingsOpen(false)}
          onSuccessToast={(title, msg) => addToast("success", title, msg)}
          onErrorToast={(title, msg) => addToast("error", title, msg)}
        />
      )}

      {/* Toast Alerts Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sleek Footer Status Bar */}
      <footer className="h-8 bg-slate-800 flex items-center justify-between px-4 sm:px-6 text-[10px] font-medium text-slate-400 uppercase tracking-widest shrink-0 mt-auto border-t border-slate-700/50">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-500 hidden sm:inline">ENDPOINT:</span>
          <span className="font-mono text-slate-300 truncate">/api/v1/compliance</span>
          <span className="text-slate-600">·</span>
          <span className={apiConnected ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {apiConnected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0 font-mono text-[10px]">
          <span>Server Latency: {apiLatency !== null ? `${apiLatency}ms` : "Active"}</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline text-slate-300">Scan Protocol: REST v1.4</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
