# Índice Central de Patrones Transversales

Solo lecciones que sirven a ≥2 proyectos. Una línea por patrón. Lo específico se queda en el `LECCIONES.md` del proyecto.

Formato: `- [AAAA-MM] <patrón en 1 frase> — origen: <proyecto> — aplica a: <dominios>`

## Patrones

- [2026-05] Mover archivos rompe imports en silencio (backend: ModuleNotFoundError; frontend: 404 runtime sin error de build). Refactor solo progresivo: red de tests primero → lotes chicos → validar → commit → rollback `git revert`. — origen: silabos_app — aplica a: cualquier refactor de arquitectura
- [2026-05] God-files con métodos duplicados (mismo nombre 2x) = bug latente: Python conserva solo la última definición. Auditar antes de partir. — origen: silabos_app — aplica a: backends Python grandes
- [2026-05] Automatización real ("cada que X, haz Y") requiere hook en settings.json; instrucción en memoria NO la dispara (la ejecuta el harness, no el agente). — origen: silabos_app — aplica a: cualquier proyecto con Claude Code

<!-- Nuevas líneas se agregan arriba de este comentario, más reciente primero -->
