import uuid
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime, timezone


METRIC_ALIASES: Dict[str, List[str]] = {
    "encryption_at_rest": ["encrypted", "encryption", "is_encrypted", "storage_encrypted"],
    "backup_retention_days": ["backup_retention", "backup_days", "retention_days", "snapshots_retained"],
    "public_access_blocked": ["block_public", "public_blocked", "is_private", "block_public_access"],
    "tls_version": ["tls", "min_tls_version", "ssl_version", "tls_min"],
    "critical_cve_count": ["cve_count", "vulnerabilities", "critical_cves", "cves_critical"],
    "mfa_enabled": ["mfa", "multi_factor_enabled", "requires_mfa"],
    "audit_logging_enabled": ["logging_enabled", "audit_enabled", "cloudtrail_enabled"],
}


def normalize_string(val: Any) -> str:
    return str(val).lower().replace("-", "_").replace(" ", "").strip()


def matches_asset_type(control_type: str, asset_type: str) -> bool:
    """Determines if a control's target asset type applies to the asset under audit."""
    c_norm = normalize_string(control_type)
    a_norm = normalize_string(asset_type)

    if c_norm in ("all", "global", "*", ""):
        return True

    if c_norm == a_norm:
        return True

    # Database aliases
    if "database" in c_norm or "db" in c_norm:
        if any(term in a_norm for term in ["db", "database", "rds", "postgres", "mysql", "dynamo", "cloudsql"]):
            return True

    # Storage aliases
    if "storage" in c_norm or "bucket" in c_norm:
        if any(term in a_norm for term in ["storage", "bucket", "s3", "blob", "gcs"]):
            return True

    # Container / Compute aliases
    if "container" in c_norm or "node" in c_norm or "compute" in c_norm:
        if any(term in a_norm for term in ["container", "node", "pod", "k8s", "vm", "ec2", "host", "compute"]):
            return True

    # Gateway / Ingress aliases
    if "gateway" in c_norm or "ingress" in c_norm or "api" in c_norm or "load_balancer" in c_norm:
        if any(term in a_norm for term in ["gateway", "ingress", "apigw", "alb", "nlb", "proxy", "cloudfront"]):
            return True

    return False


def resolve_metric_value(asset: Dict[str, Any], metric_path: str) -> Tuple[bool, Any]:
    """
    Finds the telemetry metric value in the asset dictionary, traversing nested structures and aliases.
    """
    # 1. Direct metrics dict lookup
    if "metrics" in asset and isinstance(asset["metrics"], dict) and metric_path in asset["metrics"]:
        return True, asset["metrics"][metric_path]

    # 2. Direct top-level lookup
    if metric_path in asset:
        return True, asset[metric_path]

    # 3. Normalized key lookup in metrics
    if "metrics" in asset and isinstance(asset["metrics"], dict):
        for k, v in asset["metrics"].items():
            if normalize_string(k) == normalize_string(metric_path):
                return True, v

    # 4. Check aliases
    aliases = METRIC_ALIASES.get(metric_path, [])
    for alias in aliases:
        if "metrics" in asset and isinstance(asset["metrics"], dict) and alias in asset["metrics"]:
            return True, asset["metrics"][alias]
        if alias in asset:
            return True, asset[alias]

    return False, None


