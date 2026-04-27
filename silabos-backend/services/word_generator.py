"""Generacion DOCX y PDF para silabos."""

import logging
import os
import re
from html import escape
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _val(v: Any, fallback: str = "") -> str:
    if v is None:
        return fallback
    s = str(v).strip()
    if not s or s in {"—", "\u00e2\u20ac\u201d", "None", "none", "null", "NULL", "/"}:
        return fallback
    return s


def _pair(left: Any, right: Any, fallback: str = "—") -> str:
    parts = [_val(left), _val(right)]
    visible = [part for part in parts if part]
    return " / ".join(visible) if visible else fallback


def _format_hours(theory: Any, practice: Any, fallback: str = "â€”") -> str:
    t = _val(theory)
    p = _val(practice)
    if t and p:
        return f"Teoria: {t} / Practica: {p}"
    if t:
        return f"Teoria: {t}"
    if p:
        return f"Practica: {p}"
    return fallback


def _safe_filename(nombre_curso: str) -> str:
    nombre = re.sub(r"[^\w\s-]", "", nombre_curso or "silabo")
    return re.sub(r"\s+", "_", nombre.strip())[:50] or "silabo"


def _build_context(silabo: dict) -> dict:
    """
    Construye el contexto de exportacion del silabo.
    Sin rowspan: cada fila semanal repite desempeno y habilidades.
    Matriz programacion: 8 cols (Desempenos|Sem|Fecha|K|H|A|Actividades|Evidencias).
    """
    dg = silabo.get("datos_generales") or {}

    def _list_to_lines(value: Any) -> str:
        if isinstance(value, list):
            parts = [str(v).strip() for v in value if str(v or "").strip()]
            return ", ".join(parts) if parts else "—"
        if isinstance(value, str):
            return value.strip() or "—"
        return "—"

    unidades_raw = silabo.get("unidades_tematicas") or []
    desempenos = []
    for i, unidad in enumerate(unidades_raw):
        logro = _val(unidad.get("logro"))
        desempenos.append(
            {
                "codigo": f"D{i + 1}",
                "descripcion": logro or f"D{i + 1}",
            }
        )

    ra_unidades = []
    for i, unidad in enumerate(unidades_raw):
        ra_text = _val(unidad.get("ra_unidad")) or _val(unidad.get("logro"))
        ra_unidades.append(
            {
                "codigo": f"RA{i + 1}",
                "descripcion": ra_text or f"RA{i + 1}",
            }
        )

    cronograma_map: dict[int, dict] = {}
    for item in silabo.get("cronograma_semanal") or []:
        if isinstance(item, dict) and "semana" in item:
            try:
                cronograma_map[int(item["semana"])] = item
            except (TypeError, ValueError):
                continue

    unidades_ctx = []
    roman_units = ["I", "II", "III", "IV"]
    for i, unidad in enumerate(unidades_raw):
        desempeno_txt = _val(unidad.get("logro"), f"D{i + 1}")
        habilidades_txt = _val(
            unidad.get("habilidades_requeridas") or unidad.get("logro"),
            "—",
        )

        semanas_str = _val(unidad.get("semanas"), "")
        partes = re.findall(r"\d+", semanas_str)
        semanas: list[int] = []
        if len(partes) >= 2:
            semanas = list(range(int(partes[0]), int(partes[1]) + 1))
        elif len(partes) == 1:
            semanas = [int(partes[0])]

        filas = []
        if semanas:
            for semana in semanas:
                sem_data = cronograma_map.get(semana) or {}
                temas_raw = unidad.get("temas") or []
                conocimientos = ""

                if sem_data.get("tema"):
                    conocimientos = _val(sem_data.get("tema"))
                elif temas_raw:
                    for tema in temas_raw:
                        if (
                            isinstance(tema, dict)
                            and str(tema.get("semana", "")).isdigit()
                            and int(tema["semana"]) == semana
                        ):
                            conocimientos = _val(
                                tema.get("conocimientos") or tema.get("tema")
                            )
                            break
                    if not conocimientos and isinstance(temas_raw[0], str):
                        conocimientos = ", ".join(str(t) for t in temas_raw)

                desempeno_celda = _val(sem_data.get("desempeno"), f"D{i + 1}. {desempeno_txt}")
                conocimientos_celda = _list_to_lines(sem_data.get("conocimientos")) if sem_data.get("conocimientos") else (conocimientos or "—")
                habilidades_celda = _list_to_lines(sem_data.get("habilidades")) if sem_data.get("habilidades") else habilidades_txt
                actitudes_celda = _list_to_lines(sem_data.get("actitudes"))
                evidencia_celda = _val(sem_data.get("evidencia") or sem_data.get("producto"), "—")
                filas.append(
                    {
                        "desempeno": desempeno_celda,
                        "habilidades": habilidades_celda,
                        "actitudes": actitudes_celda,
                        "semana": f"{semana}",
                        "fecha": _val(sem_data.get("fecha"), "—"),
                        "conocimientos": conocimientos_celda,
                        "actividades": _val(sem_data.get("actividad"), "—"),
                        "evidencias": evidencia_celda,
                    }
                )
        else:
            temas = unidad.get("temas") or []
            temas_txt = ", ".join(
                t if isinstance(t, str) else _val(t.get("conocimientos") or t.get("tema"))
                for t in temas
            )
            filas.append(
                {
                    "desempeno": f"D{i + 1}. {desempeno_txt}",
                    "habilidades": habilidades_txt,
                    "actitudes": _list_to_lines(unidad.get("actitudes")),
                    "semana": semanas_str or "—",
                    "fecha": "—",
                    "conocimientos": temas_txt or "—",
                    "actividades": "—",
                    "evidencias": "—",
                }
            )

        numero = _val(unidad.get("numero"), str(i + 1))
        titulo = _val(unidad.get("titulo"), f"Unidad {i + 1}")
        unidades_ctx.append(
            {
                "numero": numero,
                "titulo": titulo,
                "titulo_completo": f"6.{numero}. UNIDAD {roman_units[i] if i < len(roman_units) else numero}: {titulo}",
                "ra_unidad": _val(unidad.get("ra_unidad") or unidad.get("logro"), "—"),
                "desempeno": f"D{i + 1}. {desempeno_txt}",
                "habilidades": habilidades_txt,
                "filas": filas,
            }
        )

    eval_filas = []
    for unidad in unidades_ctx:
        for fila in unidad.get("filas", []):
            eval_filas.append(
                {
                    "desempeno": fila["desempeno"],
                    "habilidades": fila["habilidades"],
                    "evidencias": fila["evidencias"] or "—",
                    "instrumento": "Rubrica analitica",
                }
            )

    matriz_raw = silabo.get("evaluacion_matriz") or []
    if matriz_raw:
        eval_filas = []
        for index, item in enumerate(matriz_raw):
            if not isinstance(item, dict):
                continue
            eval_filas.append(
                {
                    "resultado_aprendizaje": _val(
                        item.get("resultado_aprendizaje")
                        or item.get("resultadoDeAprendizaje"),
                        f"RA{index + 1}",
                    ),
                    "desempenos": _val(
                        item.get("desempenos") or item.get("desempeno"),
                        "—",
                    ),
                    "evidencias": _val(
                        item.get("evidenciasDeAprendizaje") or item.get("evidencias"),
                        "—",
                    ),
                    "instrumentos": _val(item.get("instrumentos"), "—"),
                }
            )
    else:
        eval_filas = []
        for index, unidad in enumerate(unidades_ctx):
            evidencias = []
            seen = set()
            for fila in unidad.get("filas", []):
                evidencia = _val(fila.get("evidencias"), "")
                key = evidencia.lower()
                if evidencia and key not in seen:
                    seen.add(key)
                    evidencias.append(evidencia)
            eval_filas.append(
                {
                    "resultado_aprendizaje": f"RA{index + 1}",
                    "desempenos": unidad.get("desempeno") or "—",
                    "evidencias": "; ".join(evidencias) if evidencias else "—",
                    "instrumentos": "Rubrica analitica",
                }
            )

    criterios = (silabo.get("sistema_evaluacion") or {}).get("criterios") or []
    grading = []
    for index, criterio in enumerate(criterios):
        if not isinstance(criterio, dict):
            continue
        grading.append(
            {
                "evidencia": _val(criterio.get("nombre"), f"Evaluacion {index + 1}"),
                "sigla": _val(criterio.get("sigla"), f"EV{index + 1}"),
                "peso": f"{criterio.get('porcentaje', 0)}%",
                "cronograma": _val(
                    criterio.get("cronograma"),
                    criterio.get("descripcion"),
                ),
            }
        )

    if not grading:
        grading = [
            {
                "evidencia": "Tareas",
                "sigla": "TA",
                "peso": "15%",
                "cronograma": "Permanente",
            },
            {
                "evidencia": "Producto Acreditable 1",
                "sigla": "PA1",
                "peso": "15%",
                "cronograma": "Semana 4",
            },
            {
                "evidencia": "Producto Acreditable 2",
                "sigla": "PA2",
                "peso": "20%",
                "cronograma": "Semana 8",
            },
            {
                "evidencia": "Examen Parcial",
                "sigla": "EP",
                "peso": "15%",
                "cronograma": "Semana 12",
            },
            {
                "evidencia": "Proyecto Final y Reflexión",
                "sigla": "PA3",
                "peso": "35%",
                "cronograma": "Semana 16",
            },
        ]

    referencias = [
        _val(b.get("referencia"))
        for b in (silabo.get("bibliografia") or [])
        if isinstance(b, dict) and b.get("referencia")
    ]

    competencia = _val(
        silabo.get("competencia_profesional")
        or (silabo.get("competencias") or [""])[0]
    )
    capacidad = _val(
        silabo.get("capacidad_del_curso")
        or (silabo.get("resultados_aprendizaje") or [""])[0]
    )
    ra_curso = _val(
        silabo.get("resultado_aprendizaje")
        or (silabo.get("resultados_aprendizaje") or [""])[0]
    )
    responsabilidad_raw = (
        silabo.get("responsabilidad_social")
        or silabo.get("responsabilidadSocial")
        or {}
    )
    if isinstance(responsabilidad_raw, dict):
        responsabilidad_social = _val(
            responsabilidad_raw.get("actividadPropuesta")
            or responsabilidad_raw.get("actividad_propuesta")
            or responsabilidad_raw.get("descripcion"),
            "Plantear una actividad para el desarrollo de un Proyecto de RSU ligado al proceso formativo del curso.",
        )
    else:
        responsabilidad_social = _val(
            responsabilidad_raw,
            "Plantear una actividad para el desarrollo de un Proyecto de RSU ligado al proceso formativo del curso.",
        )

    return {
        "facultad": _val(dg.get("facultad")),
        "escuela_profesional": _val(
            dg.get("escuela_profesional") or dg.get("carrera")
        ),
        "programa_estudios": _val(
            dg.get("programa_estudios") or dg.get("carrera")
        ),
        "departamento_academico": _val(
            dg.get("escuela_profesional") or dg.get("carrera")
        ),
        "nombre_curso": _val(dg.get("nombre_curso")),
        "programa": _val(dg.get("programa_estudios") or dg.get("carrera")),
        "escuela": _val(dg.get("escuela_profesional") or dg.get("carrera")),
        "modalidad": _val(dg.get("modalidad"), "Presencial").capitalize(),
        "curso": _val(dg.get("nombre_curso")),
        "prerrequisito": _val(dg.get("prerrequisito")),
        "codigo_curso": _val(dg.get("codigo")),
        "semestre": _val(dg.get("semestre")),
        "periodo_academico": _val(
            dg.get("periodo_academico") or dg.get("semestre")
        ),
        "creditos": _val(dg.get("creditos")),
        "horas_teoria": _val(dg.get("horas_teoria")),
        "horas_practica": _val(dg.get("horas_practica")),
        "fecha_inicio": _val(dg.get("fecha_inicio")),
        "fecha_fin": _val(dg.get("fecha_fin")),
        "horas_semanales": _format_hours(dg.get("horas_teoria"), dg.get("horas_practica")),
        "docente_nombre": _val(dg.get("docente")),
        "docente_email": _val(dg.get("docente_email")),
        "sumilla": _val(silabo.get("sumilla")),
        "competencia_profesional": competencia,
        "capacidad_del_curso": capacidad,
        "ra_curso": ra_curso,
        "ra_unidades": ra_unidades,
        "desempenos": desempenos,
        "unidades": unidades_ctx,
        "eval_filas": eval_filas,
        "grading": grading,
        "formula_pf": "PF = " + " + ".join(f"{row['peso']}*{row['sigla']}" for row in grading),
        "metodologia": _val(
            silabo.get("metodologia"),
            "El curso emplea metodologias activas: ABP, Aprendizaje Basado "
            "en Proyectos e Investigacion Formativa. Se complementa con el "
            "Aula Virtual UNPRG.",
        ),
        "tutoria": _val(
            silabo.get("tutoria"),
            "Las tutorias academicas se realizan de manera presencial o "
            "virtual, conforme a la normativa institucional vigente.",
        ),
        "responsabilidad_social": responsabilidad_social,
        "referencias": referencias,
        "_filename": _safe_filename(_val(dg.get("nombre_curso"))),
    }


