# Arquitectura del Frontend — SIGEISIL (silabos-frontend)

> Documento de estado actual para una limpieza progresiva conservadora ("V2").
> Generado por análisis de solo lectura. NO se modificó código fuente.
> Raíz analizada: `c:/TEST_CODE/SILABOSAIAUTOMATIZACION/silabos_app/silabos-frontend`
> Fecha de análisis: 2026-05-15. Estado git: rama `main`.

---

## 1. Resumen ejecutivo

`silabos-frontend` es una SPA en **React 19 + TypeScript + Vite 6** que asiste a docentes de la
Escuela de Educación UNPRG (FACHSE) en la elaboración asistida por IA de sílabos académicos.
Consume una API HTTP propia (`silabos-backend`, FastAPI) vía `fetch`.

**Flujos de usuario principales:**

1. **Landing pública** (`/`) — presentación institucional, sin auth (`pages/Landing.tsx`).
2. **Login / Registro** — email/password y Google Sign-In (`pages/Login.tsx`, `pages/Register.tsx`,
   `components/GoogleSignInButton.tsx`, hook `hooks/useAuth.ts`). Token JWT en `sessionStorage`.
3. **Selección de contexto académico** (`/select-context`, `pages/ContextSelector.tsx`) — el usuario
   elige Facultad → Carrera → Programa → Plan → Curso → Periodo. Se guarda en `sessionStorage`
   con clave dinámica por semestre (`hooks/useAppContext.ts`). Es **prerequisito** del wizard
   (`ContextGuard` en `App.tsx`).
4. **Wizard progresivo de generación de sílabo** (`/creator/*`) — 12 pasos secuenciales bajo
   `pages/creator/CreatorLayout.tsx`. Cada paso genera/edita un bloque vía IA (desempeños,
   contenido, método, producto integrador, mapa de conocimientos, programa progresivo semanal,
   evaluación, cierre) con polling de jobs asíncronos (`api.pollAiGenerationJob`).
5. **Chat / asistente lateral** — `components/layout/PersistentRightPanel.tsx` muestra mensajes
   guía por pantalla (`data/panelMessages.ts`); guías NotebookLM (`components/NotebookLMGuide.tsx`).
6. **Gestión y revisión** — listado de sílabos (`pages/SyllabusList.tsx`), revisión por roles de
   gestión (`pages/Review.tsx`), analítica (`pages/Analytics.tsx`), catálogo (`pages/Catalog.tsx`).
7. **Entrega final + descarga** — `pages/SyllabusFinalDelivery.tsx` y `pages/SyllabusEditor.tsx`
   (lazy) permiten descargar el sílabo en **PDF / Word** (`api.downloadSyllabusExport(id, 'pdf'|'docx')`).
8. **Administración** — usuarios, sumillas, métodos de enseñanza, habilidades, currículo
   (`pages/Admin*.tsx`), protegidas por rol `admin`.

Routing con `react-router-dom` v7 (`BrowserRouter`). Estilos con **Tailwind CSS v4**
(plugin Vite, sin `tailwind.config`) más `index.css` con `@font-face` locales.

---

## 2. Árbol de carpetas actual (anotado)

