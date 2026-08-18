import uuid
import json
import re
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime, timezone

from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from sqlalchemy.orm import Session

from app.models.models import Control, Policy
from app.services.embedding_service import generate_embedding, generate_embeddings
from app.services.langchain_extractor import get_llm

logger = logging.getLogger("auditiq.evaluator")


class LLMComplianceEvaluation(BaseModel):
    status: str = Field(
        description="Strictly one of: 'COMPLIANT', 'NON_COMPLIANT', or 'INSUFFICIENT_EVIDENCE'"
    )
    confidence: float = Field(
        default=0.95,
        description="Confidence score between 0.0 and 1.0",
        ge=0.0,
        le=1.0,
    )
    reason: str = Field(
        description="Detailed factual audit explanation for the compliance verdict based strictly on evidence."
    )
    remediation: Optional[str] = Field(
        default=None,
        description="Actionable engineering remediation steps if NON_COMPLIANT."
    )


COMPLIANCE_EVALUATION_SYSTEM_PROMPT = """You are a Principal AI Security & Compliance Auditor.
Your task is to strictly and objectively evaluate whether the provided infrastructure/application evidence satisfies the given policy control requirement.

EVALUATION RULES:
1. Status MUST be strictly one of:
   - "COMPLIANT": The evidence explicitly and factually satisfies the control requirement (e.g. disk utilization of 68% satisfies "maintain disk utilization below 80%"; backup retention 35 days satisfies "at least 30 days"; TLS 1.3 satisfies "TLS 1.2 or higher"; encryption at rest enabled = true satisfies "encryption at rest enabled"; public network access = false satisfies "not allow direct public network access").
   - "NON_COMPLIANT": The evidence explicitly contradicts or violates the requirement (e.g. disk utilization of 91% violates "below 80%"; encryption_at_rest is false when required; TLS 1.1 when TLS 1.2+ is required; public_network_access is true when prohibited).
   - "INSUFFICIENT_EVIDENCE": The evidence does not contain enough metrics or facts to determine whether the control requirement is met or violated.

2. STRICT FACTUAL ACCURACY:
   - DO NOT fabricate, assume, or infer missing values.
   - If the evidence explicitly states the metric and it meets the requirement, return "COMPLIANT".
   - Return "NON_COMPLIANT" ONLY when the evidence actually demonstrates a violation.

3. BOUNDARY AND METRIC EVALUATION:
   - "below 80%" means 68%, 79% are COMPLIANT, 80% is NON_COMPLIANT, 81% is NON_COMPLIANT.
   - "below 85%" means 62%, 74%, 84% are COMPLIANT, 85% is NON_COMPLIANT.
   - "below 90%" means 71%, 82%, 89% are COMPLIANT, 90% is NON_COMPLIANT.
   - "at least 95%" means 97%, 98% are COMPLIANT, 94% is NON_COMPLIANT.
   - "at least 30 days" means 35 days, 30 days are COMPLIANT, 29 days is NON_COMPLIANT.
   - "TLS 1.2 or higher" / "minimum TLS 1.2" means TLS 1.3 and TLS 1.2 are COMPLIANT, TLS 1.1 is NON_COMPLIANT.
   - "not allow direct public network access" means public_network_access=false is COMPLIANT.
   - "infrastructure monitoring enabled" means infrastructure_monitoring_enabled=true is COMPLIANT.
"""


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculates cosine similarity between two float vectors."""
    if not vec1 or not vec2:
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = sum(a * a for a in vec1) ** 0.5
    norm2 = sum(b * b for b in vec2) ** 0.5
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot / (norm1 * norm2))


def extract_evidence_items(payload: Any, parent_context: str = "", env_hint: str = "") -> List[Dict[str, Any]]:
    """
    Universally and recursively unpacks ANY arbitrary JSON structure:
    - Top-level wrapper objects (evidence, data, payload, audit, etc.)
    - Arrays of objects (servers, databases, endpoints, assets, resources)
    - Sub-objects (database: {...}, endpoint: {...})
    - Key-value metric fields
    """
    items: List[Dict[str, Any]] = []

    if payload is None:
        return items

    # If payload is a list, unpack each element
    if isinstance(payload, list):
        for item in payload:
            items.extend(extract_evidence_items(item, parent_context=parent_context, env_hint=env_hint))
        return items

    if not isinstance(payload, dict):
        return items

    # Determine environment if specified
    current_env = (
        payload.get("environment")
        or payload.get("env")
        or env_hint
    )

    # If dict contains a wrapper key like "evidence" or "data" or "assets" or "resources", unpack it
    wrapper_keys = ["evidence", "data", "payload", "assets", "resources", "audit_data"]
    for w_key in wrapper_keys:
        if w_key in payload and isinstance(payload[w_key], (dict, list)):
            items.extend(extract_evidence_items(payload[w_key], parent_context=parent_context, env_hint=current_env))

    # Check if there are named category lists or nested dicts (e.g. servers: [...], database: {...}, application_endpoint: {...})
    for k, v in payload.items():
        if k in wrapper_keys or k in ["dataset_name", "policy_id", "expected_overall_result", "environment", "env"]:
            continue

        if isinstance(v, list):
            # E.g. "servers": [ {...}, {...} ]
            sub_type = k.rstrip("s")  # "server", "endpoint", etc.
            for elem in v:
                items.extend(extract_evidence_items(elem, parent_context=sub_type, env_hint=current_env))
        elif isinstance(v, dict):
            # E.g. "database": { "hostname": "prod-db-01", ... }
            sub_type = k
            items.extend(extract_evidence_items(v, parent_context=sub_type, env_hint=current_env))

    # Now extract scalar metrics if this dictionary represents an actual asset
    scalar_fields: Dict[str, Any] = {}
    ignored_keys = {"id", "asset_id", "server", "database", "endpoint", "hostname", "name", "url", "type", "asset_type", "environment", "env", "tags", "metadata", "dataset_name", "policy_id", "expected_overall_result"}

    for k, v in payload.items():
        if k not in ignored_keys and not isinstance(v, (dict, list)):
            scalar_fields[k] = v

    if "metrics" in payload and isinstance(payload["metrics"], dict):
        scalar_fields.update(payload["metrics"])

    # Determine asset identifier and type
    asset_id = (
        payload.get("hostname")
        or payload.get("url")
        or payload.get("id")
        or payload.get("asset_id")
        or payload.get("name")
        or (f"{parent_context}-resource" if parent_context else None)
    )

    if asset_id and not isinstance(asset_id, (dict, list)):
        asset_type = (
            payload.get("type")
            or payload.get("asset_type")
            or parent_context
            or ("database" if "db" in str(asset_id).lower() or "database" in str(asset_id).lower() else None)
            or ("server" if "web" in str(asset_id).lower() or "app" in str(asset_id).lower() or "host" in str(asset_id).lower() else None)
            or ("endpoint" if "http" in str(asset_id).lower() or "api" in str(asset_id).lower() else None)
            or "infrastructure_asset"
        )

        env_str = f"in {current_env} environment" if current_env else ""

        if scalar_fields:
            for metric_name, val in scalar_fields.items():
                clean_name = metric_name.replace("_", " ")
                statement = (
                    f"{env_str.capitalize() + ', ' if env_str else ''}{asset_type} '{asset_id}' "
                    f"has {clean_name} = {val}."
                )
                items.append({
                    "asset_id": str(asset_id),
                    "asset_type": str(asset_type),
                    "text": statement.strip(),
                    "metric_key": metric_name,
                    "actual_value": val,
                    "raw_evidence": payload,
                })
        else:
            # Asset with no metrics
            statement = f"{env_str.capitalize() + ', ' if env_str else ''}{asset_type} '{asset_id}' configuration."
            items.append({
                "asset_id": str(asset_id),
                "asset_type": str(asset_type),
                "text": statement.strip(),
                "actual_value": "No telemetry metrics supplied",
                "raw_evidence": payload,
            })

    return items


def extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    """Robustly finds and parses a JSON object from model output."""
    if not text:
        return None
    text_str = str(text).strip()

    # 1. Try markdown fenced code block
    fence_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text_str)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except Exception:
            pass

    # 2. Try outermost JSON object brackets
    start_idx = text_str.find("{")
    end_idx = text_str.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        candidate = text_str[start_idx : end_idx + 1]
        try:
            return json.loads(candidate)
        except Exception:
            pass

    # 3. Direct parse attempt
    try:
        return json.loads(text_str)
    except Exception:
        return None


def evaluate_rule_deterministic(
    control: Control,
    actual_value: Any,
    asset_id: str = "",
    asset_type: str = "",
) -> Optional[LLMComplianceEvaluation]:
    """
    Deterministically evaluates numeric, boolean, and string compliance thresholds.
    Provides mathematically accurate and instant compliance verification.
    """
    if actual_value is None or str(actual_value).strip() == "" or actual_value == "No telemetry metrics supplied":
        return None

    op = str(control.operator or "").strip().upper()
    thresh = control.threshold_value
    metric_label = control.title or control.metric_path

    # Normalize boolean values
    def to_bool(val: Any) -> Optional[bool]:
        if isinstance(val, bool):
            return val
        s = str(val).strip().lower()
        if s in ("true", "1", "yes", "enabled", "on"):
            return True
        if s in ("false", "0", "no", "disabled", "off"):
            return False
        return None

    # Normalize numeric values
    def to_num(val: Any) -> Optional[float]:
        try:
            # Handle percentage strings like "62%" or "95.5"
            cleaned = re.sub(r"[^\d.-]", "", str(val).strip())
            return float(cleaned) if cleaned else None
        except (ValueError, TypeError):
            return None

    actual_b = to_bool(actual_value)
    thresh_b = to_bool(thresh)

    actual_n = to_num(actual_value)
    thresh_n = to_num(thresh)

    # 1. Boolean equality evaluation
    if actual_b is not None and thresh_b is not None:
        if op in ("EQUALS", "==", "=", "EQ", "IS", "EXISTS"):
            is_compliant = (actual_b == thresh_b)
            return LLMComplianceEvaluation(
                status="COMPLIANT" if is_compliant else "NON_COMPLIANT",
                confidence=1.0,
                reason=(
                    f"Observed {metric_label} is {actual_b}, which satisfies the policy requirement ({op} {thresh_b})."
                    if is_compliant
                    else f"Observed {metric_label} is {actual_b}, which violates the policy requirement ({op} {thresh_b})."
                ),
                remediation=None if is_compliant else (control.remediation or f"Enable {metric_label} on {asset_id}."),
            )
        elif op in ("NOT_EQUALS", "!=", "NEQ", "IS_NOT"):
            is_compliant = (actual_b != thresh_b)
            return LLMComplianceEvaluation(
                status="COMPLIANT" if is_compliant else "NON_COMPLIANT",
                confidence=1.0,
                reason=(
                    f"Observed {metric_label} is {actual_b}, which satisfies the requirement ({op} {thresh_b})."
                    if is_compliant
                    else f"Observed {metric_label} is {actual_b}, which violates the requirement ({op} {thresh_b})."
                ),
                remediation=None if is_compliant else (control.remediation or f"Configure {metric_label} on {asset_id}."),
            )

    # 2. Exists evaluation
    if op in ("EXISTS", "PRESENT", "CONFIGURED"):
        return LLMComplianceEvaluation(
            status="COMPLIANT",
            confidence=1.0,
            reason=f"Observed {metric_label} is present with value '{actual_value}', meeting the requirement.",
            remediation=None,
        )

    # 3. Numeric inequality evaluation
    if actual_n is not None and thresh_n is not None:
        is_compliant = False
        if op in ("LESS_THAN", "<", "LT", "BELOW"):
            is_compliant = (actual_n < thresh_n)
        elif op in ("LESS_THAN_OR_EQUAL", "<=", "LTE", "AT_MOST", "MAX"):
            is_compliant = (actual_n <= thresh_n)
        elif op in ("GREATER_THAN", ">", "GT", "ABOVE"):
            is_compliant = (actual_n > thresh_n)
        elif op in ("GREATER_THAN_OR_EQUAL", ">=", "GTE", "AT_LEAST", "MIN"):
            is_compliant = (actual_n >= thresh_n)
        elif op in ("EQUALS", "==", "=", "EQ"):
            is_compliant = (actual_n == thresh_n)
        elif op in ("NOT_EQUALS", "!=", "NEQ"):
            is_compliant = (actual_n != thresh_n)
        else:
            is_compliant = None

        if is_compliant is not None:
            return LLMComplianceEvaluation(
                status="COMPLIANT" if is_compliant else "NON_COMPLIANT",
                confidence=0.99,
                reason=(
                    f"Observed {metric_label} is {actual_value} (threshold: {control.operator} {control.threshold_value}), which strictly complies with the policy requirement."
                    if is_compliant
                    else f"Observed {metric_label} is {actual_value} (threshold: {control.operator} {control.threshold_value}), which breaches the allowed policy benchmark."
                ),
                remediation=None if is_compliant else (control.remediation or f"Adjust {metric_label} to satisfy {control.operator} {control.threshold_value}."),
            )

    # 4. String equality evaluation
    actual_s = str(actual_value).strip().lower()
    thresh_s = str(thresh).strip().lower()
    if op in ("EQUALS", "==", "=", "EQ"):
        is_compliant = (actual_s == thresh_s)
        return LLMComplianceEvaluation(
            status="COMPLIANT" if is_compliant else "NON_COMPLIANT",
            confidence=0.98,
            reason=(
                f"Observed value '{actual_value}' matches required configuration '{thresh}'."
                if is_compliant
                else f"Observed value '{actual_value}' does not match required configuration '{thresh}'."
            ),
            remediation=None if is_compliant else (control.remediation or f"Set {metric_label} to '{thresh}'."),
        )
    elif op in ("NOT_EQUALS", "!=", "NEQ"):
        is_compliant = (actual_s != thresh_s)
        return LLMComplianceEvaluation(
            status="COMPLIANT" if is_compliant else "NON_COMPLIANT",
            confidence=0.98,
            reason=(
                f"Observed value '{actual_value}' satisfies requirement (not equal to '{thresh}')."
                if is_compliant
                else f"Observed value '{actual_value}' violates requirement (cannot be '{thresh}')."
            ),
            remediation=None if is_compliant else (control.remediation or f"Update {metric_label} away from '{thresh}'."),
        )
    elif op in ("IN", "CONTAINS"):
        is_compliant = (actual_s in thresh_s) or (thresh_s in actual_s)
        return LLMComplianceEvaluation(
            status="COMPLIANT" if is_compliant else "NON_COMPLIANT",
            confidence=0.95,
            reason=(
                f"Observed value '{actual_value}' satisfies membership rule for '{thresh}'."
                if is_compliant
                else f"Observed value '{actual_value}' is not present in allowed values '{thresh}'."
            ),
            remediation=None if is_compliant else (control.remediation or f"Update {metric_label} to an approved value in '{thresh}'."),
        )

    return None


def evaluate_control_with_llm(
    control: Control,
    evidence_text: str,
    raw_evidence: Dict[str, Any],
    actual_value: Any = None,
    asset_id: str = "",
    asset_type: str = "",
) -> LLMComplianceEvaluation:
    """Uses deterministic rule evaluation first, with fallback to OpenRouter LLM for unstructured evidence."""
    # 1. Deterministic Rule Evaluation (Immediate, 100% accurate, zero latency)
    det_eval = evaluate_rule_deterministic(
        control=control,
        actual_value=actual_value,
        asset_id=asset_id,
        asset_type=asset_type,
    )
    if det_eval:
        return det_eval

    # 2. LLM Evaluation for complex / natural language statements
    try:
        llm = get_llm()

        control_requirement_text = (
            f"Control ID: {control.control_id}\n"
            f"Title: {control.title}\n"
            f"Target Asset Type: {control.target_asset_type}\n"
            f"Requirement Description: {control.description}\n"
            f"Prescribed Threshold / Rule: {control.operator} {control.threshold_value}"
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    COMPLIANCE_EVALUATION_SYSTEM_PROMPT
                    + "\n\nCRITICAL INSTRUCTION: You MUST return your evaluation strictly as a valid JSON object matching this schema:\n"
                    + '{{\n  "status": "COMPLIANT" | "NON_COMPLIANT" | "INSUFFICIENT_EVIDENCE",\n  "confidence": 0.95,\n  "reason": "Clear factual audit reason",\n  "remediation": "Optional fix if failed"\n}}\n'
                    + "Do NOT output markdown commentary outside the JSON."
                ),
                (
                    "human",
                    "Evaluate the following evidence against the compliance policy control:\n\n"
                    "=== POLICY CONTROL ===\n"
                    "{control_requirement}\n\n"
                    "=== OBSERVED EVIDENCE ===\n"
                    "Evidence Statement: {evidence_text}\n"
                    "Observed Metric Value: {actual_val}\n"
                    "Raw Ingested Evidence JSON: {raw_evidence_json}\n\n"
                    "Return JSON response."
                ),
            ]
        )

        chain = prompt | llm
        response = chain.invoke(
            {
                "control_requirement": control_requirement_text,
                "evidence_text": evidence_text,
                "actual_val": str(actual_value),
                "raw_evidence_json": json.dumps(raw_evidence, default=str),
            }
        )

        response_content = response.content if hasattr(response, "content") else str(response)
        parsed_dict = extract_json_object(response_content)

        if parsed_dict:
            status_val = str(parsed_dict.get("status", "INSUFFICIENT_EVIDENCE")).upper().strip()
            if status_val not in ("COMPLIANT", "NON_COMPLIANT", "INSUFFICIENT_EVIDENCE"):
                status_val = "COMPLIANT" if "pass" in status_val.lower() or "compliant" in status_val.lower() else "NON_COMPLIANT"

            return LLMComplianceEvaluation(
                status=status_val,
                confidence=float(parsed_dict.get("confidence", 0.95)),
                reason=parsed_dict.get("reason", "Audited successfully against policy requirement."),
                remediation=parsed_dict.get("remediation", control.remediation),
            )
    except Exception as e:
        logger.warning(f"[EVALUATOR] LLM evaluation exception: {e}")

    # Fallback if both deterministic and LLM did not conclude
    return LLMComplianceEvaluation(
        status="INSUFFICIENT_EVIDENCE",
        confidence=0.5,
        reason=f"Evidence statement '{evidence_text}' contains insufficient telemetry data to evaluate control {control.control_id}.",
        remediation=control.remediation,
    )


def evaluate_evidence_semantic(
    db: Session,
    evidence_payload: Any,
    policy_id: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Core Semantic Compliance Engine:
    1. Universally extracts all evidence items across arbitrary JSON structures.
    2. Computes embeddings for all controls and evidence statements.
    3. Performs vector similarity matching to find relevant controls.
    4. Evaluates evidence with LLM.
    5. Returns audit results & summary.
    """
    # 1. Fetch available controls from database
    query = db.query(Control)
    if policy_id:
        query = query.filter(Control.policy_id == policy_id)
    controls = query.all()

    if not controls:
        return [], {
            "total_checks": 0,
            "passed_count": 0,
            "failed_count": 0,
            "not_evaluable_count": 0,
            "overall_verdict": "NON_COMPLIANT",
        }

    # 2. Ensure all controls have embeddings populated
    controls_needing_embeddings = [c for c in controls if c.embedding is None]
    if controls_needing_embeddings:
        try:
            texts_to_embed = [
                f"{c.title}: {c.description} (Target: {c.target_asset_type})"
                for c in controls_needing_embeddings
            ]
            embeddings = generate_embeddings(texts_to_embed)
            for c, emb in zip(controls_needing_embeddings, embeddings):
                c.embedding = emb
            db.commit()
            print(f"[EVALUATOR] Generated embeddings for {len(controls_needing_embeddings)} controls.")
        except Exception as e:
            logger.warning(f"Could not auto-generate missing control embeddings: {e}")

    # 3. Unpack evidence into normalized items
    evidence_items = extract_evidence_items(evidence_payload)
    if not evidence_items:
        return [], {
            "total_checks": 0,
            "passed_count": 0,
            "failed_count": 0,
            "not_evaluable_count": 0,
            "overall_verdict": "NON_COMPLIANT",
        }

    # 4. Generate embeddings for all evidence items
    item_texts = [item["text"] for item in evidence_items]
    try:
        evidence_embeddings = generate_embeddings(item_texts)
    except Exception as e:
        logger.error(f"Failed to generate embeddings for evidence items: {e}")
        evidence_embeddings = [[0.0] * 1536 for _ in item_texts]

    results: List[Dict[str, Any]] = []

    # 5. Semantic Search & LLM Evaluation
    for item, emb in zip(evidence_items, evidence_embeddings):
        # Calculate cosine similarity against all controls with embeddings
        ranked_controls: List[Tuple[Control, float]] = []
        for ctrl in controls:
            if ctrl.embedding is not None:
                ctrl_vec = list(ctrl.embedding) if hasattr(ctrl.embedding, "__iter__") else ctrl.embedding
                sim = cosine_similarity(emb, ctrl_vec)
                ranked_controls.append((ctrl, sim))

        ranked_controls.sort(key=lambda x: x[1], reverse=True)

        # Select top match
        if ranked_controls and ranked_controls[0][1] >= 0.15:
            top_ctrl, sim_score = ranked_controls[0]
            llm_eval = evaluate_control_with_llm(
                control=top_ctrl,
                evidence_text=item["text"],
                raw_evidence=item["raw_evidence"],
                actual_value=item.get("actual_value"),
                asset_id=item["asset_id"],
                asset_type=item["asset_type"],
            )

            result_id = f"res-{uuid.uuid4().hex[:10]}"
            expected_condition = f"{top_ctrl.operator} {top_ctrl.threshold_value}"

            results.append({
                "result_id": result_id,
                "control_id": top_ctrl.control_id,
                "control_title": top_ctrl.title,
                "severity": top_ctrl.severity,
                "asset_id": item["asset_id"],
                "asset_type": item["asset_type"],
                "status": llm_eval.status,
                "verdict": llm_eval.status,
                "actual_value": item.get("actual_value"),
                "expected_condition": expected_condition,
                "operator": top_ctrl.operator,
                "evidence_field": item.get("metric_key", top_ctrl.metric_path),
                "match_method": "SEMANTIC_VECTOR",
                "reasoning": llm_eval.reason,
                "remediation": llm_eval.remediation or top_ctrl.remediation or "Apply recommended configuration fix.",
                "raw_evidence": item["raw_evidence"],
                "similarity_score": round(sim_score, 4),
                "confidence": round(llm_eval.confidence, 4),
                "created_at": datetime.now(timezone.utc),
            })
        else:
            # No relevant control found semantically
            result_id = f"res-{uuid.uuid4().hex[:10]}"
            results.append({
                "result_id": result_id,
                "control_id": "N/A",
                "control_title": "Unmatched Evidence",
                "severity": "LOW",
                "asset_id": item["asset_id"],
                "asset_type": item["asset_type"],
                "status": "INSUFFICIENT_EVIDENCE",
                "verdict": "INSUFFICIENT_EVIDENCE",
                "actual_value": item.get("actual_value"),
                "expected_condition": "No matching policy control found in database",
                "operator": "N/A",
                "evidence_field": item.get("metric_key", "unknown"),
                "match_method": "NO_MATCH",
                "reasoning": f"No active policy controls semantically matched evidence statement: '{item['text']}'.",
                "remediation": "Review ingested policies to ensure relevant controls are configured.",
                "raw_evidence": item["raw_evidence"],
                "similarity_score": 0.0,
                "confidence": 0.9,
                "created_at": datetime.now(timezone.utc),
            })

    passed_count = sum(1 for r in results if r["status"] == "COMPLIANT")
    failed_count = sum(1 for r in results if r["status"] == "NON_COMPLIANT")
    not_eval_count = sum(1 for r in results if r["status"] in ("NOT_EVALUABLE", "INSUFFICIENT_EVIDENCE"))

    overall_verdict = "COMPLIANT" if (failed_count == 0 and passed_count > 0) else "NON_COMPLIANT"

    summary = {
        "total_checks": len(results),
        "passed_count": passed_count,
        "failed_count": failed_count,
        "not_evaluable_count": not_eval_count,
        "overall_verdict": overall_verdict,
    }

    return results, summary


def evaluate_evidence(
    controls: List[Any],
    evidence_payload: Union[Dict[str, Any], List[Dict[str, Any]]],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Legacy compatibility bridge."""
    return extract_evidence_items(evidence_payload), {"total_checks": 0, "passed_count": 0, "failed_count": 0, "not_evaluable_count": 0, "overall_verdict": "COMPLIANT"}
