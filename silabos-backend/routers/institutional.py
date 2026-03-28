from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix='/institutional', tags=['Institutional'])


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


@router.get('/faculties')
async def listar_facultades(request: Request):
    """Lista todas las facultades con sus carreras anidadas."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get('supabase')

    if not supabase:
        raise HTTPException(status_code=503, detail='Base de datos no disponible')

    faculties = await supabase.listar_facultades_carreras()
    return {'faculties': faculties}


@router.get('/careers')
async def listar_careers(request: Request, faculty_id: str = Query(...)):
    """
    Lista las carreras/escuelas de una facultad.
    Usado por ContextSelector para carga en cascada.
    """
    servicios = _obtener_servicios(request)
    supabase = servicios.get('supabase')

    if not supabase:
        raise HTTPException(status_code=503, detail='Base de datos no disponible')

    careers = await supabase.listar_careers(faculty_id)
    return {'success': True, 'data': careers, 'error': None}
