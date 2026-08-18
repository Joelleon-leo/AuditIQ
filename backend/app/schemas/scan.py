from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, ConfigDict


class AssetMetricEvidence(BaseModel):
    id: Optional[str] = None
    asset_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    asset_type: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tags: Optional[Dict[str, Any]] = Field(default_factory=dict)

    model_config = ConfigDict(extra="allow")


class ScanExecutionRequest(BaseModel):
    policy_id: Optional[str] = Field(None, description="Optional ID of policy to constrain evaluation, or omit for global semantic search across all policies")
    evidence: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = Field(
        None,
        description="Evidence payload containing assets array or asset definitions",
    )
    evidence_json: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = Field(
        None,
        description="Alias for evidence payload",
    )


class SingleEvaluationResult(BaseModel):
    result_id: str
    control_id: str
    control_title: str
    severity: str
    asset_id: str
    asset_type: str
    status: str  # "COMPLIANT", "NON_COMPLIANT", "NOT_EVALUABLE", "INSUFFICIENT_EVIDENCE", "ERROR"
    verdict: str  # "COMPLIANT", "NON_COMPLIANT", "NOT_EVALUABLE", "INSUFFICIENT_EVIDENCE"
    actual_value: Optional[Any] = None
    expected_condition: str
    operator: Optional[str] = None
    evidence_field: Optional[str] = None
    match_method: Optional[str] = "SEMANTIC_VECTOR"
    reasoning: str
    remediation: Optional[str] = None
    raw_evidence: Optional[Dict[str, Any]] = None
    similarity_score: Optional[float] = None
    confidence: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ScanReportResponse(BaseModel):
    scan_id: str
    id: Optional[str] = None  # alias for scan_id
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None
    policy_version: Optional[str] = "1.0"
    overall_verdict: str  # "COMPLIANT" or "NON_COMPLIANT"
    overall_status: Optional[str] = None  # alias for overall_verdict
    passed_count: int
    failed_count: int
    not_evaluable_count: int
    total_checks: int
    executed_at: datetime
    created_at: Optional[datetime] = None  # alias for executed_at
    results: List[SingleEvaluationResult]

    model_config = ConfigDict(from_attributes=True)


class ScanListItem(BaseModel):
    scan_id: str
    id: str
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None
    overall_status: str
    overall_verdict: str
    total_checks: int
    passed_count: int
    failed_count: int
    executed_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