def _add_section_title(document, title: str) -> None:
    paragraph = document.add_paragraph()
    run = paragraph.add_run(title)
    run.bold = True


def _set_cell_text(cell, text: str, *, bold: bool = False) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    run = paragraph.add_run(text or "—")
    run.bold = bold


def _generar_docx_programatico(context: dict) -> bytes:
    from docx import Document
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Cm, Pt

    document = Document()
    section = document.sections[0]
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    normal_style = document.styles["Normal"]
    normal_style.font.name = "Arial"
    normal_style.font.size = Pt(10)

    header = document.add_paragraph()
    header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header.add_run('UNIVERSIDAD NACIONAL "PEDRO RUIZ GALLO"\n')
    run.bold = True
    run = header.add_run(f"{context['facultad']}\n")
    run.bold = True
    run = header.add_run(
        f"ESCUELA PROFESIONAL {context['escuela_profesional']}\n"
    )
    run.bold = True
    header.add_run(
        f"Departamento Academico de {context['departamento_academico']}"
    )

    title = document.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run(f"{context['nombre_curso']} (Silabo)")
    run.bold = True

    _add_section_title(document, "I. Informacion General")
    info_table = document.add_table(rows=0, cols=2)
    info_table.style = "Table Grid"
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_fields = [
        ("1.1 Programa de Estudios", context["programa"]),
        ("1.2 Escuela Profesional", context["escuela"]),
        ("1.3 Modalidad", context["modalidad"]),
        ("1.4 Curso", context["curso"]),
        ("1.5 Prerrequisito", context["prerrequisito"]),
        ("1.6 Codigo del curso", context["codigo_curso"]),
        ("1.7 Semestre Academico", context["semestre"]),
        ("1.8 Periodo Academico", context["periodo_academico"]),
        ("1.9 Creditos", context["creditos"]),
        (
            "1.10\nHoras Semanales",
            context["horas_semanales"],
        ),
        (
            "1.11 Duracion (Inicio / Termino)",
            _pair(context["fecha_inicio"], context["fecha_fin"]),
        ),
        (
            "1.12 Docente (Nombre / Correo)",
            _pair(context["docente_nombre"], context["docente_email"]),
        ),
    ]
    for label, value in info_fields:
        row = info_table.add_row().cells
        _set_cell_text(row[0], label, bold=True)
        _set_cell_text(row[1], value)

    _add_section_title(document, "II. Sumilla")
    document.add_paragraph(context["sumilla"] or "—")

    _add_section_title(document, "III. Resultado de Aprendizaje del Curso")
    document.add_paragraph(context["ra_curso"] or context["capacidad_del_curso"] or "—")
    if context["competencia_profesional"]:
        nota = document.add_paragraph()
        run = nota.add_run("Competencia profesional asociada: ")
        run.bold = True
        nota.add_run(context["competencia_profesional"])
    if context["capacidad_del_curso"] and context["capacidad_del_curso"] != context["ra_curso"]:
        nota_cap = document.add_paragraph()
        run = nota_cap.add_run("Capacidad del curso: ")
        run.bold = True
        nota_cap.add_run(context["capacidad_del_curso"])

    _add_section_title(document, "IV. Resultados de Aprendizaje de las Unidades Didacticas")
    if context["ra_unidades"]:
        for ra in context["ra_unidades"]:
            paragraph = document.add_paragraph(style="List Bullet")
            run = paragraph.add_run(f"{ra['codigo']}: ")
            run.bold = True
            paragraph.add_run(ra["descripcion"])
    else:
        document.add_paragraph("—")

    _add_section_title(document, "V. Desempenos de las Unidades Didacticas")
    if context["desempenos"]:
        for desempeno in context["desempenos"]:
            document.add_paragraph(
                f"{desempeno['codigo']}. {desempeno['descripcion']}",
                style="List Bullet",
            )
    else:
        document.add_paragraph("—")

    _add_section_title(document, "VI. Programacion Academica")
    for unidad in context["unidades"]:
        paragraph = document.add_paragraph()
        run = paragraph.add_run(unidad["titulo_completo"])
        run.bold = True
        ra_paragraph = document.add_paragraph()
        run = ra_paragraph.add_run("Resultado de Aprendizaje: ")
        run.bold = True
        ra_paragraph.add_run(unidad.get("ra_unidad", "—"))

        unit_table = document.add_table(rows=1, cols=8)
        unit_table.style = "Table Grid"
        unit_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        headers = [
            "Desempenos",
            "Sem.",
            "Fecha",
            "Conocimientos",
            "Habilidades",
            "Actitudes",
            "Actividades de Aprendizaje",
            "Evidencias",
        ]
        for index, header_text in enumerate(headers):
            _set_cell_text(unit_table.rows[0].cells[index], header_text, bold=True)

        for fila in unidad["filas"]:
            row = unit_table.add_row().cells
            _set_cell_text(row[0], fila["desempeno"])
            _set_cell_text(row[1], fila["semana"])
            _set_cell_text(row[2], fila.get("fecha", "—"))
            _set_cell_text(row[3], fila["conocimientos"])
            _set_cell_text(row[4], fila["habilidades"])
            _set_cell_text(row[5], fila.get("actitudes", "—"))
            _set_cell_text(row[6], fila["actividades"])
            _set_cell_text(row[7], fila["evidencias"])

    _add_section_title(document, "VII. Sistema de Evaluacion")
    eval_table = document.add_table(rows=1, cols=4)
    eval_table.style = "Table Grid"
    eval_headers = [
        "Resultado de Aprendizaje",
        "Desempenos",
        "Evidencias de Aprendizaje",
        "Instrumentos",
    ]
    for index, header_text in enumerate(eval_headers):
        _set_cell_text(eval_table.rows[0].cells[index], header_text, bold=True)
    for fila in context["eval_filas"]:
        row = eval_table.add_row().cells
        _set_cell_text(row[0], fila["resultado_aprendizaje"])
        _set_cell_text(row[1], fila["desempenos"])
        _set_cell_text(row[2], fila["evidencias"])
        _set_cell_text(row[3], fila["instrumentos"])

    _add_section_title(document, "VIII. Sistema de Calificacion")
    grading_table = document.add_table(rows=1, cols=4)
    grading_table.style = "Table Grid"
    for index, header_text in enumerate(
        ["Evidencias", "Sigla", "Peso", "Cronograma"]
    ):
        _set_cell_text(grading_table.rows[0].cells[index], header_text, bold=True)
    for row_data in context["grading"]:
        row = grading_table.add_row().cells
        _set_cell_text(row[0], row_data["evidencia"])
        _set_cell_text(row[1], row_data["sigla"])
        _set_cell_text(row[2], row_data["peso"])
        _set_cell_text(row[3], row_data["cronograma"])
    paragraph = document.add_paragraph()
    run = paragraph.add_run(context["formula_pf"])
    run.bold = True

    _add_section_title(
        document,
        "IX. Metodologia de Ensenanza-Aprendizaje y Actividades de Investigacion Formativa",
    )
    document.add_paragraph(context["metodologia"] or "—")

    _add_section_title(document, "X. Actividades de Tutoria: Area Academica")
    document.add_paragraph(context["tutoria"] or "—")

    _add_section_title(document, "XI. Responsabilidad Social")
    document.add_paragraph(context["responsabilidad_social"] or "—")

    _add_section_title(document, "XII. Referencias")
    if context["referencias"]:
        for referencia in context["referencias"]:
            document.add_paragraph(referencia, style="List Bullet")
    else:
        document.add_paragraph("Pendiente de completar.")

    signature_table = document.add_table(rows=2, cols=2)
    signature_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    _set_cell_text(signature_table.rows[0].cells[0], "__________________________")
    _set_cell_text(signature_table.rows[0].cells[1], "__________________________")
    _set_cell_text(
        signature_table.rows[1].cells[0],
        "Director del Departamento Academico",
    )
    _set_cell_text(
        signature_table.rows[1].cells[1],
        context["docente_nombre"] or "Docente",
    )

    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def generar_docx(silabo: dict, template_path: Optional[str] = None) -> bytes:
    """Genera el DOCX del silabo usando docxtpl con fallback estable."""
    context = _build_context(silabo)

    if template_path and os.path.exists(template_path):
        try:
            from docxtpl import DocxTemplate

            template = DocxTemplate(template_path)
            template.render(context)

            buffer = BytesIO()
            template.save(buffer)
            return buffer.getvalue()
        except Exception as exc:
            logger.warning(
                "La plantilla DOCX fallo y se usara el generador programatico: %s",
                exc,
            )

    return _generar_docx_programatico(context)


