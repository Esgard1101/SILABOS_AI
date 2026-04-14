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
        logger.info("SupabaseService inicializado con SQLAlchemy + psycopg2")

    # ──────────────────────────────────────────────
    # Ejecución segura en hilo (evita bloquear el event loop)
    # ──────────────────────────────────────────────

    async def _ejecutar(self, func, *args, **kwargs):
        """Corre una función síncrona en un hilo del pool del SO."""
        return await asyncio.to_thread(func, *args, **kwargs)

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
        """Elimina un documento de la base de datos y del disco."""
        try:
            return await self._ejecutar(self._eliminar_doc_sync, doc_id)
        except Exception as e:
            logger.error(f"Error al eliminar documento {doc_id}: {e}")
            return False

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
                    WHERE id = :id::uuid
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
                      (:sid::uuid, :ver, :payload::jsonb,
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
                    WHERE syllabus_id = :sid::uuid
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
                    VALUES (:sid::uuid, :name, :obs)
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
                    WHERE syllabus_id = :sid::uuid
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
                            created_at, updated_at
                        )
                    VALUES
                        (
                            :id, :course_id, :user_id, :semester,
                            :teacher_name, :status,
                            CAST(:payload_json AS JSONB),
                            now(), now()
                        )
                    RETURNING
                        id, course_id, user_id, semester,
                        teacher_name, status, payload_json,
                        created_at, updated_at
                """),
                {
                    "id": syllabus_id,
                    "course_id": meta["course_id"],
                    "user_id": user_id,
                    "semester": meta["semester"],
                    "teacher_name": meta["teacher_name"],
                    "status": meta["status"],
                    "payload_json": json.dumps(silabo_dict, ensure_ascii=False),
                },
            )
            sesion.commit()
            fila = resultado.mappings().first()

        logger.info(f"SÃ­labo guardado con ID: {syllabus_id}")
        return self._mapear_silabo_fila(fila) or {}

    async def guardar_silabo(
        self,
        silabo_dict: dict,
        user_id: Optional[str] = None,
        status: str = "draft",
    ) -> dict:
        try:
            return await self._ejecutar(
                self._guardar_silabo_sync,
                silabo_dict,
                user_id,
                status,
            )
        except Exception as e:
            logger.error(f"Error al guardar sÃ­labo: {e}")
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
            logger.error(f"Error al actualizar sÃ­labo {silabo_id}: {e}")
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
            logger.error(f"Error al obtener sÃ­labo {silabo_id}: {e}")
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
            logger.error(f"Error al listar sÃ­labos: {e}")
            return []

    def _obtener_ultima_version_sync(self, syllabus_id: str) -> int:
        with self._Session() as sesion:
            ultima = sesion.execute(
                text("""
                    SELECT COALESCE(MAX(version_number), 0)
                    FROM syllabus_versions
                    WHERE syllabus_id = :sid::uuid
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
            logger.error(f"Error al obtener Ãºltima versiÃ³n: {e}")
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
                    SELECT id, name, code, credits, cycle, is_common, scope,
                           program_id, sumilla, competencia_egreso, resultado_aprendizaje, capacidad
                    FROM courses
                    WHERE id = :course_id
                """),
                {"course_id": course_id},
            ).mappings().first()
        return dict(fila) if fila else None

    async def obtener_curso(self, course_id: str) -> Optional[dict]:
        try:
            return await self._ejecutar(self._obtener_curso_sync, course_id)
        except Exception as e:
            logger.error(f"Error al obtener curso {course_id}: {e}")
            return None

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