def evaluate_single_rule(
    operator_str: str,
    threshold: Any,
    actual_value: Any,
) -> Tuple[bool, str]:
    """
    Executes deterministic comparison between observed actual_value and threshold.
    Returns (is_passed, explanation_fragment).
    """
    op = operator_str.upper().strip()

    # Operator normalization
    if op in ("==", "EQUALS", "IS", "EQ"):
        op_canonical = "=="
    elif op in ("!=", "NOT_EQUALS", "NEQ", "NOT"):
        op_canonical = "!="
    elif op in (">", "GREATER_THAN", "GT"):
        op_canonical = ">"
    elif op in (">=", "GREATER_THAN_OR_EQUAL", "GTE"):
        op_canonical = ">="
    elif op in ("<", "LESS_THAN", "LT"):
        op_canonical = "<"
    elif op in ("<=", "LESS_THAN_OR_EQUAL", "LTE"):
        op_canonical = "<="
    elif op in ("IN", "CONTAINS"):
        op_canonical = "in"
    elif op in ("EXISTS", "PRESENT"):
        op_canonical = "exists"
    elif op in ("IS_TRUE", "TRUE"):
        op_canonical = "is_true"
    elif op in ("IS_FALSE", "FALSE"):
        op_canonical = "is_false"
    else:
        op_canonical = op

    # Handle special operators
    if op_canonical == "exists":
        passed = actual_value is not None and actual_value != ""
        return passed, f"existence test: present={passed}"

    if op_canonical == "is_true":
        passed = str(actual_value).lower() in ("true", "1", "yes")
        return passed, f"boolean true check (observed={actual_value})"

    if op_canonical == "is_false":
        passed = str(actual_value).lower() in ("false", "0", "no")
        return passed, f"boolean false check (observed={actual_value})"

    if op_canonical == "in":
        if isinstance(threshold, list):
            passed = actual_value in threshold
            return passed, f"membership in {threshold}"
        elif isinstance(threshold, str):
            passed = str(actual_value).lower() in threshold.lower()
            return passed, f"contained within '{threshold}'"

    # Boolean comparison
    thresh_str = str(threshold).lower()
    actual_str = str(actual_value).lower()

    if thresh_str in ("true", "false") or isinstance(actual_value, bool):
        bool_actual = actual_str in ("true", "1", "yes")
        bool_expected = thresh_str in ("true", "1", "yes")
        if op_canonical in ("==", "EQUALS"):
            passed = bool_actual == bool_expected
        else:
            passed = bool_actual != bool_expected
        return passed, f"boolean comparison ({bool_actual} {op_canonical} {bool_expected})"

    # Numeric comparison
    try:
        num_actual = float(actual_value)
        num_expected = float(threshold)

        if op_canonical in ("==", "EQUALS"):
            passed = num_actual == num_expected
        elif op_canonical in ("!=", "NOT_EQUALS"):
            passed = num_actual != num_expected
        elif op_canonical in (">", "GREATER_THAN"):
            passed = num_actual > num_expected
        elif op_canonical in (">=", "GREATER_THAN_OR_EQUAL"):
            passed = num_actual >= num_expected
        elif op_canonical in ("<", "LESS_THAN"):
            passed = num_actual < num_expected
        elif op_canonical in ("<=", "LESS_THAN_OR_EQUAL"):
            passed = num_actual <= num_expected
        else:
            passed = num_actual == num_expected

        return passed, f"numeric comparison ({num_actual} {op_canonical} {num_expected})"
    except (ValueError, TypeError):
        pass

    # String comparison
    if op_canonical in ("==", "EQUALS"):
        passed = actual_str == thresh_str
    elif op_canonical in ("!=", "NOT_EQUALS"):
        passed = actual_str != thresh_str
    else:
        passed = actual_str == thresh_str

    return passed, f"string comparison ('{actual_value}' {op_canonical} '{threshold}')"


