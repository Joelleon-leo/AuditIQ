import os
import base64
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from app.core.database import get_db
from app.models.models import Policy, Control, generate_uuid
from app.schemas.policy import PolicyResponse, PolicyUploadResponse, PolicyListItem
from app.schemas.control import ControlCreate, ControlUpdate, ControlResponse
from app.services.pdf_parser import extract_text_from_pdf_bytes
from app.services.pdf_generator import generate_pdf_from_text
from app.services.langchain_extractor import extract_controls_with_langchain
from app.services.embedding_service import generate_embedding, generate_embeddings

router = APIRouter()


DB_UNAVAILABLE_DETAIL = (
    "Database connection failed. Check PostgreSQL network access, host/port, and DATABASE_URL."
)


@router.post(
    "/policies/upload",
    response_model=PolicyUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload PDF policy document and extract compliance controls",
)
async def upload_policy(
    file: UploadFile = File(..., description="PDF or text policy document"),
    db: Session = Depends(get_db),
):
    """
    1. Ingests uploaded PDF byte stream directly into memory.
    2. Extracts clean raw text via pypdf / pdfplumber.
    3. Invokes LangChain structured output extraction pipeline to derive testable technical rules.
    4. Computes pgvector embeddings for each extracted control.
    5. Persists Policy and Control models to the database.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    clean_filename = file.filename.strip()

    # Prevent duplicate policy document uploads
    try:
        existing_policy = db.query(Policy).filter(Policy.filename.ilike(clean_filename)).first()
        if existing_policy:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Policy document '{clean_filename}' has already been uploaded (Policy ID: {existing_policy.id}). Duplicate uploads are not allowed.",
            )
    except HTTPException:
        raise
    except Exception as check_err:
        print(f"[DUPLICATE CHECK NOTICE] Could not verify existing filename: {check_err}")

    try:
        content = await file.read()
        file_size = len(content)

        # 1. Extract raw text from PDF
        raw_text, total_pages = extract_text_from_pdf_bytes(content, filename=file.filename)

        if not raw_text or len(raw_text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Extracted document text was empty or too brief to parse.",
            )

        # 2. Extract structured controls using LangChain
        try:
            extracted_controls = extract_controls_with_langchain(raw_text)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            runtime_error = str(exc).lower()
            if "rate limit" in runtime_error or "quota" in runtime_error or "429" in runtime_error:
                raise HTTPException(status_code=429, detail=str(exc)) from exc
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        # 3. Compute embeddings for extracted controls
        texts_to_embed = [
            f"{item.title}: {item.description} (Target: {item.target_asset_type})"
            for item in extracted_controls
        ]
        try:
            control_embeddings = generate_embeddings(texts_to_embed)
        except Exception as e:
            print(f"[EMBEDDING NOTICE] Control embeddings deferred: {e}")
            control_embeddings = [None] * len(extracted_controls)

        # 4. Prepare binary document for PostgreSQL storage
        file_uuid = generate_uuid()
        file_base64_str = base64.b64encode(content).decode("utf-8")

        # 5. Create Policy database record
        new_policy = Policy(
            id=file_uuid,
            filename=file.filename,
            file_size_bytes=file_size,
            raw_text=raw_text,
            file_path=None,
            file_base64=file_base64_str,
            status="PARSED",
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_policy)
        db.flush()  # Populates new_policy.id

        # 6. Create Control records with embeddings
        db_controls: List[Control] = []
        for i, item in enumerate(extracted_controls):
            ctrl = Control(
                policy_id=new_policy.id,
                control_id=item.control_id,
                title=item.title,
                description=item.description,
                target_asset_type=item.target_asset_type,
                metric_path=item.metric_path,
                operator=item.operator,
                threshold_value=item.threshold_value,
                severity=item.severity,
                category=item.category,
                remediation=item.remediation,
                embedding=control_embeddings[i] if i < len(control_embeddings) else None,
                created_at=datetime.now(timezone.utc),
            )
            db.add(ctrl)
            db_controls.append(ctrl)

        db.commit()
        db.refresh(new_policy)

        return PolicyUploadResponse(
            policy_id=new_policy.id,
            filename=new_policy.filename,
            file_size_bytes=new_policy.file_size_bytes,
            raw_text=new_policy.raw_text,
            status=new_policy.status,
            total_controls_extracted=len(db_controls),
            controls=[ControlResponse.model_validate(c) for c in db_controls],
            uploaded_at=new_policy.created_at,
        )

    except HTTPException:
        db.rollback()
        raise
    except OperationalError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database operation failed while saving policy upload.",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process policy upload: {str(exc)}",
        )


@router.get(
    "/policies",
    response_model=List[PolicyListItem],
    summary="List all uploaded policies",
)
def list_policies(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    try:
        policies = db.query(Policy).order_by(Policy.created_at.desc()).offset(skip).limit(limit).all()
        return [
            PolicyListItem(
                id=p.id,
                filename=p.filename,
                file_size_bytes=p.file_size_bytes or 0,
                status=p.status,
                created_at=p.created_at,
                controls_count=len(p.controls),
            )
            for p in policies
        ]
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database query failed for policies.") from exc


@router.get(
    "/policies/{policy_id}",
    response_model=PolicyResponse,
    summary="Retrieve policy details and associated controls",
)
def get_policy(
    policy_id: str,
    db: Session = Depends(get_db),
):
    try:
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail=f"Policy with ID '{policy_id}' not found.")
        return policy
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database query failed for policy details.") from exc


def resolve_policy_file_path(policy: Policy) -> Optional[str]:
    """
    Locates the exact physical uploaded document file on disk across
    different working directory paths and naming schemes.
    """
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    search_dirs = [
        os.path.join(backend_root, "storage", "uploads"),
        os.path.join(os.getcwd(), "backend", "storage", "uploads"),
        os.path.join(os.getcwd(), "storage", "uploads"),
    ]

    # 1. Check direct file_path from DB
    if policy.file_path:
        candidates = [
            policy.file_path,
            os.path.abspath(policy.file_path),
            os.path.join(backend_root, policy.file_path),
            os.path.join(os.getcwd(), policy.file_path),
        ]
        for c in candidates:
            if c and os.path.exists(c) and os.path.isfile(c):
                return c

    # 2. Check candidate directories by policy ID and filename
    for s_dir in search_dirs:
        if os.path.exists(s_dir) and os.path.isdir(s_dir):
            # Exact UUID prefix match
            exact_name = f"{policy.id}_{policy.filename}"
            exact_path = os.path.join(s_dir, exact_name)
            if os.path.exists(exact_path) and os.path.isfile(exact_path):
                return exact_path

            # Prefix or suffix scan
            for fname in os.listdir(s_dir):
                if (policy.id and fname.startswith(str(policy.id))) or (policy.filename and fname.endswith(str(policy.filename))):
                    candidate = os.path.join(s_dir, fname)
                    if os.path.isfile(candidate):
                        return candidate

    return None


@router.get(
    "/policies/{policy_id}/file",
    summary="View or download the exact uploaded policy document directly",
)
def get_policy_file(
    policy_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the exact uploaded document byte-for-byte for inline browser viewing.
    Priority 1: Physical exact uploaded document on server disk (updates DB cache).
    Priority 2: Stored base64 binary document from PostgreSQL.
    Priority 3: Dynamically generated document from extracted policy text.
    """
    try:
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found.")

        filename = policy.filename or "policy_document.pdf"
        is_pdf_name = bool(filename.lower().endswith(".pdf"))
        safe_pdf_filename = filename if is_pdf_name else f"{filename}.pdf"

        # 1. Base64 database binary stream (primary: stored directly in PostgreSQL)
        if getattr(policy, "file_base64", None):
            try:
                pdf_bytes = base64.b64decode(policy.file_base64)
                if pdf_bytes and len(pdf_bytes) > 10:
                    media_type = "application/pdf" if (is_pdf_name or pdf_bytes.startswith(b"%PDF")) else "text/plain; charset=utf-8"
                    return Response(
                        content=pdf_bytes,
                        media_type=media_type,
                        headers={
                            "Content-Disposition": f'inline; filename="{filename}"',
                            "Content-Type": media_type,
                            "Cache-Control": "public, max-age=86400",
                        },
                    )
            except Exception as b64_err:
                print(f"[POLICY FILE WARNING] Base64 decode error: {b64_err}")

        # 2. Check physical file on server disk (legacy fallback)
        disk_path = resolve_policy_file_path(policy)
        if disk_path and os.path.exists(disk_path):
            media_type = "application/pdf" if is_pdf_name else "text/plain; charset=utf-8"
            return FileResponse(
                path=disk_path,
                filename=filename,
                media_type=media_type,
                content_disposition_type="inline",
                headers={
                    "Content-Disposition": f'inline; filename="{filename}"',
                    "Content-Type": media_type,
                    "Cache-Control": "public, max-age=86400",
                },
            )

        # 3. Dynamic PDF synthesis from raw extracted text (last fallback)
        if policy.raw_text and len(policy.raw_text.strip()) > 0:
            try:
                synthesized_pdf = generate_pdf_from_text(policy.raw_text, title=filename)
                return Response(
                    content=synthesized_pdf,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'inline; filename="{safe_pdf_filename}"',
                        "Content-Type": "application/pdf",
                        "Cache-Control": "public, max-age=3600",
                    },
                )
            except Exception as gen_err:
                print(f"[POLICY FILE WARNING] Dynamic PDF generation fallback: {gen_err}")
                return Response(
                    content=policy.raw_text.encode("utf-8"),
                    media_type="text/plain; charset=utf-8",
                    headers={"Content-Disposition": f'inline; filename="{filename}.txt"'},
                )

        raise HTTPException(status_code=404, detail="Policy document content is not available.")
    except HTTPException:
        raise
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read policy file: {str(exc)}") from exc


