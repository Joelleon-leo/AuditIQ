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
    policy_id: str = Field(..., description="ID of the policy against which to evaluate evidence")
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
    status: str  # "COMPLIANT", "NON_COMPLIANT", "NOT_EVALUABLE", "ERROR"
    verdict: str  # Frontend alias: "COMPLIANT", "NON_COMPLIANT", "NOT_EVALUABLE"
    actual_value: Optional[Any] = None
    expected_condition: str
    reasoning: str
    remediation: Optional[str] = None
    raw_evidence: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class ScanReportResponse(BaseModel):
    scan_id: str
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None
    overall_verdict: str  # "COMPLIANT" or "NON_COMPLIANT"
    passed_count: int
    failed_count: int
    not_evaluable_count: int
    total_checks: int
    executed_at: datetime
    results: List[SingleEvaluationResult]

    model_config = ConfigDict(from_attributes=True)
