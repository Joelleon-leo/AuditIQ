import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { PolicyUploader } from "./components/PolicyUploader";
import { ControlsTable } from "./components/ControlsTable";
import { EvidenceScanner } from "./components/EvidenceScanner";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { ResultsTable } from "./components/ResultsTable";
import { AuditDrawer } from "./components/AuditDrawer";
import { ScanHistoryModal } from "./components/ScanHistoryModal";
import { ToastContainer } from "./components/ToastContainer";
import { complianceApi } from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState("controls");
  const [allPolicies, setAllPolicies] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const [selectedAuditItem, setSelectedAuditItem] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

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

  const getScanIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("scan")) return params.get("scan");
    if (params.get("scan_id")) return params.get("scan_id");
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 3 && pathParts[0] === "compliance" && pathParts[1] === "results" && pathParts[2]) {
      return pathParts[2];
    }
    if (pathParts.length >= 2 && pathParts[0] === "scans" && pathParts[1]) {
      return pathParts[1];
    }
    return null;
  };

  const selectAndLoadPolicy = async (policy) => {
    if (!policy) {
      setActivePolicy(null);
      setScanResult(null);
      return;
    }
    const policyId = policy.id || policy.policy_id;

    // Reset scan result if switching away from the document that was scanned
    setScanResult((prevScan) => {
      if (prevScan && prevScan.policy_id && prevScan.policy_id !== policyId) {
        const url = new URL(window.location);
        url.searchParams.delete("scan");
        url.searchParams.delete("scan_id");
        window.history.replaceState({}, "", url.toString());
        return null;
      }
      return prevScan;
    });

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

  const loadPersistedScan = useCallback(async (scanId, updateHistory = true, availablePolicies = allPolicies) => {
    if (!scanId) return;
    setIsLoadingScan(true);

    try {
      const report = await complianceApi.getScanDetails(scanId);
      setScanResult(report);
      setActiveTab("scanner");

      if (updateHistory) {
        const url = new URL(window.location);
        url.searchParams.set("scan", scanId);
        window.history.pushState({ scanId }, "", url.toString());
      }

      // Connect associated policy from scan metadata if available
      if (report.policy_id) {
        const matchedPolicy = availablePolicies.find(
          (p) => (p.id || p.policy_id) === report.policy_id
        );
        if (matchedPolicy) {
          setActivePolicy(matchedPolicy);
        } else {
          try {
            const fetched = await complianceApi.getPolicyById(report.policy_id);
            const normalized = {
              ...fetched,
              id: fetched.id || fetched.policy_id,
              policy_id: fetched.id || fetched.policy_id,
              controls: (fetched.controls || []).map(normalizeControl),
            };
            setActivePolicy(normalized);
          } catch {
            // Leave policy name as rendered from scan result
          }
        }
      }
    } catch (err) {
      console.error("Failed to load persisted scan:", err);
      addToast(
        "error",
        "Scan Load Error",
        `Could not retrieve persisted scan '${scanId}' from database.`
      );
    } finally {
      setIsLoadingScan(false);
    }
  }, [allPolicies]);

  useEffect(() => {
    const loadPoliciesAndScan = async () => {
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

        const urlScanId = getScanIdFromUrl();
        if (urlScanId) {
          // If URL has a persisted scan_id (e.g. from page refresh or bookmark), load from DB
          await loadPersistedScan(urlScanId, false, normalizedList);
        } else if (normalizedList.length > 0) {
          await selectAndLoadPolicy(normalizedList[0]);
        } else {
          setActivePolicy(null);
        }
      } catch (error) {
        console.error("Failed to load policies:", error);
        setAllPolicies([]);
        setActivePolicy(null);

        const urlScanId = getScanIdFromUrl();
        if (urlScanId) {
          await loadPersistedScan(urlScanId, false, []);
        }
      }
    };

    loadPoliciesAndScan();
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlScanId = getScanIdFromUrl();
      if (urlScanId) {
        loadPersistedScan(urlScanId, false, allPolicies);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadPersistedScan, allPolicies]);

  const handlePolicyUploaded = (newPolicy) => {
    const normalized = {
      ...newPolicy,
      id: newPolicy.id || newPolicy.policy_id,
      policy_id: newPolicy.policy_id || newPolicy.id,
      controls: (newPolicy.controls || []).map(normalizeControl),
    };
    setAllPolicies((prev) => [normalized, ...prev]);
    setActivePolicy(normalized);
    setScanResult(null);
    const url = new URL(window.location);
    url.searchParams.delete("scan");
    url.searchParams.delete("scan_id");
    window.history.replaceState({}, "", url.toString());
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

  const handleDeletePolicy = async (policyToDelete) => {
    if (!policyToDelete) return;
    const policyId = policyToDelete.id || policyToDelete.policy_id;
    const filename = policyToDelete.filename || "Policy";

    try {
      await complianceApi.deletePolicy(policyId);

      const updatedPolicies = allPolicies.filter(
        (p) => (p.id || p.policy_id) !== policyId
      );
      setAllPolicies(updatedPolicies);

      // If deleted policy was active, switch to first remaining or null
      const currentActiveId = activePolicy ? (activePolicy.id || activePolicy.policy_id) : null;
      if (currentActiveId === policyId) {
        if (updatedPolicies.length > 0) {
          await selectAndLoadPolicy(updatedPolicies[0]);
        } else {
          setActivePolicy(null);
        }
      }

      addToast(
        "success",
        "Policy Deleted",
        `Policy "${filename}", all associated controls, and the stored document file were deleted.`
      );
    } catch (err) {
      console.error("Failed to delete policy:", err);
      addToast(
        "error",
        "Deletion Failed",
        err.message || `Failed to delete policy "${filename}".`
      );
    }
  };

  const handleExecuteScan = async (evidencePayload) => {
    setIsScanning(true);

    try {
      const policyId = activePolicy ? (activePolicy.id || activePolicy.policy_id) : null;
      const report = await complianceApi.runComplianceScan(
        policyId,
        evidencePayload
      );

      setScanResult(report);
      setIsScanning(false);

      // Persist scan ID in URL query parameter so page refresh preserves results
      const scanId = report.scan_id || report.id;
      if (scanId) {
        const url = new URL(window.location);
        url.searchParams.set("scan", scanId);
        window.history.pushState({ scanId }, "", url.toString());
      }

      if (report.overall_verdict === "COMPLIANT" || report.overall_status === "COMPLIANT") {
        addToast(
          "success",
          "Compliance Scan Passed",
          `All ${report.passed_count} checks passed policy evaluation. Audit record saved to Neon PostgreSQL (ID: ${scanId}).`
        );
      } else {
        addToast(
          "error",
          "Compliance Violations Detected",
          `Found ${report.failed_count} non-compliant findings. Audit record saved to Neon PostgreSQL (ID: ${scanId}).`
        );
      }
    } catch (error) {
      console.error("Compliance scan failed:", error);
      setIsScanning(false);
      addToast(
        "error",
        "Scan Execution Error",
        error.message || "Failed to execute semantic compliance scan."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePolicy={activePolicy}
        allPolicies={allPolicies}
        onSelectPolicy={(p) => selectAndLoadPolicy(p)}
        onDeletePolicy={handleDeletePolicy}
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* TAB 1: Policy Ingestion & Controls Management */}
        {activeTab === "controls" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PolicyUploader
              allPolicies={allPolicies}
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
                activePolicy={activePolicy}
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
                  onOpenHistory={() => setHistoryModalOpen(true)}
                  isScanning={isScanning}
                  onErrorToast={(title, msg) => addToast("error", title, msg)}
                  onSuccessToast={(title, msg) => addToast("success", title, msg)}
                />
              </div>

              {/* Executive Summary Cards */}
              <div className="lg:col-span-6">
                {isLoadingScan ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <h3 className="font-bold text-slate-700 text-sm">Loading Persisted Audit Record</h3>
                    <p className="text-xs text-slate-500 mt-1">Retrieving scan data from Neon PostgreSQL...</p>
                  </div>
                ) : scanResult ? (
                  <ExecutiveSummary scanResult={scanResult} />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                    <h3 className="font-bold text-slate-700 text-sm">Awaiting Scan Execution</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Click <strong>"Run Compliance Scan"</strong> to evaluate the evidence payload against active rules, or view <strong>Past Scans</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Full Width Asset-Level Results Table */}
            {scanResult && !isLoadingScan && (
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



      {/* Scan History Modal */}
      <ScanHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        activePolicy={activePolicy}
        onSelectScan={(scanId) => loadPersistedScan(scanId, true, allPolicies)}
        activeScanId={scanResult?.scan_id || scanResult?.id}
      />

      {/* Toast Alerts Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
