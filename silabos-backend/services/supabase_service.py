# Servicio de base de datos — PostgreSQL directo con SQLAlchemy + psycopg2
# Sin SDK de Supabase. Lee DATABASE_URL del .env para conectarse.
# Los PDFs se guardan en disco local en la carpeta /uploads.

import asyncio
import io
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import bcrypt
import PyPDF2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Carpeta local de uploads (se crea si no existe)
# ──────────────────────────────────────────────
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _normalize_database_url(database_url: str) -> str:
    """
    Acepta URLs estilo postgres:// y las normaliza al formato que
    SQLAlchemy espera para psycopg2.
    """
    if database_url.startswith("postgres://"):
        return "postgresql+psycopg2://" + database_url[len("postgres://"):]
    if database_url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + database_url[len("postgresql://"):]
    return database_url


def _flatten_text_items(value) -> list[str]:
    """Extrae texto desde JSONB legacy string[] o desde objetos {codigo, items}."""
    if value is None:
        return []
    if isinstance(value, str):
        text_value = value.strip()
        return [text_value] if text_value else []
    if isinstance(value, (int, float, bool)):
        return [str(value)]
    if isinstance(value, list):
        flattened: list[str] = []
        for item in value:
            flattened.extend(_flatten_text_items(item))
        return flattened
    if isinstance(value, dict):
        if isinstance(value.get("items"), list):
            return _flatten_text_items(value.get("items"))
        flattened: list[str] = []
        for item in value.values():
            flattened.extend(_flatten_text_items(item))
        return flattened
    return []


