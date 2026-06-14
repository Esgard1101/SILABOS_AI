# Guía Técnica — Pantalla de Carga (Preloader) Elegante e Inteligente

Esta guía detalla el paradigma para implementar una pantalla de carga (preloader) global de alto rendimiento que:
1. Cubra la pantalla con el logotipo de la aplicación en el centro y un spinner animado a su alrededor.
2. Controle las transiciones tanto en recargas tradicionales de página (HTML/Blade) como en peticiones dinámicas (AJAX/Fetch).
3. Evite bloquear la pantalla de forma errónea ante validaciones del navegador o llamadas AJAX secundarias.

---

## 1. Estructura HTML (Layout Principal)

El preloader debe insertarse inmediatamente después de la apertura del tag `<body>` para garantizar que sea lo primero en procesarse y renderizarse en el navegador, cubriendo cualquier contenido sin maquetar durante la carga inicial.

```html
<!-- Colocar justo debajo de <body> -->
<div id="appPreloader" class="app-preloader">
    <div class="preloader-wrapper">
        <!-- Contenedor del logotipo de la aplicación -->
        <div class="preloader-logo">
            <img src="{{ asset('assets/img/logo.png') }}" alt="Logo">
        </div>
        <!-- Anillo de carga (spinner) -->
        <div class="preloader-spinner"></div>
    </div>
</div>
```

---

## 2. Estilos CSS (admin.css)

El diseño utiliza un fondo gris claro o neutro para integrarse de forma fluida con el área de contenido. El spinner gira en el color de acento de la aplicación.

```css
/* ============================================================
   PRELOADER OVERLAY
   ============================================================ */
.app-preloader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #F8FAFC; /* Slate 50 (color claro para suavizar transiciones) */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999; /* Por encima de cualquier modal, menú o tooltip */
    transition: opacity 0.3s ease, visibility 0.3s ease;
    opacity: 1;
    visibility: visible;
}

/* Clase añadida vía JS para desvanecer el loader */
.app-preloader.preloader-fade-out {
    opacity: 0;
    visibility: hidden;
}

.preloader-wrapper {
    position: relative;
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Contenedor central del Logotipo */
.preloader-logo {
    position: absolute;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08); /* Sombra ligera */
    padding: 10px;
    z-index: 2;
}

.preloader-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

/* Anillo giratorio (Teal Accent) */
.preloader-spinner {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 3px solid rgba(20, 184, 166, 0.15); /* Pista transparente */
    border-top: 3px solid #14B8A6;          /* Extremo del spinner en Teal */
    border-radius: 50%;
    animation: preloader-spin 1s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
    z-index: 1;
}

/* Animación de Rotación */
@keyframes preloader-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
```

---

## 3. Lógica JavaScript de Control (admin.js)

El JS exporta funciones globales y escucha eventos para automatizar el ciclo de vida del preloader de forma inteligente.

```javascript
// ============================================================
// PRELOADER GLOBAL API
// ============================================================

/**
 * Muestra la pantalla de carga de forma instantánea.
 */
window.showPreloader = function () {
    const preloader = document.getElementById('appPreloader');
    if (preloader) {
        preloader.style.display = 'flex';
        preloader.classList.remove('preloader-fade-out');
    }
};

/**
 * Desvanece y oculta la pantalla de carga.
 */
window.hidePreloader = function () {
    const preloader = document.getElementById('appPreloader');
    if (preloader) {
        preloader.classList.add('preloader-fade-out');
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 300); // Coincide con la duración de la transición en el CSS
    }
};

// 1. Ocultar preloader cuando la página y sus recursos carguen por completo
window.addEventListener('load', function () {
    hidePreloader();
});

document.addEventListener('DOMContentLoaded', function () {

    // 2. Activar preloader en clics de enlaces de navegación principal
    const navLinks = document.querySelectorAll(
        '.sidebar-nav-item, .sidebar-brand, .qcard, .topbar-breadcrumb a, .btn-accent, .btn-ghost'
    );
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            // Ignorar clics secundarios (clic derecho, ctrl+clic, target="_blank", etc.)
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || this.getAttribute('target') === '_blank') {
                return;
            }
            // Ignorar enlaces sin destino real o scripts vacíos
            const href = this.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) {
                return;
            }
            showPreloader();
        });
    });

    // 3. Activar preloader en envíos de formularios convencionales (recarga)
    // Usamos delegación en document y validamos e.defaultPrevented
    document.addEventListener('submit', function (e) {
        // Si el evento fue cancelado (por validación nativa del navegador o AJAX),
        // evitamos mostrar el preloader para no bloquear la interfaz.
        if (e.defaultPrevented) {
            return;
        }
        showPreloader();
    });
});
```

---

## 4. Control Asíncrono en AJAX / Fetch (Módulos Dinámicos)

Cuando los formularios o acciones se envían a través de AJAX (evitando la recarga de página mediante `e.preventDefault()`), la pantalla de carga debe operarse de forma explícita en el ciclo de la petición para evitar bloqueos:

```javascript
document.getElementById('form-ajax-example').addEventListener('submit', function (e) {
    e.preventDefault(); // Evitamos recarga tradicional

    // 1. Mostrar el cargador manualmente antes de disparar la petición
    showPreloader();

    // 2. Realizar petición Fetch/AJAX
    fetch('/api/route', {
        method: 'POST',
        body: JSON.stringify({ data: 'example' })
    })
    .then(r => r.json())
    .then(res => {
        // Procesar éxito...
    })
    .catch(err => {
        // Procesar error...
    })
    .finally(() => {
        // 3. Ocultar el cargador en el bloque finally (asegura ejecución en éxito o error)
        hidePreloader();
    });
});
```
