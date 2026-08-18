from typing import List, Optional
import logging
from langchain_openai import OpenAIEmbeddings
from app.core.config import settings

logger = logging.getLogger("auditiq.embeddings")


def get_embeddings_client() -> OpenAIEmbeddings:
    """Instantiates the embedding client via OpenRouter or OpenAI."""
    api_key = getattr(settings, "active_gemini_api_key", "") or getattr(settings, "OPENROUTER_API_KEY", "")
    if not api_key:
        raise ValueError("API key is missing. Ensure OPENROUTER_API_KEY is configured in .env.")

    base_url = None
    if api_key.startswith("sk-or-v1-") or settings.LLM_PROVIDER.lower() == "openrouter":
        base_url = getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    return OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL_NAME,
        api_key=api_key,
        openai_api_base=base_url,
        check_embedding_ctx_length=False,
    )


def generate_embedding(text: str) -> List[float]:
    """Generates an embedding vector for a single text input."""
    if not text or not text.strip():
        raise ValueError("Cannot generate embedding for empty text.")

    client = get_embeddings_client()
    vector = client.embed_query(text.strip())
    return vector


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a batch of text inputs."""
    valid_texts = [t.strip() if (t and t.strip()) else "empty" for t in texts]
    if not valid_texts:
        return []

    client = get_embeddings_client()
    vectors = client.embed_documents(valid_texts)
    return vectors