def evaluate_evidence(
    controls: List[Any],
    evidence_payload: Union[Dict[str, Any], List[Dict[str, Any]]],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Audits a list of controls against incoming infrastructure/application telemetry assets.
    Returns:
      (evaluation_results_list, scan_summary_dict)
    """
    # Extract asset array from payload
    raw_assets: List[Dict[str, Any]] = []

    if isinstance(evidence_payload, list):
        raw_assets = evidence_payload
    elif isinstance(evidence_payload, dict):
        if "assets" in evidence_payload and isinstance(evidence_payload["assets"], list):
            raw_assets = evidence_payload["assets"]
        elif "resources" in evidence_payload and isinstance(evidence_payload["resources"], list):
            raw_assets = evidence_payload["resources"]
        else:
            # Check if dict values are assets
            potential_assets = [
                v for v in evidence_payload.values()
                if isinstance(v, dict) and (v.get("id") or v.get("asset_id") or v.get("type") or v.get("asset_type"))
            ]
            if potential_assets:
                raw_assets = potential_assets
            else:
                raw_assets = [evidence_payload]

    results: List[Dict[str, Any]] = []

    for asset in raw_assets:
        asset_id = asset.get("id") or asset.get("asset_id") or asset.get("name") or "unknown-resource"
        asset_type = asset.get("type") or asset.get("asset_type") or "generic_asset"

        for ctrl in controls:
            ctrl_id = getattr(ctrl, "control_id", None) or ctrl.get("control_id")
            ctrl_title = getattr(ctrl, "title", None) or ctrl.get("title")
            ctrl_desc = getattr(ctrl, "description", None) or ctrl.get("description")
            target_type = getattr(ctrl, "target_asset_type", None) or ctrl.get("target_asset_type") or ctrl.get("asset_type")
            metric_path = getattr(ctrl, "metric_path", None) or ctrl.get("metric_path") or ctrl.get("target_metric")
            operator = getattr(ctrl, "operator", None) or ctrl.get("operator")
            threshold = getattr(ctrl, "threshold_value", None) or ctrl.get("threshold_value") or ctrl.get("threshold")
            severity = getattr(ctrl, "severity", None) or ctrl.get("severity", "HIGH")
            remediation = getattr(ctrl, "remediation", None) or ctrl.get("remediation", "")

            # Check asset type applicability
            if not matches_asset_type(str(target_type), str(asset_type)):
                continue

            found, actual_value = resolve_metric_value(asset, str(metric_path))

            result_id = f"res-{uuid.uuid4().hex[:10]}"
            expected_condition = f"{operator} {threshold}"

            if not found:
                results.append({
                    "result_id": result_id,
                    "control_id": ctrl_id,
                    "control_title": ctrl_title,
                    "severity": severity,
                    "asset_id": asset_id,
                    "asset_type": asset_type,
                    "status": "NOT_EVALUABLE",
                    "verdict": "NOT_EVALUABLE",
                    "actual_value": "Metric Missing in Payload",
                    "expected_condition": expected_condition,
                    "reasoning": f"Telemetry metric '{metric_path}' was not found in the evidence payload for asset '{asset_id}'.",
                    "remediation": remediation or f"Ensure telemetry agent exports '{metric_path}' for {asset_type}.",
                    "raw_evidence": asset,
                })
                continue

            # Deterministic evaluation
            passed, detail_msg = evaluate_single_rule(operator, threshold, actual_value)

            status = "COMPLIANT" if passed else "NON_COMPLIANT"
            if passed:
                reasoning = (
                    f"Asset '{asset_id}' passed verification: observed {metric_path} = '{actual_value}', "
                    f"which satisfies the policy condition ({operator} {threshold})."
                )
            else:
                reasoning = (
                    f"VIOLATION on asset '{asset_id}': observed {metric_path} = '{actual_value}', "
                    f"which violates the mandatory requirement ({operator} {threshold})."
                )

            results.append({
                "result_id": result_id,
                "control_id": ctrl_id,
                "control_title": ctrl_title,
                "severity": severity,
                "asset_id": asset_id,
                "asset_type": asset_type,
                "status": status,
                "verdict": status,
                "actual_value": actual_value,
                "expected_condition": expected_condition,
                "reasoning": reasoning,
                "remediation": remediation or "Apply the prescribed configuration change to bring the resource into compliance.",
                "raw_evidence": asset,
            })

    passed_count = sum(1 for r in results if r["status"] == "COMPLIANT")
    failed_count = sum(1 for r in results if r["status"] == "NON_COMPLIANT")
    not_eval_count = sum(1 for r in results if r["status"] == "NOT_EVALUABLE")

    overall_verdict = "COMPLIANT" if (failed_count == 0 and passed_count > 0) else "NON_COMPLIANT"

    summary = {
        "total_checks": len(results),
        "passed_count": passed_count,
        "failed_count": failed_count,
        "not_evaluable_count": not_eval_count,
        "overall_verdict": overall_verdict,
    }

    return results, summary
