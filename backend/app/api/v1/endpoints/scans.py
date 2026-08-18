from app.api.v1.endpoints.policies import router
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Policy, ScanRun, ScanResult
from app.schemas.scan import (
    ScanExecutionRequest,
    ScanReportResponse,
    SingleEvaluationResult,
    ScanListItem,
)
from app.services.evaluator import evaluate_evidence_semantic


@router.post(
    "/scans/run",
    response_model=ScanReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute compliance scan against evidence JSON",
)
@router.post(
    "/compliance/scan",
    response_model=ScanReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute compliance scan (compliance alias)",
)
@router.post(
    "/evidence/analyze",
    response_model=ScanReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze evidence JSON using semantic search & LLM evaluation",
)
def run_scan(
    request: ScanExecutionRequest,
    db: Session = Depends(get_db),
):
    """
    1. Unpacks evidence payload and converts into natural language statements.
    2. Generates embeddings and performs semantic search against pgvector control embeddings.
    3. LLM evaluates evidence against retrieved controls (COMPLIANT / NON_COMPLIANT / INSUFFICIENT_EVIDENCE).
    4. Persists ScanRun and ScanResult records atomically to Neon PostgreSQL.
    """
    policy = None
    if request.policy_id:
        policy = db.query(Policy).filter(Policy.id == request.policy_id).first()

    evidence_data = request.evidence if request.evidence is not None else request.evidence_json
    if not evidence_data:
        raise HTTPException(
            status_code=400,
            detail="Evidence payload is missing or empty. Provide a valid JSON evidence body.",
        )

    # Execute pgvector semantic search + LLM evaluation engine
    eval_results, summary = evaluate_evidence_semantic(
        db=db,
        evidence_payload=evidence_data,
        policy_id=policy.id if policy else None,
    )

    policy_name = policy.filename if policy else "All Ingested Policies"
    now_utc = datetime.now(timezone.utc)

    # Atomic database persistence transaction
    try:
        scan_run = ScanRun(
            policy_id=policy.id if policy else None,
            evidence_json=evidence_data if isinstance(evidence_data, dict) else {"assets": evidence_data},
            overall_verdict=summary["overall_verdict"],
            total_checks=summary["total_checks"],
            passed_checks=summary["passed_count"],
            failed_checks=summary["failed_count"],
            not_evaluable_checks=summary["not_evaluable_count"],
            executed_at=now_utc,
        )
        db.add(scan_run)
        db.flush()  # Populates scan_run.id

        response_results: List[SingleEvaluationResult] = []
        for item in eval_results:
            created_time = item.get("created_at") or now_utc
            db_result = ScanResult(
                scan_run_id=scan_run.id,
                asset_id=item["asset_id"],
                asset_type=item["asset_type"],
                control_id=item["control_id"],
                control_title=item["control_title"],
                severity=item["severity"],
                status=item["status"],
                actual_value=item.get("actual_value"),
                expected_condition=item.get("expected_condition", "N/A"),
                operator=item.get("operator"),
                evidence_field=item.get("evidence_field"),
                match_method=item.get("match_method", "SEMANTIC_VECTOR"),
                reasoning=item["reasoning"],
                remediation=item.get("remediation"),
                raw_evidence=item.get("raw_evidence"),
                similarity_score=item.get("similarity_score"),
                confidence=item.get("confidence"),
                created_at=created_time,
            )
            db.add(db_result)

            response_results.append(
                SingleEvaluationResult(
                    result_id=item["result_id"],
                    control_id=item["control_id"],
                    control_title=item["control_title"],
                    severity=item["severity"],
                    asset_id=item["asset_id"],
                    asset_type=item["asset_type"],
                    status=item["status"],
                    verdict=item["status"],
                    actual_value=item.get("actual_value"),
                    expected_condition=item.get("expected_condition", "N/A"),
                    operator=item.get("operator"),
                    evidence_field=item.get("evidence_field"),
                    match_method=item.get("match_method", "SEMANTIC_VECTOR"),
                    reasoning=item["reasoning"],
                    remediation=item.get("remediation"),
                    raw_evidence=item.get("raw_evidence"),
                    similarity_score=item.get("similarity_score"),
                    confidence=item.get("confidence"),
                    created_at=created_time,
                )
            )

        db.commit()
        db.refresh(scan_run)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to persist compliance scan to database: {str(exc)}",
        ) from exc

    return ScanReportResponse(
        scan_id=scan_run.id,
        id=scan_run.id,
        policy_id=scan_run.policy_id,
        policy_name=policy_name,
        policy_version="1.0",
        overall_verdict=summary["overall_verdict"],
        overall_status=summary["overall_verdict"],
        passed_count=summary["passed_count"],
        failed_count=summary["failed_count"],
        not_evaluable_count=summary["not_evaluable_count"],
        total_checks=summary["total_checks"],
        executed_at=scan_run.executed_at,
        created_at=scan_run.executed_at,
        results=response_results,
    )


