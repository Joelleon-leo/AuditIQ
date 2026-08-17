from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Policy, ScanRun, ScanResult
from app.schemas.scan import ScanExecutionRequest, ScanReportResponse, SingleEvaluationResult
from app.services.evaluator import evaluate_evidence

router = APIRouter()


@router.post(
    "/scans/run",
    response_model=ScanReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute compliance scan against evidence JSON",
)
def run_scan(
    request: ScanExecutionRequest,
    db: Session = Depends(get_db),
):
    """
    1. Fetches target Policy and associated Controls.
    2. Runs deterministic rule evaluation against incoming evidence payload.
    3. Persists the ScanRun execution and individual ScanResults to the database.
    4. Returns complete audit verdict, statistics, and human-readable reasoning.
    """
    policy = db.query(Policy).filter(Policy.id == request.policy_id).first()

    if not policy:
        raise HTTPException(
            status_code=404,
            detail=f"Policy with ID '{request.policy_id}' not found.",
        )

    if not policy.controls or len(policy.controls) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Policy '{policy.filename}' has no controls defined. Upload a valid policy document first.",
        )

    evidence_data = request.evidence if request.evidence is not None else request.evidence_json
    if not evidence_data:
        raise HTTPException(
            status_code=400,
            detail="Evidence payload is missing or empty. Provide a valid JSON evidence body with 'assets' array.",
        )

    # Execute deterministic evaluation engine
    eval_results, summary = evaluate_evidence(policy.controls, evidence_data)

    # Persist ScanRun to database
    scan_run = ScanRun(
        policy_id=policy.id,
        evidence_json=evidence_data if isinstance(evidence_data, dict) else {"assets": evidence_data},
        overall_verdict=summary["overall_verdict"],
        total_checks=summary["total_checks"],
        passed_checks=summary["passed_count"],
        failed_checks=summary["failed_count"],
        not_evaluable_checks=summary["not_evaluable_count"],
        executed_at=datetime.now(timezone.utc),
    )
    db.add(scan_run)
    db.flush()  # Populates scan_run.id

    # Persist individual ScanResults
    response_results: List[SingleEvaluationResult] = []
    for item in eval_results:
        db_result = ScanResult(
            scan_run_id=scan_run.id,
            asset_id=item["asset_id"],
            asset_type=item["asset_type"],
            control_id=item["control_id"],
            control_title=item["control_title"],
            severity=item["severity"],
            status=item["status"],
            actual_value=item["actual_value"],
            expected_condition=item["expected_condition"],
            reasoning=item["reasoning"],
            remediation=item.get("remediation"),
            raw_evidence=item.get("raw_evidence"),
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
                actual_value=item["actual_value"],
                expected_condition=item["expected_condition"],
                reasoning=item["reasoning"],
                remediation=item.get("remediation"),
                raw_evidence=item.get("raw_evidence"),
            )
        )

    db.commit()
    db.refresh(scan_run)

    return ScanReportResponse(
        scan_id=scan_run.id,
        policy_id=policy.id,
        policy_name=policy.filename,
        overall_verdict=summary["overall_verdict"],
        passed_count=summary["passed_count"],
        failed_count=summary["failed_count"],
        not_evaluable_count=summary["not_evaluable_count"],
        total_checks=summary["total_checks"],
        executed_at=scan_run.executed_at,
        results=response_results,
    )


@router.get(
    "/scans/{scan_id}",
    response_model=ScanReportResponse,
    summary="Get historical scan report by ID",
)
def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
):
    scan_run = db.query(ScanRun).filter(ScanRun.id == scan_id).first()
    if not scan_run:
        raise HTTPException(status_code=404, detail=f"Scan with ID '{scan_id}' not found.")

    policy_name = scan_run.policy.filename if scan_run.policy else "Unknown Policy"

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
            reasoning=r.reasoning,
            remediation=r.remediation,
            raw_evidence=r.raw_evidence,
        )
        for r in scan_run.results
    ]

    return ScanReportResponse(
        scan_id=scan_run.id,
        policy_id=scan_run.policy_id,
        policy_name=policy_name,
        overall_verdict=scan_run.overall_verdict,
        passed_count=scan_run.passed_checks,
        failed_count=scan_run.failed_checks,
        not_evaluable_count=scan_run.not_evaluable_checks,
        total_checks=scan_run.total_checks,
        executed_at=scan_run.executed_at,
        results=results_dto,
    )
