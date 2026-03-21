# Plantilla Anexo C UNPRG

Colocar aquí el archivo: `anexo_c_template.docx`

La plantilla debe ser un archivo Word (.docx) con
el formato oficial del Anexo C UNPRG con variables
Jinja2 en los campos correspondientes.

Variables disponibles: ver _build_context()
en services/word_generator.py

Mientras no exista la plantilla, el endpoint
devuelve HTTP 503 con mensaje claro.