def _ensure_weasyprint_compatibility() -> None:
    import pydyf
    from weasyprint.matrix import Matrix
    from weasyprint.pdf.stream import Stream

    if not hasattr(pydyf.Stream, "transform") and not getattr(
        Stream, "_silabos_transform_patch", False
    ):

        def _patched_transform(self, a=1, b=0, c=0, d=1, e=0, f=0):
            pydyf.Stream.set_matrix(self, a, b, c, d, e, f)
            self._ctm_stack[-1] = Matrix(a, b, c, d, e, f) @ self.ctm

        Stream.transform = _patched_transform
        Stream._silabos_transform_patch = True

    if not hasattr(pydyf.Stream, "text_matrix") and not getattr(
        Stream, "_silabos_text_matrix_patch", False
    ):

        def _patched_text_matrix(self, a=1, b=0, c=0, d=1, e=0, f=0):
            pydyf.Stream.set_text_matrix(self, a, b, c, d, e, f)

        Stream.text_matrix = _patched_text_matrix
        Stream._silabos_text_matrix_patch = True


def generar_pdf_html(silabo: dict) -> bytes:
    """Genera el PDF del silabo usando WeasyPrint desde HTML."""
    try:
        from weasyprint import CSS, HTML
    except ImportError as exc:
        raise ImportError(
            "WeasyPrint no esta instalado. Ver instrucciones en requirements.txt."
        ) from exc

    _ensure_weasyprint_compatibility()

    context = _build_context(silabo)
    html_str = _build_html(context)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    return HTML(string=html_str, base_url=base_dir).write_pdf(
        stylesheets=[CSS(string=_CSS_SILABO)]
    )


