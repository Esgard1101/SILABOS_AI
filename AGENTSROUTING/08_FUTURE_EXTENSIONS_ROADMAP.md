# Future Extensions: Supabase Storage, RAG, and Visual AI Assistant

## Purpose
This document provides the architectural roadmap and specifications for two high-priority future features:
1. **Cloud-Native Storage & RAG:** Moving syllabus-specific files (PDFs, docs) to isolated folders in Supabase Storage to enable Retrieval-Augmented Generation (RAG).
2. **Visual Context AI Assistant:** A multimodal support chat that uses real-time screenshots to provide click-by-click guidance to teachers.

## When To Read This
Read this before:
- Implementing the transition from local VPS storage to Supabase Storage.
- Designing the vector database schema for RAG.
- Starting the development of the UI-aware "Teacher Guide" assistant (Estimated timeline: ~2 months).

## Key Files (Proposed)
- `silabos-backend/services/storage_service.py` (New)
- `silabos-backend/services/rag_engine.py` (New)
- `silabos-backend/routers/assistant.py` (New)
- `silabos-frontend/src/hooks/useScreenCapture.ts` (New)
- `silabos-frontend/src/components/assistant/VisualChat.tsx` (New)

## Endpoints And Contracts (Draft)
### Storage & RAG
- `POST /api/syllabi/{id}/files/upload`: Uploads to `buckets/syllabi/{syllabus_id}/filename.pdf`.
- `POST /api/syllabi/{id}/files/process-rag`: Triggers vectorization of syllabus-specific folder.
- `GET /api/syllabi/{id}/files`: Lists files in the syllabus-specific bucket.

### Visual Assistant
- `POST /api/assistant/visual-query`: Receives `{ prompt: string, screenshot_base64: string, current_route: string }`.
- Returns: `{ message: string, highlight_selector?: string, coordinates?: { x, y } }`.

## Data Flow
### RAG Isolation Flow
1. Teacher uploads document in Step 2.
2. Backend uses `StorageService` to save file in a dedicated folder: `syllabi/{syllabus_id}/{file_id}.pdf`.
3. An background job (or Edge Function) extracts text and generates embeddings.
4. Embeddings are stored in `syllabus_embeddings` table, tagged with `syllabus_id`.
5. During unit generation, the prompt is enriched with context *only* from the syllabus-specific folder.

### Visual Assistant Flow
1. Teacher clicks "Help" in any wizard step.
2. Frontend captures a screenshot of the current viewport (e.g., via `html2canvas` or `getDisplayMedia`).
3. Screenshot + question are sent to a multimodal LLM (e.g., Gemini 1.5 Pro or GPT-4o).
4. AI analyzes the screenshot vs. the teacher's intent.
5. AI returns prose instructions + a CSS selector to highlight the exact button/field the teacher needs to interact with.

## Tables / Persistence
- `syllabus_embeddings`: `(id, syllabus_id, content, embedding_vector, metadata_json)`
- `assistant_logs`: `(id, user_id, prompt, image_url_ref, ai_response)`

## Approved Decisions
- **Strict Isolation:** Every syllabus draft MUST have its own isolated folder in Supabase Storage. No global shared folders for syllabus-specific RAG context.
- **Multimodal UI Guidance:** The assistant must not just guess based on text; it must "see" the screen to account for dynamic UI states (errors, empty states, loading).
- **Latency/Cost Optimization:** The visual assistant is deferred (approx. 2 months) until multimodal token costs and quality meet production stability requirements.

## Known Risks And Anti-Patterns
- **Privacy:** Screenshots may contain sensitive browser data. Frontend must mask or warn before sending.
- **Token Usage:** Sending full-resolution screenshots on every chat turn is expensive. Use low-res or compressed versions for UI analysis.
- **RAG Drift:** Ensure that if a syllabus is deleted, its Storage folder and all associated embeddings are purged.
- **VPS Memory:** Offloading storage to Supabase is mandatory to keep the 4GB RAM VPS stable for Python logic and job management.

## Cross-Module Impact
- [01_WIZARD_OFFICIAL_DATA.md](01_WIZARD_OFFICIAL_DATA.md): Step 2 (Fuentes) must be updated to handle Supabase Storage URLs instead of local paths.
- [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md): The unit prompt will incorporate RAG-retrieved context from the isolated bucket.
- [06_AI_PROVIDERS_DB_OPERATIONS.md](06_AI_PROVIDERS_DB_OPERATIONS.md): New routing for multimodal models (e.g., `GEMINI_VISUAL_MODEL`).

## Suggested Verification
- Verify Supabase RLS policies allow users to read/write ONLY their own syllabus folders.
- Test screenshot compression to ensure it remains legible for the AI but small enough for fast POST requests.

## Recursive Update Notes
Update this file when:
- The first Supabase bucket is provisioned.
- The multimodal assistant PoC (Proof of Concept) is initiated.
- The cost-to-quality ratio for visual LLMs is re-evaluated.
