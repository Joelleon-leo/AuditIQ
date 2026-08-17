from typing import List 
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from app.core.config import settings
from app.schemas.control import ExtractedControlItem, ExtractedControlsList


EXTRACTION_SYSTEM_PROMPT = """You are a Principal AI Governance & Compliance Architect.
Your task is to analyze the provided security or compliance policy document text and extract EVERY actionable, testable technical rule/control.

CRITICAL EXTRACTION RULES:
1. `control_id`: If the document contains explicit control codes/IDs (e.g. 'INFRA-001', 'INFRA-002', 'SEC-01', 'CC6.1-ENCRYPT', 'IAM-02'), you MUST use that exact control_id. Do NOT invent generic 'RULE-001' IDs when document IDs exist.
2. `title`: Concise, clear title of the security control (e.g., 'CPU Utilization', 'Auto-Scaling', 'Memory Utilization', 'Environment Tagging'). Do NOT use section headings or entire raw sentences as titles.
3. `description`: Full, clear statement of what is required by the policy requirement.
4. DO NOT extract section headings (e.g., 'Policy Requirements', 'Purpose', 'Scope', 'Audit and Remediation', 'Table of Contents') or background metadata sentences (e.g., 'This policy defines internal infrastructure governance...') as controls. Extract ONLY real compliance requirements.
5. `target_asset_type`: Standardize to one of: 'database_server', 'storage_bucket', 'container_node', 'api_gateway', 'identity_provider', or 'all'.
6. `metric_path`: Telemetry metric field (e.g., 'cpu_utilization', 'auto_scaling_enabled', 'memory_utilization', 'environment', 'encryption_at_rest').
7. `operator`: Choose from 'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL', 'in', 'exists'.
8. `threshold_value`: Benchmark value (e.g., '85', '90', 'true', 'production').
9. `severity`: Risk impact: 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW'.
10. `category`: Domain name (e.g., 'Infrastructure Governance', 'Data Protection', 'Access Control').
11. `remediation`: Step-by-step engineering instructions to resolve non-compliance.
"""


def get_llm():
    """Instantiates the configured LLM client via OpenRouter."""
    api_key = getattr(settings, "active_gemini_api_key", "") or getattr(settings, "OPENROUTER_API_KEY", "")

    if not api_key:
        raise ValueError(
            "LLM API key is missing. Ensure OPENROUTER_API_KEY is configured in .env."
        )

    base_url = None
    if api_key.startswith("sk-or-v1-") or settings.LLM_PROVIDER.lower() == "openrouter":
        base_url = getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    return ChatOpenAI(
        model=settings.GEMINI_MODEL_NAME,
        api_key=api_key,
        openai_api_base=base_url,
        temperature=0.0,
    )


def extract_controls_with_langchain(
    policy_text: str,
) -> List[ExtractedControlItem]:
    """
    Extract compliance controls directly from policy text using OpenRouter LLM.
    No local fallback parsing is used.
    """

    if not policy_text or not policy_text.strip():
        raise ValueError(
            "Policy text is empty. Cannot extract compliance controls."
        )

    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                EXTRACTION_SYSTEM_PROMPT,
            ),
            (
                "human",
                "Extract all actionable compliance controls from "
                "this policy document text:\n\n{policy_text}",
            ),
        ]
    )

    structured_llm = llm.with_structured_output(
        ExtractedControlsList,
        method="json_schema",
    )

    chain = prompt | structured_llm

    result: ExtractedControlsList = chain.invoke(
        {
            "policy_text": policy_text,
        }
    )

    if not result or not result.controls:
        raise RuntimeError("OpenRouter LLM returned no compliance controls from document text.")

    print(f"[OpenRouter LLM] Extracted {len(result.controls)} controls from policy document.")
    return result.controls