```
silabos-frontend/
├── index.html                # Entry HTML. Refiere /src/main.tsx y fuentes Google (sustituidas por locales)
├── package.json              # name "react-example" (placeholder). Sin test runner. lint = tsc --noEmit
├── vite.config.ts            # Plugins react+tailwind; alias "@" -> raíz; define process.env.GEMINI_API_KEY
├── tsconfig.json             # ÚNICO tsconfig. SIN "strict". paths "@/*" -> "./*"
├── vercel.json               # SPA rewrite (todo -> index.html)
├── .env / .env.local / .env.production / .env.example   # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
├── mocksdesistemainterno/    # 8 capturas WhatsApp .jpeg (material de diseño, NO usado por código)
├── metadata.json             # metadata de proyecto (AI Studio)
├── public/                   # Assets servidos en raíz "/" (ver §2.3)
└── src/
    ├── main.tsx              # Bootstrap. createRoot + StrictMode. NO monta providers globales
    ├── App.tsx               # 199 ln. Router central, todas las rutas, ContextGuard, 1 lazy import
    ├── index.css             # 292 ln. @font-face locales + variables CSS (--app-bg, etc.) + utilidades
    ├── api/
    │   ├── client.ts         # 1155 ln. CAPA API COMPLETA: fetch wrapper, ApiError, ~110 endpoints, polling
    │   └── types.ts          # 985 ln. Todos los tipos/DTOs del dominio
    ├── components/
    │   ├── AppShell.tsx          # 181 ln. Shell legado; SOLO usado por Dashboard.tsx
    │   ├── BibliographyGuide.tsx # 304 ln. Guía bibliografía; usa hook useBibliography
    │   ├── CollapsibleGuideCard.tsx # Card colapsable reutilizable
    │   ├── CourseCard.tsx        # 113 ln. Tarjeta de curso
    │   ├── FinalDeliveryInsights.tsx # 165 ln. Panel insights de entrega final
    │   ├── GoogleSignInButton.tsx   # 144 ln. Botón Google (usa VITE_GOOGLE_CLIENT_ID)
    │   ├── MethodSelector.tsx       # 212 ln. Selector de método pedagógico
    │   ├── NavSidebar.tsx           # Navegación lateral
    │   ├── NotebookLMGuide.tsx      # 491 ln. Guía NotebookLM (refs a /images/notebooklm_steps/*)
    │   ├── ProtectedRoute.tsx       # Guard de auth + roles
    │   ├── StatusBadge.tsx          # Badge de estado de sílabo
    │   ├── Toast.tsx                # 107 ln. useToast() + componente Toast
    │   ├── layout/
    │   │   ├── MasterLayout.tsx          # Layout principal (WaveHeader+Sidebar+RightPanel). Provee LayoutContext
    │   │   ├── OffcanvasSidebar.tsx      # 214 ln. Sidebar off-canvas
    │   │   ├── PersistentRightPanel.tsx  # Panel derecho persistente (usa data/panelMessages)
    │   │   └── WaveHeader.tsx            # Header con onda + logos
    │   └── ui/
    │       └── push-side-panel.tsx       # 126 ln. Primitiva UI panel deslizante
    ├── context/
    │   ├── LayoutContext.tsx     # 12 ln. Contexto trivial { hasMasterLayout }
    │   └── SyllabusContext.tsx   # 287 ln. ESTADO CENTRAL del wizard (~40 campos), montado solo en CreatorLayout
    ├── data/
    │   └── panelMessages.ts      # 206 ln. Textos guía por ruta (getPanelMessage)
    ├── hooks/
    │   ├── useAppContext.ts      # Contexto académico (sessionStorage, NO React Context)
    │   ├── useAuth.ts            # 197 ln. Autenticación. Se instancia por componente (no compartido)
    │   ├── useBibliography.ts    # Hook de bibliografía (usado por BibliographyGuide)
    │   ├── useDocuments.ts       # MUERTO: no importado por ningún componente
    │   └── useSyllabus.ts        # 61 ln. MUERTO (legado): no importado; colisiona en nombre con context
    ├── pages/
    │   ├── Landing.tsx / Landing.css   # Página pública
    │   ├── Login.tsx / Register.tsx    # Auth
    │   ├── ContextSelector.tsx  # 558 ln. Selección contexto académico
    │   ├── Dashboard.tsx        # 321 ln. Panel inicio (único consumidor de AppShell legado)
    │   ├── SyllabusList.tsx     # 651 ln. Listado de sílabos
    │   ├── SyllabusEditor.tsx   # 1393 ln. GOD COMPONENT (lazy). Vista avanzada/editor + export PDF/Word
    │   ├── SyllabusFinalDelivery.tsx # 280 ln. Entrega final
    │   ├── Review.tsx / Catalog.tsx / Analytics.tsx
    │   ├── Admin{Users,Sumillas,TeachingMethods,Skills,Curriculum}.tsx  # Pantallas admin
    │   └── creator/            # WIZARD (12 pasos) — mayor concentración de lógica de negocio
    │       ├── CreatorLayout.tsx          # 134 ln. Monta SyllabusProvider + barra de pasos
    │       ├── Step1_Repositorio.tsx      # 467 ln
    │       ├── Step2_Fuentes.tsx          # 1169 ln  (GOD COMPONENT)
    │       ├── Step2A_NotebookGuide.tsx   # 640 ln
    │       ├── Step2A_1_ManualUpload.tsx  # 182 ln
    │       ├── Step2A_2_DeepResearch.tsx  # 339 ln
    │       ├── Step3_Desempenos.tsx       # 564 ln
    │       ├── Step4_Contenido.tsx        # 797 ln
    │       ├── Step5_Metodo.tsx           # 620 ln
    │       ├── Step6_Cierre.tsx           # 592 ln  (evaluación)
    │       ├── Step7_ProductoIntegrador.tsx # 675 ln
    │       ├── Step8_ProgramaProgresivo.tsx # 1245 ln (GOD COMPONENT)
    │       ├── Step8b_MapaConocimientos.tsx  # 1341 ln (GOD COMPONENT, mayor archivo de pages)
    │       └── Step9_CierreProgresivo.tsx    # 292 ln
    └── utils/
        ├── methodIcons.ts       # Mapeo código/nombre de método -> icono FontAwesome
        └── syllabusStorage.ts   # 174 ln. Helpers sessionStorage + normalización de payload
```

