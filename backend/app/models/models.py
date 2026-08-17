import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Integer,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Policy(Base):
    __tablename__ = "policies"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    raw_text = Column(Text, nullable=False)
    file_path = Column(String(500), nullable=True)
    status = Column(String(50), default="PARSED")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    controls = relationship(
        "Control",
        back_populates="policy",
        cascade="all, delete-orphan",
        order_by="Control.created_at",
    )
    scans = relationship(
        "ScanRun",
        back_populates="policy",
        cascade="all, delete-orphan",
    )


class Control(Base):
    __tablename__ = "controls"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    policy_id = Column(
        String(36),
        ForeignKey("policies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    control_id = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    target_asset_type = Column(String(100), nullable=False)  # e.g., "database_server", "storage_bucket", "all"
    metric_path = Column(String(100), nullable=False)        # e.g., "encryption_at_rest", "backup_retention_days"
    operator = Column(String(50), nullable=False)           # e.g., "EQUALS", ">=", "<=", "==", "!=", "in"
    threshold_value = Column(JSON, nullable=False)          # numeric, boolean, or string value
    severity = Column(String(50), default="HIGH")           # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    category = Column(String(100), default="General Security")
    remediation = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    policy = relationship("Policy", back_populates="controls")


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    policy_id = Column(
        String(36),
        ForeignKey("policies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    evidence_json = Column(JSON, nullable=False)
    overall_verdict = Column(String(50), nullable=False)  # "COMPLIANT" or "NON_COMPLIANT"
    total_checks = Column(Integer, default=0)
    passed_checks = Column(Integer, default=0)
    failed_checks = Column(Integer, default=0)
    not_evaluable_checks = Column(Integer, default=0)
    executed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    policy = relationship("Policy", back_populates="scans")
    results = relationship(
        "ScanResult",
        back_populates="scan_run",
        cascade="all, delete-orphan",
    )


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    scan_run_id = Column(
        String(36),
        ForeignKey("scan_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id = Column(String(255), nullable=False)
    asset_type = Column(String(100), nullable=False)
    control_id = Column(String(100), nullable=False)
    control_title = Column(String(255), nullable=False)
    severity = Column(String(50), default="HIGH")
    status = Column(String(50), nullable=False)  # "COMPLIANT", "NON_COMPLIANT", "NOT_EVALUABLE", "ERROR"
    actual_value = Column(JSON, nullable=True)
    expected_condition = Column(String(255), nullable=False)
    reasoning = Column(Text, nullable=False)
    remediation = Column(Text, nullable=True)
    raw_evidence = Column(JSON, nullable=True)

    # Relationships
    scan_run = relationship("ScanRun", back_populates="results")