@router.get(
    "/scans",
    response_model=List[ScanListItem],
    summary="List all historical compliance scans",
)
def list_scans(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Retrieve history of all executed compliance scans ordered from latest to oldest."""
    scans = (
        db.query(ScanRun)
        .order_by(ScanRun.executed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        ScanListItem(
            scan_id=s.id,
            id=s.id,
            policy_id=s.policy_id,
            policy_name=s.policy.filename if s.policy else "All Ingested Policies",
            overall_status=s.overall_verdict,
            overall_verdict=s.overall_verdict,
            total_checks=s.total_checks,
            passed_count=s.passed_checks,
            failed_count=s.failed_checks,
            executed_at=s.executed_at,
            created_at=s.executed_at,
        )
        for s in scans
    ]


@router.get(
    "/policies/{policy_id}/scans",
    response_model=List[ScanListItem],
    summary="List historical scans for a specific policy",
)
@router.get(
    "/compliance/policies/{policy_id}/scans",
    response_model=List[ScanListItem],
    summary="List historical scans for a specific policy (compliance alias)",
)
def get_policy_scans(
    policy_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve audit history for a specific policy."""
    scans = (
        db.query(ScanRun)
        .filter(ScanRun.policy_id == policy_id)
        .order_by(ScanRun.executed_at.desc())
        .all()
    )

    return [
        ScanListItem(
            scan_id=s.id,
            id=s.id,
            policy_id=s.policy_id,
            policy_name=s.policy.filename if s.policy else "All Ingested Policies",
            overall_status=s.overall_verdict,
            overall_verdict=s.overall_verdict,
            total_checks=s.total_checks,
            passed_count=s.passed_checks,
            failed_count=s.failed_checks,
            executed_at=s.executed_at,
            created_at=s.executed_at,
        )
        for s in scans
    ]


@router.get(
    "/scans/{scan_id}",
    response_model=ScanReportResponse,
    summary="Get historical scan report by ID",
)
@router.get(
    "/compliance/scans/{scan_id}",
    response_model=ScanReportResponse,
    summary="Get historical scan report by ID (compliance alias)",
)
def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve full persisted compliance scan report directly from Neon PostgreSQL."""
    scan_run = db.query(ScanRun).filter(ScanRun.id == scan_id).first()
    if not scan_run:
        raise HTTPException(status_code=404, detail=f"Scan with ID '{scan_id}' not found in database.")

    policy_name = scan_run.policy.filename if scan_run.policy else "All Ingested Policies"

    results_dto = [
        SingleEvaluationResult(
            result_id=r.id,
            control_id=r.control_id,
            control_title=r.control_title,
            severity=r.severity or "HIGH",
            asset_id=r.asset_id,
            asset_type=r.asset_type,
            status=r.status,
            verdict=r.status,
            actual_value=r.actual_value,
            expected_condition=r.expected_condition,
            operator=r.operator,
            evidence_field=r.evidence_field,
            match_method=r.match_method or "SEMANTIC_VECTOR",
            reasoning=r.reasoning,
            remediation=r.remediation,
            raw_evidence=r.raw_evidence,
            similarity_score=r.similarity_score,
            confidence=r.confidence,
            created_at=r.created_at,
        )
        for r in scan_run.results
    ]

    return ScanReportResponse(
        scan_id=scan_run.id,
        id=scan_run.id,
        policy_id=scan_run.policy_id,
        policy_name=policy_name,
        policy_version="1.0",
        overall_verdict=scan_run.overall_verdict,
        overall_status=scan_run.overall_verdict,
        passed_count=scan_run.passed_checks,
        failed_count=scan_run.failed_checks,
        not_evaluable_count=scan_run.not_evaluable_checks,
        total_checks=scan_run.total_checks,
        executed_at=scan_run.executed_at,
        created_at=scan_run.executed_at,
        results=results_dto,
    )