### 2.1 Componentes más grandes por líneas (objetivos de refactor)

| Archivo | Líneas | Naturaleza |
|---|---|---|
| `pages/SyllabusEditor.tsx` | 1393 | God component, lazy, export PDF/Word |
| `pages/creator/Step8b_MapaConocimientos.tsx` | 1341 | God component (IA + edición semanal) |
| `pages/creator/Step8_ProgramaProgresivo.tsx` | 1245 | God component (programa semanal) |
| `pages/creator/Step2_Fuentes.tsx` | 1169 | God component (fuentes/bibliografía) |
| `api/client.ts` | 1155 | Capa API monolítica (~110 métodos) |
| `api/types.ts` | 985 | Tipos monolíticos |
| `pages/creator/Step4_Contenido.tsx` | 797 | Lógica IA contenido |
| `pages/creator/Step7_ProductoIntegrador.tsx` | 675 | Lógica IA producto |
| Total `src/` | ~23 033 | — |

### 2.2 Tipos/tests/build

Sin archivos `*.test.*` ni `*.spec.*`. Sin runner de tests. No hay `eslint`. Total ~23k líneas.

### 2.3 Organización de `public/` (assets sueltos)

`public/` mezcla **20 PNG sueltos en raíz**, 2 SVG, y subcarpetas:

- **PNG en raíz (sueltos):** `FONDO-LOGINV1.png` (1.8 MB), `ICONCONOCIMIENTOS.png`,
  `ICONCURADURIABUSQUEDADEFUENTESPORIA.png`, `ICONEMPEZARNOTEBOOKLM.png`,
  `ICONRELACIONCONPROPOSITO.png`, `ICONactitudes.png`, `ICONcompetenciacargado.png`,
  `ICONhabilidades.png`, `ICONplantillaoficialcargado.png`, `SumillaICONcargado.png`,
  `capacidadresultadocargadoICON.png`, `ajustarchat.png`, `crearnuevosilaboflujofinal.png`,
  `descargarPDF.png`, `descargarword.png`, `landing_floating.png`, `logo_fachse.png`,
  `pegarpromptDEJSON (1).png` (espacio + paréntesis en nombre), `sigesillanding1.png`,
  `unprg-logo.png`. Nomenclatura inconsistente (MAYÚSCULAS, mixed-case, espacios).
- `public/notebooklmICONS/` — 4 PNG (1 con espacios/acentos: `ICONNOTEBOOK_4_Verificación de fuentes.png`).
- `public/images/notebooklm_steps/` — capturas de pasos NotebookLM.
- `public/landing_page/` — 7 assets de landing (`hero-brain-book.png`, `iconomain.svg`, etc.).
- `public/fonts/Inter,JetBrains_Mono,Playfair_Display/` — fuentes locales (la **coma** en el
  nombre de carpeta es frágil; referenciada literalmente en `index.css`).
- `iconoParaContextselector.svg` (**5.78 MB**) e `iconologin.svg` (1.08 MB) — SVG enormes.

> **Regla de negocio del usuario (MEMORY):** los iconos personalizados (estas imágenes PNG)
> deben renderizarse **sin border, sin background, sin marco**. Verificado: se usan como
> `<img src="/ICON...png">` u `style backgroundImage`, sin contenedor decorativo. Cualquier
> reorganización debe preservar este render limpio y NO envolver los `<img>` en cajas con borde/fondo.

---

## 3. Arquitectura de componentes / capas

### 3.1 Capas observadas

| Capa | Ubicación | Responsabilidad | Estado |
|---|---|---|---|
| Entry | `main.tsx`, `index.html` | Bootstrap | Sin providers globales |
| Router | `App.tsx` | Todas las rutas + guards | Imports estáticos salvo `SyllabusEditor` (lazy) |
| Páginas | `pages/`, `pages/creator/` | Pantallas + **mucha lógica de negocio inline** | God components |
| Layout | `components/layout/` | Chrome (header, sidebar, panel) | OK |
| Componentes | `components/`, `components/ui/` | UI reutilizable parcial | Reuso bajo |
| Estado | `context/`, `hooks/` | Estado wizard + auth + contexto académico | Fragmentado (ver 3.3) |
| API | `api/client.ts`, `api/types.ts` | Acceso HTTP + tipos | Monolítica pero centralizada (bueno) |
| Utils | `utils/` | Helpers puros | OK |
| Datos | `data/panelMessages.ts` | Constantes de copy | OK |

### 3.2 Mapa de dependencias (quién importa a quién)

- `App.tsx` → todas las `pages/*` + `ProtectedRoute` + `layout/MasterLayout` +
  `pages/creator/CreatorLayout` + `hooks/useAppContext`.
