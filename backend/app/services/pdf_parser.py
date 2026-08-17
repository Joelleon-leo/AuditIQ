import io
import re
from typing import Tuple


def extract_text_from_pdf_bytes(pdf_bytes: bytes, filename: str = "document.pdf") -> Tuple[str, int]:
    """
    Extracts raw text and total pages from an in-memory PDF byte stream.
    Gracefully handles encrypted, multi-page, or plain-text files.
    """
    if not pdf_bytes:
        raise ValueError("Provided file buffer is empty.")

    # If user uploaded a markdown or text file directly
    if filename.lower().endswith((".txt", ".md", ".json", ".yaml", ".yml")):
        try:
            text = pdf_bytes.decode("utf-8")
            return clean_extracted_text(text), 1
        except Exception:
            text = pdf_bytes.decode("latin-1", errors="ignore")
            return clean_extracted_text(text), 1

    extracted_pages = []
    total_pages = 0

    # Primary extractor: pypdf
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(pdf_bytes))
        total_pages = len(reader.pages)

        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                extracted_pages.append(f"--- PAGE {idx + 1} ---\n{page_text.strip()}")
    except Exception as pypdf_err:
        print(f"[PDFParser] pypdf extraction notice: {pypdf_err}. Trying secondary parser...")

    # Secondary fallback extractor: pdfplumber
    if not extracted_pages:
        try:
            import pdfplumber

            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                total_pages = len(pdf.pages)
                for idx, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        extracted_pages.append(f"--- PAGE {idx + 1} ---\n{page_text.strip()}")
        except Exception as plumber_err:
            print(f"[PDFParser] pdfplumber fallback notice: {plumber_err}")

    # If binary extraction found valid pages
    if extracted_pages:
        full_text = "\n\n".join(extracted_pages)
        return clean_extracted_text(full_text), total_pages

    # Fallback to UTF-8 / ASCII string extraction if format is text-like
    try:
        decoded = pdf_bytes.decode("utf-8", errors="ignore")
        cleaned = clean_extracted_text(decoded)
        if len(cleaned) > 20:
            return cleaned, 1
    except Exception:
        pass

    raise ValueError(
        f"Unable to extract text from '{filename}'. Please ensure the PDF is not password-protected or image-only."
    )


def clean_extracted_text(text: str) -> str:
    """Normalizes excessive whitespace, strange characters, and formatting artifacts."""
    # Replace non-breaking spaces
    text = text.replace("\xa0", " ")
    # Replace multiple empty lines with maximum 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove null bytes
    text = text.replace("\x00", "")
    return text.strip()
