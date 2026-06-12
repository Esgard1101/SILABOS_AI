# 02 — Definition of Done Estándar (COMÚN)

> **Qué es esto:** El estándar de "tarea cerrada". Separa lo que YO valido (manual, sin gastar tokens del agente) de lo que el AGENTE verifica solo. Toda tarea de SPRINT/SPEC usa esta estructura de dos niveles.

---

## 1. Los dos niveles (siempre presentes en cada tarea)

### 🧑‍💻 DoD-Usuario — lo valido YO, manualmente
El agente **NO** lo ejecuta (no gasto tokens en testeo E2E agéntico). Son pasos que yo hago en navegador o Postman.

### 🤖 DoD-Técnico — lo verifica el AGENTE, automáticamente
El agente de Capa 2 DEBE correr esto antes de dar la tarea por cerrada. No me consume a mí.

---

## 2. Plantilla de DoD para módulos CON interfaz (Blade/panel)

```markdown
**🧑‍💻 DoD-Usuario (validación manual en navegador):**
- [ ] Abro [ruta] y veo [resultado esperado].
- [ ] Ejecuto [acción] desde la UI y [efecto visible].
- [ ] La validación de error [campo] se dispara visualmente al [condición].
- [ ] El filtro por [tenant/perfil] solo muestra mis datos de sesión.

**🤖 DoD-Técnico (el agente lo corre solo):**
- [ ] `php artisan migrate:fresh --seed` corre limpio.
- [ ] `tinker`: [relación clave]->first() no rompe.
- [ ] Tests Feature de la tarea pasan (`php artisan test --filter=XxxTest`).
- [ ] Sin queries crudas en controller; lógica en Service; validación en FormRequest.
- [ ] Decisión estructural (si la hubo) registrada en context.md + bitacoradev.md.
```

---

## 3. Plantilla de DoD para APIs SIN interfaz (backend puro)

> **Caso crítico (tu punto 9):** APIs donde el frontend no es tu scope, no tenés acceso al server de la empresa, y no hay UI para abrir. Acá el DoD-Usuario se apoya en **tests Feature automáticos** + un **walkthrough de Postman escrito** (no automatizado).

```markdown
**🤖 DoD-Técnico (el agente lo corre solo — ESTA ES LA RED DE SEGURIDAD):**
- [ ] Tests Feature cubren: happy path, 401 sin API key, 422 validación, 404 recurso inexistente, aislamiento de tenant.
- [ ] `php artisan test --filter=XxxApiTest` pasa en verde.
- [ ] El JSON de respuesta NUNCA expone campos internos prohibidos (listar cuáles).
- [ ] Contrato reflejado en DOCUMENTATIONS/<contrato_api>.md.

**🧑‍💻 DoD-Usuario (walkthrough Postman — el agente lo ESCRIBE, yo lo corro si puedo):**
> El agente redacta los pasos. NO automatiza la colección. Si no puedo correrlo
> (sin acceso al server), CONFÍO en los tests Feature de arriba.

- [ ] **Request 1 — Happy path:**
      `GET {{base_url}}/api/v1/<recurso>/{slug}`
      Header: `X-Api-Key: {{api_key}}`
      Esperado: 200 + estructura `{...}` (pegar ejemplo de JSON).
- [ ] **Request 2 — Sin key:** mismo request sin header → 401.
- [ ] **Request 3 — Validación:** body inválido → 422 con `{errors:{...}}`.
- [ ] **Request 4 — Aislamiento:** key/sesión de tenant A no devuelve data de tenant B.

> Nota: si el endpoint no es alcanzable desde mi entorno local, este walkthrough
> queda como documentación para QA/frontend, y la aceptación recae en DoD-Técnico.
```

---

## 4. Regla de oro del reparto de esfuerzo

| Tipo de verificación | Quién | Cuándo | Costo de tokens |
|---|---|---|---|
| migrate / tinker / tests Feature | 🤖 Agente Capa 2 | Antes de cerrar tarea | Del agente (OK) |
| Navegador (click, ver, validar) | 🧑‍💻 Yo | Cuando reviso la entrega | Cero tokens |
| Postman manual | 🧑‍💻 Yo (si puedo) | Cuando reviso APIs | Cero tokens |
| Walkthrough Postman escrito | 🤖 Agente lo redacta | Al cerrar tarea de API | Mínimo |

**Nunca** pedirle al agente que ejecute testeo E2E navegando la app. Eso lo hago yo.
