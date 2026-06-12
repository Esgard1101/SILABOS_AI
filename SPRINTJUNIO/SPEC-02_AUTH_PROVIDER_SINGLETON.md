# SPEC-02 — AuthProvider singleton: fin del sidebar "desactivado" tras login

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (auth/layout)
**Estado:** LISTO PARA EJECUTAR
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/06_AI_PROVIDERS_DB_OPERATIONS.md` (sección auth) + `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md` (riesgo: endpoints oficiales públicos por diseño — no tocar auth backend).

---

## 1. Resumen y objetivo

Bug reportado (intermitente): usuarios se loguean correctamente pero el sidebar aparece desactivado ("Inicia sesión para acceder al menú"), incluso con contexto de curso elegido. El dashboard a veces muestra "Programa no definido / Sin semestre" en el mismo estado.

### Causa raíz (diagnóstico confirmado en código)

`useAuth` ([useAuth.ts:49](../silabos-frontend/src/hooks/useAuth.ts)) es un **hook con estado local, no un Context**:

1. **Multi-instancia:** `MasterLayout`, `Login`, `Register`, `ProtectedRoute` llaman `useAuth()` y cada uno crea su PROPIA copia de `isAuthenticated`. El login actualiza la instancia de `Login`; la del `MasterLayout` (que alimenta el sidebar vía prop) solo se entera si SU `validateSession()` round-trip tiene éxito.
2. **Validación N veces:** cada instancia dispara su propio `validateSession()` → varias llamadas `GET /me` por carga de página, compitiendo entre sí.
3. **Logout silencioso por error de red:** en el `catch` de `validateSession`, **cualquier** error que no sea 401 (timeout, backend dormido, blip de red) también ejecuta `clearAuthState` → borra `sessionStorage` → todas las pantallas quedan deslogueadas. Esto explica el "intermitente".
4. **sessionStorage por pestaña:** abrir el sistema en otra pestaña = sesión y contexto perdidos (alimenta el síntoma "Programa no definido").

---

## 2. Glosario y datos

- **Identificador de acceso:** JWT propio en storage (`silabos_token`) + `users.role` string. Backend NO se toca.
- **Archivos nuevos:** `silabos-frontend/src/context/AuthContext.tsx`.
- **Archivos que modifica:** `hooks/useAuth.ts` (se vuelve consumidor del context, API pública idéntica), `App.tsx` (montar provider raíz), `components/layout/MasterLayout.tsx`, `components/layout/OffcanvasSidebar.tsx`, `components/ProtectedRoute.tsx`, `pages/Login.tsx`, `pages/Register.tsx`, `api/client.ts` (helpers de storage).
- **Tablas:** ninguna.

---

## 3. Alcance (Features E2E)

### Incluye (entregable core)

- [ ] `AuthProvider` único montado en la raíz de `App.tsx`; `useAuth()` pasa a leer del context (misma firma de retorno: `{user, isAuthenticated, isLoading, error, login, loginWithGoogle, registerWithGoogle, logout}` → cero cambios en los consumidores más allá del import).
- [ ] `validateSession()` corre **una sola vez** al montar el provider (y tras login). Eliminar validaciones por componente.
- [ ] Política de limpieza de sesión: `clearSession` SOLO ante `401`/`403`. Errores de red/5xx → conservar sesión optimista (`isAuthenticated = Boolean(token)`), exponer `error` para banner no bloqueante y reintentar en background (1 retry con backoff simple).
- [ ] Migrar `silabos_token` + `silabos_user` de `sessionStorage` a `localStorage` (decisión: UX multi-pestaña y supervivencia a cierre de ventana > diferencia nula de seguridad XSS entre ambos storages). Incluir migración suave: si existe valor viejo en sessionStorage, moverlo.
- [ ] Sincronización multi-pestaña: listener de `storage` event → logout en una pestaña desloguea las demás.
- [ ] `OffcanvasSidebar` deja de recibir `isAuthenticated` por prop y consume `useAuth()` directamente (elimina el acoplamiento que escondía el bug).

### Fuera de alcance

- Cambios en backend de auth, refresh tokens, expiración del JWT (no existe hoy; postergar).
- Migrar `useAppContext` (contexto institucional) — SOLO si la verificación CA-05 demuestra que comparte el síntoma, alinear su storage a localStorage en esta misma tarea (cambio de una constante); nada más.

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** NO.
- Comportamiento visible: tras login, el sidebar SIEMPRE muestra menú activo + datos del usuario. Si la API está caída, banner discreto "Reintentando conexión…" sin cerrar sesión.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Login):** Login correcto → sidebar activo inmediatamente (sin esperar round-trip extra de `/me`).
- **CA-02 (F5):** Refresh en cualquier ruta interna → sesión persiste, sidebar activo, sin flash de "deslogueado".
- **CA-03 (Red caída):** Con backend apagado 15s y token válido en storage → NO se borra sesión; al volver el backend, `/me` revalida.
- **CA-04 (401 real):** Token inválido/expirado → limpieza total + redirect a `/login` (comportamiento actual conservado).
- **CA-05 (Multi-pestaña):** Sesión iniciada en pestaña A → pestaña B nueva abre logueada con contexto coherente. Verificar también el card "Contexto activo" del dashboard.
- **CA-06 (Roles):** `admin` ve items de gestión; `docente` ve sus 3 items. Sin cambios de lógica de roles.

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Login con cuenta admin → abro sidebar → menú activo con mi nombre y rol.
- [ ] F5 en `/dashboard` y en `/creator/producto` → sidebar sigue activo.
- [ ] Apago el backend local 15s con la app abierta → no me desloguea; banner de reintento; al encenderlo todo sigue.
- [ ] Abro segunda pestaña → sigo logueado.

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` en verde.
- [ ] Grep: ningún componente fuera de `AuthContext.tsx` mantiene `useState` de `isAuthenticated`/`user` de sesión.
- [ ] Grep: `clearSession`/`clearAuthState` solo se invoca en ramas 401/403 o logout explícito.
- [ ] Nota de decisión (storage + política 401) registrada al cierre en `AGENTSROUTING/06_AI_PROVIDERS_DB_OPERATIONS.md` cuando el user acepte.

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T1 (esta SPEC) | Bugfix estructural frontend | NO | — | [ ] |