- `MasterLayout` → `useAuth`, `LayoutContext`, `WaveHeader`, `OffcanvasSidebar`,
  `PersistentRightPanel`.
- `PersistentRightPanel` → `data/panelMessages`.
- `CreatorLayout` → `SyllabusProvider`/`useSyllabus` (context), `Toast`, `useAppContext`.
- Los 12 `Step*.tsx` → `api/client` (directo) + `context/SyllabusContext` (`useSyllabus`) +
  `api/types`. **14 archivos** consumen `useSyllabus`.
- `ProtectedRoute` → `useAuth`. `SyllabusContext` → `api/client`, `useAppContext`, `Toast`.
- `Dashboard.tsx` → `components/AppShell` (**único consumidor** de ese shell legado).
- `BibliographyGuide` → `hooks/useBibliography`.
- Casi todas las páginas importan `api/client` **directamente** (sin capa de servicios/feature).

### 3.3 Gestión de estado (fragmentada — punto clave)

No hay un único árbol de estado. Coexisten **tres mecanismos**:

1. **React Context real:** `SyllabusContext` (~40 campos del wizard) — montado **solo dentro de
   `CreatorLayout`**, no global. `LayoutContext` (trivial).
2. **Hooks que leen `sessionStorage` directamente, NO Context:** `useAppContext` (contexto
   académico, clave `context_<semestre>`), `useAuth` (token `silabos_token`, user
   `silabos_user`). `useAuth` **se re-instancia en cada componente** (`MasterLayout`,
   `ProtectedRoute`, etc.) → cada montaje vuelve a llamar `/api/auth/me` (sin caché compartida).
3. **Helpers de storage sueltos:** `utils/syllabusStorage.ts` (`currentSyllabus`,
   `syllabusStatusOverrides` en `sessionStorage`).

Hooks **muertos**: `hooks/useSyllabus.ts` (legado, colisiona en nombre con el `useSyllabus` del
context) y `hooks/useDocuments.ts` (no importado en ninguna parte).

### 3.4 Capa API

- Base URL: `api/client.ts:45` → `import.meta.env.VITE_API_URL || 'http://localhost:8000'`.
- `.env.example`: `VITE_API_URL=https://api.innovasaber.com.pe`, `VITE_GOOGLE_CLIENT_ID=`.
- Auth: `Bearer` token desde `sessionStorage` (`buildHeaders`). `401` → `clearSession()` +
  redirección imperativa a `/login` (`window.location.href`).
- `request<T>()` centraliza parseo, manejo de error (`ApiError`), timeouts vía `AbortController`.
- ~110 métodos en el objeto `api` (auth, syllabus CRUD, draft progresivo v3, jobs IA con
  `pollAiGenerationJob`, catálogos, admin). `import('./types')` inline repetido decenas de veces.
- Único punto de acceso HTTP (positivo para refactor: la capa ya está centralizada).

---

## 4. Modelo de imports

- **Imports relativos** en prácticamente todo el código (`../api/client`, `../../context/...`).
- **Alias `@`** definido en `vite.config.ts:15` (`'@' -> path.resolve(__dirname, '.')`, apunta a
  **la raíz del proyecto, no a `src/`**) y en `tsconfig.json:19` (`"@/*": ["./*"]`).
  **El alias casi no se usa en `src/`** (solo aparece en strings de assets `@/...` ninguno real).
  Inconsistencia: `@` mapea a raíz, no a `src` — confuso para futuros imports.
- **Lazy/dynamic imports:** un único `React.lazy` en `App.tsx:48`
  (`SyllabusEditor = lazy(() => import('./pages/SyllabusEditor'))`) con `Suspense`. El resto de
  páginas/wizard se importan estáticamente (bundle único grande). Los `import('./types')` en
  `client.ts` son **type-only imports**, no code-splitting.
- **Assets:** todos vía `public/` referenciados por **string absoluto** (`src="/unprg-logo.png"`,
  `url('/FONDO-LOGINV1.png')`, `backgroundImage`). No hay imports de assets desde `src/`
  (ningún `import logo from './logo.png'`). Esto significa que mover un PNG en `public/` **rompe
  silenciosamente** (sin error de build, solo 404 en runtime).
- **Env vars (`VITE_*`):** solo dos — `VITE_API_URL` (`api/client.ts:45`),
  `VITE_GOOGLE_CLIENT_ID` (`components/GoogleSignInButton.tsx:84`). `vite.config.ts:11` además
  inyecta `process.env.GEMINI_API_KEY` (define), aparentemente sin uso real en `src/`.

### 4.1 Puntos donde un movimiento de archivo ROMPE algo (inventario para V2)

