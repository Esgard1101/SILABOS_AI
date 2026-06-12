# 01 — Reglas de Verticalización (COMÚN)

> **Qué es esto:** El corazón del método. Define qué es un slice atómico testeable y cómo encontrar el "punto óptimo" entre tareas demasiado dependientes (inmanejables al volver al thread) y tareas demasiado grandes (el agente se degrada).

---

## 1. El antipatrón a eliminar

```
❌ MAL (división horizontal por capas)
   Tarea 1: todas las migraciones del módulo
   Tarea 2: todos los services y controllers
   Tarea 3: todas las vistas Blade

   → Ninguna es testeable sola. Para validar "el módulo Cards funciona"
     necesito que las 3 tareas estén cerradas. Si algo falla, vuelvo al
     thread 1. Cada sesión nueva no entrega nada interactuable.
```

```
✅ BIEN (división vertical por módulo funcional)
   T1: Módulo Cards completo (migración + model + service + form + controller + vista)
       → Levanto el server, abro /admin/cards, creo una card, la veo. TESTEABLE.
   T2: Módulo Categorías completo
       → Independiente. Sesión limpia. Solo necesita leer context.md + su SPEC.
```

---

## 2. El punto óptimo de granularidad (regla del 70%)

**Default (70% de los casos): 1 tarea = 1 CRUD/módulo completo end-to-end.**
Razón: aprovecha la ventana de contexto del agente en una sola pasada y entrega algo que yo abro y testeo. Es el tamaño del slice `T-07 Bautismo` (migración→model→service→form→controller→blade lista+form→PDF) que ya funcionó.

**Cuándo bajar la granularidad (degradar el slice):**
Dividir un módulo en sub-slices SOLO si se cumple ≥1 de estos gatillos:
- El módulo tiene **>1 pantalla con lógica distinta** (ej. listado complejo con filtros + un wizard de alta multi-paso).
- La feature es **crítica** (pagos, migración de data, merge de registros) y un error en cascada es caro.
- El módulo **supera lo que el agente maneja bien en una sesión** (muchas tablas, muchas reglas de negocio, integración externa).

**Cómo se degrada (sub-slices que SIGUEN siendo verticales):**
```
✅ T2a: Cards — Listado + lectura (DataTable, ver detalle)   → testeable
✅ T2b: Cards — Alta + edición + toggle estado               → testeable
   NO así:
❌ T2a: Cards — migraciones    ❌ T2b: Cards — controllers
```
Cada sub-slice toca todas las capas pero de un sub-conjunto de la feature.

---

## 3. La excepción legítima: Épica 0 (Cimientos)

En proyectos desde 0 hay una base no-verticalizable. **Se acepta como horizontal explícita**, pero en el 70% de los casos debe entregar algo navegable, no solo migraciones:

```
✅ Épica 0 recomendada (entrega flujo navegable):
   T0.1 — Setup + migraciones núcleo + auth + LOGIN FUNCIONAL
          + DASHBOARD VACÍO + SIDEBAR con seed de opciones de menú
   → Aprovecho para corregir TODO el flujo de navegación de una vez.
   → DoD-Usuario: hago login, navego el sidebar, veo módulos vacíos sin romper.
```
La alternativa (Épica 0 puramente horizontal de solo migraciones) es válida pero es la segunda opción.

---

## 4. Minimizar dependencias (para no volver al primer thread)

El verdadero cuello de botella no es el tamaño, son las **aristas de dependencia**. Objetivo: que cada tarea arranque en **sesión limpia** leyendo solo `context.md` + su SPEC + las skills.

Reglas:
- Marcar dependencias explícitas por tarea (`Depende de: T0.1`).
- Agrupar en **bloques/épicas paralelas** lo que no se bloquea entre sí.
- Identificar el **bloqueo cruzado mínimo** (ej. "Modal Personas reutilizable debe estar en main antes de Bautismo/Matrimonio/Confirmación") y aislarlo como tarea propia temprana.
- Si dos tareas tocan el **mismo archivo**, o se fusionan, o se serializan explícitamente (evita conflictos multi-dev).

---

## 5. Evaluación de SCOPE antes de verticalizar (lo más importante de Capa 1)

> Antes de partir nada en tareas, Capa 1 debe **evaluar el alcance leyendo `context.md` + `bitacoradev.md`**. Verticalizar es el paso 2. Entender qué impacto tiene la feature en el sistema vivo es el paso 1, y es donde Capa 1 aporta más valor como copiloto de arquitectura.

El error de saltarse esto: un agente que recibe "agregá un endpoint" y lo escribe sin preguntar **dónde encaja, qué módulos toca, si rompe el contrato existente, o si es un proyecto satélite con su propio scope**. Eso produce specs técnicamente correctos pero arquitectónicamente ciegos.

### Las 4 dimensiones que Capa 1 evalúa SIEMPRE (con preguntas, no asunciones)

1. **Encaje en el sistema (scope real).** Leyendo `context.md` + módulos existentes:
   - ¿Esta feature pertenece a un módulo existente, crea uno nuevo, o es un **proyecto satélite** que consume/expone hacia el core?
   - Si es satélite: ¿cuál es su frontera? ¿qué consume del core y qué expone? ¿comparte BD o se integra por API/contrato?
   - ¿Qué módulos del proyecto se ven afectados (leen, modifican, dependen)?

2. **Valor agregado.** ¿Qué problema real resuelve para el usuario final? Si el valor no está claro, Capa 1 lo cuestiona antes de planear (puede ser sobreingeniería disfrazada de feature).

3. **Decisiones de arquitectura — con recomendación.** Capa 1 no solo pregunta: **propone** una opción y explica el trade-off, para que el tech lead decida. Ejemplo: "Para este endpoint recomiendo reusar `XService` en lugar de uno nuevo, porque ya resuelve el filtro de tenant. Alternativa: service nuevo si esperás lógica divergente. ¿Cuál?"

4. **Preguntas/diagnósticos para el tech lead.** Capa 1 pide lo que le falta para decidir: queries de diagnóstico ("ejecutá `SELECT ...` para ver el estado de X"), archivos ("pasame el `XController` actual"), o aclaraciones de negocio.

### Caso típico: "quiero agregar / consumir un endpoint"

Capa 1 NO escribe el SPEC hasta responder, contra el `context.md`:
- ¿Es endpoint que **expongo** (mi API) o que **consumo** (servicio externo / otro proyecto del ecosistema)?
- ¿Encaja en un controller/módulo existente o justifica uno nuevo?
- Si consumo: ¿dónde vive la capa de integración (un `XIntegrationService`)? ¿cómo manejo fallos, timeouts, auth?
- ¿Toca el contrato de API documentado? Si sí → actualizar el contrato es parte del slice.
- ¿Respeta el tenant/scope del glosario, o el endpoint externo trae su propio identificador?

---

## 6. Checklist de auto-validación del slice (Capa 1 lo aplica a cada tarea)

Antes de escribir una tarea, Capa 1 verifica:

- [ ] ¿Toca DB + lógica + interfaz (o contrato API) en la MISMA tarea?
- [ ] ¿Puedo (yo, usuario) abrir el navegador o Postman y validar el resultado SIN ejecutar la tarea siguiente?
- [ ] ¿Arranca en sesión limpia con solo `context.md` + su SPEC?
- [ ] ¿Sus dependencias están declaradas y son mínimas?
- [ ] ¿Está en el punto óptimo (un CRUD completo) o tiene un gatillo real para degradarse?
- [ ] Si toca el mismo archivo que otra tarea, ¿está serializada o fusionada?

Si alguna falla → reformular antes de escribir.
