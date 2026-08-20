import json
import uuid
import random

def create_element(
    el_type,
    x,
    y,
    width,
    height,
    text=None,
    stroke_color="#1e293b",
    bg_color="#ffffff",
    fill_style="solid",
    stroke_width=2,
    font_size=16,
    text_align="center",
    roundness=3,
    points=None,
    start_binding=None,
    end_binding=None,
    custom_id=None,
    line_height=1.25,
    font_family=1
):
    el_id = custom_id or f"elem_{uuid.uuid4().hex[:8]}"
    seed = random.randint(1000, 999999)
    version = random.randint(10, 100)
    version_nonce = random.randint(100000, 9999999)

    element = {
        "id": el_id,
        "type": el_type,
        "x": float(x),
        "y": float(y),
        "width": float(width),
        "height": float(height),
        "angle": 0,
        "strokeColor": stroke_color,
        "backgroundColor": bg_color,
        "fillStyle": fill_style,
        "strokeWidth": stroke_width,
        "strokeStyle": "solid",
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": {"type": roundness} if roundness else None,
        "seed": seed,
        "version": version,
        "versionNonce": version_nonce,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1787143000000,
        "link": None,
        "locked": False,
    }

    if el_type == "text":
        element.update({
            "text": text or "",
            "fontSize": font_size,
            "fontFamily": font_family,
            "textAlign": text_align,
            "verticalAlign": "middle",
            "baseline": int(font_size * 0.8),
            "containerId": None,
            "originalText": text or "",
            "lineHeight": line_height,
            "autoResize": True
        })
    elif el_type == "arrow":
        element.update({
            "points": points or [[0, 0], [width, height]],
            "lastCommittedPoint": None,
            "startBinding": start_binding,
            "endBinding": end_binding,
            "startArrowhead": None,
            "endArrowhead": "arrow",
            "elbowed": False
        })

    return element