| Punto | Archivo:línea | Riesgo al mover |
|---|---|---|
| Entry script | `index.html:21` (`/src/main.tsx`) | Mover `main.tsx` rompe el arranque |
| Alias `@` | `vite.config.ts:15`, `tsconfig.json:19-22` | Apunta a raíz; cualquier reescritura debe sincronizar ambos |
| Lazy import | `App.tsx:48` (`./pages/SyllabusEditor`) | Mover `SyllabusEditor.tsx` rompe el chunk lazy |
| Imports estáticos del router | `App.tsx:8-39` | ~30 imports relativos a `pages/*` y `components/*` |
| Fuentes locales | `src/index.css:7-52` (`/fonts/Inter,JetBrains_Mono,Playfair_Display/...`) | Nombre de carpeta con coma; mover fuentes rompe `@font-face` |
| Assets string (público) | ver §2.3 y Grep: `AppShell.tsx`, `Landing.tsx`, `Login.tsx`, `Register.tsx`, `WaveHeader.tsx`, `OffcanvasSidebar.tsx`, `PersistentRightPanel.tsx`, `ContextSelector.tsx`, `SyllabusEditor.tsx:992/1003`, `NotebookLMGuide.tsx:29-40`, `Step1_Repositorio.tsx:21-24`, `Step2A_1_ManualUpload.tsx:50`, `Step8b_MapaConocimientos.tsx:33-34` | Rutas absolutas hardcodeadas; mover PNG/SVG = 404 en runtime sin error de compilación |
| SPA rewrite | `vercel.json` | OK genérico; sin cambios |
| Env | `.env*`, `api/client.ts:45`, `GoogleSignInButton.tsx:84` | Renombrar var rompe API/Google |

---

## 5. Code smells / deuda técnica (con file:line)

1. **God components** (lógica de negocio + IA + UI en un solo archivo):
   - `pages/SyllabusEditor.tsx` (1393 ln), `pages/creator/Step8b_MapaConocimientos.tsx` (1341 ln),
     `Step8_ProgramaProgresivo.tsx` (1245 ln), `Step2_Fuentes.tsx` (1169 ln),
     `Step4_Contenido.tsx` (797 ln), `Step7_ProductoIntegrador.tsx` (675 ln).
   - Construcción de prompts dentro del componente: `Step8b_MapaConocimientos.tsx:59`
     (`buildKnowledgeMapPrompt`).
2. **Lógica de negocio en componentes:** cálculos de unidades/semanas
   (`Step8b_MapaConocimientos.tsx:45 unitForWeek`), normalización de payload mezclada con UI;
   las páginas llaman `api/client` directamente sin capa de servicios por feature.
3. **Estado fragmentado / sin fuente única:** ver §3.3. `useAuth` re-fetch `/api/auth/me` por
   cada montaje (no memoizado/compartido) — `hooks/useAuth.ts:131` (useEffect en cada instancia).
4. **Código muerto:**
   - `hooks/useSyllabus.ts` (61 ln) — no importado; **colisión de nombre** con
     `useSyllabus` de `context/SyllabusContext.tsx`.
   - `hooks/useDocuments.ts` — no importado por ningún componente.
   - `components/AppShell.tsx` (181 ln) — shell legado usado **solo** por `Dashboard.tsx:13`
     (el resto usa `MasterLayout`); candidato a consolidar.
5. **Assets sueltos / nomenclatura inconsistente:** 20 PNG en raíz de `public/`, nombres en
   MAYÚSCULAS sin patrón, espacios y paréntesis (`pegarpromptDEJSON (1).png`), acentos
   (`notebooklmICONS/ICONNOTEBOOK_4_Verificación de fuentes.png`), carpeta de fuentes con coma.
   SVG de 5.78 MB (`iconoParaContextselector.svg`) y 1.08 MB (`iconologin.svg`) sin optimizar.
   `mocksdesistemainterno/` (8 JPEG WhatsApp) versionado sin uso en código.
6. **Alias `@` mal apuntado:** mapea a raíz del proyecto, no a `src/`; prácticamente sin uso,
   genera confusión (`vite.config.ts:15`, `tsconfig.json:19`).
7. **Tipos monolíticos:** `api/types.ts` (985 ln) con todos los DTOs; `import('./types')`
   inline repetido ~30 veces en `client.ts` en lugar de import de tipos al tope.
8. **`package.json` con `name: "react-example"`** y dependencias de servidor (`express`,
   `better-sqlite3`, `dotenv`) en un proyecto frontend Vite — ruido / superficie innecesaria.
