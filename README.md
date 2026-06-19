# Enterprise Knowledge AI

A multi-tenant Retrieval-Augmented Generation (RAG) platform that lets organizations upload their internal documents and query them through natural language, with LLM-generated, citation-aware answers.

Built with **FastAPI**, **PostgreSQL**, **FAISS**, **Ollama**, and **OpenAI**.

---

## Overview

Enterprise Knowledge AI enables companies to turn their internal documents into a searchable knowledge base. Each company (tenant) has isolated data, users, roles, and permissions. Users can upload documents, which are chunked and embedded into a vector store, and then ask questions in a chat interface that retrieves relevant context and generates grounded, citation-aware responses.

## Key Features

- **Multi-tenant architecture** — company-scoped data isolation across documents, embeddings, and chat sessions
- **Role-based access control (RBAC)** — auth dependencies, permissions, and role management for fine-grained access
- **Document ingestion pipeline** — chunking, embedding generation, and indexing for uploaded files
- **Pluggable vector stores** — support for FAISS, Chroma, and Pinecone via a common interface
- **Pluggable LLM providers** — switch between local models (Ollama), local embedding models, and OpenAI
- **Citation-aware retrieval** — responses reference the source chunks they were generated from
- **Persistent chat sessions** — conversation history stored per user/company
- **REST API** — FastAPI backend with routes for auth, users, ingestion, and chat
- **Streamlit frontend** — login, registration, dashboard, user management, document upload, and chat UI
- **Database migrations** — schema versioning via Alembic
- **Containerized setup** — Docker Compose for local development

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Streamlit UI    │──────▶│   FastAPI Backend │──────▶│   PostgreSQL      │
│  (frontend/)     │       │   (app/)          │       │   (db/)           │
└─────────────────┘       └──────────────────┘       └──────────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  ▼                 ▼                 ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │ Ingestion     │  │ RAG /         │  │ Vector Store  │
          │ Service       │  │ Retrieval     │  │ (FAISS /      │
          │ (chunking +   │  │ Service       │  │  Chroma /     │
          │ embedding)    │  │ (LLM + cite)  │  │  Pinecone)    │
          └──────────────┘  └──────────────┘  └──────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| Vector Search | FAISS (default), Chroma, Pinecone |
| LLMs | Ollama (local), OpenAI |
| Embeddings | Local embedding model + pluggable factory |
| Frontend | Streamlit |
| Auth | JWT-based auth with role/permission middleware |
| Containerization | Docker Compose |

## Project Structure

```
enterprise-knowledge-ai/
├── alembic/                  # Database migrations
├── app/
│   ├── dependencies/         # Auth, permissions, roles dependency injection
│   ├── middleware/            # Request middleware
│   ├── routes/                # API routes (auth, chat, ingest, users)
│   │   └── schemas/           # Pydantic request/response schemas
│   ├── core/                  # Config, constants, logging, security, utils
│   ├── db/
│   │   ├── repositories/      # Data access layer
│   │   ├── models.py           # ORM models
│   │   └── embeddings/         # Embedding model factory + local model
│   ├── services/               # Business logic (auth, chat, ingestion, RAG, retrieval, users, company)
│   ├── vector_store/            # FAISS / Chroma / Pinecone implementations behind a common interface
│   └── main.py
├── frontend/
│   ├── components/             # Reusable Streamlit components (auth guard, sidebar)
│   ├── pages/                   # Login, Register, Dashboard, Users, Upload, Chat
│   ├── llm/                      # LLM provider implementations (Ollama, OpenAI) + factory
│   └── app.py
├── storage/
│   ├── files/                    # Per-company uploaded files
│   └── vector/                    # Per-company FAISS indexes + metadata
├── tests/
├── docker-compose.yml
├── alembic.ini
├── requirements.txt
└── .env
```

## Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL
- Docker & Docker Compose (optional, for containerized setup)
- [Ollama](https://ollama.com) running locally (if using local LLMs)
- An OpenAI API key (if using OpenAI models)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/enterprise-knowledge-ai.git
   cd enterprise-knowledge-ai
   ```

2. **Create a virtual environment and install dependencies**
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/enterprise_knowledge_ai
   SECRET_KEY=your-secret-key
   OPENAI_API_KEY=your-openai-key
   OLLAMA_BASE_URL=http://localhost:11434
   VECTOR_STORE=faiss
   ```

4. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend**
   ```bash
   uvicorn app.main:app --reload
   ```

6. **Start the frontend**
   ```bash
   streamlit run frontend/app.py
   ```

### Using Docker Compose

```bash
docker-compose up --build
```

## Usage

1. **Register** a company and admin user via the Register page.
2. **Log in** to access the dashboard.
3. **Upload documents** — files are chunked, embedded, and indexed automatically per company.
4. **Chat** with your knowledge base — ask questions and get answers grounded in your uploaded documents, with citations back to source chunks.
5. **Manage users** and roles from the Users page (admin only).

## API Endpoints (high level)

| Route group | Description |
|---|---|
| `/auth` | Registration, login, token refresh |
| `/users` | User management (CRUD, roles) |
| `/ingest` | Document upload and ingestion |
| `/chat` | Query the knowledge base, manage chat sessions |

> Full interactive API docs available at `/docs` once the backend is running (FastAPI Swagger UI).

## Roadmap / Ideas for Improvement

- [ ] Add support for additional document formats (PDF tables, scanned docs via OCR)
- [ ] Streaming responses in the chat UI
- [ ] Admin analytics dashboard (usage, query volume per company)
- [ ] Hybrid search (keyword + semantic)
- [ ] Rate limiting per tenant

## License

This project is licensed under the MIT License.

## Author

Built by Sanket Gadekar — feel free to connect or reach out with questions.
