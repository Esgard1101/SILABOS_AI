import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.method_suggestion_rules import suggest_method_by_rules  # noqa: E402


METHODS = [
    {"id": "abde-id", "code": "ABDe", "name": "Aprendizaje Basado en Desafios", "phases": []},
    {"id": "abpro-id", "code": "ABPro", "name": "Aprendizaje Basado en Proyectos", "phases": []},
    {"id": "abt-id", "code": "ABT", "name": "Aprendizaje Basado en Taller", "phases": []},
]


class MethodSuggestionRulesTests(unittest.TestCase):
    def test_prefers_taller_for_curricular_planning_in_early_education(self):
        suggestion = suggest_method_by_rules(
            curso={
                "name": "Planificacion Curricular en la Educacion Temprana",
                "capacidad": "Planifica sesiones de aprendizaje para ninos menores de tres anos.",
                "temas_conocimientos": [
                    {
                        "codigo": "2.20.1",
                        "items": [
                            "Lista de cotejo",
                            "Entrevista a padres de familia",
                        ],
                    },
                    {
                        "codigo": "2.20.2",
                        "items": [
                            "Planificacion semanal",
                            "Planificacion diaria",
                            "Materiales para la educacion temprana",
                        ],
                    },
                ],
            },
            metodos_base=METHODS,
            performances=[
                {"statement": "Disena sesiones de aprendizaje para ninos menores de tres anos."},
                {"statement": "Organiza secuencias didacticas pertinentes."},
            ],
        )

        self.assertIsNotNone(suggestion)
        self.assertEqual(suggestion["method_code"], "ABT")
        self.assertEqual(suggestion["origin"], "rule_pedagogical_production")

    def test_does_not_force_taller_for_mobile_app_project(self):
        suggestion = suggest_method_by_rules(
            curso={
                "name": "Pensamiento computacional aplicado",
                "capacidad": "Disena e implementa aplicaciones moviles para resolver problemas del mundo real.",
                "temas_conocimientos": ["APP Inventor", "Prototipo funcional", "Videojuego con Python"],
            },
            metodos_base=METHODS,
            performances=[
                {"statement": "Identifica problemas que pueden conllevar al desarrollo de una aplicacion movil."},
                {"statement": "Disena y desarrolla una aplicacion movil."},
            ],
        )

        self.assertIsNone(suggestion)


if __name__ == "__main__":
    unittest.main()