9. **UI duplicada:** patrones repetidos de tarjeta/borde/badge inline con clases Tailwind
   (`MethodSelector.tsx:143-203`, tarjetas en múltiples Step*); sin componentes compartidos
   (`Card`, `Field`, `Badge`) salvo `StatusBadge`, `CourseCard`, `CollapsibleGuideCard`.
10. **Prop drilling / acoplamiento:** los Step* dependen simultáneamente de `useSyllabus`
    (context), `api/client` directo y `useAppContext` (storage) — tres orígenes de verdad.
11. **`tsconfig` sin `strict`** (ver §9) — red de seguridad de tipos débil.

---

## 6. Propuesta de reestructuración CONSERVADORA (objetivo, bajo riesgo)

Estructura **feature-based ligera** sobre `src/`, sin reescribir lógica. Mover, no reescribir.

```
src/
├── main.tsx
├── App.tsx                       # solo composición de rutas
├── app/
│   └── routes.tsx                # (opc. fase tardía) extraer tabla de rutas de App.tsx
├── shared/
│   ├── ui/                       # Toast, StatusBadge, CourseCard, CollapsibleGuideCard,
│   │                             #   push-side-panel, primitivas Card/Field/Badge (nuevas, opcional)
│   ├── layout/                   # MasterLayout, WaveHeader, OffcanvasSidebar,
│   │                             #   PersistentRightPanel, AppShell (a deprecar)
│   ├── lib/                      # methodIcons, syllabusStorage (utils puros)
│   └── data/                     # panelMessages
├── api/
│   ├── client.ts                 # se mantiene (ya centralizado)
│   └── types/                    # (fase tardía) dividir types.ts por dominio
├── auth/
│   ├── hooks/useAuth.ts
│   └── components/GoogleSignInButton.tsx, ProtectedRoute.tsx
├── context-academico/
│   └── hooks/useAppContext.ts, pages/ContextSelector.tsx
├── features/
│   ├── wizard/                   # SyllabusContext + CreatorLayout + Step1..Step9 + Step8b
│   │   ├── context/SyllabusContext.tsx
│   │   ├── CreatorLayout.tsx
│   │   └── steps/Step*.tsx
│   ├── syllabus/                 # SyllabusList, SyllabusEditor (lazy), SyllabusFinalDelivery,
│   │   │                         #   FinalDeliveryInsights
│   ├── review/                   # Review.tsx
│   ├── catalog/                  # Catalog.tsx, MethodSelector
│   ├── analytics/                # Analytics.tsx
│   ├── admin/                    # Admin*.tsx
│   ├── dashboard/                # Dashboard.tsx
│   ├── notebooklm/               # NotebookLMGuide, BibliographyGuide, useBibliography
│   └── public/                   # Landing.tsx + Landing.css, Login, Register
└── index.css

public/
├── brand/        # unprg-logo.png, logo_fachse.png
├── backgrounds/   # FONDO-LOGINV1.png, landing_floating.png, sigesillanding1.png
├── icons/         # ICON*.png, *cargado*.png, descargarPDF/word.png, ajustarchat.png ...
├── landing/        # (ya existe landing_page/)
├── notebooklm/     # (ya existe notebooklmICONS/ + images/notebooklm_steps/)
└── fonts/          # renombrar carpeta sin coma -> fonts/inter, fonts/jetbrains-mono, ...
```

**Principios conservadores:**
- Fase 1 = SOLO borrar muerto + reorganizar assets (sin tocar imports de TS).
- Mover archivos TS por lotes pequeños, actualizar imports relativos con búsqueda exacta.
- **No** introducir alias nuevos hasta que `@` se corrija (apuntar a `src/`) en lote aislado.
- Preservar render de iconos sin borde/fondo/marco (regla de negocio): al reubicar PNG en
  `public/icons/`, actualizar el string path 1:1, NO envolver `<img>` en contenedores.
- Eliminar `process.env.GEMINI_API_KEY` del `define` solo si se confirma 0 uso.

---

## 7. Plan progresivo por lotes (menor riesgo primero)

> Validación estándar tras cada lote: `npx tsc --noEmit` (alias `npm run lint`) **debe pasar**
> + `npm run build` (vite build) **debe pasar** + smoke manual de rutas afectadas.
> Cada lote = 1 commit atómico en rama dedicada. Rollback = `git revert <sha>` del lote.