class SupabaseService:
    """
    Servicio de base de datos con SQLAlchemy síncrono + psycopg2.
    Todos los métodos son async; las operaciones bloqueantes se ejecutan
    en un hilo del pool usando asyncio.to_thread().
    """

    def __init__(self):
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError(
                "DATABASE_URL no está configurada en .env. "
                "Formato esperado: postgresql+psycopg2://usuario:contraseña@host:puerto/basededatos"
            )
        database_url = _normalize_database_url(database_url)

        # Motor síncrono con psycopg2
        self._engine = create_engine(
            database_url,
            pool_pre_ping=True,      # Verifica la conexión antes de usarla
            pool_size=5,
            max_overflow=10,
            connect_args={"options": "-c timezone=utc"},
        )
        self._Session = sessionmaker(bind=self._engine, autocommit=False, autoflush=False)
        self._ensure_runtime_schema_sync()
        logger.info("SupabaseService inicializado con SQLAlchemy + psycopg2")

    # ──────────────────────────────────────────────
    # Ejecución segura en hilo (evita bloquear el event loop)
    # ──────────────────────────────────────────────

    async def _ejecutar(self, func, *args, **kwargs):
        """Corre una función síncrona en un hilo del pool del SO."""
        return await asyncio.to_thread(func, *args, **kwargs)

    def _ensure_runtime_schema_sync(self) -> None:
        """
        Ajustes de esquema requeridos por el sprint actual.
        Se ejecutan al iniciar para no depender de una migracion manual.
        """
        with self._Session() as sesion:
            sesion.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'")
            )
            sesion.execute(
                text("UPDATE users SET status = 'active' WHERE status IS NULL")
            )
            sesion.execute(
                text("ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active'")
            )
            sesion.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR")
            )
            sesion.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'local'")
            )
            sesion.execute(
                text("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL")
            )
            sesion.execute(
                text("ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'local'")
            )
            sesion.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID")
            )
            sesion.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ")
            )
            sesion.execute(
                text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique
                    ON users (google_sub)
                    WHERE google_sub IS NOT NULL
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS course_sumilla_revisions (
                        id UUID PRIMARY KEY,
                        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                        previous_sumilla TEXT,
                        new_sumilla TEXT NOT NULL,
                        changed_by UUID REFERENCES users(id),
                        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_course_sumilla_revisions_course_id_changed_at
                    ON course_sumilla_revisions (course_id, changed_at DESC)
                    """
                )
            )
            # ── Tabla de referencias bibliográficas parseadas desde NotebookLM ──
            sesion.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS course_bibliography_refs (
                        id UUID PRIMARY KEY,
                        course_id VARCHAR NOT NULL,
                        doc_id VARCHAR NOT NULL,
                        ref_text TEXT NOT NULL,
                        ref_order INT NOT NULL DEFAULT 0,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_course_bibliography_refs_course_id
                    ON course_bibliography_refs (course_id)
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_course_bibliography_refs_doc_id
                    ON course_bibliography_refs (doc_id)
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    ALTER TABLE IF EXISTS syllabus_units
                    ADD COLUMN IF NOT EXISTS required_skills JSONB NOT NULL DEFAULT '[]'::jsonb
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS ai_generation_jobs (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
                        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        job_type VARCHAR(80) NOT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'running', 'done', 'error')),
                        unit_number INT,
                        request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                        result_json JSONB,
                        error_message TEXT,
                        attempts INT NOT NULL DEFAULT 0,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        started_at TIMESTAMPTZ,
                        finished_at TIMESTAMPTZ,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_user_active
                    ON ai_generation_jobs(user_id, status, created_at DESC)
                    WHERE status IN ('pending', 'running')
                    """
                )
            )
            sesion.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_syllabus
                    ON ai_generation_jobs(syllabus_id, created_at DESC)
                    """
                )
            )
            sesion.commit()

    # ──────────────────────────────────────────────
    # SÍLABOS
    # ──────────────────────────────────────────────

    def _guardar_silabo_sync(self, silabo_dict: dict) -> dict:
        """Inserta el sílabo completo en la tabla syllabi (operación síncrona)."""
        datos_generales = silabo_dict.get("datos_generales", {})
        course_id = datos_generales.get("course_id", "")
        doc_id = str(uuid.uuid4())
        ahora = datetime.now(timezone.utc).isoformat()

        with self._Session() as sesion:
            sesion.execute(
                text("""
                    INSERT INTO syllabi
                        (id, course_id, semester, teacher_name, payload_json, created_at)
                    VALUES
                        (:id, :course_id, :semestre, :docente,
                         :payload_json::jsonb, :created_at)
                """),
                {
                    "id": doc_id,
                    "course_id": course_id,
                    "semestre": datos_generales.get("semestre", ""),
                    "docente": datos_generales.get("docente", ""),
                    "payload_json": json.dumps(silabo_dict, ensure_ascii=False),
                    "created_at": ahora,
                },
            )
            sesion.commit()

        logger.info(f"Sílabo guardado con ID: {doc_id}")
        return {"id": doc_id, "created_at": ahora, **silabo_dict}

    async def guardar_silabo(self, silabo_dict: dict) -> dict:
        """Guarda un sílabo generado en la tabla syllabi."""
        try:
            return await self._ejecutar(self._guardar_silabo_sync, silabo_dict)
        except Exception as e:
            logger.error(f"Error al guardar sílabo: {e}")
            return {}

    def _obtener_silabo_sync(self, silabo_id: str) -> Optional[dict]:
        """Obtiene un sílabo por su UUID (operación síncrona)."""
        with self._Session() as sesion:
            resultado = sesion.execute(
                text("SELECT id, course_id, semester, teacher_name, payload_json, created_at FROM syllabi WHERE id = :id"),
                {"id": silabo_id},
            ).mappings().first()

        if resultado:
            fila = dict(resultado)
            if isinstance(fila.get("payload_json"), str):
                fila["payload_json"] = json.loads(fila["payload_json"])
            return fila
        return None

    async def obtener_silabo(self, silabo_id: str) -> Optional[dict]:
        """Obtiene un sílabo por su ID."""
        try:
            return await self._ejecutar(self._obtener_silabo_sync, silabo_id)
        except Exception as e:
            logger.error(f"Error al obtener sílabo {silabo_id}: {e}")
            return None

    def _listar_silabos_sync(self, skip: int, limit: int) -> list:
        """Lista sílabos con paginación (operación síncrona)."""
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT id, course_id, semester, teacher_name, created_at
                    FROM syllabi
                    ORDER BY created_at DESC
                    LIMIT :limit OFFSET :skip
                """),
                {"limit": limit, "skip": skip},
            ).mappings().all()
        return [dict(f) for f in filas]

    async def listar_silabos(self, skip: int = 0, limit: int = 20) -> list:
        """Lista sílabos con paginación simple."""
        try:
            return await self._ejecutar(self._listar_silabos_sync, skip, limit)
        except Exception as e:
            logger.error(f"Error al listar sílabos: {e}")
            return []

    # ──────────────────────────────────────────────
    # DOCUMENTOS CURRICULARES
    # ──────────────────────────────────────────────

    def _obtener_docs_carrera_sync(self, carrera_id: str) -> list:
        """Obtiene los documentos de una carrera (operación síncrona)."""
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT id, name, career_id, storage_path, text_content, created_at
                    FROM curriculum_docs
                    WHERE career_id = :carrera_id
                    ORDER BY created_at DESC
                """),
                {"carrera_id": carrera_id},
            ).mappings().all()
        docs = [dict(f) for f in filas]
        logger.info(f"Se encontraron {len(docs)} documentos para carrera {carrera_id}")
        return docs

    async def obtener_docs_carrera(self, carrera_id: str) -> list:
        """
        Obtiene los documentos curriculares de una carrera.
        Devuelve lista de documentos con su texto extraído.
        """
        try:
            return await self._ejecutar(self._obtener_docs_carrera_sync, carrera_id)
        except Exception as e:
            logger.error(f"Error al obtener docs de carrera {carrera_id}: {e}")
            return []

    async def descargar_texto_doc(self, storage_path: str) -> str:
        """
        Lee un PDF desde la carpeta local /uploads y retorna su texto extraído.
        storage_path es la ruta relativa dentro de UPLOADS_DIR.
        """
        try:
            ruta_completa = UPLOADS_DIR / storage_path
            logger.info(f"Leyendo documento local: {ruta_completa}")

            if not ruta_completa.exists():
                logger.warning(f"Archivo no encontrado en disco: {ruta_completa}")
                return ""

            pdf_bytes = await asyncio.to_thread(ruta_completa.read_bytes)
            texto = self._extraer_texto_pdf(pdf_bytes)
            logger.info(f"Texto extraído: {len(texto)} caracteres de {storage_path}")
            return texto

        except Exception as e:
            logger.error(f"Error al leer PDF desde disco {storage_path}: {e}")
            return ""

    def _extraer_texto_pdf(self, pdf_bytes: bytes) -> str:
        """Extrae texto plano de un PDF usando PyPDF2 (operación síncrona)."""
        try:
            lector = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            paginas = []
            for num, pagina in enumerate(lector.pages):
                try:
                    texto_pagina = pagina.extract_text()
                    if texto_pagina:
                        paginas.append(texto_pagina)
                except Exception as e:
                    logger.warning(f"No se pudo extraer texto de la página {num}: {e}")
            return "\n".join(paginas)
        except Exception as e:
            logger.error(f"Error al leer PDF con PyPDF2: {e}")
            return ""

    def _guardar_pdf_disco(self, file_bytes: bytes, storage_path: str) -> None:
        """Escribe los bytes del PDF en la carpeta local /uploads (síncrono)."""
        destino = UPLOADS_DIR / storage_path
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(file_bytes)
        logger.info(f"PDF guardado en disco: {destino}")

    def _insertar_doc_sync(self, registro: dict) -> dict:
        """Inserta metadatos del documento en curriculum_docs (síncrono)."""
        with self._Session() as sesion:
            sesion.execute(
                text("""
                    INSERT INTO curriculum_docs
                        (id, name, career_id, storage_path, text_content, created_at)
                    VALUES
                        (:id, :name, :career_id, :storage_path, :text_content, :created_at)
                """),
                registro,
            )
            sesion.commit()
        return registro

    async def subir_pdf(
        self,
        file_bytes: bytes,
        filename: str,
        carrera_id: Optional[str] = None,
    ) -> dict:
        """
        Guarda el PDF en disco local (/uploads), extrae su texto con PyPDF2
        y registra los metadatos en la tabla curriculum_docs.

        Returns:
            dict con id, nombre, storage_path, texto_extraido
        """
        try:
            doc_id = str(uuid.uuid4())
            # storage_path relativo dentro de UPLOADS_DIR
            storage_path = f"{doc_id}/{filename}"

            logger.info(f"Procesando PDF: {filename} → uploads/{storage_path}")

            # Guardar en disco (en hilo para no bloquear)
            await asyncio.to_thread(self._guardar_pdf_disco, file_bytes, storage_path)

            # Extraer texto del PDF
            texto_extraido = await asyncio.to_thread(self._extraer_texto_pdf, file_bytes)
            logger.info(f"Texto extraído: {len(texto_extraido)} caracteres")

            registro = {
                "id": doc_id,
                "name": filename,
                "career_id": carrera_id,
                "storage_path": storage_path,
                "text_content": texto_extraido[:50000],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            return await self._ejecutar(self._insertar_doc_sync, registro)

        except Exception as e:
            logger.error(f"Error al subir PDF {filename}: {e}")
            return {"error": str(e)}

    async def subir_texto_plano(
        self,
        file_bytes: bytes,
        filename: str,
        carrera_id: Optional[str] = None,
    ) -> dict:
        """Guarda un archivo de texto o markdown y persiste su contenido."""
        try:
            doc_id = str(uuid.uuid4())
            storage_path = f"{doc_id}/{filename}"
            await asyncio.to_thread(self._guardar_pdf_disco, file_bytes, storage_path)
            texto_extraido = file_bytes.decode("utf-8", errors="ignore")

            registro = {
                "id": doc_id,
                "name": filename,
                "career_id": carrera_id,
                "storage_path": storage_path,
                "text_content": texto_extraido[:50000],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            return await self._ejecutar(self._insertar_doc_sync, registro)
        except Exception as e:
            logger.error(f"Error al subir archivo de texto {filename}: {e}")
            return {"error": str(e)}

    def _listar_docs_sync(self) -> list:
        """Lista todos los documentos curriculares (síncrono)."""
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT id, name, career_id, storage_path, created_at
                    FROM curriculum_docs
                    ORDER BY created_at DESC
                """)
            ).mappings().all()
        return [dict(f) for f in filas]

    async def listar_documentos(self) -> list:
        """Lista todos los documentos curriculares."""
        try:
            return await self._ejecutar(self._listar_docs_sync)
        except Exception as e:
            logger.error(f"Error al listar documentos: {e}")
            return []
    def _listar_facultades_carreras_sync(self) -> list:
        """Lista facultades con sus carreras asociadas (sincrono)."""
        with self._Session() as sesion:
            filas = sesion.execute(
                text(
                    """
                    SELECT
                        faculties.id AS faculty_id,
                        faculties.name AS faculty_name,
                        faculties.code AS faculty_code,
                        careers.id AS career_id,
                        careers.name AS career_name,
                        careers.code AS career_code
                    FROM faculties
                    LEFT JOIN careers ON careers.faculty_id = faculties.id
                    ORDER BY faculties.name, careers.name
                    """
                )
            ).mappings().all()

        faculties_map: dict[str, dict] = {}
        for fila in filas:
            faculty_id = str(fila["faculty_id"])
            faculty = faculties_map.setdefault(
                faculty_id,
                {
                    "id": faculty_id,
                    "name": fila["faculty_name"],
                    "code": fila["faculty_code"],
                    "careers": [],
                },
            )

            if fila["career_id"]:
                faculty["careers"].append(
                    {
                        "id": str(fila["career_id"]),
                        "name": fila["career_name"],
                        "code": fila["career_code"],
                    }
                )

        return list(faculties_map.values())

    async def listar_facultades_carreras(self) -> list:
        """Lista facultades institucionales con sus carreras."""
        try:
            return await self._ejecutar(self._listar_facultades_carreras_sync)
        except Exception as e:
            logger.error(f"Error al listar facultades y carreras: {e}")
            return []

    def _eliminar_doc_sync(self, doc_id: str) -> bool:
        """Elimina un documento de la BD y su archivo en disco (síncrono)."""
        with self._Session() as sesion:
            # Obtener storage_path antes de borrar
            fila = sesion.execute(
                text("SELECT storage_path FROM curriculum_docs WHERE id = :id"),
                {"id": doc_id},
            ).mappings().first()

            if fila:
                # Borrar el archivo físico si existe
                ruta = UPLOADS_DIR / fila["storage_path"]
                if ruta.exists():
                    ruta.unlink()
                    logger.info(f"Archivo eliminado del disco: {ruta}")

            sesion.execute(
                text("DELETE FROM curriculum_docs WHERE id = :id"),
                {"id": doc_id},
            )
            sesion.commit()

        logger.info(f"Documento {doc_id} eliminado de la BD")
        return True

    async def eliminar_documento(self, doc_id: str) -> bool:
        """Elimina un documento de la base de datos, del disco y sus refs parseadas."""
        try:
            await self.eliminar_referencias_doc(doc_id)
            return await self._ejecutar(self._eliminar_doc_sync, doc_id)
        except Exception as e:
            logger.error(f"Error al eliminar documento {doc_id}: {e}")
            return False

    # ──────────────────────────────────────────────
    # REFERENCIAS BIBLIOGRÁFICAS (NotebookLM)
    # ──────────────────────────────────────────────

    def _guardar_refs_sync(self, course_id: str, doc_id: str, refs: list[str]) -> int:
        """Reemplaza las refs del curso y guarda las nuevas (síncrono)."""
        with self._Session() as sesion:
            # Borrar refs anteriores del mismo curso (replace, no acumulate)
            sesion.execute(
                text("DELETE FROM course_bibliography_refs WHERE course_id = :course_id"),
                {"course_id": course_id},
            )
            # Insertar nuevas
            ahora = datetime.now(timezone.utc).isoformat()
            for orden, ref_text in enumerate(refs):
                sesion.execute(
                    text(
                        """
                        INSERT INTO course_bibliography_refs
                            (id, course_id, doc_id, ref_text, ref_order, created_at)
                        VALUES
                            (:id, :course_id, :doc_id, :ref_text, :ref_order, :created_at)
                        """
                    ),
                    {
                        "id": str(uuid.uuid4()),
                        "course_id": course_id,
                        "doc_id": doc_id,
                        "ref_text": ref_text,
                        "ref_order": orden,
                        "created_at": ahora,
                    },
                )
            sesion.commit()
        return len(refs)

    async def guardar_referencias_curso(
        self, course_id: str, doc_id: str, refs: list[str]
    ) -> int:
        """Persiste las referencias parseadas de un PDF de NotebookLM."""
        return await self._ejecutar(self._guardar_refs_sync, course_id, doc_id, refs)

    def _obtener_refs_sync(self, course_id: str) -> list[str]:
        with self._Session() as sesion:
            filas = sesion.execute(
                text(
                    """
                    SELECT ref_text FROM course_bibliography_refs
                    WHERE course_id = :course_id
                    ORDER BY ref_order ASC
                    """
                ),
                {"course_id": course_id},
            ).mappings().all()
        return [f["ref_text"] for f in filas]

    async def obtener_referencias_curso(self, course_id: str) -> list[str]:
        """Devuelve las referencias APA pre-parseadas de un curso."""
        return await self._ejecutar(self._obtener_refs_sync, course_id)

    def _obtener_refs_rows_sync(self, course_id: str) -> list[dict]:
        from services.bibliography_parser import referencia_a_metadata

        with self._Session() as sesion:
            filas = sesion.execute(
                text(
                    """
                    SELECT doc_id, ref_text, ref_order, created_at
                    FROM course_bibliography_refs
                    WHERE course_id = :course_id
                    ORDER BY created_at ASC, ref_order ASC
                    """
                ),
                {"course_id": course_id},
            ).mappings().all()

        rows: list[dict] = []
        for fila in filas:
            created_at = fila.get("created_at")
            if hasattr(created_at, "isoformat"):
                created_at = created_at.isoformat()
            rows.append(
                referencia_a_metadata(
                    fila.get("ref_text", ""),
                    doc_id=fila.get("doc_id"),
                    course_id=course_id,
                    ref_order=fila.get("ref_order"),
                    created_at=created_at,
                )
            )
        return rows

    async def obtener_referencias_curso_rows(self, course_id: str) -> list[dict]:
        """Devuelve filas estructuradas de referencias sin cambiar el schema almacenado."""
        return await self._ejecutar(self._obtener_refs_rows_sync, course_id)

    def _obtener_doc_refs_curso_sync(self, course_id: str) -> dict | None:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    SELECT
                        refs.doc_id,
                        docs.name AS document_name,
                        COUNT(*) AS total,
                        MIN(refs.created_at) AS created_at
                    FROM course_bibliography_refs refs
                    LEFT JOIN curriculum_docs docs ON docs.id::text = refs.doc_id
                    WHERE refs.course_id = :course_id
                    GROUP BY refs.doc_id, docs.name
                    ORDER BY MIN(refs.created_at) DESC
                    LIMIT 1
                    """
                ),
                {"course_id": course_id},
            ).mappings().first()

        if not fila:
            return None

        created_at = fila.get("created_at")
        if hasattr(created_at, "isoformat"):
            created_at = created_at.isoformat()

        return {
            "doc_id": fila.get("doc_id"),
            "document_name": fila.get("document_name"),
            "total": int(fila.get("total") or 0),
            "created_at": created_at,
        }

    async def obtener_doc_refs_curso(self, course_id: str) -> dict | None:
        """Devuelve el documento NotebookLM asociado a las referencias del curso."""
        return await self._ejecutar(self._obtener_doc_refs_curso_sync, course_id)

    def _eliminar_refs_doc_sync(self, doc_id: str) -> None:
        with self._Session() as sesion:
            sesion.execute(
                text("DELETE FROM course_bibliography_refs WHERE doc_id = :doc_id"),
                {"doc_id": doc_id},
            )
            sesion.commit()

    async def eliminar_referencias_doc(self, doc_id: str) -> None:
        """Elimina las referencias ligadas a un documento (para cascada en delete doc)."""
        await self._ejecutar(self._eliminar_refs_doc_sync, doc_id)

    def _eliminar_refs_curso_sync(self, course_id: str) -> None:
        with self._Session() as sesion:
            sesion.execute(
                text("DELETE FROM course_bibliography_refs WHERE course_id = :course_id"),
                {"course_id": course_id},
            )
            sesion.commit()

    async def eliminar_referencias_curso(self, course_id: str) -> None:
        """Elimina las referencias NotebookLM asociadas al curso."""
        await self._ejecutar(self._eliminar_refs_curso_sync, course_id)

    async def obtener_doc_id_refs_curso(self, course_id: str) -> str | None:
        """Devuelve el doc_id del último upload de bibliografía para el curso, o None."""
        doc = await self.obtener_doc_refs_curso(course_id)
        return doc.get("doc_id") if doc else None

    async def obtener_texto_docs(self, doc_ids: list) -> str:
        """
        Obtiene y concatena el texto de múltiples documentos.
        Usa text_content en BD; si no existe, lee el PDF del disco.
        """
        textos = []
        for doc_id in doc_ids:
            try:
                doc = await self._ejecutar(self._obtener_doc_por_id_sync, doc_id)
                if not doc:
                    continue

                nombre = doc.get("name", "Documento")
                if doc.get("text_content"):
                    textos.append(f"=== {nombre} ===\n{doc['text_content']}")
                elif doc.get("storage_path"):
                    texto = await self.descargar_texto_doc(doc["storage_path"])
                    if texto:
                        textos.append(f"=== {nombre} ===\n{texto}")

            except Exception as e:
                logger.error(f"Error al obtener texto del doc {doc_id}: {e}")

        return "\n\n".join(textos)

    def _obtener_doc_por_id_sync(self, doc_id: str) -> Optional[dict]:
        """Obtiene un documento por ID (síncrono)."""
        with self._Session() as sesion:
            fila = sesion.execute(
                text("SELECT name, text_content, storage_path FROM curriculum_docs WHERE id = :id"),
                {"id": doc_id},
            ).mappings().first()
        return dict(fila) if fila else None

    # ──────────────────────────────────────────────
    # SESIONES DE CHAT
    # ──────────────────────────────────────────────

    def _crear_sesion_sync(self, sesion_data: dict) -> dict:
        """Inserta una nueva sesión de chat en la BD (síncrono)."""
        with self._Session() as sesion:
            sesion.execute(
                text("""
                    INSERT INTO chat_sessions (id, doc_ids, messages, created_at)
                    VALUES (:id, :doc_ids::jsonb, :messages::jsonb, :created_at)
                """),
                {
                    "id": sesion_data["id"],
                    "doc_ids": json.dumps(sesion_data["doc_ids"]),
                    "messages": json.dumps(sesion_data["messages"]),
                    "created_at": sesion_data["created_at"],
                },
            )
            sesion.commit()
        return sesion_data

    async def crear_sesion_chat(
        self, titulo: str = "Nueva conversación", doc_ids: list = []
    ) -> dict:
        """Crea una nueva sesión de chat y la persiste en la BD."""
        try:
            sesion_data = {
                "id": str(uuid.uuid4()),
                "doc_ids": doc_ids,
                "messages": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            return await self._ejecutar(self._crear_sesion_sync, sesion_data)
        except Exception as e:
            logger.error(f"Error al crear sesión de chat: {e}")
            return {}

    def _obtener_sesion_sync(self, session_id: str) -> Optional[dict]:
        """Obtiene una sesión de chat por ID (síncrono)."""
        with self._Session() as sesion:
            fila = sesion.execute(
                text("SELECT id, doc_ids, messages, created_at FROM chat_sessions WHERE id = :id"),
                {"id": session_id},
            ).mappings().first()

        if fila:
            datos = dict(fila)
            for campo in ("doc_ids", "messages"):
                if isinstance(datos.get(campo), str):
                    datos[campo] = json.loads(datos[campo])
            return datos
        return None

    async def obtener_sesion_chat(self, session_id: str) -> Optional[dict]:
        """Obtiene el historial de una sesión de chat."""
        try:
            return await self._ejecutar(self._obtener_sesion_sync, session_id)
        except Exception as e:
            logger.error(f"Error al obtener sesión {session_id}: {e}")
            return None

    def _agregar_mensaje_sync(self, session_id: str, rol: str, contenido: str) -> bool:
        """Agrega un mensaje al historial de la sesión (síncrono)."""
        with self._Session() as sesion:
            fila = sesion.execute(
                text("SELECT messages FROM chat_sessions WHERE id = :id"),
                {"id": session_id},
            ).mappings().first()

            if not fila:
                return False

            mensajes = fila["messages"]
            if isinstance(mensajes, str):
                mensajes = json.loads(mensajes)

            mensajes.append({
                "rol": rol,
                "contenido": contenido,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            sesion.execute(
                text("UPDATE chat_sessions SET messages = :messages::jsonb WHERE id = :id"),
                {"messages": json.dumps(mensajes, ensure_ascii=False), "id": session_id},
            )
            sesion.commit()
        return True

    async def agregar_mensaje_chat(self, session_id: str, rol: str, contenido: str) -> bool:
        """Agrega un mensaje al historial de una sesión de chat."""
        try:
            return await self._ejecutar(self._agregar_mensaje_sync, session_id, rol, contenido)
        except Exception as e:
            logger.error(f"Error al agregar mensaje a sesión {session_id}: {e}")
            return False

    # ──────────────────────────────────────────────
    # PERFIL DE EGRESO
    # ──────────────────────────────────────────────

    def _perfil_egreso_sync(self, carrera_id: str) -> str:
        """Obtiene el perfil de egreso de una carrera (síncrono)."""
        with self._Session() as sesion:
            fila = sesion.execute(
                text("SELECT perfil_egreso FROM careers WHERE id = :id"),
                {"id": carrera_id},
            ).mappings().first()
        return (fila["perfil_egreso"] or "") if fila else ""

    async def obtener_perfil_egreso(self, carrera_id: str) -> str:
        """Obtiene el perfil de egreso de una carrera desde la tabla careers."""
        try:
            return await self._ejecutar(self._perfil_egreso_sync, carrera_id)
        except Exception as e:
            logger.error(f"Error al obtener perfil de egreso de carrera {carrera_id}: {e}")
            return ""

    # ──────────────────────────────────────────────
    # USUARIOS Y AUTENTICACIÓN
    # ──────────────────────────────────────────────

    def _obtener_usuario_por_email_sync(self, email: str) -> Optional[dict]:
        """Obtiene un usuario por su email para autenticación (síncrono)."""
        with self._Session() as sesion:
            fila = sesion.execute(
                text("SELECT id, email, password_hash, full_name, role, career_id FROM users WHERE email = :email"),
                {"email": email},
            ).mappings().first()
        return dict(fila) if fila else None

    async def obtener_usuario_por_email(self, email: str) -> Optional[dict]:
        """Obtiene los datos de un usuario dado su email."""
        try:
            return await self._ejecutar(self._obtener_usuario_por_email_sync, email)
        except Exception as e:
            logger.error(f"Error al obtener usuario por email {email}: {e}")
            return None

    def _obtener_usuario_por_id_sync(self, user_id: str) -> Optional[dict]:
        """Obtiene un usuario por su ID (síncrono)."""
        with self._Session() as sesion:
            fila = sesion.execute(
                text("SELECT id, email, full_name, role, career_id FROM users WHERE id = :id"),
                {"id": user_id},
            ).mappings().first()
        return dict(fila) if fila else None

    async def obtener_usuario_por_id(self, user_id: str) -> Optional[dict]:
        """Obtiene los datos de un usuario dado su ID."""
        try:
            return await self._ejecutar(self._obtener_usuario_por_id_sync, user_id)
        except Exception as e:
            logger.error(f"Error al obtener usuario por ID {user_id}: {e}")
            return None

    def _mapear_usuario_fila(self, fila) -> Optional[dict]:
        if not fila:
            return None

        data = dict(fila)
        for campo in ("id", "career_id", "approved_by"):
            if data.get(campo) is not None:
                data[campo] = str(data[campo])

        for campo in ("created_at", "approved_at"):
            if campo in data:
                data[campo] = self._serializar_fecha(data.get(campo))

        return data

    def _obtener_usuario_por_email_sync(self, email: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    SELECT
                        id, email, password_hash, full_name, role, career_id,
                        status, google_sub, auth_provider, approved_by,
                        approved_at, created_at
                    FROM users
                    WHERE LOWER(email) = LOWER(:email)
                    """
                ),
                {"email": email},
            ).mappings().first()
        return self._mapear_usuario_fila(fila)

    async def obtener_usuario_por_email(self, email: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_usuario_por_email_sync, email)
        except Exception as e:
            logger.error(f"Error al obtener usuario por email {email}: {e}")
            return None

    def _obtener_usuario_por_google_sub_sync(self, google_sub: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    SELECT
                        id, email, password_hash, full_name, role, career_id,
                        status, google_sub, auth_provider, approved_by,
                        approved_at, created_at
                    FROM users
                    WHERE google_sub = :google_sub
                    """
                ),
                {"google_sub": google_sub},
            ).mappings().first()
        return self._mapear_usuario_fila(fila)

    async def obtener_usuario_por_google_sub(self, google_sub: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_usuario_por_google_sub_sync, google_sub)
        except Exception as e:
            logger.error(f"Error al obtener usuario por google_sub: {e}")
            return None

    def _obtener_usuario_por_id_sync(self, user_id: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    SELECT
                        id, email, password_hash, full_name, role, career_id,
                        status, google_sub, auth_provider, approved_by,
                        approved_at, created_at
                    FROM users
                    WHERE id = :id
                    """
                ),
                {"id": user_id},
            ).mappings().first()
        return self._mapear_usuario_fila(fila)

    async def obtener_usuario_por_id(self, user_id: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_usuario_por_id_sync, user_id)
        except Exception as e:
            logger.error(f"Error al obtener usuario por ID {user_id}: {e}")
            return None

    @staticmethod
    def _placeholder_password_hash() -> str:
        return bcrypt.hashpw(
            uuid.uuid4().hex.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

    def _crear_usuario_google_sync(
        self,
        *,
        email: str,
        full_name: str,
        career_id: Optional[str],
        google_sub: str,
        role: str = "docente",
        status: str = "pending",
    ) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, password_hash, full_name, role, career_id,
                        status, google_sub, auth_provider, created_at
                    )
                    VALUES (
                        :id, :email, :password_hash, :full_name, :role, :career_id,
                        :status, :google_sub, 'google', NOW()
                    )
                    RETURNING
                        id, email, password_hash, full_name, role, career_id,
                        status, google_sub, auth_provider, approved_by,
                        approved_at, created_at
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "email": email.strip().lower(),
                    "password_hash": self._placeholder_password_hash(),
                    "full_name": full_name.strip(),
                    "role": role,
                    "career_id": career_id,
                    "status": status,
                    "google_sub": google_sub,
                },
            ).mappings().first()
            sesion.commit()
        return self._mapear_usuario_fila(fila)

    async def crear_usuario_google(
        self,
        *,
        email: str,
        full_name: str,
        career_id: Optional[str],
        google_sub: str,
        role: str = "docente",
        status: str = "pending",
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._crear_usuario_google_sync,
                email=email,
                full_name=full_name,
                career_id=career_id,
                google_sub=google_sub,
                role=role,
                status=status,
            )
        except Exception as e:
            logger.error(f"Error al crear usuario Google {email}: {e}")
            return None

    def _vincular_google_usuario_sync(
        self,
        *,
        user_id: str,
        google_sub: str,
        full_name: str,
        email: str,
        career_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Optional[dict]:
        query = """
            UPDATE users
            SET email = :email,
                full_name = :full_name,
                google_sub = :google_sub,
                auth_provider = 'google'
        """
        params = {
            "id": user_id,
            "email": email.strip().lower(),
            "full_name": full_name.strip(),
            "google_sub": google_sub,
        }
        if career_id is not None:
            query += ", career_id = :career_id"
            params["career_id"] = career_id
        if status is not None:
            query += ", status = :status"
            params["status"] = status
        query += """
            WHERE id = :id
            RETURNING
                id, email, password_hash, full_name, role, career_id,
                status, google_sub, auth_provider, approved_by,
                approved_at, created_at
        """

        with self._Session() as sesion:
            fila = sesion.execute(text(query), params).mappings().first()
            sesion.commit()
        return self._mapear_usuario_fila(fila)

    async def vincular_google_usuario(
        self,
        *,
        user_id: str,
        google_sub: str,
        full_name: str,
        email: str,
        career_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._vincular_google_usuario_sync,
                user_id=user_id,
                google_sub=google_sub,
                full_name=full_name,
                email=email,
                career_id=career_id,
                status=status,
            )
        except Exception as e:
            logger.error(f"Error al vincular Google para usuario {user_id}: {e}")
            return None

    def _listar_usuarios_sync(self, status: Optional[str] = None) -> list:
        query = """
            SELECT
                id, email, full_name, role, career_id, status,
                google_sub, auth_provider, approved_by, approved_at, created_at
            FROM users
        """
        params = {}
        if status:
            query += " WHERE status = :status"
            params["status"] = status
        query += " ORDER BY created_at DESC, full_name ASC"

        with self._Session() as sesion:
            filas = sesion.execute(text(query), params).mappings().all()
        return [self._mapear_usuario_fila(fila) for fila in filas]

    async def listar_usuarios(self, status: Optional[str] = None) -> list:
        try:
            return await self._ejecutar(self._listar_usuarios_sync, status)
        except Exception as e:
            logger.error(f"Error al listar usuarios: {e}")
            return []

    def _actualizar_estado_usuario_sync(
        self,
        user_id: str,
        new_status: str,
        acted_by: Optional[str] = None,
    ) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    UPDATE users
                    SET status = :status,
                        approved_by = :approved_by,
                        approved_at = :approved_at
                    WHERE id = :id
                    RETURNING
                        id, email, password_hash, full_name, role, career_id,
                        status, google_sub, auth_provider, approved_by,
                        approved_at, created_at
                    """
                ),
                {
                    "id": user_id,
                    "status": new_status,
                    "approved_by": acted_by if new_status == "active" else None,
                    "approved_at": datetime.now(timezone.utc) if new_status == "active" else None,
                },
            ).mappings().first()
            sesion.commit()
        return self._mapear_usuario_fila(fila)

    async def actualizar_estado_usuario(
        self,
        user_id: str,
        new_status: str,
        acted_by: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._actualizar_estado_usuario_sync,
                user_id,
                new_status,
                acted_by,
            )
        except Exception as e:
            logger.error(f"Error al actualizar estado del usuario {user_id}: {e}")
            return None

    # ──────────────────────────────────────────────
    # HEALTH CHECK
    # ──────────────────────────────────────────────

    def _actualizar_status_sync(
        self, syllabus_id: str, new_status: str
    ) -> bool:
        with self._Session() as sesion:
            resultado = sesion.execute(
                text("""
                    UPDATE syllabi
                    SET status = :status,
                        updated_at = now()
                    WHERE id = CAST(:id AS UUID)
                """),
                {"status": new_status, "id": syllabus_id},
            )
            sesion.commit()
            return resultado.rowcount > 0

    async def actualizar_status(
        self, syllabus_id: str, new_status: str
    ) -> bool:
        try:
            return await self._ejecutar(
                self._actualizar_status_sync,
                syllabus_id,
                new_status,
            )
        except Exception as e:
            logger.error(f"Error al actualizar status: {e}")
            return False

    def _guardar_version_sync(
        self, syllabus_id: str, payload: dict,
        version_number: int, changed_by: str,
        note: str
    ) -> dict:
        with self._Session() as sesion:
            resultado = sesion.execute(
                text("""
                    INSERT INTO syllabus_versions
                      (syllabus_id, version_number,
                       payload_json, changed_by, change_note)
                    VALUES
                      (CAST(:sid AS UUID), :ver, CAST(:payload AS JSONB),
                       :changed_by, :note)
                    RETURNING id, version_number, created_at
                """),
                {
                    "sid": syllabus_id,
                    "ver": version_number,
                    "payload": json.dumps(payload, ensure_ascii=False),
                    "changed_by": changed_by,
                    "note": note,
                },
            )
            sesion.commit()
            row = resultado.mappings().first()
            return dict(row) if row else {}

    async def guardar_version(
        self, syllabus_id: str, payload: dict,
        version_number: int = 1,
        changed_by: str = "sistema",
        note: str = "Versión generada"
    ) -> dict:
        try:
            return await self._ejecutar(
                self._guardar_version_sync,
                syllabus_id, payload,
                version_number, changed_by, note,
            )
        except Exception as e:
            logger.error(f"Error al guardar versión: {e}")
            return {}

    def _listar_versiones_sync(self, syllabus_id: str) -> list:
        with self._Session() as sesion:
            rows = sesion.execute(
                text("""
                    SELECT id, version_number, changed_by,
                           change_note, created_at
                    FROM syllabus_versions
                    WHERE syllabus_id = CAST(:sid AS UUID)
                    ORDER BY version_number DESC
                """),
                {"sid": syllabus_id},
            ).mappings().all()
            return [dict(r) for r in rows]

    async def listar_versiones(
        self, syllabus_id: str
    ) -> list:
        try:
            return await self._ejecutar(
                self._listar_versiones_sync, syllabus_id
            )
        except Exception as e:
            logger.error(f"Error al listar versiones: {e}")
            return []

    def _guardar_observacion_sync(
        self, syllabus_id: str,
        observer_name: str, observation: str
    ) -> dict:
        with self._Session() as sesion:
            resultado = sesion.execute(
                text("""
                    INSERT INTO syllabus_observations
                      (syllabus_id, observer_name, observation)
                    VALUES (CAST(:sid AS UUID), :name, :obs)
                    RETURNING id, created_at
                """),
                {
                    "sid": syllabus_id,
                    "name": observer_name,
                    "obs": observation,
                },
            )
            sesion.commit()
            row = resultado.mappings().first()
            return dict(row) if row else {}

    async def guardar_observacion(
        self, syllabus_id: str,
        observer_name: str, observation: str
    ) -> dict:
        try:
            return await self._ejecutar(
                self._guardar_observacion_sync,
                syllabus_id, observer_name, observation,
            )
        except Exception as e:
            logger.error(f"Error al guardar observación: {e}")
            return {}

    def _listar_observaciones_sync(
        self, syllabus_id: str
    ) -> list:
        with self._Session() as sesion:
            rows = sesion.execute(
                text("""
                    SELECT id, observer_name, observation,
                           status, created_at
                    FROM syllabus_observations
                    WHERE syllabus_id = CAST(:sid AS UUID)
                    ORDER BY created_at DESC
                """),
                {"sid": syllabus_id},
            ).mappings().all()
            return [dict(r) for r in rows]

    async def listar_observaciones(
        self, syllabus_id: str
    ) -> list:
        try:
            return await self._ejecutar(
                self._listar_observaciones_sync, syllabus_id
            )
        except Exception as e:
            logger.error(f"Error al listar observaciones: {e}")
            return []

    def _stats_sync(self) -> dict:
        with self._Session() as sesion:
            total = sesion.execute(
                text("SELECT COUNT(*) FROM syllabi")
            ).scalar() or 0
            por_status = sesion.execute(
                text("""
                    SELECT status, COUNT(*) as count
                    FROM syllabi
                    GROUP BY status
                """)
            ).mappings().all()
            docs = sesion.execute(
                text("SELECT COUNT(*) FROM curriculum_docs")
            ).scalar() or 0
            users = sesion.execute(
                text("SELECT COUNT(*) FROM users")
            ).scalar() or 0
            return {
                "total_syllabi": total,
                "total_documents": docs,
                "total_users": users,
                "by_status": [dict(r) for r in por_status],
            }

    async def obtener_stats(self) -> dict:
        try:
            return await self._ejecutar(self._stats_sync)
        except Exception as e:
            logger.error(f"Error al obtener stats: {e}")
            return {
                "total_syllabi": 0,
                "total_documents": 0,
                "total_users": 0,
                "by_status": [],
            }

    def _serializar_fecha(self, valor):
        if isinstance(valor, datetime):
            if valor.tzinfo is None:
                valor = valor.replace(tzinfo=timezone.utc)
            return valor.astimezone(timezone.utc).isoformat()
        return valor

    def _extraer_meta_silabo(
        self, silabo_dict: dict, status_por_defecto: str = "draft"
    ) -> dict:
        datos_generales = silabo_dict.get("datos_generales", {}) or {}
        course_id = (
            datos_generales.get("course_id")
            or silabo_dict.get("course_id")
            or None
        )
        if course_id == "":
            course_id = None

        return {
            "course_id": course_id,
            "semester": (
                datos_generales.get("semestre")
                or datos_generales.get("periodo_academico")
                or silabo_dict.get("semester")
                or ""
            ),
            "teacher_name": (
                datos_generales.get("docente")
                or silabo_dict.get("teacher_name")
                or ""
            ),
            "status": silabo_dict.get("status") or status_por_defecto,
        }

    def _mapear_silabo_fila(self, fila) -> Optional[dict]:
        if not fila:
            return None

        data = dict(fila)
        for campo in ("id", "course_id", "user_id"):
            if data.get(campo) is not None:
                data[campo] = str(data[campo])

        for campo in ("created_at", "updated_at"):
            data[campo] = self._serializar_fecha(data.get(campo))

        if isinstance(data.get("payload_json"), str):
            data["payload_json"] = json.loads(data["payload_json"])

        return data

    def _guardar_silabo_sync(
        self,
        silabo_dict: dict,
        user_id: Optional[str] = None,
        status: str = "draft",
        teaching_method_id: Optional[str] = None,
        methodology_json: Optional[dict] = None,
    ) -> dict:
        meta = self._extraer_meta_silabo(silabo_dict, status)
        syllabus_id = str(uuid.uuid4())

        with self._Session() as sesion:
            resultado = sesion.execute(
                text("""
                    INSERT INTO syllabi
                        (
                            id, course_id, user_id, semester,
                            teacher_name, status, payload_json,
                            teaching_method_id, methodology_json,
                            created_at, updated_at
                        )
                    VALUES
                        (
                            :id, :course_id, :user_id, :semester,
                            :teacher_name, :status,
                            CAST(:payload_json AS JSONB),
                            :teaching_method_id,
                            CAST(:methodology_json AS JSONB),
                            now(), now()
                        )
                    RETURNING
                        id, course_id, user_id, semester,
                        teacher_name, status, payload_json,
                        teaching_method_id, methodology_json, created_at, updated_at
                """),
                {
                    "id": syllabus_id,
                    "course_id": meta["course_id"],
                    "user_id": user_id,
                    "semester": meta["semester"],
                    "teacher_name": meta["teacher_name"],
                    "status": meta["status"],
                    "payload_json": json.dumps(silabo_dict, ensure_ascii=False),
                    "teaching_method_id": teaching_method_id,
                    "methodology_json": json.dumps(methodology_json, ensure_ascii=False) if methodology_json else None,
                },
            )
            sesion.commit()
            fila = resultado.mappings().first()

        logger.info(f"Sílabo guardado con ID: {syllabus_id}")
        return self._mapear_silabo_fila(fila) or {}

    async def guardar_silabo(
        self,
        silabo_dict: dict,
        user_id: Optional[str] = None,
        status: str = "draft",
        teaching_method_id: Optional[str] = None,
        methodology_json: Optional[dict] = None,
    ) -> dict:
        try:
            return await self._ejecutar(
                self._guardar_silabo_sync,
                silabo_dict,
                user_id,
                status,
                teaching_method_id,
                methodology_json,
            )
        except Exception as e:
            logger.error(f"Error al guardar sílabo: {e}")
            return {}

    def _actualizar_silabo_sync(
        self,
        silabo_id: str,
        silabo_dict: dict,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Optional[dict]:
        meta = self._extraer_meta_silabo(
            silabo_dict,
            status or silabo_dict.get("status") or "draft",
        )
        query = """
            UPDATE syllabi
            SET course_id = :course_id,
                semester = :semester,
                teacher_name = :teacher_name,
                status = :status,
                payload_json = CAST(:payload_json AS JSONB),
                updated_at = now()
            WHERE id = :id
        """
        params = {
            "id": silabo_id,
            "course_id": meta["course_id"],
            "semester": meta["semester"],
            "teacher_name": meta["teacher_name"],
            "status": meta["status"],
            "payload_json": json.dumps(silabo_dict, ensure_ascii=False),
        }
        if user_id:
            query += " AND user_id = :user_id"
            params["user_id"] = user_id
        query += """
            RETURNING
                id, course_id, user_id, semester,
                teacher_name, status, payload_json,
                created_at, updated_at
        """

        with self._Session() as sesion:
            resultado = sesion.execute(text(query), params)
            sesion.commit()
            fila = resultado.mappings().first()

        return self._mapear_silabo_fila(fila)

    async def actualizar_silabo(
        self,
        silabo_id: str,
        silabo_dict: dict,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._actualizar_silabo_sync,
                silabo_id,
                silabo_dict,
                user_id,
                status,
            )
        except Exception as e:
            logger.error(f"Error al actualizar sílabo {silabo_id}: {e}")
            return None

    def _obtener_silabo_sync(
        self, silabo_id: str, user_id: Optional[str] = None
    ) -> Optional[dict]:
        query = """
            SELECT
                id, course_id, user_id, semester,
                teacher_name, status, payload_json,
                created_at, updated_at
            FROM syllabi
            WHERE id = :id
        """
        params = {"id": silabo_id}
        if user_id:
            query += " AND user_id = :user_id"
            params["user_id"] = user_id

        with self._Session() as sesion:
            resultado = sesion.execute(
                text(query),
                params,
            ).mappings().first()

        return self._mapear_silabo_fila(resultado)

    async def obtener_silabo(
        self, silabo_id: str, user_id: Optional[str] = None
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._obtener_silabo_sync, silabo_id, user_id
            )
        except Exception as e:
            logger.error(f"Error al obtener sílabo {silabo_id}: {e}")
            return None

    def _listar_silabos_sync(
        self, skip: int, limit: int, user_id: Optional[str] = None
    ) -> list:
        query = """
            SELECT
                id, course_id, user_id, semester,
                teacher_name, status, payload_json,
                created_at, updated_at
            FROM syllabi
        """
        params = {"limit": limit, "skip": skip}
        if user_id:
            query += " WHERE user_id = :user_id"
            params["user_id"] = user_id
        query += """
            ORDER BY updated_at DESC NULLS LAST, created_at DESC
            LIMIT :limit OFFSET :skip
        """

        with self._Session() as sesion:
            filas = sesion.execute(
                text(query),
                params,
            ).mappings().all()
        return [self._mapear_silabo_fila(f) for f in filas]

    async def listar_silabos(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
    ) -> list:
        try:
            return await self._ejecutar(
                self._listar_silabos_sync,
                skip,
                limit,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al listar sílabos: {e}")
            return []

    def _obtener_ultima_version_sync(self, syllabus_id: str) -> int:
        with self._Session() as sesion:
            ultima = sesion.execute(
                text("""
                    SELECT COALESCE(MAX(version_number), 0)
                    FROM syllabus_versions
                    WHERE syllabus_id = CAST(:sid AS UUID)
                """),
                {"sid": syllabus_id},
            ).scalar()
        return int(ultima or 0)

    async def obtener_ultima_version(self, syllabus_id: str) -> int:
        try:
            return await self._ejecutar(
                self._obtener_ultima_version_sync, syllabus_id
            )
        except Exception as e:
            logger.error(f"Error al obtener última versión: {e}")
            return 0

    def _ping_sync(self) -> bool:
        """Ejecuta una query mínima para verificar la conexión (síncrono)."""
        with self._Session() as sesion:
            sesion.execute(text("SELECT 1"))
        return True

    async def verificar_conexion(self) -> bool:
        """Verificación mínima de conectividad con la base de datos."""
        try:
            return await self._ejecutar(self._ping_sync)
        except Exception as e:
            logger.error(f"Error al verificar conexión con la BD: {e}")
            return False

    # ──────────────────────────────────────────────
    # CATÁLOGO DE HABILIDADES
    # ──────────────────────────────────────────────

    def _listar_skill_categories_sync(self) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT DISTINCT categoria
                    FROM skills_catalog
                    WHERE estado = 'activa'
                    ORDER BY categoria ASC
                """)
            ).mappings().all()
        return [fila["categoria"] for fila in filas]

    async def listar_skill_categories(self) -> list:
        try:
            return await self._ejecutar(self._listar_skill_categories_sync)
        except Exception as e:
            logger.error(f"Error al listar categorías de skills: {e}")
            return []

    @staticmethod
    def _texto_skill_catalogo(valor, fallback: str = "") -> str:
        if valor is None:
            return fallback
        texto = str(valor).strip()
        return texto or fallback

    def _map_skill_catalogo_item(self, fila: dict, fallback_id: int) -> dict:
        return {
            "id": fila.get("id") or fallback_id,
            "id_habilidad": self._texto_skill_catalogo(fila.get("id_habilidad")),
            "nombre": self._texto_skill_catalogo(
                fila.get("nombre"),
                "Sin nombre registrado",
            ),
            "descripcion": self._texto_skill_catalogo(
                fila.get("descripcion"),
                "Sin descripcion registrada",
            ),
            "categoria": self._texto_skill_catalogo(
                fila.get("categoria"),
                "Sin categoria",
            ),
            "subcategoria": self._texto_skill_catalogo(fila.get("subcategoria")),
            "nivel": self._texto_skill_catalogo(
                fila.get("nivel_cognitivo"),
                "Sin nivel cognitivo registrado",
            ),
            "verbo": self._texto_skill_catalogo(
                fila.get("verbo_principal"),
                "Sin verbo registrado",
            ),
        }

    def _listar_catalogo_skills_sync(self, categoria: Optional[str] = None) -> list:
        params = {}
        where_categoria = ""
        if categoria:
            where_categoria = " AND categoria = :categoria"
            params["categoria"] = categoria

        with self._Session() as sesion:
            filas = sesion.execute(
                text(f"""
                    SELECT *
                    FROM skills_catalog
                    WHERE estado = 'activa'
                    {where_categoria}
                    ORDER BY categoria ASC, subcategoria ASC, nombre ASC
                """),
                params,
            ).mappings().all()

        return [
            self._map_skill_catalogo_item(fila, index + 1)
            for index, fila in enumerate(filas)
        ]

    async def listar_catalogo_skills(self, categoria: Optional[str] = None) -> list:
        try:
            return await self._ejecutar(self._listar_catalogo_skills_sync, categoria)
        except Exception as e:
            logger.error(f"Error al listar catalogo completo de skills: {e}")
            return []

    def _listar_skills_por_categorias_sync(self, categories: list) -> dict:
        """
        Devuelve verbos e instrumentos para inyectar en el prompt.
        No devuelve registros completos al frontend — solo lo que necesita la IA.
        """
        if not categories:
            return {"verbos": [], "instrumentos": [], "habilidades": []}

        # Construir placeholders de forma segura
        placeholders = ", ".join([f":cat{i}" for i in range(len(categories))])
        params = {f"cat{i}": cat for i, cat in enumerate(categories)}

        with self._Session() as sesion:
            filas = sesion.execute(
                text(f"""
                    SELECT
                        categoria,
                        subcategoria,
                        nivel_cognitivo,
                        verbo_principal,
                        descripcion,
                        evidencias_sugeridas,
                        instrumentos_sugeridos
                    FROM skills_catalog
                    WHERE categoria IN ({placeholders})
                      AND estado = 'activa'
                    ORDER BY categoria ASC, nivel_cognitivo ASC, verbo_principal ASC
                """),
                params,
            ).mappings().all()

        verbos = []
        verbos_set = set()
        instrumentos = []
        instrumentos_set = set()
        habilidades = []
        habilidades_set = set()
        for fila in filas:
            if fila.get("verbo_principal"):
                verbo = fila["verbo_principal"].strip()
                verbo_key = verbo.lower()
                if verbo and verbo_key not in verbos_set:
                    verbos_set.add(verbo_key)
                    verbos.append(verbo)
            if fila.get("instrumentos_sugeridos"):
                instrumentos_texto = (
                    fila["instrumentos_sugeridos"]
                    .replace("\r", "\n")
                    .replace(";", ",")
                )
                for inst in instrumentos_texto.replace("\n", ",").split(","):
                    limpio = inst.strip()
                    limpio_key = limpio.lower()
                    if limpio and limpio_key not in instrumentos_set:
                        instrumentos_set.add(limpio_key)
                        instrumentos.append(limpio)

            evidencia = self._texto_skill_catalogo(
                fila.get("evidencias_sugeridas"),
                "Producto o evidencia alineada al desempeno",
            )
            if len(evidencia) > 140:
                evidencia = evidencia[:137].rstrip() + "..."

            habilidad = {
                "verbo": self._texto_skill_catalogo(
                    fila.get("verbo_principal"),
                    "Sin verbo registrado",
                ),
                "nivel": self._texto_skill_catalogo(
                    fila.get("nivel_cognitivo"),
                    "Sin nivel cognitivo",
                ),
                "subcat": self._texto_skill_catalogo(
                    fila.get("subcategoria"),
                    self._texto_skill_catalogo(fila.get("categoria"), "Sin subcategoria"),
                ),
                "descripcion": self._texto_skill_catalogo(
                    fila.get("descripcion"),
                    "Sin descripcion registrada",
                ),
                "evidencia": evidencia,
            }
            habilidad_key = (
                habilidad["verbo"].lower(),
                habilidad["nivel"].lower(),
                habilidad["subcat"].lower(),
            )
            if habilidad_key not in habilidades_set:
                habilidades_set.add(habilidad_key)
                habilidades.append(habilidad)

        return {
            "verbos": verbos[:30],           # Máximo 30 verbos para no inflar el prompt
            "instrumentos": instrumentos[:15],
            "habilidades": habilidades[:12],
        }

    def _listar_skills_por_ids_sync(self, skill_ids: list) -> dict:
        if not skill_ids:
            return {"verbos": [], "instrumentos": [], "habilidades": []}
        placeholders = ", ".join([f":sid{i}" for i in range(len(skill_ids))])
        params = {f"sid{i}": sid for i, sid in enumerate(skill_ids)}
        with self._Session() as sesion:
            filas = sesion.execute(
                text(f"""
                    SELECT verbo_principal, instrumentos_sugeridos, evidencias_sugeridas,
                           subcategoria, nivel_cognitivo, descripcion, categoria
                    FROM skills_catalog
                    WHERE id IN ({placeholders}) AND estado = 'activa'
                """),
                params,
            ).mappings().all()
        return self._listar_skills_por_categorias_sync.__func__(self, []) if not filas else \
            self.__class__._build_skills_context(list(filas))

    @staticmethod
    def _build_skills_context(filas: list) -> dict:
        verbos, verbos_set = [], set()
        instrumentos, instrumentos_set = [], set()
        habilidades, habilidades_set = [], set()
        for fila in filas:
            v = (fila.get("verbo_principal") or "").strip()
            if v and v.lower() not in verbos_set:
                verbos_set.add(v.lower()); verbos.append(v)
            for inst in (fila.get("instrumentos_sugeridos") or "").replace(";", ",").split(","):
                i = inst.strip()
                if i and i.lower() not in instrumentos_set:
                    instrumentos_set.add(i.lower()); instrumentos.append(i)
            key = (v.lower(), (fila.get("nivel_cognitivo") or "").lower())
            if key not in habilidades_set:
                habilidades_set.add(key)
                habilidades.append({
                    "verbo": v, "nivel": fila.get("nivel_cognitivo", ""),
                    "subcat": fila.get("subcategoria", ""),
                    "descripcion": fila.get("descripcion", ""),
                    "evidencia": (fila.get("evidencias_sugeridas") or "")[:140],
                })
        return {"verbos": verbos[:30], "instrumentos": instrumentos[:15], "habilidades": habilidades[:12]}

    async def listar_skills_por_ids(self, skill_ids: list) -> dict:
        try:
            return await self._ejecutar(self._listar_skills_por_ids_sync, skill_ids)
        except Exception as e:
            logger.error(f"Error al listar skills por IDs: {e}")
            return {"verbos": [], "instrumentos": [], "habilidades": []}

    def _listar_skills_raw_por_ids_sync(self, skill_ids: list) -> list:
        if not skill_ids:
            return []
        placeholders = ", ".join([f":sid{i}" for i in range(len(skill_ids))])
        params = {f"sid{i}": sid for i, sid in enumerate(skill_ids)}
        with self._Session() as sesion:
            filas = sesion.execute(
                text(f"""
                    SELECT id, nombre, categoria, subcategoria, nivel_cognitivo, verbo_principal
                    FROM skills_catalog
                    WHERE id IN ({placeholders})
                """),
                params,
            ).mappings().all()
        return [dict(f) for f in filas]

    async def listar_skills_raw_por_ids(self, skill_ids: list) -> list:
        try:
            return await self._ejecutar(self._listar_skills_raw_por_ids_sync, skill_ids)
        except Exception as e:
            logger.error(f"Error al listar skills raw por IDs: {e}")
            return []

    async def listar_skills_por_categorias(self, categories: list) -> dict:
        try:
            return await self._ejecutar(self._listar_skills_por_categorias_sync, categories)
        except Exception as e:
            logger.error(f"Error al listar skills por categorías: {e}")
            return {"verbos": [], "instrumentos": [], "habilidades": []}

    # ──────────────────────────────────────────────
    # PROGRAMAS ACADÉMICOS
    # ──────────────────────────────────────────────

    def _listar_programas_sync(self, career_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT id, name, coordinator, career_id
                    FROM programs
                    WHERE career_id = :career_id
                    ORDER BY name ASC
                """),
                {"career_id": career_id},
            ).mappings().all()
        return [dict(f) for f in filas]

    async def listar_programas(self, career_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_programas_sync, career_id)
        except Exception as e:
            logger.error(f"Error al listar programas de carrera {career_id}: {e}")
            return []

    # ──────────────────────────────────────────────
    def _obtener_programa_sync(self, program_id: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    SELECT
                        p.id,
                        p.name AS program_name,
                        p.career_id,
                        cr.name AS career_name,
                        f.id AS faculty_id,
                        f.name AS faculty_name
                    FROM programs p
                    LEFT JOIN careers cr ON cr.id = p.career_id
                    LEFT JOIN faculties f ON f.id = cr.faculty_id
                    WHERE p.id = :program_id
                """),
                {"program_id": program_id},
            ).mappings().first()
        if not fila:
            return None
        item = dict(fila)
        for campo in ("id", "career_id", "faculty_id"):
            if item.get(campo) is not None:
                item[campo] = str(item[campo])
        return item

    async def obtener_programa(self, program_id: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_programa_sync, program_id)
        except Exception as e:
            logger.error(f"Error al obtener programa {program_id}: {e}")
            return None

    # CURSOS
    # ──────────────────────────────────────────────

    def _listar_cursos_programa_sync(self, program_id: str) -> list:
        """
        Lista cursos de un programa + cursos comunes (is_common=true).
        Ordenados por ciclo y nombre.
        """
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT id, name, code, credits, cycle, is_common, scope, program_id
                    FROM courses
                    WHERE program_id = :program_id OR is_common = true
                    ORDER BY cycle ASC NULLS LAST, name ASC
                """),
                {"program_id": program_id},
            ).mappings().all()
        return [dict(f) for f in filas]

    async def listar_cursos_programa(self, program_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_cursos_programa_sync, program_id)
        except Exception as e:
            logger.error(f"Error al listar cursos del programa {program_id}: {e}")
            return []

    def _obtener_curso_sync(self, course_id: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    SELECT c.id, c.name, c.code, c.credits, c.cycle, c.is_common, c.scope,
                           c.program_id, c.sumilla,
                           COALESCE(NULLIF(c.competencia, ''), c.competencia_egreso) AS competencia_egreso,
                           c.competencia,
                           c.resultado_aprendizaje, c.capacidad,
                           c.hours_theory, c.hours_practice, c.prerequisites, c.tipo_curso, c.naturaleza,
                           c.temas_conocimientos, c.habilidades_desempenos, c.actividades_metodo,
                           p.name AS program_name,
                           cr.id AS career_id,
                           cr.name AS career_name,
                           f.id AS faculty_id,
                           f.name AS faculty_name
                    FROM courses c
                    LEFT JOIN programs p ON p.id = c.program_id
                    LEFT JOIN careers cr ON cr.id = p.career_id
                    LEFT JOIN faculties f ON f.id = cr.faculty_id
                    WHERE c.id = :course_id
                """),
                {"course_id": course_id},
            ).mappings().first()
        if not fila:
            return None

        item = dict(fila)
        for campo in ("id", "program_id", "career_id", "faculty_id"):
            if item.get(campo) is not None:
                item[campo] = str(item[campo])
        return item

    async def obtener_curso(self, course_id: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_curso_sync, course_id)
        except Exception as e:
            logger.error(f"Error al obtener curso {course_id}: {e}")
            return None

    def _listar_cursos_admin_sync(
        self,
        program_id: Optional[str] = None,
        search: str = "",
    ) -> list:
        query = """
            SELECT
                c.id,
                c.name,
                c.code,
                c.credits,
                c.cycle,
                c.is_common,
                c.scope,
                c.program_id,
                c.sumilla,
                p.name AS program_name,
                cr.id AS career_id,
                cr.name AS career_name,
                f.id AS faculty_id,
                f.name AS faculty_name
            FROM courses c
            LEFT JOIN programs p ON p.id = c.program_id
            LEFT JOIN careers cr ON cr.id = p.career_id
            LEFT JOIN faculties f ON f.id = cr.faculty_id
            WHERE 1 = 1
        """
        params = {}
        if program_id:
            query += " AND (c.program_id = :program_id OR c.is_common = true)"
            params["program_id"] = program_id
        if search.strip():
            query += " AND (LOWER(c.name) LIKE :search OR LOWER(COALESCE(c.code, '')) LIKE :search)"
            params["search"] = f"%{search.strip().lower()}%"
        query += " ORDER BY c.cycle ASC NULLS LAST, c.name ASC"

        with self._Session() as sesion:
            filas = sesion.execute(text(query), params).mappings().all()

        resultado = []
        for fila in filas:
            item = dict(fila)
            for campo in ("id", "program_id", "career_id", "faculty_id"):
                if item.get(campo) is not None:
                    item[campo] = str(item[campo])
            resultado.append(item)
        return resultado

    async def listar_cursos_admin(
        self,
        program_id: Optional[str] = None,
        search: str = "",
    ) -> list:
        try:
            return await self._ejecutar(self._listar_cursos_admin_sync, program_id, search)
        except Exception as e:
            logger.error(f"Error al listar cursos para admin: {e}")
            return []

    def _actualizar_sumilla_curso_sync(
        self,
        course_id: str,
        new_sumilla: str,
        changed_by: str,
    ) -> Optional[dict]:
        with self._Session() as sesion:
            previo = sesion.execute(
                text(
                    """
                    SELECT id, name, code, program_id, sumilla
                    FROM courses
                    WHERE id = :course_id
                    """
                ),
                {"course_id": course_id},
            ).mappings().first()
            if not previo:
                return None

            fila = sesion.execute(
                text(
                    """
                    UPDATE courses
                    SET sumilla = :sumilla
                    WHERE id = :course_id
                    RETURNING
                        id, name, code, program_id, sumilla,
                        competencia_egreso, resultado_aprendizaje, capacidad
                    """
                ),
                {"course_id": course_id, "sumilla": new_sumilla},
            ).mappings().first()

            sesion.execute(
                text(
                    """
                    INSERT INTO course_sumilla_revisions (
                        id, course_id, previous_sumilla, new_sumilla, changed_by
                    )
                    VALUES (
                        :id, :course_id, :previous_sumilla, :new_sumilla, :changed_by
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "course_id": course_id,
                    "previous_sumilla": previo.get("sumilla") or "",
                    "new_sumilla": new_sumilla,
                    "changed_by": changed_by,
                },
            )
            sesion.commit()

        result = dict(fila) if fila else None
        if result:
            for campo in ("id", "program_id"):
                if result.get(campo) is not None:
                    result[campo] = str(result[campo])
        return result

    async def actualizar_sumilla_curso(
        self,
        course_id: str,
        new_sumilla: str,
        changed_by: str,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._actualizar_sumilla_curso_sync,
                course_id,
                new_sumilla,
                changed_by,
            )
        except Exception as e:
            logger.error(f"Error al actualizar sumilla del curso {course_id}: {e}")
            return None

    def _listar_historial_sumilla_sync(self, course_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text(
                    """
                    SELECT
                        r.id,
                        r.course_id,
                        r.previous_sumilla,
                        r.new_sumilla,
                        r.changed_at,
                        r.changed_by,
                        u.full_name AS changed_by_name
                    FROM course_sumilla_revisions r
                    LEFT JOIN users u ON u.id = r.changed_by
                    WHERE r.course_id = :course_id
                    ORDER BY r.changed_at DESC
                    """
                ),
                {"course_id": course_id},
            ).mappings().all()

        resultado = []
        for fila in filas:
            item = dict(fila)
            for campo in ("id", "course_id", "changed_by"):
                if item.get(campo) is not None:
                    item[campo] = str(item[campo])
            item["changed_at"] = self._serializar_fecha(item.get("changed_at"))
            resultado.append(item)
        return resultado

    async def listar_historial_sumilla(self, course_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_historial_sumilla_sync, course_id)
        except Exception as e:
            logger.error(f"Error al listar historial de sumilla {course_id}: {e}")
            return []

    # ──────────────────────────────────────────────
    # CAREERS (para endpoint institucional)
    # ──────────────────────────────────────────────

    def _listar_careers_sync(self, faculty_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT id, name, code, faculty_id
                    FROM careers
                    WHERE faculty_id = :faculty_id
                    ORDER BY name ASC
                """),
                {"faculty_id": faculty_id},
            ).mappings().all()
        return [dict(f) for f in filas]

    async def listar_careers(self, faculty_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_careers_sync, faculty_id)
        except Exception as e:
            logger.error(f"Error al listar careers de facultad {faculty_id}: {e}")
            return []

    # ──────────────────────────────────────────────
    # SÍLABOS FILTRADOS POR PROGRAMA
    # ──────────────────────────────────────────────

    def _listar_silabos_programa_sync(
        self, user_id: str, program_id: str, skip: int, limit: int
    ) -> list:
        """Lista sílabos del usuario filtrados por programa (incluye cursos comunes)."""
        query = """
            SELECT
                s.id, s.course_id, s.user_id, s.semester,
                s.teacher_name, s.status, s.payload_json,
                s.created_at, s.updated_at
            FROM syllabi s
            WHERE s.user_id = :user_id
              AND s.course_id IN (
                  SELECT id FROM courses
                  WHERE program_id = :program_id OR is_common = true
              )
            ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
            LIMIT :limit OFFSET :skip
        """
        with self._Session() as sesion:
            filas = sesion.execute(
                text(query),
                {
                    "user_id": user_id,
                    "program_id": program_id,
                    "limit": limit,
                    "skip": skip,
                },
            ).mappings().all()
        return [self._mapear_silabo_fila(f) for f in filas]

    async def listar_silabos_programa(
        self, user_id: str, program_id: str, skip: int = 0, limit: int = 20
    ) -> list:
        try:
            return await self._ejecutar(
                self._listar_silabos_programa_sync,
                user_id,
                program_id,
                skip,
                limit,
            )
        except Exception as e:
            logger.error(f"Error al listar sílabos por programa: {e}")
            return []

    def _listar_silabos_programa_admin_sync(
        self,
        program_id: str,
        skip: int,
        limit: int,
        user_id: Optional[str] = None,
    ) -> list:
        query = """
            SELECT
                s.id, s.course_id, s.user_id, s.semester,
                s.teacher_name, s.status, s.payload_json,
                s.created_at, s.updated_at
            FROM syllabi s
            WHERE s.course_id IN (
                SELECT id FROM courses
                WHERE program_id = :program_id OR is_common = true
            )
        """
        params = {
            "program_id": program_id,
            "limit": limit,
            "skip": skip,
        }
        if user_id:
            query += " AND s.user_id = :user_id"
            params["user_id"] = user_id
        query += """
            ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
            LIMIT :limit OFFSET :skip
        """

        with self._Session() as sesion:
            filas = sesion.execute(text(query), params).mappings().all()
        return [self._mapear_silabo_fila(f) for f in filas]

    async def listar_silabos_programa_admin(
        self,
        program_id: str,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
    ) -> list:
        try:
            return await self._ejecutar(
                self._listar_silabos_programa_admin_sync,
                program_id,
                skip,
                limit,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al listar sílabos por programa (admin): {e}")
            return []

    # ══════════════════════════════════════════════════════════════
    # MÉTODOS PEDAGÓGICOS (teaching_methods) — desde DB
    # ══════════════════════════════════════════════════════════════

    def _mapear_teaching_method(self, fila) -> dict:
        item = dict(fila)
        if item.get("id") is not None:
            item["id"] = str(item["id"])
        for campo in ("created_at", "updated_at"):
            if campo in item:
                item[campo] = self._serializar_fecha(item.get(campo))
        for campo in (
            "phases", "tecnicas_didacticas", "instrumentos_evaluacion",
            "productos_tipicos", "phase_rules_json", "grading_template_json",
        ):
            if isinstance(item.get(campo), str):
                try:
                    item[campo] = json.loads(item[campo])
                except Exception:
                    pass
        return item

    def _listar_teaching_methods_sync(self, include_archived: bool = False) -> list:
        where = "" if include_archived else "WHERE is_archived = false"
        with self._Session() as sesion:
            filas = sesion.execute(
                text(f"""
                    SELECT id, name, code, description, phases, weekly_template,
                           tecnicas_didacticas, estrategias_evaluacion, instrumentos_evaluacion,
                           proposito, rol_docente, rol_estudiante, productos_tipicos,
                           phase_rules_json, grading_template_json,
                           is_archived
                    FROM teaching_methods
                    {where}
                    ORDER BY name ASC
                """)
            ).mappings().all()
        return [self._mapear_teaching_method(f) for f in filas]

    async def listar_teaching_methods(self, include_archived: bool = False) -> list:
        try:
            return await self._ejecutar(self._listar_teaching_methods_sync, include_archived)
        except Exception as e:
            logger.error(f"Error al listar teaching_methods: {e}")
            return []

    def _obtener_teaching_method_sync(self, method_id: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    SELECT id, name, code, description, phases, weekly_template,
                           tecnicas_didacticas, estrategias_evaluacion, instrumentos_evaluacion,
                           proposito, rol_docente, rol_estudiante, productos_tipicos,
                           phase_rules_json, grading_template_json,
                           is_archived
                    FROM teaching_methods
                    WHERE id = :id
                """),
                {"id": method_id},
            ).mappings().first()
        return self._mapear_teaching_method(fila) if fila else None

    async def obtener_teaching_method(self, method_id: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_teaching_method_sync, method_id)
        except Exception as e:
            logger.error(f"Error al obtener teaching_method {method_id}: {e}")
            return None

    def _crear_teaching_method_sync(self, data: dict, changed_by: str) -> Optional[dict]:
        mid = str(uuid.uuid4())
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    INSERT INTO teaching_methods
                        (id, name, code, description, phases, weekly_template,
                         tecnicas_didacticas, estrategias_evaluacion, instrumentos_evaluacion)
                    VALUES
                        (:id, :name, :code, :description,
                         :phases::jsonb, :weekly_template,
                         :tecnicas::jsonb, :estrategias, :instrumentos::jsonb)
                    RETURNING id, name, code, description, phases, weekly_template,
                              tecnicas_didacticas, estrategias_evaluacion, instrumentos_evaluacion, is_archived
                """),
                {
                    "id": mid,
                    "name": data["name"],
                    "code": data.get("code", ""),
                    "description": data.get("description", ""),
                    "phases": json.dumps(data.get("phases", []), ensure_ascii=False),
                    "weekly_template": data.get("weekly_template", ""),
                    "tecnicas": json.dumps(data.get("tecnicas_didacticas", []), ensure_ascii=False),
                    "estrategias": data.get("estrategias_evaluacion", ""),
                    "instrumentos": json.dumps(data.get("instrumentos_evaluacion", []), ensure_ascii=False),
                },
            ).mappings().first()
            sesion.execute(
                text("""
                    INSERT INTO teaching_methods_history
                        (id, teaching_method_id, action, payload_after, changed_by)
                    VALUES (:hid, :mid, 'create', :payload, :by)
                """),
                {"hid": str(uuid.uuid4()), "mid": mid, "payload": json.dumps(data, ensure_ascii=False, default=str), "by": changed_by},
            )
            sesion.commit()
        return self._mapear_teaching_method(fila) if fila else None

    async def crear_teaching_method(self, data: dict, changed_by: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._crear_teaching_method_sync, data, changed_by)
        except Exception as e:
            logger.error(f"Error al crear teaching_method: {e}")
            return None

    def _actualizar_teaching_method_sync(self, method_id: str, data: dict, changed_by: str) -> Optional[dict]:
        with self._Session() as sesion:
            previo = sesion.execute(
                text("SELECT * FROM teaching_methods WHERE id = :id"),
                {"id": method_id},
            ).mappings().first()
            if not previo:
                return None
            fila = sesion.execute(
                text("""
                    UPDATE teaching_methods
                    SET name = COALESCE(:name, name),
                        code = COALESCE(:code, code),
                        description = COALESCE(:description, description),
                        phases = COALESCE(:phases::jsonb, phases),
                        weekly_template = COALESCE(:weekly_template, weekly_template),
                        tecnicas_didacticas = COALESCE(:tecnicas::jsonb, tecnicas_didacticas),
                        estrategias_evaluacion = COALESCE(:estrategias, estrategias_evaluacion),
                        instrumentos_evaluacion = COALESCE(:instrumentos::jsonb, instrumentos_evaluacion)
                    WHERE id = :id
                    RETURNING id, name, code, description, phases, weekly_template,
                              tecnicas_didacticas, estrategias_evaluacion, instrumentos_evaluacion, is_archived
                """),
                {
                    "id": method_id,
                    "name": data.get("name"),
                    "code": data.get("code"),
                    "description": data.get("description"),
                    "phases": json.dumps(data["phases"], ensure_ascii=False) if "phases" in data else None,
                    "weekly_template": data.get("weekly_template"),
                    "tecnicas": json.dumps(data["tecnicas_didacticas"], ensure_ascii=False) if "tecnicas_didacticas" in data else None,
                    "estrategias": data.get("estrategias_evaluacion"),
                    "instrumentos": json.dumps(data["instrumentos_evaluacion"], ensure_ascii=False) if "instrumentos_evaluacion" in data else None,
                },
            ).mappings().first()
            sesion.execute(
                text("""
                    INSERT INTO teaching_methods_history
                        (id, teaching_method_id, action, payload_before, payload_after, changed_by)
                    VALUES (:hid, :mid, 'update', :before, :after, :by)
                """),
                {
                    "hid": str(uuid.uuid4()), "mid": method_id,
                    "before": json.dumps(dict(previo), ensure_ascii=False, default=str),
                    "after": json.dumps(data, ensure_ascii=False, default=str),
                    "by": changed_by,
                },
            )
            sesion.commit()
        return self._mapear_teaching_method(fila) if fila else None

    async def actualizar_teaching_method(self, method_id: str, data: dict, changed_by: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._actualizar_teaching_method_sync, method_id, data, changed_by)
        except Exception as e:
            logger.error(f"Error al actualizar teaching_method {method_id}: {e}")
            return None

    def _archivar_teaching_method_sync(self, method_id: str, changed_by: str) -> bool:
        with self._Session() as sesion:
            previo = sesion.execute(
                text("SELECT * FROM teaching_methods WHERE id = :id"),
                {"id": method_id},
            ).mappings().first()
            if not previo:
                return False
            sesion.execute(
                text("UPDATE teaching_methods SET is_archived = true WHERE id = :id"),
                {"id": method_id},
            )
            sesion.execute(
                text("""
                    INSERT INTO teaching_methods_history
                        (id, teaching_method_id, action, payload_before, changed_by)
                    VALUES (:hid, :mid, 'archive', :before, :by)
                """),
                {
                    "hid": str(uuid.uuid4()), "mid": method_id,
                    "before": json.dumps(dict(previo), ensure_ascii=False, default=str),
                    "by": changed_by,
                },
            )
            sesion.commit()
        return True

    async def archivar_teaching_method(self, method_id: str, changed_by: str) -> bool:
        try:
            return await self._ejecutar(self._archivar_teaching_method_sync, method_id, changed_by)
        except Exception as e:
            logger.error(f"Error al archivar teaching_method {method_id}: {e}")
            return False

    # ══════════════════════════════════════════════════════════════
    # SKILLS (admin CRUD sobre skills_catalog)
    # ══════════════════════════════════════════════════════════════

    def _mapear_skill_admin(self, fila) -> dict:
        item = dict(fila)
        if item.get("id") is not None:
            item["id"] = str(item["id"])
        if "created_at" in item:
            item["created_at"] = self._serializar_fecha(item.get("created_at"))
        return item

    def _listar_skills_admin_sync(
        self,
        categoria: Optional[str] = None,
        search: str = "",
        include_archived: bool = False,
        page: int = 1,
        page_size: int = 30,
    ) -> dict:
        params: dict = {}
        conditions = [] if include_archived else ["estado = 'activa'"]
        if categoria:
            conditions.append("categoria = :categoria")
            params["categoria"] = categoria
        if search.strip():
            conditions.append("(LOWER(nombre) LIKE :search OR LOWER(verbo_principal) LIKE :search OR LOWER(id_habilidad) LIKE :search)")
            params["search"] = f"%{search.strip().lower()}%"
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        offset = (max(page, 1) - 1) * page_size
        with self._Session() as sesion:
            total_row = sesion.execute(
                text(f"SELECT COUNT(*) FROM skills_catalog {where}"), params
            ).scalar()
            filas = sesion.execute(
                text(f"""
                    SELECT id, id_habilidad, nombre, descripcion, categoria, subcategoria,
                           nivel_cognitivo, verbo_principal, evidencias_sugeridas,
                           instrumentos_sugeridos, estado
                    FROM skills_catalog
                    {where}
                    ORDER BY categoria ASC, subcategoria ASC, nombre ASC
                    LIMIT :limit OFFSET :offset
                """),
                {**params, "limit": page_size, "offset": offset},
            ).mappings().all()
        return {"items": [self._mapear_skill_admin(f) for f in filas], "total": total_row or 0}

    async def listar_skills_admin(
        self,
        categoria: Optional[str] = None,
        search: str = "",
        include_archived: bool = False,
        page: int = 1,
        page_size: int = 30,
    ) -> dict:
        try:
            return await self._ejecutar(
                self._listar_skills_admin_sync, categoria, search, include_archived, page, page_size
            )
        except Exception as e:
            logger.error(f"Error al listar skills admin: {e}")
            return {"items": [], "total": 0}

    def _obtener_skill_sync(self, skill_id: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    SELECT id, id_habilidad, nombre, descripcion, categoria, subcategoria,
                           nivel_cognitivo, verbo_principal, evidencias_sugeridas,
                           instrumentos_sugeridos, estado
                    FROM skills_catalog WHERE id = :id
                """),
                {"id": skill_id},
            ).mappings().first()
        return self._mapear_skill_admin(fila) if fila else None

    async def obtener_skill(self, skill_id: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_skill_sync, skill_id)
        except Exception as e:
            logger.error(f"Error al obtener skill {skill_id}: {e}")
            return None

    def _crear_skill_sync(self, data: dict, changed_by: str) -> Optional[dict]:
        sid = str(uuid.uuid4())
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    INSERT INTO skills_catalog
                        (id, id_habilidad, nombre, descripcion, categoria, subcategoria,
                         nivel_cognitivo, verbo_principal, evidencias_sugeridas,
                         instrumentos_sugeridos, estado)
                    VALUES
                        (:id, :id_habilidad, :nombre, :descripcion, :categoria, :subcategoria,
                         :nivel_cognitivo, :verbo_principal, :evidencias_sugeridas,
                         :instrumentos_sugeridos, 'activa')
                    RETURNING id, id_habilidad, nombre, descripcion, categoria, subcategoria,
                              nivel_cognitivo, verbo_principal, evidencias_sugeridas,
                              instrumentos_sugeridos, estado
                """),
                {"id": sid, **{k: data.get(k, "") for k in (
                    "id_habilidad", "nombre", "descripcion", "categoria", "subcategoria",
                    "nivel_cognitivo", "verbo_principal", "evidencias_sugeridas", "instrumentos_sugeridos"
                )}},
            ).mappings().first()
            sesion.execute(
                text("""
                    INSERT INTO skills_catalog_history
                        (id, skill_id, action, payload_after, changed_by)
                    VALUES (:hid, :sid, 'create', :payload, :by)
                """),
                {"hid": str(uuid.uuid4()), "sid": sid, "payload": json.dumps(data, ensure_ascii=False, default=str), "by": changed_by},
            )
            sesion.commit()
        return self._mapear_skill_admin(fila) if fila else None

    async def crear_skill(self, data: dict, changed_by: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._crear_skill_sync, data, changed_by)
        except Exception as e:
            logger.error(f"Error al crear skill: {e}")
            return None

    def _actualizar_skill_sync(self, skill_id: str, data: dict, changed_by: str) -> Optional[dict]:
        with self._Session() as sesion:
            previo = sesion.execute(
                text("SELECT * FROM skills_catalog WHERE id = :id"),
                {"id": skill_id},
            ).mappings().first()
            if not previo:
                return None
            campos = {k: data[k] for k in (
                "id_habilidad", "nombre", "descripcion", "categoria", "subcategoria",
                "nivel_cognitivo", "verbo_principal", "evidencias_sugeridas", "instrumentos_sugeridos"
            ) if k in data}
            if not campos:
                return self._mapear_skill_admin(previo)
            sets = ", ".join(f"{k} = :{k}" for k in campos)
            fila = sesion.execute(
                text(f"""
                    UPDATE skills_catalog SET {sets} WHERE id = :id
                    RETURNING id, id_habilidad, nombre, descripcion, categoria, subcategoria,
                              nivel_cognitivo, verbo_principal, evidencias_sugeridas,
                              instrumentos_sugeridos, estado
                """),
                {**campos, "id": skill_id},
            ).mappings().first()
            sesion.execute(
                text("""
                    INSERT INTO skills_catalog_history
                        (id, skill_id, action, payload_before, payload_after, changed_by)
                    VALUES (:hid, :sid, 'update', :before, :after, :by)
                """),
                {
                    "hid": str(uuid.uuid4()), "sid": skill_id,
                    "before": json.dumps(dict(previo), ensure_ascii=False, default=str),
                    "after": json.dumps(data, ensure_ascii=False, default=str),
                    "by": changed_by,
                },
            )
            sesion.commit()
        return self._mapear_skill_admin(fila) if fila else None

    async def actualizar_skill(self, skill_id: str, data: dict, changed_by: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._actualizar_skill_sync, skill_id, data, changed_by)
        except Exception as e:
            logger.error(f"Error al actualizar skill {skill_id}: {e}")
            return None

    def _archivar_skill_sync(self, skill_id: str, changed_by: str) -> bool:
        with self._Session() as sesion:
            previo = sesion.execute(
                text("SELECT * FROM skills_catalog WHERE id = :id"),
                {"id": skill_id},
            ).mappings().first()
            if not previo:
                return False
            sesion.execute(
                text("UPDATE skills_catalog SET estado = 'archivada' WHERE id = :id"),
                {"id": skill_id},
            )
            sesion.execute(
                text("""
                    INSERT INTO skills_catalog_history
                        (id, skill_id, action, payload_before, changed_by)
                    VALUES (:hid, :sid, 'archive', :before, :by)
                """),
                {
                    "hid": str(uuid.uuid4()), "sid": skill_id,
                    "before": json.dumps(dict(previo), ensure_ascii=False, default=str),
                    "by": changed_by,
                },
            )
            sesion.commit()
        return True

    async def archivar_skill(self, skill_id: str, changed_by: str) -> bool:
        try:
            return await self._ejecutar(self._archivar_skill_sync, skill_id, changed_by)
        except Exception as e:
            logger.error(f"Error al archivar skill {skill_id}: {e}")
            return False

    # ══════════════════════════════════════════════════════════════
    # CURRÍCULO DE CURSOS (curriculum + historial)
    # ══════════════════════════════════════════════════════════════

    def _actualizar_curriculo_curso_sync(
        self, course_id: str, data: dict, changed_by: str, user_career_id: Optional[str], user_role: str
    ) -> Optional[dict]:
        with self._Session() as sesion:
            previo = sesion.execute(
                text("""
                    SELECT c.id, c.is_common, c.program_id, c.sumilla, c.competencia_egreso,
                           c.resultado_aprendizaje, c.capacidad, p.career_id
                    FROM courses c
                    LEFT JOIN programs p ON p.id = c.program_id
                    WHERE c.id = :course_id
                """),
                {"course_id": course_id},
            ).mappings().first()
            if not previo:
                return None
            # Regla: cursos comunes solo admin o director
            if previo.get("is_common") and user_role not in ("admin", "director"):
                raise PermissionError("Solo admin o director puede editar cursos comunes")
            # Scope check: director solo su carrera
            if user_role == "director" and user_career_id:
                if str(previo.get("career_id", "")) != user_career_id:
                    raise PermissionError("Fuera de tu scope de carrera")

            campos_validos = ("sumilla", "competencia_egreso", "resultado_aprendizaje", "capacidad")
            campos = {k: data[k] for k in campos_validos if k in data}
            if not campos:
                return dict(previo)
            sets = ", ".join(f"{k} = :{k}" for k in campos)
            fila = sesion.execute(
                text(f"""
                    UPDATE courses SET {sets} WHERE id = :course_id
                    RETURNING id, name, sumilla, competencia_egreso, resultado_aprendizaje, capacidad
                """),
                {**campos, "course_id": course_id},
            ).mappings().first()
            sesion.execute(
                text("""
                    INSERT INTO courses_curriculum_history
                        (id, course_id, action, payload_before, payload_after, changed_by)
                    VALUES (:hid, :cid, 'update', :before, :after, :by)
                """),
                {
                    "hid": str(uuid.uuid4()), "cid": course_id,
                    "before": json.dumps({k: previo.get(k) for k in campos_validos}, ensure_ascii=False, default=str),
                    "after": json.dumps(campos, ensure_ascii=False, default=str),
                    "by": changed_by,
                },
            )
            sesion.commit()
        return dict(fila) if fila else None

    async def actualizar_curriculo_curso(
        self, course_id: str, data: dict, changed_by: str,
        user_career_id: Optional[str] = None, user_role: str = "admin"
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._actualizar_curriculo_curso_sync,
                course_id, data, changed_by, user_career_id, user_role
            )
        except PermissionError:
            raise
        except Exception as e:
            logger.error(f"Error al actualizar currículo del curso {course_id}: {e}")
            return None

    def _listar_historial_curriculo_sync(self, course_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT h.id, h.course_id, h.action, h.payload_before, h.payload_after,
                           h.changed_at, u.full_name AS changed_by_name
                    FROM courses_curriculum_history h
                    LEFT JOIN users u ON u.id = h.changed_by
                    WHERE h.course_id = :course_id
                    ORDER BY h.changed_at DESC
                """),
                {"course_id": course_id},
            ).mappings().all()
        resultado = []
        for fila in filas:
            item = dict(fila)
            item["changed_at"] = self._serializar_fecha(item.get("changed_at"))
            resultado.append(item)
        return resultado

    async def listar_historial_curriculo(self, course_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_historial_curriculo_sync, course_id)
        except Exception as e:
            logger.error(f"Error al listar historial curriculo {course_id}: {e}")
            return []

    # ══════════════════════════════════════════════════════════════
    # DESEMPEÑOS (performances) por curso
    # ══════════════════════════════════════════════════════════════

    def _mapear_performance(self, fila) -> dict:
        item = dict(fila)
        for campo in ("id", "course_id"):
            if item.get(campo) is not None:
                item[campo] = str(item[campo])
        if "created_at" in item:
            if campo in item:
                item[campo] = self._serializar_fecha(item.get(campo))
        return item

    def _listar_performances_curso_sync(self, course_id: str, include_archived: bool = False) -> list:
        where_arch = "" if include_archived else "AND (p.is_archived = false OR p.is_archived IS NULL)"
        with self._Session() as sesion:
            filas = sesion.execute(
                text(f"""
                    SELECT
                        p.id,
                        p.course_id,
                        p.code,
                        p.statement,
                        p.display_order,
                        p.is_archived,
                        COALESCE((
                            SELECT jsonb_agg(item)
                            FROM jsonb_array_elements(COALESCE(c.temas_conocimientos, '[]'::jsonb)) AS t,
                                 jsonb_array_elements(COALESCE(t->'items', '[]'::jsonb)) AS item
                            WHERE t->>'codigo' = p.code
                        ), '[]'::jsonb) AS conocimientos,
                        COALESCE((
                            SELECT jsonb_agg(item)
                            FROM jsonb_array_elements(COALESCE(c.habilidades_desempenos, '[]'::jsonb)) AS h,
                                 jsonb_array_elements(COALESCE(h->'items', '[]'::jsonb)) AS item
                            WHERE h->>'codigo' = p.code
                        ), '[]'::jsonb) AS habilidades
                    FROM performances p
                    JOIN courses c ON c.id = p.course_id
                    WHERE p.course_id = :course_id {where_arch}
                    ORDER BY p.display_order ASC
                """),
                {"course_id": course_id},
            ).mappings().all()
        return [self._mapear_performance(f) for f in filas]

    async def listar_performances_curso(self, course_id: str, include_archived: bool = False) -> list:
        try:
            return await self._ejecutar(self._listar_performances_curso_sync, course_id, include_archived)
        except Exception as e:
            logger.error(f"Error al listar performances {course_id}: {e}")
            return []

    def _prefill_syllabus_units_sync(
        self,
        syllabus_id: str,
        course_id: str,
        week_dates: list[str],
    ) -> dict:
        performances = self._listar_performances_curso_sync(course_id, include_archived=False)
        if not performances:
            return {"units": [], "contents": [], "warning": "Curso sin desempenos oficiales"}

        total_weeks = 16
        count = max(len(performances), 1)
        base = total_weeks // count
        extra = total_weeks % count
        ranges = []
        start = 1
        for index in range(count):
            end = start + base + (1 if index < extra else 0) - 1
            ranges.append((start, end))
            start = end + 1

        units: list[dict] = []
        contents: list[dict] = []

        with self._Session() as sesion:
            sesion.execute(
                text("DELETE FROM syllabus_units WHERE syllabus_id = CAST(:sid AS UUID)"),
                {"sid": syllabus_id},
            )
            for index, perf in enumerate(performances):
                start_week, end_week = ranges[index]
                skills = perf.get("habilidades") or []
                knowledge = perf.get("conocimientos") or []
                unit_id = str(uuid.uuid4())
                title = f"Unidad {index + 1}: {str(perf.get('statement') or '')[:80]}"
                sesion.execute(
                    text("""
                        INSERT INTO syllabus_units
                            (id, syllabus_id, performance_id, unit_number, title, required_skills)
                        VALUES
                            (CAST(:id AS UUID), CAST(:sid AS UUID), CAST(:pid AS UUID),
                             :unit_number, :title, CAST(:required_skills AS JSONB))
                    """),
                    {
                        "id": unit_id,
                        "sid": syllabus_id,
                        "pid": perf.get("id"),
                        "unit_number": index + 1,
                        "title": title,
                        "required_skills": json.dumps(skills, ensure_ascii=False),
                    },
                )
                unit_payload = {
                    "id": unit_id,
                    "performance_id": perf.get("id"),
                    "performance_code": perf.get("code"),
                    "unit_number": index + 1,
                    "title": title,
                    "required_skills": skills,
                    "weeks": f"{start_week}-{end_week}",
                }
                units.append(unit_payload)

                week_count = end_week - start_week + 1
                for offset, week in enumerate(range(start_week, end_week + 1)):
                    selected = [
                        str(item)
                        for item_pos, item in enumerate(knowledge)
                        if int(item_pos * week_count / max(len(knowledge), 1)) == offset
                    ] if knowledge else []
                    if not selected and knowledge:
                        selected = [str(knowledge[min(offset, len(knowledge) - 1)])]
                    if len(selected) > 2:
                        selected = selected[:2]
                    content_id = str(uuid.uuid4())
                    date_range = week_dates[week - 1] if 0 <= week - 1 < len(week_dates) else "---"
                    content = {
                        "id": content_id,
                        "unit_id": unit_id,
                        "week": week,
                        "date_range": date_range,
                        "knowledge": selected,
                        "activities": "Por definir",
                        "learning_evidence": "Por definir",
                    }
                    sesion.execute(
                        text("""
                            INSERT INTO syllabus_contents
                                (id, unit_id, week, date_range, knowledge, required_skills, activities, learning_evidence)
                            VALUES
                                (CAST(:id AS UUID), CAST(:unit_id AS UUID), :week, :date_range,
                                 :knowledge, :required_skills, :activities, :learning_evidence)
                        """),
                        {
                            "id": content_id,
                            "unit_id": unit_id,
                            "week": week,
                            "date_range": date_range,
                            "knowledge": "; ".join(selected) if selected else "Por definir",
                            "required_skills": "",
                            "activities": "Por definir",
                            "learning_evidence": "Por definir",
                        },
                    )
                    contents.append(content)
            sesion.commit()

        return {"units": units, "contents": contents}

    async def prefill_syllabus_units(
        self,
        syllabus_id: str,
        course_id: str,
        week_dates: list[str],
    ) -> dict:
        try:
            return await self._ejecutar(
                self._prefill_syllabus_units_sync,
                syllabus_id,
                course_id,
                week_dates,
            )
        except Exception as e:
            logger.error(f"Error al precargar unidades oficiales {syllabus_id}: {e}")
            return {}

    def _recalcular_performance_codes_sync(self, sesion, course_id: str) -> None:
        sesion.execute(
            text("""
                UPDATE performances AS p
                SET code = 'D' || rn.row_num::text,
                    display_order = rn.row_num
                FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (ORDER BY display_order ASC) AS row_num
                    FROM performances
                    WHERE course_id = :course_id AND (is_archived = false OR is_archived IS NULL)
                ) AS rn
                WHERE p.id = rn.id
            """),
            {"course_id": course_id},
        )

    def _crear_performance_sync(self, course_id: str, statement: str, changed_by: str) -> Optional[dict]:
        pid = str(uuid.uuid4())
        with self._Session() as sesion:
            max_order = sesion.execute(
                text("""
                    SELECT COALESCE(MAX(display_order), 0) + 1
                    FROM performances
                    WHERE course_id = :course_id AND (is_archived = false OR is_archived IS NULL)
                """),
                {"course_id": course_id},
            ).scalar()
            fila = sesion.execute(
                text("""
                    INSERT INTO performances (id, course_id, code, statement, display_order)
                    VALUES (:id, :course_id, :code, :statement, :order)
                    RETURNING id, course_id, code, statement, display_order, is_archived
                """),
                {
                    "id": pid, "course_id": course_id,
                    "code": f"D{max_order}", "statement": statement, "order": max_order,
                },
            ).mappings().first()
            sesion.execute(
                text("""
                    INSERT INTO performances_history
                        (id, performance_id, course_id, action, payload_after, changed_by)
                    VALUES (:hid, :pid, :cid, 'create', :payload, :by)
                """),
                {"hid": str(uuid.uuid4()), "pid": pid, "cid": course_id,
                 "payload": json.dumps({"statement": statement}, ensure_ascii=False), "by": changed_by},
            )
            sesion.commit()
        return self._mapear_performance(fila) if fila else None

    async def crear_performance(self, course_id: str, statement: str, changed_by: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._crear_performance_sync, course_id, statement, changed_by)
        except Exception as e:
            logger.error(f"Error al crear performance: {e}")
            return None

    def _actualizar_performance_sync(
        self, perf_id: str, statement: str, changed_by: str
    ) -> Optional[dict]:
        with self._Session() as sesion:
            previo = sesion.execute(
                text("SELECT id, course_id, statement FROM performances WHERE id = :id"),
                {"id": perf_id},
            ).mappings().first()
            if not previo:
                return None
            fila = sesion.execute(
                text("""
                    UPDATE performances SET statement = :statement WHERE id = :id
                    RETURNING id, course_id, code, statement, display_order, is_archived
                """),
                {"statement": statement, "id": perf_id},
            ).mappings().first()
            sesion.execute(
                text("""
                    INSERT INTO performances_history
                        (id, performance_id, course_id, action, payload_before, payload_after, changed_by)
                    VALUES (:hid, :pid, :cid, 'update', :before, :after, :by)
                """),
                {
                    "hid": str(uuid.uuid4()), "pid": perf_id, "cid": str(previo["course_id"]),
                    "before": json.dumps({"statement": previo["statement"]}, ensure_ascii=False),
                    "after": json.dumps({"statement": statement}, ensure_ascii=False),
                    "by": changed_by,
                },
            )
            sesion.commit()
        return self._mapear_performance(fila) if fila else None

    async def actualizar_performance(self, perf_id: str, statement: str, changed_by: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._actualizar_performance_sync, perf_id, statement, changed_by)
        except Exception as e:
            logger.error(f"Error al actualizar performance {perf_id}: {e}")
            return None

    def _archivar_performance_sync(self, perf_id: str, changed_by: str) -> bool:
        with self._Session() as sesion:
            previo = sesion.execute(
                text("SELECT id, course_id, code, statement FROM performances WHERE id = :id"),
                {"id": perf_id},
            ).mappings().first()
            if not previo:
                return False
            sesion.execute(
                text("UPDATE performances SET is_archived = true WHERE id = :id"),
                {"id": perf_id},
            )
            self._recalcular_performance_codes_sync(sesion, str(previo["course_id"]))
            sesion.execute(
                text("""
                    INSERT INTO performances_history
                        (id, performance_id, course_id, action, payload_before, changed_by)
                    VALUES (:hid, :pid, :cid, 'archive', :before, :by)
                """),
                {
                    "hid": str(uuid.uuid4()), "pid": perf_id, "cid": str(previo["course_id"]),
                    "before": json.dumps(dict(previo), ensure_ascii=False, default=str),
                    "by": changed_by,
                },
            )
            sesion.commit()
        return True

    async def archivar_performance(self, perf_id: str, changed_by: str) -> bool:
        try:
            return await self._ejecutar(self._archivar_performance_sync, perf_id, changed_by)
        except Exception as e:
            logger.error(f"Error al archivar performance {perf_id}: {e}")
            return False

    # ══════════════════════════════════════════════════════════════
    # VÍNCULOS MÉTODO ↔ HABILIDAD (teaching_method_skill_links)
    # ══════════════════════════════════════════════════════════════

    def _listar_method_skill_links_sync(self, method_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT l.id, l.teaching_method_id AS method_id, l.skill_id,
                           l.priority, l.is_recommended,
                           s.id_habilidad, s.nombre AS skill_nombre,
                           s.categoria AS skill_categoria, s.subcategoria, s.nivel_cognitivo
                    FROM teaching_method_skill_links l
                    JOIN skills_catalog s ON s.id = l.skill_id
                    WHERE l.teaching_method_id = :mid AND s.estado = 'activa'
                    ORDER BY l.is_recommended DESC, l.priority ASC, s.nombre ASC
                """),
                {"mid": method_id},
            ).mappings().all()
        return [self._stringify_uuids(dict(f)) for f in filas]

    def _stringify_uuids(self, item: dict) -> dict:
        for k, v in item.items():
            if hasattr(v, "hex"):  # UUID type
                item[k] = str(v)
        return item

    async def listar_method_skill_links(self, method_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_method_skill_links_sync, method_id)
        except Exception as e:
            logger.error(f"Error al listar links método-skill {method_id}: {e}")
            return []

    def _crear_method_skill_link_sync(
        self, method_id: str, skill_id: str, priority: int, is_recommended: bool
    ) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    INSERT INTO teaching_method_skill_links
                        (id, teaching_method_id, skill_id, priority, is_recommended)
                    VALUES (:id, :mid, :sid, :priority, :is_rec)
                    ON CONFLICT (teaching_method_id, skill_id) DO UPDATE
                        SET priority = EXCLUDED.priority, is_recommended = EXCLUDED.is_recommended
                    RETURNING id, teaching_method_id, skill_id, priority, is_recommended
                """),
                {
                    "id": str(uuid.uuid4()), "mid": method_id, "sid": skill_id,
                    "priority": priority, "is_rec": is_recommended,
                },
            ).mappings().first()
            sesion.commit()
        return self._stringify_uuids(dict(fila)) if fila else None

    async def crear_method_skill_link(
        self, method_id: str, skill_id: str, priority: int = 50, is_recommended: bool = False
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(self._crear_method_skill_link_sync, method_id, skill_id, priority, is_recommended)
        except Exception as e:
            logger.error(f"Error al crear link método-skill: {e}")
            return None

    def _actualizar_method_skill_link_sync(
        self, link_id: str, priority: int, is_recommended: bool
    ) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    UPDATE teaching_method_skill_links
                    SET priority = :priority, is_recommended = :is_rec
                    WHERE id = :id
                    RETURNING id, teaching_method_id, skill_id, priority, is_recommended
                """),
                {"id": link_id, "priority": priority, "is_rec": is_recommended},
            ).mappings().first()
            sesion.commit()
        return self._stringify_uuids(dict(fila)) if fila else None

    async def actualizar_method_skill_link(
        self, link_id: str, priority: int, is_recommended: bool
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(self._actualizar_method_skill_link_sync, link_id, priority, is_recommended)
        except Exception as e:
            logger.error(f"Error al actualizar link {link_id}: {e}")
            return None

    def _eliminar_method_skill_link_sync(self, link_id: str) -> bool:
        with self._Session() as sesion:
            sesion.execute(
                text("DELETE FROM teaching_method_skill_links WHERE id = :id"),
                {"id": link_id},
            )
            sesion.commit()
        return True

    async def eliminar_method_skill_link(self, link_id: str) -> bool:
        try:
            return await self._ejecutar(self._eliminar_method_skill_link_sync, link_id)
        except Exception as e:
            logger.error(f"Error al eliminar link {link_id}: {e}")
            return False

    def _listar_skills_compatibles_sync(
        self, method_id: str, search: str = "", page: int = 1, page_size: int = 50
    ) -> dict:
        offset = (page - 1) * page_size
        with self._Session() as sesion:
            # Skills recomendadas
            recs = sesion.execute(
                text("""
                    SELECT s.id, s.id_habilidad, s.nombre, s.categoria, s.subcategoria,
                           s.nivel_cognitivo, s.verbo_principal, s.evidencias_sugeridas,
                           l.priority, l.is_recommended
                    FROM teaching_method_skill_links l
                    JOIN skills_catalog s ON s.id = l.skill_id
                    WHERE l.teaching_method_id = :mid AND s.estado = 'activa' AND l.is_recommended = true
                    ORDER BY l.priority ASC, s.nombre ASC
                """),
                {"mid": method_id},
            ).mappings().all()

            # Skills compatibles (sin filter de is_recommended)
            compat_q = """
                SELECT s.id, s.id_habilidad, s.nombre, s.categoria, s.subcategoria,
                       s.nivel_cognitivo, s.verbo_principal, s.evidencias_sugeridas,
                       l.priority, l.is_recommended
                FROM teaching_method_skill_links l
                JOIN skills_catalog s ON s.id = l.skill_id
                WHERE l.teaching_method_id = :mid AND s.estado = 'activa'
            """
            params: dict = {"mid": method_id}
            if search.strip():
                compat_q += " AND (LOWER(s.nombre) LIKE :search OR LOWER(s.id_habilidad) LIKE :search)"
                params["search"] = f"%{search.strip().lower()}%"
            compat_q += " ORDER BY l.is_recommended DESC, l.priority ASC, s.nombre ASC LIMIT :ps OFFSET :off"
            params["ps"] = page_size
            params["off"] = offset

            compat = sesion.execute(text(compat_q), params).mappings().all()

            # Count total compatible
            count_q = """
                SELECT COUNT(*) FROM teaching_method_skill_links l
                JOIN skills_catalog s ON s.id = l.skill_id
                WHERE l.teaching_method_id = :mid AND s.estado = 'activa'
            """
            count_params: dict = {"mid": method_id}
            if search.strip():
                count_q += " AND (LOWER(s.nombre) LIKE :search OR LOWER(s.id_habilidad) LIKE :search)"
                count_params["search"] = f"%{search.strip().lower()}%"
            total = sesion.execute(text(count_q), count_params).scalar() or 0

            fallback_mode = len(recs) == 0 and total == 0

        def _map(f):
            item = self._stringify_uuids(dict(f))
            item["id"] = str(item["id"])
            return item

        if fallback_mode:
            # Sin links → devolver catálogo completo activo
            with self._Session() as sesion:
                all_skills_q = """
                    SELECT id, id_habilidad, nombre, categoria, subcategoria,
                           nivel_cognitivo, verbo_principal, evidencias_sugeridas
                    FROM skills_catalog WHERE estado = 'activa'
                """
                params2: dict = {}
                if search.strip():
                    all_skills_q += " AND (LOWER(nombre) LIKE :search OR LOWER(id_habilidad) LIKE :search)"
                    params2["search"] = f"%{search.strip().lower()}%"
                all_skills_q += " ORDER BY categoria ASC, nombre ASC LIMIT :ps OFFSET :off"
                params2["ps"] = page_size
                params2["off"] = offset
                all_skills = sesion.execute(text(all_skills_q), params2).mappings().all()
                total_all = sesion.execute(
                    text("SELECT COUNT(*) FROM skills_catalog WHERE estado = 'activa'")
                ).scalar() or 0
            return {
                "recommended_skills": [],
                "compatible_skills": [_map(f) for f in all_skills],
                "total": total_all,
                "fallback_mode": True,
            }

        return {
            "recommended_skills": [_map(f) for f in recs],
            "compatible_skills": [_map(f) for f in compat],
            "total": total,
            "fallback_mode": False,
        }

    async def listar_skills_compatibles(
        self, method_id: str, search: str = "", page: int = 1, page_size: int = 50
    ) -> dict:
        try:
            return await self._ejecutar(self._listar_skills_compatibles_sync, method_id, search, page, page_size)
        except Exception as e:
            logger.error(f"Error al listar skills compatibles para método {method_id}: {e}")
            return {"recommended_skills": [], "compatible_skills": [], "total": 0, "fallback_mode": True}

    # ══════════════════════════════════════════════════════════════
    # SCOPES Y PERMISOS DE USUARIO
    # ══════════════════════════════════════════════════════════════

    def _sugerir_skills_para_contenido_sync(
        self,
        course_id: str | None = None,
        desempeno: str = "",
        q: str = "",
        nivel_bloom: str = "",
        limit: int = 12,
    ) -> dict:
        terms = " ".join([desempeno or "", q or ""]).strip().lower()
        tokens = [t for t in terms.replace(",", " ").replace(".", " ").split() if len(t) >= 4][:12]

        if course_id:
            with self._Session() as sesion:
                course_row = sesion.execute(
                    text("""
                        SELECT name, temas_conocimientos, habilidades_desempenos
                        FROM courses
                        WHERE id = :course_id
                    """),
                    {"course_id": course_id},
                ).mappings().first()
            if course_row:
                temas = _flatten_text_items(course_row.get("temas_conocimientos"))
                habilidades = _flatten_text_items(course_row.get("habilidades_desempenos"))
                course_terms = " ".join(
                    [
                        str(course_row.get("name") or ""),
                        " ".join(temas),
                        " ".join(habilidades),
                    ]
                )
                tokens.extend([t for t in course_terms.lower().replace(",", " ").split() if len(t) >= 5][:10])

        params: dict = {"limit": max(1, min(limit, 400))}
        where = [
            "LOWER(TRIM(COALESCE(estado, 'activa'))) = 'activa'",
            "COALESCE(is_archived, false) = false",
        ]
        if nivel_bloom.strip():
            where.append("LOWER(COALESCE(nivel_cognitivo, '')) = :nivel")
            params["nivel"] = nivel_bloom.strip().lower()
        if q.strip():
            where.append(
                "(LOWER(nombre) LIKE :q OR LOWER(COALESCE(descripcion, '')) LIKE :q OR LOWER(COALESCE(verbo_principal, '')) LIKE :q)"
            )
            params["q"] = f"%{q.strip().lower()}%"

        with self._Session() as sesion:
            filas = sesion.execute(
                text(f"""
                    SELECT id, id_habilidad, nombre, descripcion, categoria, subcategoria,
                           nivel_cognitivo, verbo_principal, disciplinas_aplicables,
                           evidencias_sugeridas, instrumentos_sugeridos, palabras_clave,
                           estado, is_archived
                    FROM skills_catalog
                    WHERE {' AND '.join(where)}
                    ORDER BY categoria ASC, nivel_cognitivo ASC, nombre ASC
                    LIMIT :limit
                """),
                params,
            ).mappings().all()

            if not filas and not q.strip() and not nivel_bloom.strip():
                filas = sesion.execute(
                    text("""
                        SELECT id, id_habilidad, nombre, descripcion, categoria, subcategoria,
                               nivel_cognitivo, verbo_principal, disciplinas_aplicables,
                               evidencias_sugeridas, instrumentos_sugeridos, palabras_clave,
                               estado, is_archived
                        FROM skills_catalog
                        WHERE COALESCE(is_archived, false) = false
                        ORDER BY categoria ASC, nivel_cognitivo ASC, nombre ASC
                        LIMIT :limit
                    """),
                    {"limit": params["limit"]},
                ).mappings().all()

        def _score(row: dict) -> int:
            nombre = str(row.get("nombre") or "").lower()
            haystack = " ".join(
                [
                    nombre,
                    str(row.get("descripcion") or "").lower(),
                    str(row.get("categoria") or "").lower(),
                    str(row.get("subcategoria") or "").lower(),
                    str(row.get("verbo_principal") or "").lower(),
                    str(row.get("disciplinas_aplicables") or "").lower(),
                    str(row.get("palabras_clave") or "").lower(),
                ]
            )
            return sum(3 if token in nombre else 1 for token in tokens if token in haystack)

        mapped = [self._stringify_uuids(dict(row)) for row in filas]
        mapped.sort(key=lambda row: (-_score(row), str(row.get("nombre") or "")))
        return {"skills": mapped[: params["limit"]], "total": len(mapped)}

    async def sugerir_skills_para_contenido(
        self,
        course_id: str | None = None,
        desempeno: str = "",
        q: str = "",
        nivel_bloom: str = "",
        limit: int = 12,
    ) -> dict:
        try:
            return await self._ejecutar(
                self._sugerir_skills_para_contenido_sync,
                course_id,
                desempeno,
                q,
                nivel_bloom,
                limit,
            )
        except Exception as e:
            logger.error(f"Error al sugerir skills para contenido: {e}")
            return {"skills": [], "total": 0}

    def _listar_scopes_usuario_sync(self, user_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT id, user_id, scope_type, scope_id, active, assigned_by, created_at
                    FROM user_scope_assignments
                    WHERE user_id = :user_id AND active = true
                    ORDER BY scope_type ASC, created_at ASC
                """),
                {"user_id": user_id},
            ).mappings().all()
        return [self._stringify_uuids(dict(f)) for f in filas]

    async def listar_scopes_usuario(self, user_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_scopes_usuario_sync, user_id)
        except Exception as e:
            logger.error(f"Error al listar scopes del usuario {user_id}: {e}")
            return []

    def _asignar_scope_sync(
        self, user_id: str, scope_type: str, scope_id: str, assigned_by: str
    ) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    INSERT INTO user_scope_assignments
                        (id, user_id, scope_type, scope_id, active, assigned_by)
                    VALUES (:id, :uid, :stype, :sid, true, :by)
                    ON CONFLICT (user_id, scope_type, scope_id) DO UPDATE
                        SET active = true, assigned_by = EXCLUDED.assigned_by
                    RETURNING id, user_id, scope_type, scope_id, active, assigned_by, created_at
                """),
                {
                    "id": str(uuid.uuid4()), "uid": user_id,
                    "stype": scope_type, "sid": scope_id, "by": assigned_by,
                },
            ).mappings().first()
            sesion.commit()
        return self._stringify_uuids(dict(fila)) if fila else None

    async def asignar_scope_usuario(
        self, user_id: str, scope_type: str, scope_id: str, assigned_by: str
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(self._asignar_scope_sync, user_id, scope_type, scope_id, assigned_by)
        except Exception as e:
            logger.error(f"Error al asignar scope: {e}")
            return None

    def _revocar_scope_sync(self, scope_id: str) -> bool:
        with self._Session() as sesion:
            sesion.execute(
                text("UPDATE user_scope_assignments SET active = false WHERE id = :id"),
                {"id": scope_id},
            )
            sesion.commit()
        return True

    async def revocar_scope_usuario(self, scope_id: str) -> bool:
        try:
            return await self._ejecutar(self._revocar_scope_sync, scope_id)
        except Exception as e:
            logger.error(f"Error al revocar scope {scope_id}: {e}")
            return False

    def _actualizar_rol_usuario_sync(self, user_id: str, role: str, changed_by: str) -> Optional[dict]:
        ROLES_VALIDOS = {"admin", "director", "coordinador", "docente"}
        if role not in ROLES_VALIDOS:
            raise ValueError(f"Rol inválido: {role}")
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    UPDATE users SET role = :role WHERE id = :id
                    RETURNING id, email, full_name, role, career_id, status
                """),
                {"role": role, "id": user_id},
            ).mappings().first()
            sesion.commit()
        return self._mapear_usuario_fila(fila) if fila else None

    async def actualizar_rol_usuario(self, user_id: str, role: str, changed_by: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._actualizar_rol_usuario_sync, user_id, role, changed_by)
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"Error al actualizar rol de usuario {user_id}: {e}")
            return None

    def _resolve_effective_permissions_sync(self, user_id: str, user_role: str) -> dict:
        with self._Session() as sesion:
            # Plantilla base del rol
            template_rows = sesion.execute(
                text("""
                    SELECT permission_key FROM role_permission_templates WHERE role = :role
                """),
                {"role": user_role},
            ).mappings().all()
            base_perms = {r["permission_key"] for r in template_rows}

            # Overrides del usuario
            override_rows = sesion.execute(
                text("""
                    SELECT permission_key, effect
                    FROM user_permission_overrides
                    WHERE user_id = :uid
                """),
                {"uid": user_id},
            ).mappings().all()

        perms = set(base_perms)
        for ov in override_rows:
            if ov["effect"] == "allow":
                perms.add(ov["permission_key"])
            elif ov["effect"] == "deny":
                perms.discard(ov["permission_key"])

        return {
            "permissions": sorted(perms),
            "base_role": user_role,
            "overrides": [{"key": r["permission_key"], "effect": r["effect"]} for r in override_rows],
        }

    async def resolve_effective_permissions(self, user_id: str, user_role: str) -> dict:
        try:
            return await self._ejecutar(self._resolve_effective_permissions_sync, user_id, user_role)
        except Exception as e:
            logger.error(f"Error al resolver permisos de {user_id}: {e}")
            return {"permissions": [], "base_role": user_role, "overrides": []}

    def _listar_overrides_usuario_sync(self, user_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT o.id, o.user_id, o.permission_key, o.effect,
                           o.granted_by, o.created_at, u.full_name AS granted_by_name
                    FROM user_permission_overrides o
                    LEFT JOIN users u ON u.id = o.granted_by
                    WHERE o.user_id = :uid
                    ORDER BY o.permission_key ASC
                """),
                {"uid": user_id},
            ).mappings().all()
        return [self._stringify_uuids(dict(f)) for f in filas]

    async def listar_overrides_usuario(self, user_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_overrides_usuario_sync, user_id)
        except Exception as e:
            logger.error(f"Error al listar overrides del usuario {user_id}: {e}")
            return []

    def _crear_override_sync(
        self, user_id: str, permission_key: str, effect: str, granted_by: str
    ) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text("""
                    INSERT INTO user_permission_overrides
                        (id, user_id, permission_key, effect, granted_by)
                    VALUES (:id, :uid, :key, :effect, :by)
                    ON CONFLICT (user_id, permission_key) DO UPDATE
                        SET effect = EXCLUDED.effect, granted_by = EXCLUDED.granted_by
                    RETURNING id, user_id, permission_key, effect, granted_by, created_at
                """),
                {
                    "id": str(uuid.uuid4()), "uid": user_id,
                    "key": permission_key, "effect": effect, "by": granted_by,
                },
            ).mappings().first()
            sesion.commit()
        return self._stringify_uuids(dict(fila)) if fila else None

    async def crear_override_usuario(
        self, user_id: str, permission_key: str, effect: str, granted_by: str
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(self._crear_override_sync, user_id, permission_key, effect, granted_by)
        except Exception as e:
            logger.error(f"Error al crear override: {e}")
            return None

    def _eliminar_override_sync(self, override_id: str) -> bool:
        with self._Session() as sesion:
            sesion.execute(
                text("DELETE FROM user_permission_overrides WHERE id = :id"),
                {"id": override_id},
            )
            sesion.commit()
        return True

    async def eliminar_override_usuario(self, override_id: str) -> bool:
        try:
            return await self._ejecutar(self._eliminar_override_sync, override_id)
        except Exception as e:
            logger.error(f"Error al eliminar override {override_id}: {e}")
            return False

    # ──────────────────────────────────────────────
    # WIZARD PROGRESIVO v3
    # ──────────────────────────────────────────────

    def _empty_workflow(self) -> dict:
        """Estado inicial vacío del workflow por bloque."""
        return {
            "bibliography": {"status": "empty", "dirty": False},
            "purpose":      {"status": "empty", "dirty": False},
            "content":      {"status": "empty", "dirty": False},
            "method":       {"status": "empty", "dirty": False},
            "grading":      {"status": "empty", "dirty": False},
        }

    def _empty_progressive_payload(
        self,
        course_id: str,
        semester: str,
        program_id: Optional[str],
        teacher_name: str = "",
        teacher_email: str = "",
        fecha_inicio: str = "",
        fecha_fin: str = "",
    ) -> dict:
        return {
            "_meta": {
                "wizard_version": "v3-progressive",
                "current_step": "bibliography",
                "requires_academic_validation": False,
                "academic_validation_status": "not_required",
            },
            "_workflow": self._empty_workflow(),
            "course_snapshot": {"course_id": course_id},
            "bibliography": {"doc_ids": [], "references": []},
            "purpose": {
                "curriculum_snapshot": {},
                "performances": [],
                "performances_origin": "none",
                "teacher_notes": "",
                "approval_state": "empty",
            },
            "content": {
                "selected_skill_ids": [],
                "knowledge_items": [],
                "attitudes": [],
                "source": "none",
                "teacher_notes": "",
                "approval_state": "empty",
            },
            "method": {
                "suggested_method_id": None,
                "suggestion_reason": "",
                "selected_method_id": None,
                "selected_method_name": "",
                "compatibility_snapshot": {},
                "teacher_notes": "",
                "approval_state": "empty",
            },
            "grading": {
                "template_origin": "none",
                "rows": [],
                "total_percent": 0,
                "teacher_notes": "",
                "approval_state": "empty",
            },
            "final_syllabus": None,
            # legacy fields needed by meta extractor
            "datos_generales": {
                "course_id": course_id,
                "program_id": program_id or "",
                "semestre": semester,
                "docente": teacher_name,
                "docente_email": teacher_email,
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
            },
        }

    @staticmethod
    def _coerce_bibliography_refs(value) -> list[str]:
        if not isinstance(value, list):
            return []

        refs: list[str] = []
        for item in value:
            if isinstance(item, dict):
                raw = (
                    item.get("apa_format")
                    or item.get("ref_text")
                    or item.get("reference")
                    or item.get("text")
                    or item.get("display_text")
                    or item.get("display")
                    or item.get("label")
                    or item.get("title")
                )
            else:
                raw = item

            ref = str(raw or "").strip()
            if ref:
                refs.append(ref)
        return refs

    @classmethod
    def _coerce_progressive_step_block(cls, step_key: str, value) -> dict:
        if isinstance(value, dict):
            return value

        if step_key == "bibliography":
            return {
                "doc_ids": [],
                "references": cls._coerce_bibliography_refs(value),
                "sources_consulted": [],
            }

        return {}

    def _crear_o_obtener_draft_progresivo_sync(
        self,
        course_id: str,
        semester: str,
        user_id: str,
        program_id: Optional[str] = None,
        teacher_name: str = "",
        teacher_email: str = "",
        fecha_inicio: str = "",
        fecha_fin: str = "",
    ) -> dict:
        with self._Session() as sesion:
            # Look for existing open progressive draft
            existing = sesion.execute(
                text("""
                    SELECT id, course_id, user_id, semester, teacher_name, status, payload_json,
                           wizard_version, current_step, requires_academic_validation,
                           academic_validation_status, program_id, created_at, updated_at
                    FROM syllabi
                    WHERE course_id = :course_id
                      AND semester = :semester
                      AND user_id = :user_id
                      AND (
                        (:program_id IS NULL AND program_id IS NULL)
                        OR program_id = :program_id
                      )
                      AND wizard_version = 'v3-progressive'
                      AND status = 'draft'
                    ORDER BY created_at DESC
                    LIMIT 1
                """),
                {
                    "course_id": course_id,
                    "semester": semester,
                    "user_id": user_id,
                    "program_id": program_id,
                },
            ).mappings().first()

            if existing:
                payload = existing["payload_json"]
                if isinstance(payload, str):
                    payload = json.loads(payload)
                if isinstance(payload, dict) and (fecha_inicio or fecha_fin or program_id):
                    datos = payload.setdefault("datos_generales", {})
                    if program_id:
                        payload["program_id"] = program_id
                        datos["program_id"] = program_id
                    if fecha_inicio:
                        datos["fecha_inicio"] = fecha_inicio
                    if fecha_fin:
                        datos["fecha_fin"] = fecha_fin
                    sesion.execute(
                        text(
                            """
                            UPDATE syllabi
                            SET payload_json = CAST(:payload_json AS JSONB), updated_at = now()
                            WHERE id = :id
                            """
                        ),
                        {"id": existing["id"], "payload_json": json.dumps(payload, ensure_ascii=False)},
                    )
                    sesion.commit()
                    existing = dict(existing)
                    existing["payload_json"] = payload
                return self._mapear_silabo_fila(existing) or {}

            # Create new progressive draft
            draft_id = str(uuid.uuid4())
            payload = self._empty_progressive_payload(
                course_id,
                semester,
                program_id,
                teacher_name=teacher_name,
                teacher_email=teacher_email,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
            )
            sesion.execute(
                text("""
                    INSERT INTO syllabi (
                        id, course_id, user_id, semester, teacher_name, status,
                        payload_json, wizard_version, current_step, program_id,
                        requires_academic_validation, academic_validation_status,
                        created_at, updated_at
                    ) VALUES (
                        :id, :course_id, :user_id, :semester, :teacher_name, 'draft',
                        CAST(:payload_json AS JSONB), 'v3-progressive', 'bibliography',
                        :program_id, false, 'not_required', now(), now()
                    )
                """),
                {
                    "id": draft_id,
                    "course_id": course_id,
                    "user_id": user_id,
                    "semester": semester,
                    "teacher_name": teacher_name,
                    "payload_json": json.dumps(payload, ensure_ascii=False),
                    "program_id": program_id,
                },
            )
            sesion.commit()

            fila = sesion.execute(
                text("""
                    SELECT id, course_id, user_id, semester, teacher_name, status, payload_json,
                           wizard_version, current_step, requires_academic_validation,
                           academic_validation_status, program_id, created_at, updated_at
                    FROM syllabi WHERE id = :id
                """),
                {"id": draft_id},
            ).mappings().first()

        return self._mapear_silabo_fila(fila) or {}

    async def crear_o_obtener_draft_progresivo(
        self,
        course_id: str,
        semester: str,
        user_id: str,
        program_id: Optional[str] = None,
        teacher_name: str = "",
        teacher_email: str = "",
        fecha_inicio: str = "",
        fecha_fin: str = "",
    ) -> dict:
        try:
            return await self._ejecutar(
                self._crear_o_obtener_draft_progresivo_sync,
                course_id, semester, user_id, program_id, teacher_name, teacher_email,
                fecha_inicio, fecha_fin,
            )
        except Exception as e:
            logger.error(f"Error al crear/obtener draft progresivo: {e}")
            return {}

    def _guardar_step_block_sync(
        self,
        syllabus_id: str,
        step_key: str,
        block_data: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        with self._Session() as sesion:
            row = sesion.execute(
                text("SELECT payload_json, wizard_version FROM syllabi WHERE id = :id"),
                {"id": syllabus_id},
            ).mappings().first()

            if not row:
                return None

            payload = row["payload_json"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            if not isinstance(payload, dict):
                payload = {}

            # Merge block data
            current_block = self._coerce_progressive_step_block(
                step_key,
                payload.get(step_key),
            )
            current_block.update(block_data)
            payload[step_key] = current_block

            # Update workflow state
            if not isinstance(payload.get("_workflow"), dict):
                payload["_workflow"] = self._empty_workflow()
            workflow_block = payload["_workflow"].get(step_key, {})
            if not isinstance(workflow_block, dict):
                workflow_block = {}
            current_block_status = workflow_block.get("status", "empty")
            # Don't downgrade approved → edited
            if current_block_status != "approved":
                payload["_workflow"][step_key] = {"status": "edited", "dirty": False}

            # Update current step tracking
            if not isinstance(payload.get("_meta"), dict):
                payload["_meta"] = {}
            payload["_meta"]["current_step"] = step_key

            # Check if academic validation is required
            if step_key == "purpose":
                origin = payload.get("purpose", {}).get("performances_origin", "")
                requires = origin in ("ai_suggested", "teacher_edited_from_ai")
                payload["_meta"]["requires_academic_validation"] = requires
                payload["_meta"]["academic_validation_status"] = "pending" if requires else "not_required"

            sesion.execute(
                text("""
                    UPDATE syllabi
                    SET payload_json = CAST(:payload_json AS JSONB),
                        current_step = :step_key,
                        requires_academic_validation = :requires_academic_validation,
                        academic_validation_status = :academic_validation_status,
                        autosaved_at = now(),
                        updated_at = now()
                    WHERE id = :id
                """),
                {
                    "id": syllabus_id,
                    "payload_json": json.dumps(payload, ensure_ascii=False),
                    "step_key": step_key,
                    "requires_academic_validation": bool(
                        payload.get("_meta", {}).get("requires_academic_validation", False)
                    ),
                    "academic_validation_status": payload.get("_meta", {}).get(
                        "academic_validation_status",
                        "not_required",
                    ),
                },
            )
            sesion.commit()

        return {"syllabus_id": syllabus_id, "step_key": step_key, "saved": True}

    async def guardar_step_block(
        self,
        syllabus_id: str,
        step_key: str,
        block_data: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._guardar_step_block_sync,
                syllabus_id, step_key, block_data, user_id,
            )
        except Exception as e:
            logger.error(f"Error al guardar step block {step_key} en {syllabus_id}: {e}")
            return None

    def _marcar_envio_validacion_academica_sync(self, syllabus_id: str) -> bool:
        with self._Session() as sesion:
            row = sesion.execute(
                text("SELECT payload_json FROM syllabi WHERE id = :id"),
                {"id": syllabus_id},
            ).mappings().first()
            if not row:
                return False

            payload = row["payload_json"]
            if isinstance(payload, str):
                payload = json.loads(payload)

            payload.setdefault("_meta", {})
            payload["_meta"]["requires_academic_validation"] = True
            payload["_meta"]["academic_validation_status"] = "pending"

            resultado = sesion.execute(
                text("""
                    UPDATE syllabi
                    SET payload_json = CAST(:payload_json AS JSONB),
                        status = 'review',
                        requires_academic_validation = true,
                        academic_validation_status = 'pending',
                        submitted_for_validation_at = now(),
                        updated_at = now()
                    WHERE id = CAST(:id AS UUID)
                """),
                {
                    "id": syllabus_id,
                    "payload_json": json.dumps(payload, ensure_ascii=False),
                },
            )
            sesion.commit()
            return resultado.rowcount > 0

    async def marcar_envio_validacion_academica(self, syllabus_id: str) -> bool:
        try:
            return await self._ejecutar(
                self._marcar_envio_validacion_academica_sync,
                syllabus_id,
            )
        except Exception as e:
            logger.error(f"Error al enviar a validacion academica {syllabus_id}: {e}")
            return False

    def _guardar_ai_suggestion_sync(
        self,
        syllabus_id: str,
        step_key: str,
        input_json: dict,
        output_json: dict,
        user_id: Optional[str] = None,
    ) -> None:
        import hashlib
        request_hash = hashlib.sha256(
            json.dumps(input_json, sort_keys=True).encode()
        ).hexdigest()[:64]

        with self._Session() as sesion:
            sesion.execute(
                text("""
                    INSERT INTO syllabus_ai_suggestions
                        (id, syllabus_id, step_key, request_hash, input_json, output_json, created_by, created_at)
                    VALUES
                        (gen_random_uuid(), :sid, :step, :hash, CAST(:inp AS JSONB), CAST(:out AS JSONB), :uid, now())
                """),
                {
                    "sid": syllabus_id,
                    "step": step_key,
                    "hash": request_hash,
                    "inp": json.dumps(input_json, ensure_ascii=False),
                    "out": json.dumps(output_json, ensure_ascii=False),
                    "uid": user_id,
                },
            )
            sesion.commit()

    async def guardar_ai_suggestion(
        self,
        syllabus_id: str,
        step_key: str,
        input_json: dict,
        output_json: dict,
        user_id: Optional[str] = None,
    ) -> None:
        try:
            await self._ejecutar(
                self._guardar_ai_suggestion_sync,
                syllabus_id, step_key, input_json, output_json, user_id,
            )
        except Exception as e:
            logger.warning(f"No se pudo guardar sugerencia IA ({step_key}): {e}")

    def _mapear_progressive_row(self, fila) -> Optional[dict]:
        if not fila:
            return None
        data = dict(fila)
        for campo in ("id", "syllabus_id", "generation_id", "parent_generation_id"):
            if data.get(campo) is not None:
                data[campo] = str(data[campo])
        for campo in ("created_at", "updated_at", "started_at", "finished_at"):
            if campo in data:
                data[campo] = self._serializar_fecha(data.get(campo))
        for campo in (
            "timeline_json",
            "extracted_context_json",
            "locked_weeks_json",
            "traceability_context_json",
            "output_json",
            "validation_summary_json",
            "request_json",
            "result_json",
        ):
            if isinstance(data.get(campo), str):
                try:
                    data[campo] = json.loads(data[campo])
                except Exception:
                    pass
        return data

    def _progressive_syllabus_access_clause(
        self,
        user_id: Optional[str],
        prefix: str = "s",
    ) -> tuple[str, dict]:
        if not user_id:
            return "", {}
        return f" AND ({prefix}.user_id = :uid OR {prefix}.user_id IS NULL)", {"uid": user_id}

    def _crear_ai_generation_job_sync(
        self,
        syllabus_id: str,
        job_type: str,
        request_json: dict,
        user_id: Optional[str] = None,
        unit_number: Optional[int] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            syllabus = sesion.execute(
                text(f"SELECT id FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).first()
            if not syllabus:
                return None

            if user_id:
                active = sesion.execute(
                    text(
                        """
                        SELECT *
                        FROM ai_generation_jobs
                        WHERE user_id = :uid
                          AND status IN ('pending', 'running')
                          AND created_at >= NOW() - INTERVAL '15 minutes'
                        ORDER BY created_at DESC
                        LIMIT 1
                        """
                    ),
                    {"uid": user_id},
                ).mappings().first()
                if active:
                    mapped = self._mapear_progressive_row(active)
                    if mapped:
                        mapped["reused"] = True
                    return mapped

            fila = sesion.execute(
                text(
                    """
                    INSERT INTO ai_generation_jobs (
                        id, syllabus_id, user_id, job_type, status, unit_number,
                        request_json, attempts, created_at, updated_at
                    )
                    VALUES (
                        gen_random_uuid(), :sid, :uid, :job_type, 'pending', :unit_number,
                        CAST(:request_json AS JSONB), 0, now(), now()
                    )
                    RETURNING *
                    """
                ),
                {
                    "sid": syllabus_id,
                    "uid": user_id,
                    "job_type": job_type,
                    "unit_number": int(unit_number) if unit_number is not None else None,
                    "request_json": json.dumps(request_json or {}, ensure_ascii=False),
                },
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def crear_ai_generation_job(
        self,
        syllabus_id: str,
        job_type: str,
        request_json: dict,
        user_id: Optional[str] = None,
        unit_number: Optional[int] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._crear_ai_generation_job_sync,
                syllabus_id,
                job_type,
                request_json,
                user_id,
                unit_number,
            )
        except Exception as e:
            logger.error(f"Error al crear job IA {job_type} para silabo {syllabus_id}: {e}")
            return None

    def _obtener_ai_generation_job_sync(
        self,
        job_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    f"""
                    SELECT j.*
                    FROM ai_generation_jobs j
                    JOIN syllabi s ON s.id = j.syllabus_id
                    WHERE j.id = :job_id
                      {access_clause}
                    """
                ),
                {"job_id": job_id, **access_params},
            ).mappings().first()
        return self._mapear_progressive_row(fila)

    async def obtener_ai_generation_job(
        self,
        job_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_ai_generation_job_sync, job_id, user_id)
        except Exception as e:
            logger.error(f"Error al obtener job IA {job_id}: {e}")
            return None

    def _marcar_ai_generation_job_running_sync(self, job_id: str) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    UPDATE ai_generation_jobs
                    SET status = 'running',
                        attempts = attempts + 1,
                        started_at = COALESCE(started_at, now()),
                        updated_at = now()
                    WHERE id = :job_id
                      AND status IN ('pending', 'running')
                    RETURNING *
                    """
                ),
                {"job_id": job_id},
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def marcar_ai_generation_job_running(self, job_id: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._marcar_ai_generation_job_running_sync, job_id)
        except Exception as e:
            logger.error(f"Error al marcar job IA running {job_id}: {e}")
            return None

    def _completar_ai_generation_job_sync(self, job_id: str, result_json: dict) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    UPDATE ai_generation_jobs
                    SET status = 'done',
                        result_json = CAST(:result_json AS JSONB),
                        error_message = NULL,
                        finished_at = now(),
                        updated_at = now()
                    WHERE id = :job_id
                    RETURNING *
                    """
                ),
                {
                    "job_id": job_id,
                    "result_json": json.dumps(result_json or {}, ensure_ascii=False),
                },
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def completar_ai_generation_job(self, job_id: str, result_json: dict) -> Optional[dict]:
        try:
            return await self._ejecutar(self._completar_ai_generation_job_sync, job_id, result_json)
        except Exception as e:
            logger.error(f"Error al completar job IA {job_id}: {e}")
            return None

    def _fallar_ai_generation_job_sync(
        self,
        job_id: str,
        error_message: str,
        result_json: Optional[dict] = None,
    ) -> Optional[dict]:
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    UPDATE ai_generation_jobs
                    SET status = 'error',
                        error_message = :error_message,
                        result_json = CAST(:result_json AS JSONB),
                        finished_at = now(),
                        updated_at = now()
                    WHERE id = :job_id
                    RETURNING *
                    """
                ),
                {
                    "job_id": job_id,
                    "error_message": error_message,
                    "result_json": json.dumps(result_json or {}, ensure_ascii=False),
                },
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def fallar_ai_generation_job(
        self,
        job_id: str,
        error_message: str,
        result_json: Optional[dict] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._fallar_ai_generation_job_sync,
                job_id,
                error_message,
                result_json,
            )
        except Exception as e:
            logger.error(f"Error al fallar job IA {job_id}: {e}")
            return None

    def _guardar_curricular_product_options_sync(
        self,
        syllabus_id: str,
        options: list[dict],
        user_id: Optional[str] = None,
    ) -> list[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            exists = sesion.execute(
                text(f"SELECT id FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).first()
            if not exists:
                return []

            rows: list[dict] = []
            for option in options[:6]:
                fila = sesion.execute(
                    text(
                        """
                        INSERT INTO curricular_product_options (
                            id, syllabus_id, category, title, justification,
                            timeline_json, selected, created_at
                        )
                        VALUES (
                            gen_random_uuid(), :sid, :category, :title, :justification,
                            CAST(:timeline AS JSONB), :selected, now()
                        )
                        RETURNING *
                        """
                    ),
                    {
                        "sid": syllabus_id,
                        "category": option.get("category") or "Libre de proponer por IA",
                        "title": option.get("title") or "Producto integrador",
                        "justification": option.get("justification") or "",
                        "timeline": json.dumps(option.get("timeline_json") or {}, ensure_ascii=False),
                        "selected": bool(option.get("selected", False)),
                    },
                ).mappings().first()
                mapped = self._mapear_progressive_row(fila)
                if mapped:
                    rows.append(mapped)
            sesion.commit()
            return rows

    async def guardar_curricular_product_options(
        self,
        syllabus_id: str,
        options: list[dict],
        user_id: Optional[str] = None,
    ) -> list[dict]:
        try:
            return await self._ejecutar(
                self._guardar_curricular_product_options_sync,
                syllabus_id, options, user_id,
            )
        except Exception as e:
            logger.error(f"Error al guardar opciones de producto {syllabus_id}: {e}")
            return []

    def _seleccionar_curricular_product_option_sync(
        self,
        syllabus_id: str,
        option_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            syllabus_row = sesion.execute(
                text(f"SELECT payload_json FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).mappings().first()
            if not syllabus_row:
                return None

            option = sesion.execute(
                text(
                    """
                    SELECT * FROM curricular_product_options
                    WHERE id = :oid AND syllabus_id = :sid
                    """
                ),
                {"oid": option_id, "sid": syllabus_id},
            ).mappings().first()
            if not option:
                return None

            sesion.execute(
                text("UPDATE curricular_product_options SET selected = false WHERE syllabus_id = :sid"),
                {"sid": syllabus_id},
            )
            fila = sesion.execute(
                text(
                    """
                    UPDATE curricular_product_options
                    SET selected = true
                    WHERE id = :oid AND syllabus_id = :sid
                    RETURNING *
                    """
                ),
                {"oid": option_id, "sid": syllabus_id},
            ).mappings().first()
            selected = self._mapear_progressive_row(fila)

            payload = syllabus_row["payload_json"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            if not isinstance(payload, dict):
                payload = {}
            progressive = payload.setdefault("progressive_curriculum", {})
            progressive["selected_product"] = selected
            progressive["updated_at"] = datetime.now(timezone.utc).isoformat()
            sesion.execute(
                text(
                    """
                    UPDATE syllabi
                    SET payload_json = CAST(:payload AS JSONB), updated_at = now()
                    WHERE id = :sid
                    """
                ),
                {"sid": syllabus_id, "payload": json.dumps(payload, ensure_ascii=False)},
            )
            sesion.commit()
            return selected

    async def seleccionar_curricular_product_option(
        self,
        syllabus_id: str,
        option_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._seleccionar_curricular_product_option_sync,
                syllabus_id, option_id, user_id,
            )
        except Exception as e:
            logger.error(f"Error al seleccionar producto {option_id}: {e}")
            return None

    def _upsert_unit_context_sync(
        self,
        syllabus_id: str,
        unit_number: int,
        raw_context_text: str,
        extracted_context_json: dict,
        notebook_prompt_version: str = "v1",
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            exists = sesion.execute(
                text(f"SELECT id FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).first()
            if not exists:
                return None
            fila = sesion.execute(
                text(
                    """
                    INSERT INTO syllabus_unit_contexts (
                        id, syllabus_id, unit_number, raw_context_text,
                        extracted_context_json, notebook_prompt_version,
                        created_at, updated_at
                    )
                    VALUES (
                        gen_random_uuid(), :sid, :unit_number, :raw_context_text,
                        CAST(:extracted AS JSONB), :prompt_version, now(), now()
                    )
                    ON CONFLICT (syllabus_id, unit_number)
                    DO UPDATE SET
                        raw_context_text = EXCLUDED.raw_context_text,
                        extracted_context_json = EXCLUDED.extracted_context_json,
                        notebook_prompt_version = EXCLUDED.notebook_prompt_version,
                        updated_at = now()
                    RETURNING *
                    """
                ),
                {
                    "sid": syllabus_id,
                    "unit_number": int(unit_number),
                    "raw_context_text": raw_context_text or "",
                    "extracted": json.dumps(extracted_context_json or {}, ensure_ascii=False),
                    "prompt_version": notebook_prompt_version,
                },
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def upsert_unit_context(
        self,
        syllabus_id: str,
        unit_number: int,
        raw_context_text: str,
        extracted_context_json: dict,
        notebook_prompt_version: str = "v1",
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._upsert_unit_context_sync,
                syllabus_id,
                unit_number,
                raw_context_text,
                extracted_context_json,
                notebook_prompt_version,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al guardar contexto de unidad {unit_number}: {e}")
            return None

    def _obtener_unit_context_sync(
        self,
        syllabus_id: str,
        unit_number: int,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    f"""
                    SELECT c.*
                    FROM syllabus_unit_contexts c
                    JOIN syllabi s ON s.id = c.syllabus_id
                    WHERE c.syllabus_id = :sid
                      AND c.unit_number = :unit_number
                      {access_clause}
                    """
                ),
                {"sid": syllabus_id, "unit_number": int(unit_number), **access_params},
            ).mappings().first()
        return self._mapear_progressive_row(fila)

    async def obtener_unit_context(
        self,
        syllabus_id: str,
        unit_number: int,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._obtener_unit_context_sync, syllabus_id, unit_number, user_id
            )
        except Exception as e:
            logger.error(f"Error al obtener contexto de unidad {unit_number}: {e}")
            return None

    def _listar_unit_generations_sync(
        self,
        syllabus_id: str,
        unit_number: Optional[int] = None,
        status: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> list[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        query = f"""
            SELECT g.*
            FROM syllabus_unit_generations g
            JOIN syllabi s ON s.id = g.syllabus_id
            WHERE g.syllabus_id = :sid
              {access_clause}
        """
        params: dict = {"sid": syllabus_id, **access_params}
        if unit_number is not None:
            query += " AND g.unit_number = :unit_number"
            params["unit_number"] = int(unit_number)
        if status:
            query += " AND g.status = :status"
            params["status"] = status
        query += " ORDER BY g.unit_number ASC, g.version DESC"
        with self._Session() as sesion:
            filas = sesion.execute(text(query), params).mappings().all()
        return [self._mapear_progressive_row(fila) for fila in filas if fila]

    async def listar_unit_generations(
        self,
        syllabus_id: str,
        unit_number: Optional[int] = None,
        status: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> list[dict]:
        try:
            return await self._ejecutar(
                self._listar_unit_generations_sync,
                syllabus_id,
                unit_number,
                status,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al listar generaciones de unidad {syllabus_id}: {e}")
            return []

    def _obtener_latest_unit_generation_sync(
        self,
        syllabus_id: str,
        unit_number: int,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        rows = self._listar_unit_generations_sync(
            syllabus_id,
            unit_number=unit_number,
            status=None,
            user_id=user_id,
        )
        return rows[0] if rows else None

    async def obtener_latest_unit_generation(
        self,
        syllabus_id: str,
        unit_number: int,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._obtener_latest_unit_generation_sync,
                syllabus_id,
                unit_number,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al obtener ultima generacion de unidad {unit_number}: {e}")
            return None

    def _guardar_unit_generation_sync(
        self,
        syllabus_id: str,
        unit_number: int,
        output_json: list[dict] | dict,
        validation_summary_json: dict,
        traceability_context_json: dict,
        locked_weeks_json: list[int] | None = None,
        teacher_instruction: str = "",
        parent_generation_id: Optional[str] = None,
        status: str = "draft",
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            exists = sesion.execute(
                text(f"SELECT id FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).first()
            if not exists:
                return None
            next_version = sesion.execute(
                text(
                    """
                    SELECT COALESCE(MAX(version), 0) + 1
                    FROM syllabus_unit_generations
                    WHERE syllabus_id = :sid AND unit_number = :unit_number
                    """
                ),
                {"sid": syllabus_id, "unit_number": int(unit_number)},
            ).scalar_one()
            fila = sesion.execute(
                text(
                    """
                    INSERT INTO syllabus_unit_generations (
                        id, syllabus_id, unit_number, version, parent_generation_id,
                        status, locked_weeks_json, teacher_instruction,
                        traceability_context_json, output_json, validation_summary_json,
                        created_at
                    )
                    VALUES (
                        gen_random_uuid(), :sid, :unit_number, :version, :parent_id,
                        :status, CAST(:locked AS JSONB), :teacher_instruction,
                        CAST(:traceability AS JSONB), CAST(:output AS JSONB),
                        CAST(:summary AS JSONB), now()
                    )
                    RETURNING *
                    """
                ),
                {
                    "sid": syllabus_id,
                    "unit_number": int(unit_number),
                    "version": int(next_version),
                    "parent_id": parent_generation_id,
                    "status": status,
                    "locked": json.dumps(locked_weeks_json or [], ensure_ascii=False),
                    "teacher_instruction": teacher_instruction or "",
                    "traceability": json.dumps(traceability_context_json or {}, ensure_ascii=False),
                    "output": json.dumps(output_json or [], ensure_ascii=False),
                    "summary": json.dumps(validation_summary_json or {}, ensure_ascii=False),
                },
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def guardar_unit_generation(
        self,
        syllabus_id: str,
        unit_number: int,
        output_json: list[dict] | dict,
        validation_summary_json: dict,
        traceability_context_json: dict,
        locked_weeks_json: list[int] | None = None,
        teacher_instruction: str = "",
        parent_generation_id: Optional[str] = None,
        status: str = "draft",
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._guardar_unit_generation_sync,
                syllabus_id,
                unit_number,
                output_json,
                validation_summary_json,
                traceability_context_json,
                locked_weeks_json,
                teacher_instruction,
                parent_generation_id,
                status,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al guardar generacion de unidad {unit_number}: {e}")
            return None

    def _guardar_week_validations_sync(
        self,
        generation_id: str,
        syllabus_id: str,
        unit_number: int,
        weeks: list[dict],
    ) -> int:
        with self._Session() as sesion:
            sesion.execute(
                text("DELETE FROM syllabus_week_validations WHERE generation_id = :gid"),
                {"gid": generation_id},
            )
            count = 0
            for row in weeks:
                validation = row.get("validation") or row
                week = row.get("week") or validation.get("week")
                if not str(week).isdigit():
                    continue
                sesion.execute(
                    text(
                        """
                        INSERT INTO syllabus_week_validations (
                            id, generation_id, syllabus_id, unit_number, week,
                            methodological_score, cognitive_score, formative_score,
                            technique_score, evidence_score, total_score, diagnosis,
                            created_at
                        )
                        VALUES (
                            gen_random_uuid(), :gid, :sid, :unit_number, :week,
                            :methodological, :cognitive, :formative,
                            :technique, :evidence, :total, :diagnosis,
                            now()
                        )
                        """
                    ),
                    {
                        "gid": generation_id,
                        "sid": syllabus_id,
                        "unit_number": int(unit_number),
                        "week": int(week),
                        "methodological": validation.get("methodological_score"),
                        "cognitive": validation.get("cognitive_score"),
                        "formative": validation.get("formative_score"),
                        "technique": validation.get("technique_score"),
                        "evidence": validation.get("evidence_score"),
                        "total": validation.get("total_score"),
                        "diagnosis": validation.get("diagnosis") or "",
                    },
                )
                count += 1
            sesion.commit()
            return count

    async def guardar_week_validations(
        self,
        generation_id: str,
        syllabus_id: str,
        unit_number: int,
        weeks: list[dict],
    ) -> int:
        try:
            return await self._ejecutar(
                self._guardar_week_validations_sync,
                generation_id,
                syllabus_id,
                unit_number,
                weeks,
            )
        except Exception as e:
            logger.error(f"Error al guardar validaciones semanales {generation_id}: {e}")
            return 0

    def _aprobar_unit_generation_sync(
        self,
        syllabus_id: str,
        unit_number: int,
        generation_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            exists = sesion.execute(
                text(f"SELECT id FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).first()
            if not exists:
                return None
            if not generation_id:
                target = sesion.execute(
                    text(
                        """
                        SELECT id FROM syllabus_unit_generations
                        WHERE syllabus_id = :sid AND unit_number = :unit_number
                        ORDER BY version DESC LIMIT 1
                        """
                    ),
                    {"sid": syllabus_id, "unit_number": int(unit_number)},
                ).mappings().first()
                generation_id = str(target["id"]) if target else None
            if not generation_id:
                return None
            sesion.execute(
                text(
                    """
                    UPDATE syllabus_unit_generations
                    SET status = 'rejected'
                    WHERE syllabus_id = :sid
                      AND unit_number = :unit_number
                      AND status = 'approved'
                      AND id <> :gid
                    """
                ),
                {"sid": syllabus_id, "unit_number": int(unit_number), "gid": generation_id},
            )
            fila = sesion.execute(
                text(
                    """
                    UPDATE syllabus_unit_generations
                    SET status = 'approved'
                    WHERE id = :gid
                      AND syllabus_id = :sid
                      AND unit_number = :unit_number
                    RETURNING *
                    """
                ),
                {"gid": generation_id, "sid": syllabus_id, "unit_number": int(unit_number)},
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def aprobar_unit_generation(
        self,
        syllabus_id: str,
        unit_number: int,
        generation_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._aprobar_unit_generation_sync,
                syllabus_id,
                unit_number,
                generation_id,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al aprobar unidad {unit_number}: {e}")
            return None

    def _actualizar_week_lock_sync(
        self,
        syllabus_id: str,
        unit_number: int,
        week: int,
        locked: bool,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        latest = self._obtener_latest_unit_generation_sync(syllabus_id, unit_number, user_id)
        if not latest:
            return None
        locked_weeks = {
            int(item) for item in (latest.get("locked_weeks_json") or [])
            if str(item).isdigit()
        }
        if locked:
            locked_weeks.add(int(week))
        else:
            locked_weeks.discard(int(week))

        weeks = latest.get("output_json") or []
        if isinstance(weeks, dict):
            weeks = weeks.get("weeks") or []
        for row in weeks:
            if int(row.get("week") or 0) == int(week):
                row["locked"] = bool(locked)

        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    UPDATE syllabus_unit_generations
                    SET locked_weeks_json = CAST(:locked AS JSONB),
                        output_json = CAST(:output AS JSONB)
                    WHERE id = :gid
                    RETURNING *
                    """
                ),
                {
                    "gid": latest["id"],
                    "locked": json.dumps(sorted(locked_weeks), ensure_ascii=False),
                    "output": json.dumps(weeks, ensure_ascii=False),
                },
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def actualizar_week_lock(
        self,
        syllabus_id: str,
        unit_number: int,
        week: int,
        locked: bool,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._actualizar_week_lock_sync,
                syllabus_id,
                unit_number,
                week,
                locked,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al actualizar lock semana {week}: {e}")
            return None

    def _actualizar_unit_week_sync(
        self,
        syllabus_id: str,
        unit_number: int,
        week: int,
        row_patch: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        latest = self._obtener_latest_unit_generation_sync(syllabus_id, unit_number, user_id)
        if not latest:
            return None
        weeks = latest.get("output_json") or []
        if isinstance(weeks, dict):
            weeks = weeks.get("weeks") or []
        allowed = {
            "performance", "required_skills", "skill", "knowledge",
            "activity", "evidence", "phase", "validation", "locked",
        }
        updated = False
        for row in weeks:
            if int(row.get("week") or 0) == int(week):
                for key, value in row_patch.items():
                    if key in allowed:
                        row[key] = value
                updated = True
                break
        if not updated:
            return None
        with self._Session() as sesion:
            fila = sesion.execute(
                text(
                    """
                    UPDATE syllabus_unit_generations
                    SET output_json = CAST(:output AS JSONB)
                    WHERE id = :gid
                    RETURNING *
                    """
                ),
                {"gid": latest["id"], "output": json.dumps(weeks, ensure_ascii=False)},
            ).mappings().first()
            sesion.commit()
            return self._mapear_progressive_row(fila)

    async def actualizar_unit_week(
        self,
        syllabus_id: str,
        unit_number: int,
        week: int,
        row_patch: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._actualizar_unit_week_sync,
                syllabus_id,
                unit_number,
                week,
                row_patch,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al actualizar semana {week}: {e}")
            return None

    def _obtener_progressive_curriculum_state_sync(
        self,
        syllabus_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            syllabus = sesion.execute(
                text(f"SELECT id, payload_json FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).mappings().first()
            if not syllabus:
                return None
            products = sesion.execute(
                text(
                    """
                    SELECT * FROM curricular_product_options
                    WHERE syllabus_id = :sid
                    ORDER BY selected DESC, created_at DESC
                    """
                ),
                {"sid": syllabus_id},
            ).mappings().all()
            contexts = sesion.execute(
                text(
                    """
                    SELECT * FROM syllabus_unit_contexts
                    WHERE syllabus_id = :sid
                    ORDER BY unit_number ASC
                    """
                ),
                {"sid": syllabus_id},
            ).mappings().all()
            generations = sesion.execute(
                text(
                    """
                    SELECT DISTINCT ON (unit_number) *
                    FROM syllabus_unit_generations
                    WHERE syllabus_id = :sid
                    ORDER BY unit_number ASC, version DESC
                    """
                ),
                {"sid": syllabus_id},
            ).mappings().all()
        payload = syllabus["payload_json"]
        if isinstance(payload, str):
            payload = json.loads(payload)
        return {
            "syllabus_id": syllabus_id,
            "progressive_curriculum": (payload or {}).get("progressive_curriculum", {}),
            "product_options": [self._mapear_progressive_row(row) for row in products],
            "unit_contexts": [self._mapear_progressive_row(row) for row in contexts],
            "unit_generations": [self._mapear_progressive_row(row) for row in generations],
        }

    async def obtener_progressive_curriculum_state(
        self,
        syllabus_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._obtener_progressive_curriculum_state_sync,
                syllabus_id,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al obtener estado progressive curriculum {syllabus_id}: {e}")
            return None

    def _guardar_progressive_assembly_sync(
        self,
        syllabus_id: str,
        final_payload: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        access_clause, access_params = self._progressive_syllabus_access_clause(user_id)
        with self._Session() as sesion:
            row = sesion.execute(
                text(f"SELECT payload_json FROM syllabi s WHERE s.id = :sid{access_clause}"),
                {"sid": syllabus_id, **access_params},
            ).mappings().first()
            if not row:
                return None
            payload = row["payload_json"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            if not isinstance(payload, dict):
                payload = {}
            payload.setdefault("progressive_curriculum", {})
            payload["progressive_curriculum"].update(final_payload.get("progressive_curriculum") or {})
            if final_payload.get("cronograma_semanal"):
                payload["cronograma_semanal"] = final_payload.get("cronograma_semanal")
            if final_payload.get("unidades_tematicas"):
                payload["unidades_tematicas"] = final_payload.get("unidades_tematicas")

            sistema_evaluacion = payload.get("sistema_evaluacion")
            if not isinstance(sistema_evaluacion, dict):
                sistema_evaluacion = {}
            if not sistema_evaluacion.get("criterios"):
                grading_block = payload.get("grading") if isinstance(payload.get("grading"), dict) else {}
                grading_rows = grading_block.get("rows") if isinstance(grading_block, dict) else []
                criterios = []
                for index, grading_row in enumerate(grading_rows or []):
                    if not isinstance(grading_row, dict):
                        continue
                    criterios.append(
                        {
                            "nombre": grading_row.get("evidencia")
                            or grading_row.get("nombre")
                            or grading_row.get("name")
                            or f"Evaluacion {index + 1}",
                            "sigla": grading_row.get("sigla")
                            or grading_row.get("code")
                            or f"EV{index + 1}",
                            "porcentaje": grading_row.get("porcentaje")
                            if grading_row.get("porcentaje") is not None
                            else grading_row.get("percentage", 0),
                            "cronograma": grading_row.get("cronograma")
                            or grading_row.get("schedule")
                            or "-",
                        }
                    )
                if criterios:
                    sistema_evaluacion = dict(sistema_evaluacion)
                    sistema_evaluacion["criterios"] = criterios
                    payload["sistema_evaluacion"] = sistema_evaluacion

            enriched_final_payload = dict(final_payload or {})
            for key in (
                "datos_generales",
                "sumilla",
                "competencia_profesional",
                "capacidad_del_curso",
                "resultado_aprendizaje",
                "resultados_aprendizaje",
                "bibliografia",
                "metodologia",
                "tutoria",
                "responsabilidad_social",
                "sistema_evaluacion",
                "evaluacion_matriz",
                "grading",
            ):
                if payload.get(key) and not enriched_final_payload.get(key):
                    enriched_final_payload[key] = payload.get(key)
            payload["final_syllabus"] = enriched_final_payload
            payload["_meta"] = payload.get("_meta") or {}
            payload["_meta"]["progressive_curriculum_assembled_at"] = datetime.now(timezone.utc).isoformat()
            sesion.execute(
                text(
                    """
                    UPDATE syllabi
                    SET payload_json = CAST(:payload AS JSONB),
                        current_step = 'progressive_curriculum',
                        updated_at = now()
                    WHERE id = :sid
                    """
                ),
                {"sid": syllabus_id, "payload": json.dumps(payload, ensure_ascii=False)},
            )
            sesion.commit()
            return {
                "syllabus_id": syllabus_id,
                "saved": True,
                "final_syllabus": enriched_final_payload,
            }

    async def guardar_progressive_assembly(
        self,
        syllabus_id: str,
        final_payload: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._guardar_progressive_assembly_sync,
                syllabus_id,
                final_payload,
                user_id,
            )
        except Exception as e:
            logger.error(f"Error al guardar ensamblaje progressive curriculum {syllabus_id}: {e}")
            return None

    def _obtener_draft_progresivo_sync(
        self,
        syllabus_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        query = """
            SELECT id, course_id, user_id, semester, status, payload_json,
                   wizard_version, current_step, requires_academic_validation,
                   academic_validation_status, program_id, created_at, updated_at
            FROM syllabi WHERE id = :id
        """
        params: dict = {"id": syllabus_id}
        if user_id:
            query += " AND (user_id = :uid OR user_id IS NULL)"
            params["uid"] = user_id

        with self._Session() as sesion:
            fila = sesion.execute(text(query), params).mappings().first()

        return self._mapear_silabo_fila(fila) if fila else None

    async def obtener_draft_progresivo(
        self,
        syllabus_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._obtener_draft_progresivo_sync, syllabus_id, user_id
            )
        except Exception as e:
            logger.error(f"Error al obtener draft progresivo {syllabus_id}: {e}")
            return None

    def _ensamblar_final_sync(
        self,
        syllabus_id: str,
        final_payload: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        with self._Session() as sesion:
            row = sesion.execute(
                text("SELECT payload_json FROM syllabi WHERE id = :id"),
                {"id": syllabus_id},
            ).mappings().first()

            if not row:
                return None

            payload = row["payload_json"]
            if isinstance(payload, str):
                payload = json.loads(payload)

            payload["final_syllabus"] = final_payload
            for key, value in final_payload.items():
                if key in {"bibliography", "purpose", "content", "method", "grading"}:
                    continue
                payload[key] = value
            if "_meta" not in payload:
                payload["_meta"] = {}
            payload["_meta"]["assembled_at"] = datetime.now(timezone.utc).isoformat()

            datos_generales = final_payload.get("datos_generales", {}) or {}
            methodology_json = final_payload.get("methodology_json")

            sesion.execute(
                text("""
                    UPDATE syllabi
                    SET payload_json = CAST(:payload_json AS JSONB),
                        course_id = :course_id,
                        semester = :semester,
                        teacher_name = :teacher_name,
                        teaching_method_id = :teaching_method_id,
                        methodology_json = CAST(:methodology_json AS JSONB),
                        updated_at = now()
                    WHERE id = :id
                """),
                {
                    "id": syllabus_id,
                    "payload_json": json.dumps(payload, ensure_ascii=False),
                    "course_id": datos_generales.get("course_id") or None,
                    "semester": datos_generales.get("semestre", ""),
                    "teacher_name": datos_generales.get("docente", ""),
                    "teaching_method_id": final_payload.get("method_id"),
                    "methodology_json": json.dumps(methodology_json, ensure_ascii=False)
                    if methodology_json is not None
                    else None,
                },
            )
            sesion.commit()

        return self._mapear_silabo_fila(
            sesion.execute(
                text("SELECT * FROM syllabi WHERE id = :id"),
                {"id": syllabus_id},
            ).mappings().first()
        ) if False else {"id": syllabus_id, "assembled": True}

    async def ensamblar_final(
        self,
        syllabus_id: str,
        final_payload: dict,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        try:
            return await self._ejecutar(
                self._ensamblar_final_sync, syllabus_id, final_payload, user_id
            )
        except Exception as e:
            logger.error(f"Error al ensamblar draft final {syllabus_id}: {e}")
            return None

    def _listar_evidencias_metodo_sync(self, method_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT e.id, e.code, e.name, e.description,
                           l.priority, l.is_recommended
                    FROM teaching_method_evidence_links l
                    JOIN evaluation_evidence_catalog e ON e.id = l.evidence_id
                    WHERE l.teaching_method_id = :mid AND e.active = true
                    ORDER BY l.is_recommended DESC, l.priority ASC
                """),
                {"mid": method_id},
            ).mappings().all()
        return [self._stringify_uuids(dict(f)) for f in filas]

    async def listar_evidencias_metodo(self, method_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_evidencias_metodo_sync, method_id)
        except Exception as e:
            logger.error(f"Error al listar evidencias método {method_id}: {e}")
            return []

    def _listar_instrumentos_metodo_sync(self, method_id: str) -> list:
        with self._Session() as sesion:
            filas = sesion.execute(
                text("""
                    SELECT i.id, i.code, i.name, i.description,
                           l.priority, l.is_recommended
                    FROM teaching_method_instrument_links l
                    JOIN evaluation_instruments_catalog i ON i.id = l.instrument_id
                    WHERE l.teaching_method_id = :mid AND i.active = true
                    ORDER BY l.is_recommended DESC, l.priority ASC
                """),
                {"mid": method_id},
            ).mappings().all()
        return [self._stringify_uuids(dict(f)) for f in filas]

    async def listar_instrumentos_metodo(self, method_id: str) -> list:
        try:
            return await self._ejecutar(self._listar_instrumentos_metodo_sync, method_id)
        except Exception as e:
            logger.error(f"Error al listar instrumentos método {method_id}: {e}")
            return []

