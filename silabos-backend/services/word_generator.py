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
    return s if s and s != "—" else fallback


def _safe_filename(nombre_curso: str) -> str:
    nombre = re.sub(r"[^\w\s-]", "", nombre_curso or "silabo")
    return re.sub(r"\s+", "_", nombre.strip())[:50] or "silabo"


def _build_context(silabo: dict) -> dict:
    """
    Construye el contexto de exportacion del silabo.
    Sin rowspan: cada fila semanal repite desempeno y habilidades.
    """
    dg = silabo.get("datos_generales") or {}

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

    cronograma_map: dict[int, dict] = {}
    for item in silabo.get("cronograma_semanal") or []:
        if isinstance(item, dict) and "semana" in item:
            try:
                cronograma_map[int(item["semana"])] = item
            except (TypeError, ValueError):
                continue

    unidades_ctx = []
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

                filas.append(
                    {
                        "desempeno": f"D{i + 1}. {desempeno_txt}",
                        "habilidades": habilidades_txt,
                        "semana": f"Sem. {semana}",
                        "conocimientos": conocimientos or "—",
                        "actividades": _val(sem_data.get("actividad"), "—"),
                        "evidencias": _val(sem_data.get("producto"), "—"),
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
                    "semana": semanas_str or "—",
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
                "titulo_completo": f"UNIDAD {numero}: {titulo}",
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
                "peso": "40%",
                "cronograma": "Permanente",
            },
            {
                "evidencia": "Producto Acreditable 1",
                "sigla": "PA1",
                "peso": "10%",
                "cronograma": "Semana 5",
            },
            {
                "evidencia": "Producto Acreditable 2",
                "sigla": "PA2",
                "peso": "20%",
                "cronograma": "Semana 12",
            },
            {
                "evidencia": "Producto Acreditable 3",
                "sigla": "PA3",
                "peso": "30%",
                "cronograma": "Semana 15",
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
        "docente_nombre": _val(dg.get("docente")),
        "docente_email": _val(dg.get("docente_email")),
        "sumilla": _val(silabo.get("sumilla")),
        "competencia_profesional": competencia,
        "capacidad_del_curso": capacidad,
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
            "1.10 Horas Semanales (Teoria / Practica)",
            f"{context['horas_teoria']} / {context['horas_practica']}",
        ),
        (
            "1.11 Duracion (Inicio / Termino)",
            f"{context['fecha_inicio']} / {context['fecha_fin']}",
        ),
        (
            "1.12 Docente (Nombre / Correo)",
            f"{context['docente_nombre']} / {context['docente_email']}",
        ),
    ]
    for label, value in info_fields:
        row = info_table.add_row().cells
        _set_cell_text(row[0], label, bold=True)
        _set_cell_text(row[1], value)

    _add_section_title(document, "II. Sumilla")
    document.add_paragraph(context["sumilla"] or "—")

    _add_section_title(document, "III. Competencia Profesional")
    document.add_paragraph(context["competencia_profesional"] or "—")

    _add_section_title(document, "IV. Capacidad del Curso")
    document.add_paragraph(context["capacidad_del_curso"] or "—")

    _add_section_title(document, "V. Desempenos de las Unidades Didacticas")
    if context["desempenos"]:
        for desempeno in context["desempenos"]:
            document.add_paragraph(
                f"{desempeno['codigo']}. {desempeno['descripcion']}",
                style="List Bullet",
            )
    else:
        document.add_paragraph("—")

    _add_section_title(document, "VI. Programa de Contenidos")
    for unidad in context["unidades"]:
        paragraph = document.add_paragraph()
        run = paragraph.add_run(unidad["titulo_completo"])
        run.bold = True

        unit_table = document.add_table(rows=1, cols=6)
        unit_table.style = "Table Grid"
        unit_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        headers = [
            "Desempenos",
            "Habilidades requeridas",
            "Semana",
            "Conocimientos",
            "Actividades",
            "Evidencias",
        ]
        for index, header_text in enumerate(headers):
            _set_cell_text(unit_table.rows[0].cells[index], header_text, bold=True)

        for fila in unidad["filas"]:
            row = unit_table.add_row().cells
            _set_cell_text(row[0], fila["desempeno"])
            _set_cell_text(row[1], fila["habilidades"])
            _set_cell_text(row[2], fila["semana"])
            _set_cell_text(row[3], fila["conocimientos"])
            _set_cell_text(row[4], fila["actividades"])
            _set_cell_text(row[5], fila["evidencias"])

    _add_section_title(document, "VII. Sistema de Evaluacion")
    eval_table = document.add_table(rows=1, cols=4)
    eval_table.style = "Table Grid"
    eval_headers = [
        "Desempenos",
        "Habilidades requeridas",
        "Evidencias de Aprendizaje",
        "Instrumentos de Evaluacion",
    ]
    for index, header_text in enumerate(eval_headers):
        _set_cell_text(eval_table.rows[0].cells[index], header_text, bold=True)
    for fila in context["eval_filas"]:
        row = eval_table.add_row().cells
        _set_cell_text(row[0], fila["desempeno"])
        _set_cell_text(row[1], fila["habilidades"])
        _set_cell_text(row[2], fila["evidencias"])
        _set_cell_text(row[3], fila["instrumento"])

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

    _add_section_title(document, "XI. Referencias")
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

    tablas_vi = []
    for unidad in ctx.get("unidades", []):
        filas = []
        for fila in unidad.get("filas", []):
            filas.append(
                f"""
                <tr>
                  <td>{escape(fila['desempeno'])}</td>
                  <td>{escape(fila['habilidades'])}</td>
                  <td>{escape(fila['semana'])}</td>
                  <td>{escape(fila['conocimientos'])}</td>
                  <td>{escape(fila['actividades'])}</td>
                  <td>{escape(fila['evidencias'])}</td>
                </tr>
                """
            )

        tablas_vi.append(
            f"""
            <div class="unidad-titulo">{escape(unidad.get('titulo_completo', ''))}</div>
            <table>
              <thead>
                <tr>
                  <th>Desempenos</th>
                  <th>Habilidades requeridas</th>
                  <th>Semana (Fecha)</th>
                  <th>Conocimientos</th>
                  <th>Actividades</th>
                  <th>Evidencias de Aprendizaje</th>
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
          <td>{escape(fila['desempeno'])}</td>
          <td>{escape(fila['habilidades'])}</td>
          <td>{escape(fila['evidencias'])}</td>
          <td>{escape(fila['instrumento'])}</td>
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
      <div class="info-row"><div class="info-label">1.10 Horas Semanales (Teoria / Practica)</div><div class="info-value">{escape(ctx['horas_teoria'])} / {escape(ctx['horas_practica'])}</div></div>
      <div class="info-row"><div class="info-label">1.11 Duracion (Inicio / Termino)</div><div class="info-value">{escape(ctx['fecha_inicio'])} / {escape(ctx['fecha_fin'])}</div></div>
      <div class="info-row"><div class="info-label">1.12 Docente (Nombre / Correo)</div><div class="info-value">{escape(ctx['docente_nombre'])} / {escape(ctx['docente_email'])}</div></div>
    </div>

    <div class="seccion-titulo">II. Sumilla</div>
    <p>{escape(ctx['sumilla'])}</p>

    <div class="seccion-titulo">III. Competencia Profesional</div>
    <p>{escape(ctx['competencia_profesional'])}</p>

    <div class="seccion-titulo">IV. Capacidad del Curso</div>
    <p>{escape(ctx['capacidad_del_curso'])}</p>

    <div class="seccion-titulo">V. Desempenos de las Unidades Didacticas</div>
    <ul>{desempenos_html}</ul>

    <div class="seccion-titulo">VI. Programa de Contenidos</div>
    {''.join(tablas_vi)}

    <div class="seccion-titulo">VII. Sistema de Evaluacion</div>
    <table>
      <thead>
        <tr>
          <th>Desempenos</th>
          <th>Habilidades requeridas</th>
          <th>Evidencias de Aprendizaje</th>
          <th>Instrumentos de Evaluacion</th>
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

    <div class="seccion-titulo">XI. Referencias</div>
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