| Lote | Acción | Imports/alias a tocar | Validación | Rollback | Commit sugerido |
|---|---|---|---|---|---|
| **L0** | Crear rama + red de seguridad: añadir `vitest`/`@testing-library` (mínimo) y 2-3 smoke tests de render (App, Login, CreatorLayout) | ninguno | tsc + build verdes | `git revert` | `chore(fe): baseline tests + branch v2` |
| **L1** | Borrar código muerto: `hooks/useSyllabus.ts`, `hooks/useDocuments.ts`. Confirmar 0 referencias antes | ninguno (verificar grep 0) | tsc + build | revert | `chore(fe): remove dead hooks` |
| **L2** | Reorganizar `public/` en subcarpetas (`brand/`,`icons/`,`backgrounds/`). Actualizar **strings de path** uno a uno (lista §4.1) | strings en ~14 archivos `.tsx` + `index.css` | tsc + build + **smoke visual** (logos, fondos, iconos render sin marco) | revert | `refactor(fe): organize public assets` |
| **L3** | Mover `mocksdesistemainterno/` fuera del build (a `docs/` o `.gitignore`); eliminar deps server no usadas de `package.json` (`express`,`better-sqlite3`,`dotenv`) si grep confirma 0 uso | `package.json` | `npm i` + tsc + build | revert | `chore(fe): trim non-frontend deps & mocks` |
| **L4** | Corregir alias `@` -> `src/` en `vite.config.ts` + `tsconfig.json` (lote aislado, nadie lo usa aún) | `vite.config.ts:15`, `tsconfig.json:19` | tsc + build | revert | `fix(fe): point @ alias to src` |
| **L5** | Crear `src/shared/{ui,layout,lib,data}` y mover utils puros + `panelMessages` + componentes UI hoja (Toast, StatusBadge, CourseCard, CollapsibleGuideCard, push-side-panel). Actualizar imports relativos | imports en consumidores de esos módulos | tsc + build | revert | `refactor(fe): introduce shared layer` |
| **L6** | Crear `src/features/wizard/` y mover `SyllabusContext` + `CreatorLayout` + `Step*`. Actualizar imports en `App.tsx` y entre steps | `App.tsx:26-39`, imports internos del wizard | tsc + build + smoke wizard completo | revert | `refactor(fe): wizard feature module` |
| **L7** | Resto de features (`syllabus/`, `admin/`, `public/`, `dashboard/`, etc.), un feature por commit | imports en `App.tsx` por bloque | tsc + build + smoke por feature | revert por commit | `refactor(fe): <feature> module` |
| **L8** | (Opcional) dividir `api/types.ts` por dominio y reemplazar `import('./types')` inline por imports al tope en `client.ts` | `client.ts` | tsc + build | revert | `refactor(fe): split api types` |
| **L9** | (Opcional) activar `strict` por etapas (`noImplicitAny` → `strictNullChecks` → `strict`) | tsconfig | tsc (esperar errores; arreglar incrementalmente) | revert | `chore(fe): enable strict step` |

Orden de riesgo: L0–L4 casi nulo (borrado/strings/config) → L5–L7 medio (movimiento masivo de
imports) → L8–L9 mayor esfuerzo de tipos. **No** mezclar lotes.

---

## 8. Mapa de riesgos

| Cambio | Riesgo | Probabilidad | Mitigación | Detección |
|---|---|---|---|---|
| Reubicar PNG/SVG en `public/` | 404 en runtime (no falla build) | Alta | Tabla §4.1 + actualizar string 1:1 | Smoke visual + grep de paths antiguos |
| Renombrar carpeta de fuentes (coma) | `@font-face` rotas, tipografía fallback | Media | Actualizar `index.css:7-52` en mismo lote | Inspección visual de fuentes |
| Mover `SyllabusContext`/steps | Imports rotos, wizard caído | Media | Lote aislado L6, tsc tras mover | `tsc --noEmit`, smoke wizard |
| Mover `SyllabusEditor` (lazy) | Chunk lazy 404 | Media | Actualizar `App.tsx:48` en el mismo commit | Build + abrir `/editor` |
| Cambiar alias `@` | Imports `@/...` rotos | Baja (casi sin uso) | Lote aislado L4, grep `from '@/'` antes | tsc + build |
| Borrar deps `express/sqlite/dotenv` | Romper script/herramienta oculta | Baja | grep uso + `npm run build` | Build / arranque dev |
| Borrar hooks muertos | Eliminar algo aún referido | Muy baja | grep referencias = 0 antes | tsc |
| Activar `strict` | Cascada de errores de tipo | Alta (esperada) | Activar por flag incremental | tsc por etapas |
| Refactor de god component | Regresión funcional IA/UI | Alta si se reescribe | **No reescribir en V2**; solo mover archivo | Smoke manual del paso |
| `useAuth` re-fetch | (Pre-existente) carga extra `/api/auth/me` | — | No tocar en limpieza; anotar para fase posterior | Network tab |

---

## 9. Estado de tipos / tests / build

- **TypeScript:** `tsconfig.json` **sin `strict`** (ni `noImplicitAny`, ni `strictNullChecks`).
  Solo `skipLibCheck`, `isolatedModules`, `noEmit`, `allowJs`, `allowImportingTsExtensions`.
  Un único `tsconfig.json` (no hay `tsconfig.app/node`). Red de tipos **débil**.