@router.delete(
    "/policies/{policy_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a policy, its controls, scans, and stored document file",
)
def delete_policy(
    policy_id: str,
    db: Session = Depends(get_db),
):
    """
    Deletes the policy record from database, cascades deletion of all its extracted controls
    and associated scan runs, and deletes the stored PDF document from the file system.
    """
    try:
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found.")

        policy_filename = policy.filename
        # Clean up physical file on disk using robust path resolution
        resolved_path = resolve_policy_file_path(policy) or policy.file_path
        if resolved_path and os.path.exists(resolved_path):
            try:
                os.remove(resolved_path)
            except Exception as file_err:
                print(f"[CLEANUP WARNING] Failed to delete file {resolved_path}: {file_err}")

        # Delete policy record (cascading deletes to child controls and scan_runs)
        db.delete(policy)
        db.commit()

        return {
            "status": "success",
            "message": f"Policy '{policy_filename}' and its associated controls were deleted successfully.",
            "policy_id": policy_id,
        }
    except HTTPException:
        db.rollback()
        raise
    except OperationalError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database operation failed while deleting policy.") from exc


@router.post(
    "/policies/{policy_id}/controls",
    response_model=ControlResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a custom control to a policy",
)
def add_control_to_policy(
    policy_id: str,
    control_in: ControlCreate,
    db: Session = Depends(get_db),
):
    try:
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found.")

        # Compute embedding for custom control
        emb = None
        try:
            emb = generate_embedding(f"{control_in.title}: {control_in.description} (Target: {control_in.target_asset_type})")
        except Exception as e:
            print(f"[EMBEDDING NOTICE] Custom control embedding skipped: {e}")

        new_ctrl = Control(
            policy_id=policy.id,
            control_id=control_in.control_id,
            title=control_in.title,
            description=control_in.description,
            target_asset_type=control_in.target_asset_type,
            metric_path=control_in.metric_path,
            operator=control_in.operator,
            threshold_value=control_in.threshold_value,
            severity=control_in.severity,
            category=control_in.category or "Custom Rule",
            remediation=control_in.remediation or "",
            embedding=emb,
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_ctrl)
        db.commit()
        db.refresh(new_ctrl)
        return new_ctrl
    except HTTPException:
        db.rollback()
        raise
    except OperationalError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database operation failed while adding control.") from exc


