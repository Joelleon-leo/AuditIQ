import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Shield,
  SlidersHorizontal,
  X
} from "lucide-react";

export const ControlsTable = ({
  controls,
  policyName,
  onAddControl,
  onUpdateControl,
  onDeleteControl,
  onSuccessToast,
  onErrorToast,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [assetTypeFilter, setAssetTypeFilter] = useState("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingControl, setEditingControl] = useState(null);
  const [deleteConfirmControl, setDeleteConfirmControl] = useState(null);

  const [formData, setFormData] = useState({
    control_id: "",
    title: "",
    description: "",
    severity: "HIGH",
    asset_type: "database_server",
    target_metric: "encryption_at_rest",
    operator: "EQUALS",
    threshold: "true",
    category: "Data Protection",
    remediation: "",
  });

  const assetTypes = useMemo(() => {
    const types = new Set(
      (controls || [])
        .map((c) => c?.asset_type)
        .filter((val) => typeof val === "string" && val.trim() !== "")
    );
    return Array.from(types);
  }, [controls]);

  const filteredControls = useMemo(() => {
    return (controls || []).filter((ctrl) => {
      if (!ctrl) return false;
      const s = (searchTerm || "").toLowerCase();
      const matchesSearch =
        (ctrl.control_id || "").toLowerCase().includes(s) ||
        (ctrl.title || "").toLowerCase().includes(s) ||
        (ctrl.description || "").toLowerCase().includes(s) ||
        (ctrl.target_metric || "").toLowerCase().includes(s);

      const matchesSeverity =
        severityFilter === "ALL" || ctrl.severity === severityFilter;

      const matchesAsset =
        assetTypeFilter === "ALL" || ctrl.asset_type === assetTypeFilter;

      return matchesSearch && matchesSeverity && matchesAsset;
    });
  }, [controls, searchTerm, severityFilter, assetTypeFilter]);

  const openCreateModal = () => {
    setFormData({
      control_id: `CTRL-${Date.now().toString(36).toUpperCase()}`,
      title: "",
      description: "",
      severity: "HIGH",
      asset_type: "database_server",
      target_metric: "",
      operator: "EQUALS",
      threshold: "true",
      category: "Security",
      remediation: "",
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (control) => {
    setEditingControl(control);
    setFormData({
      control_id: control.control_id,
      title: control.title,
      description: control.description,
      severity: control.severity,
      asset_type: control.asset_type,
      target_metric: control.target_metric,
      operator: control.operator,
      threshold: control.threshold,
      category: control.category || "General",
      remediation: control.remediation || "",
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveControl = (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.target_metric.trim()) {
      onErrorToast("Validation Error", "Title and Target Metric are required.");
      return;
    }

    if (editingControl) {
      onUpdateControl({
        ...editingControl,
        ...formData,
      });
      onSuccessToast("Control Updated", `Control ${formData.control_id} was updated.`);
    } else {
      onAddControl(formData);
      onSuccessToast("Control Added", `New control ${formData.control_id} added.`);
    }

    setIsCreateModalOpen(false);
    setEditingControl(null);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteConfirmControl) return;
    onDeleteControl(deleteConfirmControl.control_id);
    onSuccessToast("Control Deleted", `Control ${deleteConfirmControl.control_id} was removed.`);
    setDeleteConfirmControl(null);
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MEDIUM":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div id="controls-table-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Extracted Compliance Rules & Controls
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              {filteredControls.length} Active Rules
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated rule definitions extracted from{" "}
            <span className="font-semibold text-slate-700">{policyName || "Active Policy"}</span>.
          </p>
        </div>

        <button
          type="button"
          id="add-custom-control-btn"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Rule</span>
        </button>
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="controls-search-input"
            placeholder="Search by ID, title, metric, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Asset filter */}
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 capitalize"
          >
            <option value="ALL">All Target Assets</option>
            {assetTypes.map((type) => (
              <option key={type} value={type}>
                {typeof type === "string" ? type.replace(/_/g, " ") : String(type || "")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table id="controls-table" className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Extracted Policy Requirement</th>
              <th className="py-3.5 px-4">Severity</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredControls.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-slate-400">
                  <Shield className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No matching extracted policies found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Try adjusting your search query or filters.
                  </p>
                </td>
              </tr>
            ) : (
              filteredControls.map((ctrl) => (
                <tr
                  key={ctrl.control_id}
                  id={`control-row-${ctrl.control_id}`}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Extracted Policy Requirement (ID, Title, Description) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-indigo-600 text-[11px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {ctrl.control_id}
                      </span>
                      {ctrl.category && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {ctrl.category}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{ctrl.title}</p>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                      {ctrl.description}
                    </p>
                  </td>

                  {/* Severity */}
                  <td className="py-3.5 px-4 whitespace-nowrap align-top pt-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getSeverityBadge(
                        ctrl.severity
                      )}`}
                    >
                      {ctrl.severity}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap align-top pt-4">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        id={`edit-control-${ctrl.control_id}`}
                        onClick={() => openEditModal(ctrl)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit Policy Control"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        id={`delete-control-${ctrl.control_id}`}
                        onClick={() => setDeleteConfirmControl(ctrl)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Policy Control"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Control Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            id="control-form-modal"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                {editingControl ? "Edit Compliance Control Rule" : "Create New Compliance Rule"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveControl} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Control ID</label>
                  <input
                    type="text"
                    required
                    value={formData.control_id}
                    onChange={(e) => setFormData({ ...formData, control_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mandatory TLS v1.3 Ingress"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Explain why this control is required..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Asset</label>
                  <input
                    type="text"
                    required
                    placeholder="database_server"
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Operator</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="EQUALS">EQUALS (==)</option>
                    <option value="NOT_EQUALS">NOT_EQUALS (!=)</option>
                    <option value="GREATER_THAN">GREATER_THAN (&gt;)</option>
                    <option value="GREATER_THAN_OR_EQUAL">GTE (&gt;=)</option>
                    <option value="LESS_THAN">LESS_THAN (&lt;)</option>
                    <option value="LESS_THAN_OR_EQUAL">LTE (&lt;=)</option>
                    <option value="IN">IN</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Threshold</label>
                  <input
                    type="text"
                    required
                    placeholder="true or 85"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Metric Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., encryption_at_rest"
                  value={formData.target_metric}
                  onChange={(e) => setFormData({ ...formData, target_metric: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remediation Steps</label>
                <input
                  type="text"
                  placeholder="Actionable steps to fix when non-compliant..."
                  value={formData.remediation}
                  onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-control-modal-btn"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Control Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmControl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              Delete Control {deleteConfirmControl.control_id}?
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove this compliance rule from policy evaluations?
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmControl(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-control-btn"
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