_CSS_SILABO = """
@page {
    size: A4;
    margin: 2cm 2.5cm 2cm 2.5cm;
}
body {
    font-family: Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
}
h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin: 0; }
h2 { font-size: 11pt; text-align: center; margin: 2px 0; }
h3 { font-size: 10pt; text-align: center; margin: 2px 0; }
p { margin: 4px 0; }
ul { margin: 4px 0; padding-left: 16px; }
li { margin: 2px 0; }
.header { text-align: center; margin-bottom: 20px; }
.header-logos {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}
.header-logos img { height: 60px; width: auto; }
.header-text { flex: 1; text-align: center; }
.titulo-silabo {
    background: #f0f0f0;
    padding: 8px;
    text-align: center;
    font-weight: bold;
    font-size: 12pt;
    margin: 15px 0;
    text-transform: uppercase;
}
.seccion-titulo {
    font-weight: bold;
    font-size: 10pt;
    text-transform: uppercase;
    border-bottom: 1px solid #333;
    padding-bottom: 3px;
    margin: 15px 0 8px 0;
}
.info-grid {
    display: table;
    width: 100%;
    font-size: 9.5pt;
}
.info-row { display: table-row; }
.info-label {
    display: table-cell;
    width: 45%;
    padding: 2px 4px;
}
.info-value {
    display: table-cell;
    padding: 2px 4px;
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 10px;
}
th {
    background: #e8e8e8;
    border: 1px solid #333;
    padding: 4px 6px;
    text-align: left;
    font-weight: bold;
}
td {
    border: 1px solid #555;
    padding: 4px 6px;
    vertical-align: top;
}
.unidad-titulo {
    font-weight: bold;
    margin: 10px 0 4px 0;
    font-size: 9.5pt;
}
.formula {
    font-weight: bold;
    margin-top: 6px;
    font-size: 9.5pt;
}
.firmas {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
}
.firma-bloque { text-align: center; width: 45%; }
.firma-linea {
    border-top: 1px solid #333;
    padding-top: 4px;
    margin-top: 30px;
}
.nota-cursiva { font-style: italic; font-size: 9pt; margin-top: 4px; }
"""