def build_diagram():
    elements = []

    # Title Container
    title_box = create_element(
        "rectangle",
        x=500, y=40, width=720, height=80,
        stroke_color="#d97706", bg_color="#fffbeb", roundness=3, stroke_width=2,
        custom_id="main_title_box"
    )
    title_text = create_element(
        "text",
        x=520, y=55, width=680, height=28,
        text="AuditIQ: Evidence & Comparison Engine Deep Dive",
        font_size=24, stroke_color="#92400e", text_align="center",
        custom_id="main_title_text"
    )
    subtitle_text = create_element(
        "text",
        x=520, y=88, width=680, height=20,
        text="Detailed Workflow: 7. Ingestion & Unpacking  ➜  8. Semantic Cosine Matching  ➜  9. Hybrid Evaluation",
        font_size=14, stroke_color="#b45309", text_align="center",
        custom_id="main_subtitle_text"
    )
    elements.extend([title_box, title_text, subtitle_text])

    # 3 Main Phase Columns
    # Col 1: Phase 4 - Ingest & Unpack (x=60)
    # Col 2: Phase 5 - Semantic Vector Matching (x=620)
    # Col 3: Phase 5 - Hybrid Evaluation Engine (x=1180)

    lane_width = 500
    lane_height = 1180
    y_start = 160

    lanes_config = [
        {
            "id": "lane_step7",
            "x": 60,
            "header_color": "#fef3c7",
            "border_color": "#d97706",
            "title_color": "#92400e",
            "title": "PHASE 4: Step 7 — Ingest & Unpack Evidence",
            "desc": "Arbitrary JSON/PDF Normalization, Recursive Object Traversal & Metric Extraction"
        },
        {
            "id": "lane_step8",
            "x": 600,
            "header_color": "#ffedd5",
            "border_color": "#ea580c",
            "title_color": "#9a3412",
            "title": "PHASE 5: Step 8 — Semantic Vector Cosine Matching",
            "desc": "Dense Embeddings Generation, Control Vector Database Retrieval & Cosine Similarity Matrix"
        },
        {
            "id": "lane_step9",
            "x": 1140,
            "header_color": "#fee2e2",
            "border_color": "#dc2626",
            "title_color": "#991b1b",
            "title": "PHASE 5: Step 9 — Hybrid Evaluation Engine",
            "desc": "Dual-Path Execution: Deterministic Rule Validator + OpenRouter LLM Cognitive Auditor"
        }
    ]

    for lane in lanes_config:
        # Background container
        bg = create_element(
            "rectangle",
            x=lane["x"], y=y_start, width=lane_width, height=lane_height,
            stroke_color=lane["border_color"], bg_color="#fffdfa",
            stroke_width=2, roundness=3, custom_id=f"{lane['id']}_bg"
        )
        header = create_element(
            "rectangle",
            x=lane["x"], y=y_start, width=lane_width, height=75,
            stroke_color=lane["border_color"], bg_color=lane["header_color"],
            stroke_width=2, roundness=3, custom_id=f"{lane['id']}_header"
        )
        title = create_element(
            "text",
            x=lane["x"] + 15, y=y_start + 12, width=lane_width - 30, height=26,
            text=lane["title"], font_size=18, stroke_color=lane["title_color"], text_align="center",
            custom_id=f"{lane['id']}_title"
        )
        desc = create_element(
            "text",
            x=lane["x"] + 15, y=y_start + 42, width=lane_width - 30, height=20,
            text=lane["desc"], font_size=11, stroke_color="#78350f", text_align="center",
            custom_id=f"{lane['id']}_subtitle"
        )
        elements.extend([bg, header, title, desc])

    # ==========================================
    # LANE 1 (Step 7: Ingest & Unpack Evidence) Details
    # ==========================================
    # 7.1 Input Sources (Raw JSON Telemetry & PDF Documents)
    box7_1 = create_element(
        "rectangle",
        x=85, y=260, width=450, height=130,
        stroke_color="#f59e0b", bg_color="#ffffff", roundness=3, custom_id="box7_1"
    )
    box7_1_t = create_element(
        "text",
        x=100, y=272, width=420, height=22,
        text="7.1 Multi-Source Evidence Ingestion", font_size=16, stroke_color="#92400e", text_align="left"
    )
    box7_1_b = create_element(
        "text",
        x=100, y=298, width=420, height=80,
        text="• Ingests Raw Telemetry / Cloud Configs (JSON, YAML, API)\n• Ingests Audit Reports, Architecture PDFs, System Logs\n• Dynamic payloads (nested arrays, single objects, multi-cloud)\n• Retains raw evidence context for audit traceability",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box7_1, box7_1_t, box7_1_b])

    # Arrow 7.1 -> 7.2
    arr7_1_2 = create_element(
        "arrow",
        x=310, y=390, width=0, height=45,
        points=[[0, 0], [0, 45]], stroke_color="#d97706",
        start_binding={"elementId": "box7_1", "focus": 0, "gap": 0},
        end_binding={"elementId": "box7_2", "focus": 0, "gap": 0}
    )
    elements.append(arr7_1_2)

    # 7.2 Recursive Structure Normalizer (`extract_evidence_items`)
    box7_2 = create_element(
        "rectangle",
        x=85, y=435, width=450, height=155,
        stroke_color="#f59e0b", bg_color="#ffffff", roundness=3, custom_id="box7_2"
    )
    box7_2_t = create_element(
        "text",
        x=100, y=447, width=420, height=22,
        text="7.2 Recursive Structural Normalizer", font_size=16, stroke_color="#92400e", text_align="left"
    )
    box7_2_b = create_element(
        "text",
        x=100, y=473, width=420, height=105,
        text="• Unpacks root envelope keys ('evidence', 'data', 'assets', 'payload')\n• Recursively walks nested resource categories ('servers', 'databases')\n• Propagates parent context & environment hints ('prod', 'staging')\n• Flattens hierarchical structures into atomic evidence items",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box7_2, box7_2_t, box7_2_b])

    # Arrow 7.2 -> 7.3
    arr7_2_3 = create_element(
        "arrow",
        x=310, y=590, width=0, height=45,
        points=[[0, 0], [0, 45]], stroke_color="#d97706",
        start_binding={"elementId": "box7_2", "focus": 0, "gap": 0},
        end_binding={"elementId": "box7_3", "focus": 0, "gap": 0}
    )
    elements.append(arr7_2_3)

    # 7.3 Asset Identifier & Scalar Metric Extractor
    box7_3 = create_element(
        "rectangle",
        x=85, y=635, width=450, height=170,
        stroke_color="#f59e0b", bg_color="#ffffff", roundness=3, custom_id="box7_3"
    )
    box7_3_t = create_element(
        "text",
        x=100, y=647, width=420, height=22,
        text="7.3 Asset Identification & Metric Extraction", font_size=16, stroke_color="#92400e", text_align="left"
    )
    box7_3_b = create_element(
        "text",
        x=100, y=673, width=420, height=120,
        text="• Resolves Asset Identity: 'hostname', 'url', 'id', 'name', 'asset_id'\n• Identifies Asset Type: server, database, endpoint, infra\n• Separates scalar telemetry metrics from metadata\n• Normalizes keys: 'disk_utilization' ➔ 'disk utilization'\n• Preserves values: '68%', '35 days', 'TLS 1.3', True/False",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box7_3, box7_3_t, box7_3_b])

    # Arrow 7.3 -> 7.4
    arr7_3_4 = create_element(
        "arrow",
        x=310, y=805, width=0, height=45,
        points=[[0, 0], [0, 45]], stroke_color="#d97706",
        start_binding={"elementId": "box7_3", "focus": 0, "gap": 0},
        end_binding={"elementId": "box7_4", "focus": 0, "gap": 0}
    )
    elements.append(arr7_3_4)

    # 7.4 Normalized Evidence Statements Formulation
    box7_4 = create_element(
        "rectangle",
        x=85, y=850, width=450, height=175,
        stroke_color="#f59e0b", bg_color="#ffffff", roundness=3, custom_id="box7_4"
    )
    box7_4_t = create_element(
        "text",
        x=100, y=862, width=420, height=22,
        text="7.4 Normalized Evidence Statements", font_size=16, stroke_color="#92400e", text_align="left"
    )
    box7_4_b = create_element(
        "text",
        x=100, y=888, width=420, height=125,
        text="• Generates atomic natural-language statements:\n  \"In prod environment, server 'web-01' has disk utilization = 68%.\"\n  \"Database 'prod-db' has encryption at rest = True.\"\n• Attaches payload metadata: asset_id, metric_key, actual_value\n• Prepares statement array ready for vector embedding",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box7_4, box7_4_t, box7_4_b])

    # Output Card of Step 7
    box7_out = create_element(
        "rectangle",
        x=85, y=1050, width=450, height=90,
        stroke_color="#059669", bg_color="#ecfdf5", roundness=3, stroke_width=1.5, custom_id="box7_out"
    )
    box7_out_t = create_element(
        "text",
        x=100, y=1060, width=420, height=20,
        text="OUTPUT: Structured Evidence Stream [ { statement, asset_id, metric_key, value, raw } ]",
        font_size=13, stroke_color="#065f46", text_align="left"
    )
    box7_out_b = create_element(
        "text",
        x=100, y=1085, width=420, height=45,
        text="Ready for semantic representation and vectorized cross-referencing against active compliance controls.",
        font_size=12, stroke_color="#047857", text_align="left"
    )
    elements.extend([box7_out, box7_out_t, box7_out_b])

    # Arrow Step 7 -> Step 8
    arr_lane1_to_2 = create_element(
        "arrow",
        x=535, y=935, width=85, height=0,
        points=[[0, 0], [85, 0]], stroke_color="#059669", stroke_width=3,
        start_binding={"elementId": "box7_4", "focus": 0, "gap": 0},
        end_binding={"elementId": "box8_1", "focus": 0, "gap": 0}
    )
    elements.append(arr_lane1_to_2)


    # ==========================================
    # LANE 2 (Step 8: Semantic Vector Cosine Matching) Details
    # ==========================================
    # 8.1 Evidence Statements Dense Embedding
    box8_1 = create_element(
        "rectangle",
        x=625, y=260, width=450, height=135,
        stroke_color="#ea580c", bg_color="#ffffff", roundness=3, custom_id="box8_1"
    )
    box8_1_t = create_element(
        "text",
        x=640, y=272, width=420, height=22,
        text="8.1 Dense Embedding Generation", font_size=16, stroke_color="#9a3412", text_align="left"
    )
    box8_1_b = create_element(
        "text",
        x=640, y=298, width=420, height=85,
        text="• Ingests batch of evidence statements into `generate_embeddings()`\n• Utilizes OpenAI / OpenRouter embeddings client (1536 dims)\n• Generates dense semantic vector representation:\n  Vec(Evidence) = [ e_1, e_2, e_3, ... e_1536 ]",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box8_1, box8_1_t, box8_1_b])

    # 8.2 Database Policy Controls Vector Retrieval
    box8_2 = create_element(
        "rectangle",
        x=625, y=435, width=450, height=155,
        stroke_color="#ea580c", bg_color="#ffffff", roundness=3, custom_id="box8_2"
    )
    box8_2_t = create_element(
        "text",
        x=640, y=447, width=420, height=22,
        text="8.2 Policy Control Vectors in PostgreSQL", font_size=16, stroke_color="#9a3412", text_align="left"
    )
    box8_2_b = create_element(
        "text",
        x=640, y=473, width=420, height=105,
        text="• Queries all active Controls for selected Policy in database\n• Auto-generates missing embeddings on-the-fly:\n  \"{title}: {description} (Target: {target_asset_type})\"\n• Loads pre-computed control vectors into memory:\n  Vec(Control_k) = [ c_1, c_2, ... c_1536 ]",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box8_2, box8_2_t, box8_2_b])

    # Arrow 8.1 -> 8.3 and 8.2 -> 8.3
    arr8_1_3 = create_element(
        "arrow",
        x=750, y=395, width=0, height=240,
        points=[[0, 0], [0, 240]], stroke_color="#ea580c",
        start_binding={"elementId": "box8_1", "focus": 0, "gap": 0},
        end_binding={"elementId": "box8_3", "focus": 0, "gap": 0}
    )
    arr8_2_3 = create_element(
        "arrow",
        x=850, y=590, width=0, height=45,
        points=[[0, 0], [0, 45]], stroke_color="#ea580c",
        start_binding={"elementId": "box8_2", "focus": 0, "gap": 0},
        end_binding={"elementId": "box8_3", "focus": 0, "gap": 0}
    )
    elements.extend([arr8_1_3, arr8_2_3])

    # 8.3 Cosine Similarity Matrix Engine
    box8_3 = create_element(
        "rectangle",
        x=625, y=635, width=450, height=170,
        stroke_color="#ea580c", bg_color="#ffffff", roundness=3, custom_id="box8_3"
    )
    box8_3_t = create_element(
        "text",
        x=640, y=647, width=420, height=22,
        text="8.3 Vector Cosine Similarity Matrix", font_size=16, stroke_color="#9a3412", text_align="left"
    )
    box8_3_b = create_element(
        "text",
        x=640, y=673, width=420, height=120,
        text="• Computes pairwise similarity between Evidence & Controls:\n  Similarity = (E · C) / ( ||E|| * ||C|| )\n• Compares semantic intent beyond simple keyword matches\n  (e.g., 'disk space 68%' matches 'storage capacity thresholds')\n• Produces ranked control affinity list per evidence item",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box8_3, box8_3_t, box8_3_b])

    # Arrow 8.3 -> 8.4
    arr8_3_4 = create_element(
        "arrow",
        x=850, y=805, width=0, height=45,
        points=[[0, 0], [0, 45]], stroke_color="#ea580c",
        start_binding={"elementId": "box8_3", "focus": 0, "gap": 0},
        end_binding={"elementId": "box8_4", "focus": 0, "gap": 0}
    )
    elements.append(arr8_3_4)

    # 8.4 Top-K Ranking & Threshold Filtering
    box8_4 = create_element(
        "rectangle",
        x=625, y=850, width=450, height=175,
        stroke_color="#ea580c", bg_color="#ffffff", roundness=3, custom_id="box8_4"
    )
    box8_4_t = create_element(
        "text",
        x=640, y=862, width=420, height=22,
        text="8.4 Top Match & Threshold Filtering (>= 0.15)", font_size=16, stroke_color="#9a3412", text_align="left"
    )
    box8_4_b = create_element(
        "text",
        x=640, y=888, width=420, height=125,
        text="• Sorts candidates by similarity score descending\n• [Score >= 0.15] Match Accepted:\n  Binds Evidence Item ➜ Top Policy Control (Title, Operator, Rule)\n• [Score < 0.15] No Match:\n  Flags evidence as UNMATCHED / INSUFFICIENT_EVIDENCE\n• Yields paired (Evidence, Target Control, SimScore)",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box8_4, box8_4_t, box8_4_b])

    # Output Card of Step 8
    box8_out = create_element(
        "rectangle",
        x=625, y=1050, width=450, height=90,
        stroke_color="#2563eb", bg_color="#eff6ff", roundness=3, stroke_width=1.5, custom_id="box8_out"
    )
    box8_out_t = create_element(
        "text",
        x=640, y=1060, width=420, height=20,
        text="OUTPUT: Semantic Control Bindings (Evidence ↔ Policy Control)",
        font_size=13, stroke_color="#1e40af", text_align="left"
    )
    box8_out_b = create_element(
        "text",
        x=640, y=1085, width=420, height=45,
        text="Every telemetry item is accurately paired with its regulatory requirement and mathematical benchmark.",
        font_size=12, stroke_color="#1d4ed8", text_align="left"
    )
    elements.extend([box8_out, box8_out_t, box8_out_b])

    # Arrow Step 8 -> Step 9
    arr_lane2_to_3 = create_element(
        "arrow",
        x=1075, y=935, width=85, height=0,
        points=[[0, 0], [85, 0]], stroke_color="#2563eb", stroke_width=3,
        start_binding={"elementId": "box8_4", "focus": 0, "gap": 0},
        end_binding={"elementId": "box9_1", "focus": 0, "gap": 0}
    )
    elements.append(arr_lane2_to_3)


    # ==========================================
    # LANE 3 (Step 9: Hybrid Evaluation Engine) Details
    # ==========================================
    # 9.1 Dual-Path Evaluation Router
    box9_1 = create_element(
        "rectangle",
        x=1165, y=260, width=450, height=110,
        stroke_color="#dc2626", bg_color="#ffffff", roundness=3, custom_id="box9_1"
    )
    box9_1_t = create_element(
        "text",
        x=1180, y=272, width=420, height=22,
        text="9.1 Hybrid Dual-Path Evaluation Router", font_size=16, stroke_color="#991b1b", text_align="left"
    )
    box9_1_b = create_element(
        "text",
        x=1180, y=298, width=420, height=65,
        text="• Inspects Control Type, Operator & Telemetry Metric Type\n• Route 1 ➜ Deterministic Rule Engine (Numeric/Boolean/Enums)\n• Route 2 ➜ LLM Cognitive Auditor (Natural language, complex)",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box9_1, box9_1_t, box9_1_b])

    # Split Arrows: Router -> Path A and Router -> Path B
    arr9_1_a = create_element(
        "arrow",
        x=1280, y=370, width=-30, height=45,
        points=[[0, 0], [-30, 45]], stroke_color="#059669",
        start_binding={"elementId": "box9_1", "focus": 0, "gap": 0},
        end_binding={"elementId": "box9_2a", "focus": 0, "gap": 0}
    )
    arr9_1_b = create_element(
        "arrow",
        x=1500, y=370, width=30, height=45,
        points=[[0, 0], [30, 45]], stroke_color="#7c3aed",
        start_binding={"elementId": "box9_1", "focus": 0, "gap": 0},
        end_binding={"elementId": "box9_2b", "focus": 0, "gap": 0}
    )
    elements.extend([arr9_1_a, arr9_1_b])

    # Path A: Fast Deterministic Engine (`evaluate_rule_deterministic`)
    box9_2a = create_element(
        "rectangle",
        x=1165, y=415, width=215, height=225,
        stroke_color="#059669", bg_color="#f0fdf4", roundness=3, stroke_width=1.5, custom_id="box9_2a"
    )
    box9_2a_t = create_element(
        "text",
        x=1175, y=425, width=195, height=38,
        text="Path A: Deterministic Rule Engine (0ms)", font_size=14, stroke_color="#065f46", text_align="left"
    )
    box9_2a_b = create_element(
        "text",
        x=1175, y=468, width=195, height=160,
        text="• Boolean Match:\n  EQUALS, NOT_EQUALS\n  (True/False, 1/0, on/off)\n• Numeric Comparison:\n  <, <=, >, >=, ==, !=\n  (68% < 80% ➜ PASS)\n  (35d >= 30d ➜ PASS)\n• String Enums & IN\n• Instant 100% confidence\n• Zero LLM API latency",
        font_size=11.5, stroke_color="#166534", text_align="left"
    )
    elements.extend([box9_2a, box9_2a_t, box9_2a_b])

    # Path B: LLM Cognitive Auditor (`evaluate_control_with_llm`)
    box9_2b = create_element(
        "rectangle",
        x=1400, y=415, width=215, height=225,
        stroke_color="#7c3aed", bg_color="#faf5ff", roundness=3, stroke_width=1.5, custom_id="box9_2b"
    )
    box9_2b_t = create_element(
        "text",
        x=1410, y=425, width=195, height=38,
        text="Path B: LLM Cognitive Auditor (OpenRouter)", font_size=14, stroke_color="#5b21b6", text_align="left"
    )
    box9_2b_b = create_element(
        "text",
        x=1410, y=468, width=195, height=160,
        text="• LangChain ChatPrompt\n• Injects Control description +\n  observed raw JSON evidence\n• Strict Auditor System Rules:\n  Strict JSON schema return\n  No hallucinated facts\n• Fallback regex parser\n• Handles complex multi-factor text statements",
        font_size=11.5, stroke_color="#6b21a8", text_align="left"
    )
    elements.extend([box9_2b, box9_2b_t, box9_2b_b])

    # Merge Arrows into 9.3
    arr9_2a_3 = create_element(
        "arrow",
        x=1272, y=640, width=50, height=30,
        points=[[0, 0], [50, 30]], stroke_color="#059669",
        start_binding={"elementId": "box9_2a", "focus": 0, "gap": 0},
        end_binding={"elementId": "box9_3", "focus": 0, "gap": 0}
    )
    arr9_2b_3 = create_element(
        "arrow",
        x=1508, y=640, width=-50, height=30,
        points=[[0, 0], [-50, 30]], stroke_color="#7c3aed",
        start_binding={"elementId": "box9_2b", "focus": 0, "gap": 0},
        end_binding={"elementId": "box9_3", "focus": 0, "gap": 0}
    )
    elements.extend([arr9_2a_3, arr9_2b_3])

    # 9.3 Verdict & Remediation Generation
    box9_3 = create_element(
        "rectangle",
        x=1165, y=675, width=450, height=155,
        stroke_color="#dc2626", bg_color="#ffffff", roundness=3, custom_id="box9_3"
    )
    box9_3_t = create_element(
        "text",
        x=1180, y=687, width=420, height=22,
        text="9.3 Verdict, Reasoning & Remediation Synthesizer", font_size=16, stroke_color="#991b1b", text_align="left"
    )
    box9_3_b = create_element(
        "text",
        x=1180, y=713, width=420, height=105,
        text="• Determines Verdict: COMPLIANT | NON_COMPLIANT | INSUFFICIENT\n• Generates Audit Reasoning with factual metric justification\n• Generates Engineering Remediation steps for failed controls\n• Assigns Confidence Score (0.0 to 1.0) and Severity Level\n• Records Evaluation Method: 'DETERMINISTIC' vs 'SEMANTIC_VECTOR'",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box9_3, box9_3_t, box9_3_b])

    # Arrow 9.3 -> 9.4
    arr9_3_4 = create_element(
        "arrow",
        x=1390, y=830, width=0, height=35,
        points=[[0, 0], [0, 35]], stroke_color="#dc2626",
        start_binding={"elementId": "box9_3", "focus": 0, "gap": 0},
        end_binding={"elementId": "box9_4", "focus": 0, "gap": 0}
    )
    elements.append(arr9_3_4)

    # 9.4 Summary & Compliance Rollup Engine
    box9_4 = create_element(
        "rectangle",
        x=1165, y=865, width=450, height=160,
        stroke_color="#dc2626", bg_color="#ffffff", roundness=3, custom_id="box9_4"
    )
    box9_4_t = create_element(
        "text",
        x=1180, y=877, width=420, height=22,
        text="9.4 Compliance Summary & Aggregation Rollup", font_size=16, stroke_color="#991b1b", text_align="left"
    )
    box9_4_b = create_element(
        "text",
        x=1180, y=903, width=420, height=110,
        text="• Calculates aggregate statistics across all audited assets:\n  - total_checks, passed_count, failed_count, not_evaluable_count\n• Computes overall compliance status (100% pass required for COMPLIANT)\n• Packages full audit result records with UUID result_ids\n• Saves run to PostgreSQL & streams to React UI Dashboard",
        font_size=13, stroke_color="#475569", text_align="left"
    )
    elements.extend([box9_4, box9_4_t, box9_4_b])

    # Output Card of Step 9
    box9_out = create_element(
        "rectangle",
        x=1165, y=1050, width=450, height=90,
        stroke_color="#dc2626", bg_color="#fef2f2", roundness=3, stroke_width=1.5, custom_id="box9_out"
    )
    box9_out_t = create_element(
        "text",
        x=1180, y=1060, width=420, height=20,
        text="FINAL AUDIT REPORT: Verdicts, Remediation Plans & UI Dashboard",
        font_size=13, stroke_color="#991b1b", text_align="left"
    )
    box9_out_b = create_element(
        "text",
        x=1180, y=1085, width=420, height=45,
        text="Factual audit trails, instant developer remediation actions, and automated compliance certification.",
        font_size=12, stroke_color="#b91c1c", text_align="left"
    )
    elements.extend([box9_out, box9_out_t, box9_out_b])

    # Legend / Key at the bottom
    legend_box = create_element(
        "rectangle",
        x=300, y=1380, width=1100, height=80,
        stroke_color="#64748b", bg_color="#f8fafc", roundness=3, stroke_width=1.5, custom_id="legend_box"
    )
    legend_title = create_element(
        "text",
        x=320, y=1390, width=1060, height=20,
        text="KEY ARCHITECTURAL HIGHLIGHTS & DESIGN PRINCIPLES", font_size=14, stroke_color="#334155", text_align="center"
    )
    legend_text = create_element(
        "text",
        x=320, y=1415, width=1060, height=35,
        text="1. Universal Ingestion (Zero fixed schemas)   |   2. Semantic Cosine Affinity (Threshold: 0.15)   |   3. Hybrid Dual-Path (Deterministic 0ms + LLM Cognitive Fallback)",
        font_size=13, stroke_color="#475569", text_align="center"
    )
    elements.extend([legend_box, legend_title, legend_text])

    diagram = {
        "type": "excalidraw",
        "version": 2,
        "source": "https://excalidraw.com",
        "elements": elements,
        "appState": {
            "gridSize": 20,
            "gridStep": 5,
            "gridModeEnabled": False,
            "viewBackgroundColor": "#ffffff"
        },
        "files": {}
    }

    return diagram

if __name__ == "__main__":
    diag = build_diagram()
    output_path = r"d:\Documents2\Projects\AuditIQ\AuditIQ_Evidence_Comparison_Engine_DeepDive.excalidraw"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(diag, f, indent=2)
    print(f"Excalidraw diagram successfully written to: {output_path}")
    print(f"Total elements: {len(diag['elements'])}")
