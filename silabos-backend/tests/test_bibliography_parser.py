import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.bibliography_parser import (
    infer_reference_type,
    parsear_referencias_bibliograficas,
    referencia_a_metadata,
)


class BibliographyParserTests(unittest.TestCase):
    def test_parse_markdown_sources_section_with_bullets(self):
        texto = """
# Informe

## Fuentes consultadas
- Perez, J. (2024). Manual de laboratorio.
  Universidad Nacional. https://repositorio.universidad.edu/manual

- Smith, A., & Doe, B. (2022). Data mining for education.
  https://doi.org/10.1234/ABCD.2022.5

## Anexos
Texto de cierre
"""

        refs = parsear_referencias_bibliograficas(texto)

        self.assertEqual(len(refs), 2)
        self.assertTrue(refs[0].startswith("Perez, J. (2024). Manual de laboratorio."))
        self.assertIn("10.1234/ABCD.2022.5", refs[1])

    def test_referencia_a_metadata_limpia_placeholders_y_detecta_documentacion(self):
        metadata = referencia_a_metadata(
            "Autor. (2024). Manual de integracion. https://docs.python.org/3/library/"
        )

        self.assertEqual(metadata["authors"], [])
        self.assertEqual(metadata["title"], "Manual de integracion")
        self.assertEqual(metadata["year"], 2024)
        self.assertEqual(metadata["type"], "documentacion")
        self.assertTrue(metadata["display_text"].startswith("Manual de integracion"))

    def test_infer_reference_type_detects_thesis(self):
        ref_type = infer_reference_type(
            ref_text="Perez, J. (2023). Tesis doctoral sobre mineria de datos. Repositorio institucional.",
            url="https://repositorio.universidad.edu/tesis/123",
        )

        self.assertEqual(ref_type, "tesis")


if __name__ == "__main__":
    unittest.main()