- **Typecheck:** `npx tsc --noEmit` ejecutado en este análisis → **pasa sin errores**
  (estado limpio actual; es la principal red de seguridad disponible hoy).
- **Tests:** **NO existen** (`0` archivos `*.test.*`/`*.spec.*`, sin runner, sin script `test`).
- **Lint:** no hay ESLint; `npm run lint` = `tsc --noEmit`.
- **Build:** `vite build` (`npm run build`). Sin code-splitting salvo `SyllabusEditor` lazy →
  bundle único grande (god components estáticos).
- **Red de seguridad mínima requerida antes del refactor (L0):**
  1. Mantener `tsc --noEmit` verde como gate obligatorio de cada lote.
  2. Añadir smoke tests de render (App + Login + CreatorLayout + un Step) con Vitest+RTL.
  3. Checklist manual de rutas críticas (wizard 12 pasos, login Google, descarga PDF/Word).
  4. Inventario de strings de assets (§4.1) como checklist de verificación post-movimiento.

---

## 10. Checklist accionable para el agente V2

Ejecutar en orden. Cada paso tiene criterio de aceptación explícito.

1. **Rama y baseline.** Crear rama `refactor/frontend-v2`. Ejecutar `npx tsc --noEmit` y
   `npm run build`.
   - *Aceptación:* ambos verdes; sha base registrado.
2. **Red de seguridad (L0).** Añadir Vitest + RTL; smoke tests: render de `App`, `Login`,
   `CreatorLayout`, un `Step`.
   - *Aceptación:* `npm test` verde; tsc/build verdes.
3. **Borrar muerto (L1).** Confirmar con grep 0 referencias y eliminar `hooks/useSyllabus.ts`
   y `hooks/useDocuments.ts`.
   - *Aceptación:* grep sin referencias; tsc/build/test verdes.
4. **Assets `public/` (L2).** Crear `brand/`,`icons/`,`backgrounds/`; mover PNG/SVG; actualizar
   cada string de §4.1 1:1. Renombrar archivos con espacios/acentos/paréntesis.
   - *Aceptación:* sin paths antiguos en grep; smoke visual confirma logos/fondos/**iconos sin
     borde ni fondo ni marco** (regla de negocio intacta); build verde.
5. **Limpieza de proyecto (L3).** Mover `mocksdesistemainterno/` fuera del build; quitar deps
   `express`/`better-sqlite3`/`dotenv` si grep confirma 0 uso en `src/`.
   - *Aceptación:* `npm i` + build + test verdes; tamaño de bundle no aumenta.
6. **Alias `@` (L4).** Apuntar `@` a `src/` en `vite.config.ts` y `tsconfig.json` (sincronizados).
   - *Aceptación:* grep `from '@/'` revisado; tsc/build verdes.
7. **Capa `shared/` (L5).** Crear `src/shared/{ui,layout,lib,data}`; mover utils/data/UI hoja;
   actualizar imports relativos.
   - *Aceptación:* tsc/build/test verdes; sin imports rotos.
8. **Feature wizard (L6).** Mover `SyllabusContext`, `CreatorLayout`, `Step*` a
   `src/features/wizard/`; actualizar `App.tsx` y cruces entre steps.
   - *Aceptación:* tsc/build verdes; smoke manual de los 12 pasos OK; sílabo descargable PDF/Word.
9. **Resto de features (L7).** Un feature por commit (`syllabus`,`admin`,`public`,`dashboard`,
   `review`,`catalog`,`analytics`,`notebooklm`).
   - *Aceptación:* por commit, tsc/build verdes + smoke del feature.
10. **Opcionales (L8/L9).** Dividir `api/types.ts`; activar `strict` por flag incremental.
    - *Aceptación:* tsc verde tras cada sub-paso; sin regresión funcional.
11. **Cierre.** Consolidar/eliminar `AppShell` legado migrando `Dashboard.tsx` a `MasterLayout`
    (evaluar como fase separada, mayor riesgo de UI).
    - *Aceptación:* Dashboard renderiza idéntico; build verde.

> Regla transversal en TODOS los pasos: **mover, no reescribir**. No refactorizar la lógica
> interna de los god components en V2 (solo reubicar el archivo). Preservar el render limpio de
> iconos personalizados (sin border/background/frame).

---

### Apéndice — comandos de validación

```bash
# typecheck (gate obligatorio por lote)
npx tsc --noEmit          # == npm run lint

# build de producción
npm run build             # vite build

# dev server (smoke manual)
npm run dev               # vite --port=3000

# tests (tras L0)
npm test                  # vitest (a añadir)
```
