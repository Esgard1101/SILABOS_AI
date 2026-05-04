# Silabos.AI - Backend principal
# FastAPI app con lifespan, CORS, routers y endpoint /health

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

from services.gemini_service import GeminiService
from services.search_service import SearchService
from services.supabase_service import SupabaseService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

servicios: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa y limpia los servicios compartidos de la aplicacion."""
    logger.info("Iniciando Silabos.AI Backend...")

    try:
        servicios["gemini"] = GeminiService()
        logger.info("GeminiService: OK")
    except Exception as exc:
        logger.error("Error al inicializar GeminiService: %s", exc)
        servicios["gemini"] = None

    try:
        servicios["search"] = SearchService()
        logger.info("SearchService: OK")
    except Exception as exc:
        logger.error("Error al inicializar SearchService: %s", exc)
        servicios["search"] = None

    try:
        servicios["supabase"] = SupabaseService()
        logger.info("SupabaseService: OK")
    except Exception as exc:
        logger.error("Error al inicializar SupabaseService: %s", exc)
        servicios["supabase"] = None

    audit_model = (
        os.getenv("OPENROUTER_AUDIT_MODEL")
        or os.getenv("OPENROUTER_MODEL")
        or "google/gemma-4-26b-a4b-it:free"
    )
    print(
        "Enrutamiento IA activo: "
        f"critico=Gemini({os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite-preview')}) | "
        f"no_critico=OpenRouter({audit_model})"
    )
    logger.info("Backend listo para recibir solicitudes")
    yield

    logger.info("Apagando Silabos.AI Backend...")
    servicios.clear()


app = FastAPI(
    title="Silabos.AI API",
    description="Backend de generacion automatica de silabos universitarios con IA",
    version="1.0.0",
    lifespan=lifespan,
)

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = list(
    set(
        origin
        for origin in [
            "http://localhost:3000",
            "http://localhost:5173",
            _frontend_url,
        ]
        if origin
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from routers import admin, auth, chat, documents, institutional, search, syllabus  # noqa: E402
from routers.analytics import router as analytics_router  # noqa: E402
from routers.institutional_catalog import router as catalog_router  # noqa: E402
from routers.programs import router as programs_router  # noqa: E402
from routers.progressive import router as progressive_router  # noqa: E402
from routers.progressive_curriculum import router as progressive_curriculum_router  # noqa: E402

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
app.include_router(progressive_router, prefix="/api")
app.include_router(progressive_curriculum_router, prefix="/api")

static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="frontend")
    logger.info("Frontend estatico montado desde: %s", static_path)


@app.get("/health", tags=["Sistema"])
async def health_check():
    """
    Verifica el estado de cada servicio externo.
    Mantiene compatibilidad con la semantica previa y agrega OpenRouter.
    """
    estado = {
        "api": "online",
        "gemini": "error",
        "openai": "no_configurado",
        "openrouter": "no_configurado",
        "supabase": "error",
        "google_search": "no_configurado",
    }

    gemini: GeminiService = servicios.get("gemini")
    if gemini:
        ok = await gemini.verificar_conexion()
        estado["gemini"] = "ok" if ok else "error"
        estado["openai"] = await gemini.verificar_conexion_openai()
        estado["openrouter"] = await gemini.verificar_conexion_openrouter()
    else:
        estado["gemini"] = "no_inicializado"
        estado["openai"] = "no_inicializado"
        estado["openrouter"] = "no_inicializado"

    supabase: SupabaseService = servicios.get("supabase")
    if supabase:
        ok = await supabase.verificar_conexion()
        estado["supabase"] = "ok" if ok else "error"
    else:
        estado["supabase"] = "no_inicializado"

    search_service: SearchService = servicios.get("search")
    if search_service and search_service.api_key and search_service.engine_id:
        estado["google_search"] = "configurado"
    else:
        estado["google_search"] = "no_configurado"

    todo_ok = estado["gemini"] == "ok" and estado["supabase"] == "ok"

    return {
        "success": todo_ok,
        "data": estado,
        "error": None if todo_ok else "Uno o mas servicios no estan disponibles",
    }


@app.get("/", tags=["Sistema"])
async def raiz():
    """Endpoint raiz de bienvenida."""
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