def _img_tag(path: Path, alt: str) -> str:
    if not path.exists():
        return ""
    return f'<img src="{path.as_uri()}" alt="{escape(alt)}" />'


def _build_html(ctx: dict) -> str:
    """Construye el HTML del silabo para WeasyPrint."""
    public_dir = (
        Path(__file__).resolve().parent.parent.parent / "silabos-frontend" / "public"
    )
    logo_unprg = _img_tag(public_dir / "unprg-logo.png", "Logo UNPRG")
    logo_fachse = _img_tag(public_dir / "logo_fachse.png", "Logo FACHSE")

    def _multiline_html(value: str) -> str:
        return escape(value or "—").replace("\n", "<br/>")

    tablas_vi = []
    for unidad in ctx.get("unidades", []):
        filas = []
        for fila in unidad.get("filas", []):
            filas.append(
                f"""
                <tr>
                  <td>{_multiline_html(fila['desempeno'])}</td>
                  <td>{escape(fila['semana'])}</td>
                  <td>{escape(fila.get('fecha', '—'))}</td>
                  <td>{_multiline_html(fila['conocimientos'])}</td>
                  <td>{_multiline_html(fila['habilidades'])}</td>
                  <td>{_multiline_html(fila.get('actitudes', '—'))}</td>
                  <td>{_multiline_html(fila['actividades'])}</td>
                  <td>{_multiline_html(fila['evidencias'])}</td>
                </tr>
                """
            )

        tablas_vi.append(
            f"""
            <div class="unidad-titulo">{escape(unidad.get('titulo_completo', ''))}</div>
            <p><strong>Resultado de Aprendizaje:</strong> {escape(unidad.get('ra_unidad', '—'))}</p>
            <table>
              <thead>
                <tr>
                  <th>Desempenos</th>
                  <th>Sem.</th>
                  <th>Fecha</th>
                  <th>Conocimientos</th>
                  <th>Habilidades</th>
                  <th>Actitudes</th>
                  <th>Actividades de Aprendizaje</th>
                  <th>Evidencias</th>
                </tr>
              </thead>
              <tbody>
                {''.join(filas)}
              </tbody>
            </table>
            """
        )

    eval_rows = "".join(
        f"""
        <tr>
          <td>{escape(fila['resultado_aprendizaje'])}</td>
          <td>{escape(fila['desempenos'])}</td>
          <td>{escape(fila['evidencias'])}</td>
          <td>{escape(fila['instrumentos'])}</td>
        </tr>
        """
        for fila in ctx.get("eval_filas", [])
    )

    grading_rows = "".join(
        f"""
        <tr>
          <td>{escape(row['evidencia'])}</td>
          <td>{escape(row['sigla'])}</td>
          <td>{escape(row['peso'])}</td>
          <td>{escape(row['cronograma'])}</td>
        </tr>
        """
        for row in ctx.get("grading", [])
    )

    desempenos_html = "".join(
        f"<li>{escape(d['codigo'])}. {escape(d['descripcion'])}</li>"
        for d in ctx.get("desempenos", [])
    )

    ra_unidades_html = "".join(
        f"<li><strong>{escape(r['codigo'])}:</strong> {escape(r['descripcion'])}</li>"
        for r in ctx.get("ra_unidades", [])
    ) or "<li>Sin unidades configuradas.</li>"

    if ctx.get("referencias"):
        refs_html = "".join(
            f"<li>{escape(ref)}</li>" for ref in ctx.get("referencias", [])
        )
    else:
        refs_html = "<li>Pendiente de completar.</li>"

    return f"""
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Silabo</title>
  </head>
  <body>
    <div class="header">
      <div class="header-logos">
        <div>{logo_unprg}</div>
        <div class="header-text">
          <h1>UNIVERSIDAD NACIONAL "PEDRO RUIZ GALLO"</h1>
          <h2>{escape(ctx['facultad'])}</h2>
          <h3>ESCUELA PROFESIONAL {escape(ctx['escuela_profesional'])}</h3>
          <p>Departamento Academico de {escape(ctx['departamento_academico'])}</p>
        </div>
        <div>{logo_fachse}</div>
      </div>
      <div class="titulo-silabo">{escape(ctx['nombre_curso'])} (Silabo)</div>
    </div>

    <div class="seccion-titulo">I. Informacion General</div>
    <div class="info-grid">
      <div class="info-row"><div class="info-label">1.1 Programa de Estudios</div><div class="info-value">{escape(ctx['programa'])}</div></div>
      <div class="info-row"><div class="info-label">1.2 Escuela Profesional</div><div class="info-value">{escape(ctx['escuela'])}</div></div>
      <div class="info-row"><div class="info-label">1.3 Modalidad</div><div class="info-value">{escape(ctx['modalidad'])}</div></div>
      <div class="info-row"><div class="info-label">1.4 Curso</div><div class="info-value">{escape(ctx['curso'])}</div></div>
      <div class="info-row"><div class="info-label">1.5 Prerrequisito</div><div class="info-value">{escape(ctx['prerrequisito'])}</div></div>
      <div class="info-row"><div class="info-label">1.6 Codigo del curso</div><div class="info-value">{escape(ctx['codigo_curso'])}</div></div>
      <div class="info-row"><div class="info-label">1.7 Semestre Academico</div><div class="info-value">{escape(ctx['semestre'])}</div></div>
      <div class="info-row"><div class="info-label">1.8 Periodo Academico</div><div class="info-value">{escape(ctx['periodo_academico'])}</div></div>
      <div class="info-row"><div class="info-label">1.9 Creditos</div><div class="info-value">{escape(ctx['creditos'])}</div></div>
      <div class="info-row"><div class="info-label">1.10<br/>Horas Semanales</div><div class="info-value">{escape(ctx['horas_semanales'])}</div></div>
      <div class="info-row"><div class="info-label">1.11 Duracion (Inicio / Termino)</div><div class="info-value">{escape(_pair(ctx['fecha_inicio'], ctx['fecha_fin']))}</div></div>
      <div class="info-row"><div class="info-label">1.12 Docente (Nombre / Correo)</div><div class="info-value">{escape(_pair(ctx['docente_nombre'], ctx['docente_email']))}</div></div>
    </div>

    <div class="seccion-titulo">II. Sumilla</div>
    <p>{escape(ctx['sumilla'])}</p>

    <div class="seccion-titulo">III. Resultado de Aprendizaje del Curso</div>
    <p><strong>{escape(ctx.get('ra_curso') or ctx.get('capacidad_del_curso') or '—')}</strong></p>
    {f'<p><em>Competencia profesional asociada:</em> {escape(ctx["competencia_profesional"])}</p>' if ctx.get('competencia_profesional') else ''}
    {f'<p><em>Capacidad del curso:</em> {escape(ctx["capacidad_del_curso"])}</p>' if ctx.get('capacidad_del_curso') and ctx.get('capacidad_del_curso') != ctx.get('ra_curso') else ''}

    <div class="seccion-titulo">IV. Resultados de Aprendizaje de las Unidades Didacticas</div>
    <ul>{ra_unidades_html}</ul>

    <div class="seccion-titulo">V. Desempenos de las Unidades Didacticas</div>
    <ul>{desempenos_html}</ul>

    <div class="seccion-titulo">VI. Programacion Academica</div>
    {''.join(tablas_vi)}

    <div class="seccion-titulo">VII. Sistema de Evaluacion</div>
    <table>
      <thead>
        <tr>
          <th>Resultado de Aprendizaje</th>
          <th>Desempenos</th>
          <th>Evidencias de Aprendizaje</th>
          <th>Instrumentos</th>
        </tr>
      </thead>
      <tbody>{eval_rows}</tbody>
    </table>

    <div class="seccion-titulo">VIII. Sistema de Calificacion</div>
    <table>
      <thead>
        <tr>
          <th>Evidencias de aprendizaje</th>
          <th>Sigla</th>
          <th>Peso</th>
          <th>Cronograma</th>
        </tr>
      </thead>
      <tbody>{grading_rows}</tbody>
    </table>
    <div class="formula">{escape(ctx['formula_pf'])}</div>

    <div class="seccion-titulo">IX. Metodologia de Ensenanza-Aprendizaje y Actividades de Investigacion Formativa</div>
    <p>{escape(ctx['metodologia'])}</p>

    <div class="seccion-titulo">X. Actividades de Tutoria: Area Academica</div>
    <p>{escape(ctx['tutoria'])}</p>

    <div class="seccion-titulo">XI. Responsabilidad Social</div>
    <p>{escape(ctx['responsabilidad_social'])}</p>

    <div class="seccion-titulo">XII. Referencias</div>
    <ul>{refs_html}</ul>

    <div class="firmas">
      <div class="firma-bloque">
        <div class="firma-linea">Nombre y apellidos</div>
        <div>Director del Departamento Academico</div>
      </div>
      <div class="firma-bloque">
        <div class="firma-linea">{escape(ctx['docente_nombre'])}</div>
        <div>Docente</div>
      </div>
    </div>
  </body>
</html>
"""
