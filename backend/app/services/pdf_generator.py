import io
import re
from typing import List


def generate_pdf_from_text(raw_text: str, title: str = "Policy Document") -> bytes:
    """
    Generates a clean, valid standard PDF 1.4 binary stream directly from text
    without external system dependencies.
    Produces formatted pages with title headers, metadata, and body text.
    """
    # Clean text
    clean_lines = raw_text.splitlines()
    pages_lines: List[List[str]] = []
    current_page: List[str] = []
    lines_per_page = 44

    for raw_line in clean_lines:
        line = raw_line.rstrip()
        # Page divider check
        if re.match(r"^---\s*PAGE\s*\d+\s*---$", line.strip(), re.IGNORECASE):
            if current_page:
                pages_lines.append(current_page)
                current_page = []
            continue

        # Wrap long lines (> 85 characters)
        while len(line) > 85:
            split_idx = line.rfind(" ", 0, 85)
            if split_idx == -1:
                split_idx = 85
            current_page.append(line[:split_idx])
            line = line[split_idx:].lstrip()
            if len(current_page) >= lines_per_page:
                pages_lines.append(current_page)
                current_page = []

        current_page.append(line)
        if len(current_page) >= lines_per_page:
            pages_lines.append(current_page)
            current_page = []

    if current_page or not pages_lines:
        pages_lines.append(current_page if current_page else ["(Empty Document)"])

    total_pages = len(pages_lines)

    # PDF Object Builder
    objects = []
    offsets = []

    def add_object(content: str) -> int:
        obj_num = len(objects) + 1
        objects.append((obj_num, content))
        return obj_num

    # Catalog & Outlines & Pages root forward declarations
    # Obj 1: Catalog
    # Obj 2: Outlines
    # Obj 3: Pages
    # Obj 4: Font Standard
    # Obj 5: Font Bold

    # 1. Catalog
    add_object("<< /Type /Catalog /Pages 3 0 R >>")
    # 2. Outlines
    add_object("<< /Type /Outlines /Count 0 >>")
    # 3. Pages Root (placeholder, will fill in page IDs)
    page_obj_ids = []

    # 4. Standard Font (Helvetica)
    add_object("<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    # 5. Bold Font (Helvetica-Bold)
    add_object("<< /Type /Font /Subtype /Type1 /Name /F2 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

    # Generate Page and Content Stream objects
    for page_num, lines in enumerate(pages_lines, start=1):
        # Build stream text
        stream_cmds = []

        # Top Header Banner Bar
        stream_cmds.append("q")
        stream_cmds.append("0.94 0.96 0.98 rg")  # light blue-gray background
        stream_cmds.append("36 752 540 40 re f")
        stream_cmds.append("0.2 0.3 0.6 RG 1.5 w")  # border
        stream_cmds.append("36 752 540 40 re S")
        stream_cmds.append("Q")

        # Header Title
        safe_title = title.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_cmds.append("BT")
        stream_cmds.append("/F2 12 Tf")
        stream_cmds.append("0.1 0.2 0.4 rg")
        stream_cmds.append("48 768 Td")
        stream_cmds.append(f"({safe_title[:60]}) Tj")
        stream_cmds.append("ET")

        # Header Page Number
        stream_cmds.append("BT")
        stream_cmds.append("/F1 9 Tf")
        stream_cmds.append("0.4 0.4 0.5 rg")
        stream_cmds.append(f"510 768 Td")
        stream_cmds.append(f"(Page {page_num} of {total_pages}) Tj")
        stream_cmds.append("ET")

        # Body Text
        stream_cmds.append("BT")
        stream_cmds.append("/F1 9.5 Tf")
        stream_cmds.append("13.5 TL")
        stream_cmds.append("0.15 0.15 0.2 rg")
        stream_cmds.append("45 730 Td")

        for line in lines:
            safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            # Highlight Section Headings or Control IDs in bold/blue
            if (
                safe_line.startswith("AUD-")
                or safe_line.startswith("Control ID:")
                or safe_line.startswith("Policy ID:")
                or safe_line.isupper()
                and len(safe_line) < 40
            ):
                stream_cmds.append("/F2 10 Tf")
                stream_cmds.append("0.1 0.2 0.6 rg")
                stream_cmds.append(f"({safe_line}) '")
                stream_cmds.append("/F1 9.5 Tf")
                stream_cmds.append("0.15 0.15 0.2 rg")
            else:
                stream_cmds.append(f"({safe_line}) '")

        stream_cmds.append("ET")

        # Footer divider line
        stream_cmds.append("q 0.7 0.7 0.7 RG 0.5 w 40 40 m 572 40 l S Q")
        stream_cmds.append("BT /F1 8 Tf 0.5 0.5 0.5 rg 45 28 Td (AuditIQ Automated Compliance Document Viewer) Tj ET")

        stream_data = "\n".join(stream_cmds).encode("latin-1", errors="replace")
        stream_len = len(stream_data)

        # Content Stream Object
        content_obj_id = len(objects) + 2  # next object
        page_obj_id = len(objects) + 1

        page_obj_ids.append(page_obj_id)

        # Add Page Object
        page_obj_content = (
            f"<< /Type /Page /Parent 3 0 R "
            f"/MediaBox [0 0 612 792] "
            f"/Contents {content_obj_id} 0 R "
            f"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>"
        )
        add_object(page_obj_content)

        # Add Content Stream Object
        stream_obj_content = f"<< /Length {stream_len} >>\nstream\n{stream_data.decode('latin-1')}\nendstream"
        add_object(stream_obj_content)

    # Now update Object 3 (Pages Root) with the actual page object IDs
    kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    pages_root_content = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_obj_ids)} >>"
    objects[2] = (3, pages_root_content)

    # Serialize PDF binary
    output = io.BytesIO()
    output.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    xref_offsets = [0]
    for obj_num, content in objects:
        offset = output.tell()
        xref_offsets.append(offset)
        output.write(f"{obj_num} 0 obj\n{content}\nendobj\n".encode("latin-1"))

    xref_start = output.tell()
    num_entries = len(objects) + 1
    output.write(f"xref\n0 {num_entries}\n".encode("latin-1"))
    output.write(b"0000000000 65535 f \n")
    for offset in xref_offsets[1:]:
        output.write(f"{offset:010d} 00000 n \n".encode("latin-1"))

    output.write(
        f"trailer\n<< /Size {num_entries} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("latin-1")
    )

    return output.getvalue()
