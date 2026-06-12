# context.md — Single Source of Truth

> Archivo de memoria del proyecto. Toda decisión arquitectónica o de diseño se registra aquí ANTES o DURANTE su implementación. Si el código contradice este documento, **gana el documento**: detener y resolver la ambigüedad con el user antes de continuar.
>
> Este archivo es LIMPIO: solo el QUÉ y el POR QUÉ. Los tecnicismos y cierres de tarea van en `bitacoradev.md`.

---

## 1. Objetivo del proyecto

[Qué es y para qué sirve, desde la perspectiva del usuario final. Qué entregamos y qué NO.]

---

## 2. Glosario del proyecto (Nomenclatura estricta)

> Hereda los defaults de `_COMUNES/00_GLOSARIO_GARZASOFT.md`. Acá solo lo ESPECÍFICO de este proyecto. Todo agente usa exclusivamente estos términos.

- **Entidad principal:** [Ej: Card / Bautismo / Producto]
- **Identificador de usuario:** [`user_id` / `usuario_id`]
- **Identificador de rol:** [`rol_id` / `perfil_id` / "rol único sin tabla"]
- **Tenant Scope:** [`empresa_id` / `sucursal_id` / `parroquia_id` / `branch_uuid` / "sin tenant"]
- **Origen del scope en runtime:** [`session('X')` / middleware / header API]
- **Otros términos del dominio:** [Ej: "Slice", "Partida", "Complemento"...]

---

## 3. Stack y versiones

- Framework: [Laravel X]
- BD: [PostgreSQL / MySQL]
- Front del panel: [Blade + Materialize + jQuery + DataTables + SweetAlert2 + ...]
- Assets: [Font Awesome y fuentes LOCALES, no CDN] ← declarar siempre
- Librerías clave: [PDF, Excel, QR, etc.]

---

## 4. Arquitectura de capas

```
Controller (delgado) → Service (con DataBaseTrait) → DB
                     ↘ FormRequest (validación)
```
- Superficies: `Http/Controllers/Admin/*` (sesión) vs `Http/Controllers/Api/*` (API key).
- [Cualquier desviación de la convención Laravel, con su motivo.]

---

## 5. Modelo de datos (decisiones)

> Solo las decisiones de modelado y su porqué. El detalle de columnas vive en las migraciones.

- **`<tabla>`** — [propósito, decisiones clave, qué FK lleva y por qué].
- ...

---

## 6. Autenticación y permisos

- [Tipo de auth: sesión Blade / Sanctum / API key]
- [Roles: único / matriz de permisos]
- [Middleware de protección]

---

## 7. Contrato de API (si aplica — resumen; detalle en DOCUMENTATIONS/<contrato>.md)

- [Endpoints, seguridad, reglas estrictas de response, campos prohibidos en el JSON.]

---

## 8. Diseño visual (si aplica)

### Sistema de diseño (tokens)
- [Colores, fuente, sidebar, comportamiento. Referencia al mockup aprobado.]

### Referencia visual
- Mockup aprobado: `resources/mockups/<archivo>.html`

---

## 9. Fuera de alcance (MVP)

- [Lo postergado explícitamente, para evitar sobreingeniería.]

---

## 10. Compatibilidad

- **PHP producción:** [`^8.X`] · **PHP local:** [`8.X`]
- [Reglas de compatibilidad de paquetes y sintaxis.]

---

## 11. Bitácora de decisiones (limpia)

> Una fila por decisión estructural o de diseño. Si es un tecnicismo de ejecución, va en `bitacoradev.md`, no acá.

| Fecha | Decisión | Motivo |
|---|---|---|
| AAAA-MM-DD | [decisión] | [motivo] |
