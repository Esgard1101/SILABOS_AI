# Silabos.AI — Backend principal
# FastAPI app con lifespan, CORS, routers y endpoint /health

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Cargar variables de entorno ANTES de importar servicios
load_dotenv()

from services.gemini_service import GeminiService
from services.search_service import SearchService
from services.supabase_service import SupabaseService

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Contenedor global de servicios (inyectado en routers)
# ──────────────────────────────────────────────
servicios: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Inicializa los servicios al arrancar la aplicación
    y los limpia al apagarla.
    """
    logger.info("Iniciando Silabos.AI Backend...")

    # Inicializar servicios
    try:
        servicios["gemini"] = GeminiService()
        logger.info("GeminiService: OK")
    except Exception as e:
        logger.error(f"Error al inicializar GeminiService: {e}")
        servicios["gemini"] = None

    try:
        servicios["search"] = SearchService()
        logger.info("SearchService: OK")
    except Exception as e:
        logger.error(f"Error al inicializar SearchService: {e}")
        servicios["search"] = None

    try:
        servicios["supabase"] = SupabaseService()
        logger.info("SupabaseService: OK")
    except Exception as e:
        logger.error(f"Error al inicializar SupabaseService: {e}")
        servicios["supabase"] = None

    print(f"🤖 Proveedor IA activo: {os.getenv('AI_PROVIDER', 'gemini')}")
    logger.info("Backend listo para recibir solicitudes")
    yield

    # Limpieza al apagar
    logger.info("Apagando Silabos.AI Backend...")
    servicios.clear()


# ──────────────────────────────────────────────
# Crear aplicación FastAPI
# ──────────────────────────────────────────────
app = FastAPI(
    title="Silabos.AI API",
    description="Backend de generación automática de sílabos universitarios con IA",
    version="1.0.0",
    lifespan=lifespan,
)

# ──────────────────────────────────────────────
# CORS — Solo para el frontend en desarrollo
# ──────────────────────────────────────────────
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    _frontend_url,
]
_allowed_origins = list(set(o for o in _allowed_origins if o))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ──────────────────────────────────────────────
# Incluir routers
# ──────────────────────────────────────────────
from routers import syllabus, documents, search, chat, auth, institutional, admin  # noqa: E402
from routers.analytics import router as analytics_router  # noqa: E402
from routers.institutional_catalog import router as catalog_router  # noqa: E402
from routers.programs import router as programs_router  # noqa: E402

app.include_router(auth.router, prefix="/api")
app.include_router(syllabus.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(institutional.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(programs_router, prefix="/api")

# ──────────────────────────────────────────────
# Servir frontend compilado (opcional)
# ──────────────────────────────────────────────
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="frontend")
    logger.info(f"Frontend estático montado desde: {static_path}")


# ──────────────────────────────────────────────
# Endpoint de salud
# ──────────────────────────────────────────────
@app.get("/health", tags=["Sistema"])
async def health_check():
    """
    Verifica el estado de cada servicio externo.
    Devuelve el estado individual de Gemini, Supabase y Google Search.
    """
    estado = {
        "api": "online",
        "gemini": "error",
        "supabase": "error",
        "google_search": "no_configurado",
    }

    # Verificar Gemini
    gemini: GeminiService = servicios.get("gemini")
    if gemini:
        ok = await gemini.verificar_conexion()
        estado["gemini"] = "ok" if ok else "error"
    else:
        estado["gemini"] = "no_inicializado"

    # Verificar Supabase
    supabase: SupabaseService = servicios.get("supabase")
    if supabase:
        ok = await supabase.verificar_conexion()
        estado["supabase"] = "ok" if ok else "error"
    else:
        estado["supabase"] = "no_inicializado"

    # Verificar Google Search (solo comprueba si las keys están configuradas)
    search: SearchService = servicios.get("search")
    if search and search.api_key and search.engine_id:
        estado["google_search"] = "configurado"
    else:
        estado["google_search"] = "no_configurado"

    # El sistema está operativo si al menos Gemini y Supabase responden
    todo_ok = estado["gemini"] == "ok" and estado["supabase"] == "ok"

    return {
        "success": todo_ok,
        "data": estado,
        "error": None if todo_ok else "Uno o más servicios no están disponibles",
    }


@app.get("/", tags=["Sistema"])
async def raiz():
    """Endpoint raíz de bienvenida."""
    return {
        "success": True,
        "data": {
            "nombre": "Silabos.AI API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/health",
        },
        "error": None,
    }