@router.put(
    "/controls/{control_id}",
    response_model=ControlResponse,
    summary="Update an existing control",
)
def update_control(
    control_id: str,
    control_update: ControlUpdate,
    db: Session = Depends(get_db),
):
    try:
        ctrl = db.query(Control).filter(Control.id == control_id).first()
        if not ctrl:
            # Also check if user passed the human-readable control_id code
            ctrl = db.query(Control).filter(Control.control_id == control_id).first()

        if not ctrl:
            raise HTTPException(status_code=404, detail=f"Control '{control_id}' not found.")

        update_data = control_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(ctrl, field):
                setattr(ctrl, field, value)

        # Regenerate embedding if core attributes changed
        try:
            ctrl.embedding = generate_embedding(f"{ctrl.title}: {ctrl.description} (Target: {ctrl.target_asset_type})")
        except Exception as e:
            print(f"[EMBEDDING NOTICE] Control update embedding skipped: {e}")

        db.commit()
        db.refresh(ctrl)
        return ctrl
    except HTTPException:
        db.rollback()
        raise
    except OperationalError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database operation failed while updating control.") from exc


@router.post(
    "/controls/backfill-embeddings",
    summary="Backfill vector embeddings for all existing controls in database",
)
def backfill_control_embeddings(
    db: Session = Depends(get_db),
):
    """
    Safely populates pgvector embeddings for any controls in the database
    that do not yet have an embedding generated. Does not alter or delete data.
    """
    try:
        controls_to_update = db.query(Control).filter(Control.embedding.is_(None)).all()
        if not controls_to_update:
            total_controls = db.query(Control).count()
            return {
                "status": "success",
                "message": "All controls already have embeddings populated.",
                "updated_count": 0,
                "total_controls": total_controls,
            }

        texts = [
            f"{c.title}: {c.description} (Target: {c.target_asset_type})"
            for c in controls_to_update
        ]
        embeddings = generate_embeddings(texts)

        for ctrl, emb in zip(controls_to_update, embeddings):
            ctrl.embedding = emb

        db.commit()
        return {
            "status": "success",
            "message": f"Successfully backfilled embeddings for {len(controls_to_update)} controls.",
            "updated_count": len(controls_to_update),
            "total_controls": db.query(Control).count(),
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to backfill control embeddings: {str(exc)}",
        )


@router.delete(
    "/controls/{control_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a control",
)
def delete_control(
    control_id: str,
    db: Session = Depends(get_db),
):
    try:
        ctrl = db.query(Control).filter(Control.id == control_id).first()
        if not ctrl:
            ctrl = db.query(Control).filter(Control.control_id == control_id).first()

        if not ctrl:
            raise HTTPException(status_code=404, detail=f"Control '{control_id}' not found.")

        db.delete(ctrl)
        db.commit()
        return {"status": "success", "message": f"Control '{control_id}' deleted."}
    except HTTPException:
        db.rollback()
        raise
    except OperationalError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE_DETAIL) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database operation failed while deleting control.") from exc
