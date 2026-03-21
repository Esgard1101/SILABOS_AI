from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix='/institutional', tags=['Institutional'])


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


@router.get('/faculties')
async def listar_facultades(request: Request):
    servicios = _obtener_servicios(request)
    supabase = servicios.get('supabase')

    if not supabase:
        raise HTTPException(status_code=503, detail='Base de datos no disponible')

    faculties = await supabase.listar_facultades_carreras()
    return {'faculties': faculties}
