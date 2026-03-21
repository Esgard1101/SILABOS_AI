# Servicio RAG — pgvector + embeddings Gemini
# Indexa documentos subidos y responde con contexto semántico.
# Regla crítica: RAG SOLO sobre documentos ya subidos — NO búsquedas en internet.
#
# IMPORTANTE: Los espacios de embedding de gemini-embedding-001
# y gemini-embedding-2-preview son INCOMPATIBLES.
# Si se cambia el modelo en .env, re-ejecutar index_document()
# para todos los documentos existentes en document_embeddings.
# Modelo activo: gemini-embedding-2-preview (configurable en .env)
#
# SQL para habilitar pgvector y crear la tabla (ejecutar una vez en Supabase):
#
#   CREATE EXTENSION IF NOT EXISTS vector;
#
#   CREATE TABLE IF NOT EXISTS document_embeddings (
#     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
#     doc_id        UUID NOT NULL,
#     chunk_text    TEXT NOT NULL,
#     embedding     vector(768),
#     metadata_json JSONB,
#     created_at    TIMESTAMPTZ DEFAULT now()
#   );
#
#   CREATE INDEX IF NOT EXISTS idx_doc_embeddings_doc_id
#     ON document_embeddings(doc_id);

import json
import logging
import os

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Conexión DB
# ──────────────────────────────────────────────

def _get_db_conn():
    """Conexión directa con psycopg2 para operaciones vectoriales con pgvector."""
    return psycopg2.connect(os.getenv("DATABASE_URL", ""))


# ──────────────────────────────────────────────
# Chunking de texto
# ──────────────────────────────────────────────

def _chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> list[str]:
    """
    Divide texto en chunks con overlap.
    ~2000 caracteres ≈ 512 tokens; overlap 200 chars ≈ 50 tokens.
    """
    if not text or not text.strip():
        return []

    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= text_len:
            break
        start = end - overlap

    return chunks


# ──────────────────────────────────────────────
# Indexación
# ──────────────────────────────────────────────

async def index_document(doc_id: str, text: str, metadata: dict) -> int:
    """
    Indexa un documento en pgvector.
    Si ya está indexado, elimina los chunks anteriores y re-indexa.
    Devuelve el número de chunks indexados.
    """
    from services.gemini_service import generate_embedding

    if not text or not text.strip():
        logger.warning(f"Documento {doc_id} sin texto, no se indexa")
        return 0

    chunks = _chunk_text(text)
    if not chunks:
        return 0

    conn = _get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                # Eliminar indexación anterior del mismo documento
                cur.execute(
                    "DELETE FROM document_embeddings WHERE doc_id = %s::uuid",
                    (doc_id,),
                )
                deleted = cur.rowcount
                if deleted > 0:
                    logger.info(f"Re-indexando {doc_id}: eliminados {deleted} chunks anteriores")

                inserted = 0
                for i, chunk in enumerate(chunks):
                    try:
                        embedding = generate_embedding(chunk)
                        vector_str = "[" + ",".join(str(x) for x in embedding) + "]"
                        chunk_metadata = {
                            **metadata,
                            "chunk_index": i,
                            "total_chunks": len(chunks),
                        }
                        cur.execute(
                            """
                            INSERT INTO document_embeddings
                                (id, doc_id, chunk_text, embedding, metadata_json)
                            VALUES
                                (gen_random_uuid(), %s::uuid, %s, %s::vector, %s::jsonb)
                            """,
                            (doc_id, chunk, vector_str, json.dumps(chunk_metadata)),
                        )
                        inserted += 1
                    except Exception as e:
                        logger.warning(f"Error al indexar chunk {i} de doc {doc_id}: {e}")
                        continue

        logger.info(f"Documento {doc_id}: {inserted}/{len(chunks)} chunks indexados")
        return inserted
    finally:
        conn.close()


async def is_indexed(doc_id: str) -> bool:
    """Verifica si un documento ya tiene chunks en pgvector."""
    try:
        conn = _get_db_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM document_embeddings WHERE doc_id = %s::uuid",
                    (doc_id,),
                )
                count = cur.fetchone()[0]
        finally:
            conn.close()
        return count > 0
    except Exception as e:
        logger.warning(f"Error al verificar índice de {doc_id}: {e}")
        return False


# ──────────────────────────────────────────────
# Búsqueda semántica
# ──────────────────────────────────────────────

async def query_documents(
    query: str,
    doc_ids: list[str],
    top_k: int = 5,
) -> list[dict]:
    """
    Búsqueda semántica con pgvector (operador <=> = distancia coseno).
    Devuelve los top_k chunks más similares a la query.
    """
    from services.gemini_service import generate_query_embedding

    try:
        query_embedding = generate_query_embedding(query)
        vector_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        conn = _get_db_conn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if doc_ids:
                    doc_ids_pg = "{" + ",".join(doc_ids) + "}"
                    cur.execute(
                        """
                        SELECT chunk_text, metadata_json,
                               1 - (embedding <=> %s::vector) AS similarity
                        FROM document_embeddings
                        WHERE doc_id = ANY(%s::uuid[])
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (vector_str, doc_ids_pg, vector_str, top_k),
                    )
                else:
                    cur.execute(
                        """
                        SELECT chunk_text, metadata_json,
                               1 - (embedding <=> %s::vector) AS similarity
                        FROM document_embeddings
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (vector_str, vector_str, top_k),
                    )
                rows = cur.fetchall()
        finally:
            conn.close()

        results = [
            {
                "chunk_text": row["chunk_text"],
                "metadata": row["metadata_json"] or {},
                "similarity": float(row["similarity"]),
            }
            for row in rows
        ]
        logger.info(f"RAG query: {len(results)} chunks para '{query[:50]}'")
        return results

    except Exception as e:
        logger.error(f"Error en búsqueda vectorial: {e}")
        return []


# ──────────────────────────────────────────────
# Pipeline RAG completo
# ──────────────────────────────────────────────

async def answer_with_context(query: str, doc_ids: list[str]) -> str:
    """
    Pipeline RAG: recupera chunks relevantes y genera respuesta con contexto.
    """
    from services.gemini_service import generate_content

    chunks = await query_documents(query, doc_ids, top_k=5)

    if not chunks:
        return "No encontré información sobre eso en los documentos cargados."

    # Filtrar por umbral mínimo de relevancia
    relevant = [c for c in chunks if c.get("similarity", 0) > 0.3]
    if not relevant:
        return "No encontré información suficientemente relevante en los documentos cargados."

    context = "\n\n".join(
        f"[Fragmento {i}]\n{c['chunk_text']}"
        for i, c in enumerate(relevant, 1)
    )

    prompt = f"""# CONTEXTO DE DOCUMENTOS INSTITUCIONALES
{context}

# PREGUNTA
{query}

# INSTRUCCIÓN
Responde basándote SOLO en el contexto provisto.
Si la respuesta no está en el contexto, indícalo claramente.
Cita la sección del documento cuando sea posible.
"""
    return await generate_content(prompt)
