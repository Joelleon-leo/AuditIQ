# 🛡️ AuditIQ — Policy-to-Evidence Compliance Platform

<p align="center">
  <strong>Transform static security & compliance policies into automated, AI-driven infrastructure audits in seconds.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.0+-61DAFB?style=flat&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL pgvector" />
  <img src="https://img.shields.io/badge/LangChain-Enabled-1C3C3C?style=flat" alt="LangChain" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
</p>

---

## 📑 Table of Contents
1. [🌟 What is AuditIQ? (In Simple Terms)](#-what-is-auditiq-in-simple-terms)
2. [🏗️ System Architecture](#️-system-architecture)
3. [✨ Key Features](#-key-features)
4. [📸 Application Walkthrough](#-application-walkthrough)
5. [⚙️ How the Evaluation Engine Works](#️-how-the-evaluation-engine-works)
6. [🛠️ Tech Stack](#️-tech-stack)
7. [🚀 Quickstart & Installation](#-quickstart--installation)
   - [Prerequisites](#prerequisites)
   - [1. Backend Setup](#1-backend-setup)
   - [2. Frontend Setup](#2-frontend-setup)
   - [3. Environment Variables](#3-environment-variables)
8. [🧪 Sample Evidence Payload for Testing](#-sample-evidence-payload-for-testing)
9. [📡 API Endpoints Summary](#-api-endpoints-summary)
10. [🤝 Contributing & License](#-contributing--license)

---

## 🌟 What is AuditIQ? (In Simple Terms)

In the real world, companies have lengthy security policies written in PDF documents (e.g., SOC 2, ISO 27001, internal company standards). These documents say things like:
- *"Database servers must have encryption at rest enabled."*
- *"Backups must be kept for at least 30 days."*
- *"All application servers must run TLS 1.2 or higher."*

Usually, human security auditors have to manually read these documents and inspect live servers to check if they match. **This is slow, tedious, and error-prone.**

### How AuditIQ solves this:
1. **You drop in a Policy PDF** 📄: AuditIQ’s AI reads the document, pulls out the exact technical rules ("controls"), and turns them into testable compliance benchmarks.
2. **You provide live infrastructure metrics** 📊: Pass in a JSON snapshot of your active servers, databases, or cloud resources.
3. **AuditIQ runs the audit automatically** ⚡: Using vector embeddings (`pgvector`) and an AI evaluation engine, it checks every single server against your policy rules and tells you instantly what **PASSED**, what **FAILED**, and **how to fix it**.

---

## 🏗️ System Architecture

<p align="center">
  <img src="./frontend/assets/AuditIQ_Architecture.png" alt="AuditIQ System Architecture & End-to-End Workflow" width="100%" />
</p>

### 🔄 The 4-Stage Workflow:
1. **Ingestion & Parsing**: PDFs are read in-memory with `pypdf`/`pdfplumber` without saving files to disk.
2. **Semantic Rule Extraction**: LangChain and LLM extract structured rules (`metric_path`, `threshold`, `operator`, `severity`).
3. **Vector Embeddings**: High-dimensional embeddings are generated for rules and stored in Neon PostgreSQL (`pgvector`).
4. **Compliance Evaluation**: Live JSON evidence metrics are matched semantically and evaluated with clear, explainable audit reasoning.

---

## ✨ Key Features

- 📑 **Zero-Disk PDF Processing**: Uploaded documents are parsed in-memory and stored directly inside PostgreSQL as secure base64 records.
- 🤖 **AI Rule Extraction**: Converts unstructured prose from PDFs into structured compliance controls with severity tags, operators, and target asset types.
- 🎯 **Semantic Vector Matching**: Understands field variations (e.g. `disk_usage` vs `disk_utilization_pct`) using `pgvector` embeddings.
- 🔍 **Asset-Level Auditing**: Evaluates each rule against every individual server, database, and container across your entire infrastructure fleet.
- 💡 **Explainable Audit Drawer**: Click on any audit finding to see the exact formula, expected condition, observed metric, and plain-English remediation instructions.
- 🕒 **Persistent Scan History**: Full audit trail of past compliance runs stored permanently in PostgreSQL with 1-click historical reload.

---

## 📸 Application Walkthrough

### 1. Landing Page & 4-Step Pipeline Overview
Intuitive enterprise interface presenting the automated compliance verification workflow.

<p align="center">
  <img src="./frontend/assets/Screenshot%202026-08-20%20151721.png" alt="AuditIQ Landing Page Hero" width="90%" />
</p>

<p align="center">
  <img src="./frontend/assets/Screenshot%202026-08-20%20151735.png" alt="AuditIQ 4-Step Workflow Pipeline" width="90%" />
</p>

---

### 2. Policy Ingestion & Interactive Document Viewer
Upload compliance PDF frameworks (SOC 2, ISO 27001, internal policies) and preview full document text and extracted controls inline.

<p align="center">
  <img src="./frontend/assets/Screenshot%202026-08-20%20151750.png" alt="Policy Upload and Extracted Controls Management" width="90%" />
</p>

<p align="center">
  <img src="./frontend/assets/Screenshot%202026-08-20%20154824.png" alt="Interactive In-Browser Policy PDF Viewer" width="90%" />
</p>

---

### 3. Custom Rule Builder & Evidence Ingestion
Define custom compliance rules with specific operators/thresholds and paste live infrastructure telemetry JSON into the scanner.

| Custom Rule Builder Modal | Telemetry Evidence JSON Editor |
|:---:|:---:|
| <img src="./frontend/assets/Screenshot%202026-08-20%20151804.png" width="480" alt="Create Custom Rule" /> | <img src="./frontend/assets/Screenshot%202026-08-20%20151906.png" width="480" alt="Evidence JSON Ingestion" /> |

---

### 4. Executive Summary & Asset-Level Audit Results
Instant compliance verdicts with pass/fail metrics, similarity match confidence scores, and individual asset breakdown.

<p align="center">
  <img src="./frontend/assets/Screenshot%202026-08-20%20164638.png" alt="Executive Summary Verdict and Detailed Audit Results Table" width="95%" />
</p>

---

## ⚙️ How the Evaluation Engine Works

When a compliance scan runs, AuditIQ calculates audit checkpoints across your fleet:

$$\text{Total Checkpoints} = \text{Extracted Policy Controls} \times \text{Applicable Infrastructure Assets}$$

```
                         ┌──► Checked on: prod-web-01        (Disk: 87%  -> FAILED ❌)
[AUD-001: Disk < 80%] ───┼──► Checked on: prod-db-01         (Disk: 76%  -> PASSED ✅)
                         └──► Checked on: metrics-resource   (Disk: 87%  -> FAILED ❌)

                         ┌──► Checked on: prod-web-01        (CPU: 91%   -> FAILED ❌)
[AUD-003: CPU < 85%]  ───┴──► Checked on: metrics-resource   (CPU: 91%   -> FAILED ❌)

[AUD-007: TLS >= 1.2]  ──► Checked on: prod-api-endpoint-01 (TLS: 1.1   -> FAILED ❌)
```

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| **Database & Vectors** | PostgreSQL 16+, `pgvector`, SQLAlchemy 2.0 |
| **AI & NLP Pipeline** | LangChain, OpenRouter / Gemini API, Sentence Embeddings |
| **Document Processing** | PyPDF, PDFPlumber, ReportLab |

---

## 🚀 Quickstart & Installation

### Prerequisites
Make sure you have installed on your machine:
- **Node.js** (v18 or higher) & **npm**
- **Python** (v3.11 or higher) & **pip**
- **Git**

---

### 1. Clone the Repository
```bash
git clone https://github.com/Joelleon-leo/AuditIQ.git
cd AuditIQ
```

---

### 2. Backend Setup

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # On macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` configuration file in the `backend/` folder:
   ```env
   # PostgreSQL Connection (Neon or local with pgvector)
   DATABASE_URL=postgresql+psycopg://username:password@host:port/database?sslmode=require

   # Application Settings
   PROJECT_NAME=AuditIQ Policy-to-Evidence Compliance Platform
   API_V1_STR=/api/v1
   ENVIRONMENT=development
   DEBUG=True

   # AI LLM Provider Configuration
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   GEMINI_MODEL_NAME=nvidia/nemotron-nano-9b-v2:free
   ```

5. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --port 8000 --reload
   ```
   > 🌐 Backend API documentation will be live at: `http://localhost:8000/docs`

---

### 3. Frontend Setup

1. Open a new terminal tab and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   > 🚀 The UI will be running at: `http://localhost:5173`

---

## 🧪 Sample Evidence Payload for Testing

You can copy and paste this sample payload directly into the **Evidence Scanner** tab to test compliance evaluation against your policy:

```json
{
  "metadata": {
    "scan_id": "PROD-AUDIT-2026-Q1",
    "environment": "production-aws-us-east-1"
  },
  "assets": [
    {
      "id": "prod-web-01",
      "type": "application_server",
      "cpu_utilization": 91.2,
      "memory_utilization": 84.0,
      "disk_utilization": 87.5,
      "patch_compliance_score": 92.0,
      "monitoring_enabled": false
    },
    {
      "id": "prod-db-01",
      "type": "database_server",
      "disk_utilization": 76.0,
      "memory_utilization": 93.4,
      "encryption_at_rest": false,
      "public_network_access": true,
      "backup_retention_days": 14,
      "patch_compliance_score": 98.0,
      "monitoring_enabled": true
    },
    {
      "id": "prod-api-endpoint-01",
      "type": "application_endpoint",
      "tls_version": 1.1,
      "ssl_certificate_valid": true
    }
  ]
}
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/policies/upload` | Upload a PDF policy, extract controls, and generate embeddings |
| `GET` | `/api/v1/policies` | List all saved policies and control counts |
| `GET` | `/api/v1/policies/{id}` | Get policy details and extracted controls |
| `GET` | `/api/v1/policies/{id}/file` | Stream or download original policy document |
| `DELETE` | `/api/v1/policies/{id}` | Delete a policy, its controls, and scan history |
| `POST` | `/api/v1/scans/execute` | Execute AI compliance audit against evidence payload |
| `GET` | `/api/v1/scans/recent` | Retrieve historical compliance scan runs |
| `GET` | `/api/v1/scans/{id}` | Retrieve specific persisted scan audit results |

---

## 🤝 Contributing & License

Contributions, issues, and feature requests are welcome!

Distributed under the **MIT License**. See `LICENSE` for more information.
