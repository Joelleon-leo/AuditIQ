from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict, computed_field


class ControlBase(BaseModel):
    control_id: str = Field(..., description="Unique code of the control rule, e.g., CC6.1-ENCRYPT")
    title: str = Field(..., description="Human-readable title of the control")
    description: str = Field(..., description="Full description of the requirement")
    target_asset_type: str = Field(
        ...,
        description="Target resource type, e.g., 'database_server', 'storage_bucket', 'container_node', 'api_gateway', 'all'",
    )
    metric_path: str = Field(
        ...,
        description="Key path in asset metrics object to inspect, e.g. 'encryption_at_rest'",
    )
    operator: str = Field(
        ...,
        description="Comparison operator: '<', '<=', '>', '>=', '==', '!=', 'EQUALS', 'NOT_EQUALS', 'in', 'is_true', 'is_false', 'exists'",
    )
    threshold_value: Any = Field(
        ...,
        description="Expected threshold value (boolean, numeric, string, or list)",
    )
    severity: str = Field("HIGH", description="Severity level: CRITICAL, HIGH, MEDIUM, LOW")
    category: Optional[str] = Field("General Security", description="Category for grouping")
    remediation: Optional[str] = Field(None, description="Recommended remediation instructions")


class ControlCreate(ControlBase):
    pass


class ControlUpdate(BaseModel):
    control_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    target_asset_type: Optional[str] = None
    metric_path: Optional[str] = None
    operator: Optional[str] = None
    threshold_value: Optional[Any] = None
    severity: Optional[str] = None
    category: Optional[str] = None
    remediation: Optional[str] = None


class ControlResponse(ControlBase):
    id: str
    policy_id: str
    created_at: datetime

    @computed_field
    @property
    def target_metric(self) -> str:
        return self.metric_path

    @computed_field
    @property
    def asset_type(self) -> str:
        return self.target_asset_type

    @computed_field
    @property
    def threshold(self) -> Any:
        return self.threshold_value

    model_config = ConfigDict(from_attributes=True)


class ExtractedControlItem(BaseModel):
    """Schema used by LangChain structured output extraction."""
    control_id: str = Field(..., description="Identifier code, e.g. 'CC6.1-ENCRYPT' or 'SEC-01'")
    title: str = Field(..., description="Concise rule title")
    description: str = Field(..., description="Brief rule requirement statement")
    target_asset_type: str = Field(
        ...,
        description="Normalized asset type: 'database_server', 'storage_bucket', 'container_node', 'api_gateway', or 'all'",
    )
    metric_path: str = Field(
        ...,
        description="Telemetry metric key, e.g. 'encryption_at_rest', 'backup_retention_days', 'public_access_blocked', 'tls_version', 'critical_cve_count'",
    )
    operator: str = Field(
        ...,
        description="One of: 'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL', 'in', 'exists'",
    )
    threshold_value: Any = Field(
        ...,
        description="Value to compare against, e.g. true, 30, '1.2', 0",
    )
    severity: str = Field("HIGH", description="CRITICAL, HIGH, MEDIUM, or LOW")
    category: str = Field("Security", description="Security category name")
    remediation: str = Field("", description="Standard fix recommendation")


class ExtractedControlsList(BaseModel):
    """Wrapper list for LLM structured extraction output."""
    controls: list[ExtractedControlItem] = Field(
        default_factory=list,
        description="List of extracted actionable compliance rules from policy text",
    )
