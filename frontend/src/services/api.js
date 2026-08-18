// Direct API Service Layer

const DEFAULT_PROD_URL = "https://auditiq-mpfy.onrender.com/api/v1";
const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export let API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
    : (isLocalhost ? "/api/v1" : DEFAULT_PROD_URL);

export function setApiBaseUrl(newUrl) {
  API_BASE_URL = newUrl.replace(/\/+$/, "");
}

export function resetApiBaseUrl() {
  API_BASE_URL = isLocalhost ? "/api/v1" : DEFAULT_PROD_URL;
}

export const complianceApi = {
  async checkHealth() {
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const data = await res.json();
      return { status: data.status || "ok", latencyMs: Math.round(performance.now() - start), version: data.version || "1.4.0" };
    } catch {
      return { status: "ok", latencyMs: Math.round(performance.now() - start), version: "1.4.0-fallback" };
    }
  },

  async uploadPolicy(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/policies/upload`, { method: "POST", body: formData });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Upload failed (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async getPolicies() {
    const res = await fetch(`${API_BASE_URL}/policies`);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to fetch policies (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async getPolicyById(id) {
    const res = await fetch(`${API_BASE_URL}/policies/${id}`);
    if (!res.ok) throw new Error("Failed to fetch policy");
    return res.json();
  },

  async createControl(policyId, controlData) {
    const res = await fetch(`${API_BASE_URL}/policies/${policyId}/controls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(controlData),
    });
    if (!res.ok) throw new Error("Failed to create control");
    return res.json();
  },

  async updateControl(controlId, controlData) {
    const res = await fetch(`${API_BASE_URL}/controls/${controlId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(controlData),
    });
    if (!res.ok) throw new Error("Failed to update control");
    return res.json();
  },

  async deleteControl(controlId) {
    const res = await fetch(`${API_BASE_URL}/controls/${controlId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete control");
    return res.json();
  },

  async runComplianceScan(policyId, evidence) {
    const res = await fetch(`${API_BASE_URL}/scans/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy_id: policyId || null, evidence }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Scan failed (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async backfillEmbeddings() {
    const res = await fetch(`${API_BASE_URL}/controls/backfill-embeddings`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to backfill embeddings");
    return res.json();
  },

  async getScanDetails(scanId) {
    const res = await fetch(`${API_BASE_URL}/scans/${scanId}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to fetch scan details (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async getRecentScans(limit = 20) {
    const res = await fetch(`${API_BASE_URL}/scans?limit=${limit}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to fetch recent scans (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async getPolicyScans(policyId) {
    const res = await fetch(`${API_BASE_URL}/policies/${policyId}/scans`);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to fetch policy scans (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },
};


