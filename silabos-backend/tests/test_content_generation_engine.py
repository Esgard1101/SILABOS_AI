import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.content_generation_engine import (  # noqa: E402
    ContentGenerationEngine,
    build_didactic_fallback,
)


class ContentGenerationEngineTests(unittest.TestCase):
    def test_fallback_uses_one_unit_per_official_performance_and_final_pa(self):
        result = build_didactic_fallback(
            curso={
                "name": "Programacion curricular en educacion temprana",
                "temas_conocimientos": [
                    "Lista de cotejo",
                    "Entrevista a padres de familia",
                    "Planificacion semanal",
                    "Planificacion diaria",
                ],
                "habilidades_desempenos": ["Disenar instrumentos", "Organizar secuencias"],
            },
            performances=[
                {
                    "code": "2.20.1",
                    "statement": "Disena sesiones de aprendizaje para ninos menores de tres anos.",
                    "conocimientos": ["Lista de cotejo", "Entrevista a padres de familia"],
                    "habilidades": ["Disenar instrumentos"],
                },
                {
                    "code": "2.20.2",
                    "statement": "Organiza secuencias didacticas pertinentes.",
                    "conocimientos": ["Planificacion semanal", "Planificacion diaria"],
                    "habilidades": ["Organizar secuencias"],
                },
            ],
            method_raw={"code": "ABT", "name": "Aprendizaje Basado en Taller"},
        )

        self.assertEqual(len(result["unidades_tematicas"]), 2)
        self.assertEqual([u["semanas"] for u in result["unidades_tematicas"]], ["1-8", "9-16"])
        self.assertEqual(len(result["cronograma_semanal"]), 16)
        self.assertIn("PA2", result["cronograma_semanal"][-1]["evidencia"])
        self.assertIn("version final", result["cronograma_semanal"][-1]["evidencia"].lower())
        self.assertFalse(
            any(
                "Fundamentos conceptuales de" in row["tema"]
                or "**ABDe -" in row["actividad"]
                or "En la fase de" in row["actividad"]
                or "Momento:" in row["actividad"]
                or "Proposito:" in row["actividad"]
                for row in result["cronograma_semanal"]
            )
        )
        self.assertIn("Problematizacion pedagogica:", result["cronograma_semanal"][0]["actividad"])
        self.assertIn("Tecnicas:", result["cronograma_semanal"][0]["actividad"])
        self.assertNotIn("Problematizacion pedagogica:", result["cronograma_semanal"][7]["actividad"])
        self.assertNotIn("Problematizacion pedagogica:", result["cronograma_semanal"][-1]["actividad"])
        self.assertTrue(
            result["cronograma_semanal"][-1]["actividad"].startswith("Socializacion del producto:")
            or result["cronograma_semanal"][-1]["actividad"].startswith("Cierre reflexivo:")
        )

    def test_normalize_payload_strips_robotic_prefixes_and_method_labels(self):
        engine = ContentGenerationEngine()
        payload = {
            "entregable_integrador": {
                "nombre": "Secuencia didactica para educacion temprana",
                "avances_por_unidad": [
                    {"unidad": 1, "sigla": "PA1", "evidencia": "PA1: primer avance"},
                ],
            },
            "content_plan": {
                "units": [
                    {
                        "title": "Fundamentos conceptuales de Lista de cotejo",
                        "ra_unidad": "",
                        "weeks": [
                            {
                                "week": 1,
                                "performance_code": "D1",
                                "knowledge": ["Fundamentos conceptuales de Lista de cotejo"],
                                "skills": [{"name": "Disenar instrumentos"}],
                                "activity": "**ABDe - Idea general:** Presentacion del desafio del curso.",
                                "evidence": "Producto parcial sobre Lista de cotejo",
                            }
                        ],
                    }
                ]
            },
        }

        result = engine.normalize_payload(
            payload=payload,
            curso={"name": "Educacion temprana"},
            performances=[{"code": "D1", "statement": "Disena sesiones de aprendizaje."}],
            method_raw={"code": "ABDe", "name": "Aprendizaje Basado en Desafios"},
            grading_rows=[],
            knowledge_items=["Lista de cotejo"],
            skill_names=["Disenar instrumentos"],
            habilidades_por_desempeno=[],
            week_dates=None,
        )

        first = result["cronograma_semanal"][0]
        self.assertEqual(first["tema"], "Lista de cotejo")
        self.assertNotIn("**ABDe -", first["actividad"])
        self.assertIn("Idea general y preguntas esenciales:", first["actividad"])
        self.assertIn("Tecnicas:", first["actividad"])
        self.assertIn("preguntas esenciales", first["actividad"].lower())
        self.assertNotIn("Momento:", first["actividad"])
        self.assertNotIn("Proposito:", first["actividad"])
        self.assertNotIn("en la fase de", first["actividad"].lower())
        self.assertNotIn("Producto parcial sobre", first["evidencia"])

    def test_phase_mapping_uses_activity_semantics_not_cyclic_modulo(self):
        engine = ContentGenerationEngine()
        payload = {
            "content_plan": {
                "units": [
                    {
                        "title": "Instrumentos de recojo de informacion",
                        "weeks": [
                            {"knowledge": ["Lista de cotejo"], "activity": "Problematizacion pedagogica: analisis de una situacion de aula en cuna."},
                            {"knowledge": ["Entrevista a padres"], "activity": "Modelado docente de una entrevista efectiva para recoger informacion del entorno familiar."},
                            {"knowledge": ["Componentes curriculares"], "activity": "Revision tecnica de la estructura de planificacion y ajuste final."},
                        ],
                    },
                    {
                        "title": "Planificacion semanal y diaria",
                        "weeks": [
                            {"knowledge": ["Planificacion semanal"], "activity": "Produccion guiada de una planificacion semanal para ninos menores de tres anos."},
                            {"knowledge": ["Materiales para educacion temprana"], "activity": "Taller de elaboracion de materiales didacticos con recursos del entorno."},
                            {"knowledge": ["Secuencia final"], "activity": "Sustentacion de la propuesta curricular ante el grupo."},
                        ],
                    },
                ]
            }
        }

        result = engine.normalize_payload(
            payload=payload,
            curso={"name": "Planificacion curricular en educacion temprana"},
            performances=[
                {"code": "D1", "statement": "Disena instrumentos para educacion temprana."},
                {"code": "D2", "statement": "Organiza secuencias didacticas pertinentes."},
            ],
            method_raw={"code": "ABT", "name": "Aprendizaje Basado en Taller"},
            grading_rows=[],
            knowledge_items=["Lista de cotejo", "Entrevista a padres", "Planificacion semanal", "Materiales"],
            skill_names=["Disenar instrumentos", "Organizar secuencias"],
            habilidades_por_desempeno=[],
            week_dates=None,
        )

        week_8 = result["cronograma_semanal"][7]["actividad"]
        week_9 = result["cronograma_semanal"][8]["actividad"]
        week_16 = result["cronograma_semanal"][15]["actividad"]

        self.assertNotIn("Problematizacion pedagogica:", week_8)
        self.assertIn("Produccion guiada:", week_9)
        self.assertNotIn("Problematizacion pedagogica:", week_16)
        self.assertIn("Tecnicas:", week_16)
        self.assertNotIn("Momento:", week_16)
        self.assertNotIn("Proposito:", week_16)


if __name__ == "__main__":
    unittest.main()
