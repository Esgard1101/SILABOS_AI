import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="lp-root">

      {/* ── NAV ── */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-row">
          <div className="lp-brand">
            <div className="lp-brand-logos">
              <img src="/unprg-logo.png" alt="UNPRG" />
            </div>
            <div className="lp-brand-name">
              <div className="t1">Sílabo<span>.AI</span></div>
              <div className="t2">FACHSE · UNPRG</div>
            </div>
          </div>

          <nav className="lp-nav-links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#modulos">Beneficios</a>
            <a href="#faq">Preguntas frecuentes</a>
          </nav>

          <Link to="/login" className="lp-btn lp-btn-primary">
            Ingresar
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>

          <div className="lp-brand-fachse-wrap">
            <img src="/logo_fachse.png" alt="FACHSE" />
            <div className="lp-brand-fachse-txt">
              <div className="l1">Facultad de Ciencias</div>
              <div className="l2">Histórico Sociales y Educación</div>
              <div className="l3">(FACHSE)</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-dots" />
        <div className="lp-container lp-hero-grid">

          {/* Left: text */}
          <div>
            <div className="lp-hero-ribbon" aria-hidden="true">
              <span className="lp-hr-text">Innovación curricular para una docencia de calidad.</span>
            </div>

            <h1 className="lp-hero-title">
              Sistema de Gestión <em>Inteligente de Sílabos</em> — UNPRG
            </h1>

            <p className="lp-lede">
              Plataforma académica impulsada por la Dirección de la Escuela Profesional de Educación para
              transformar la elaboración de sílabos, fortalecer la coherencia curricular y elevar la calidad
              formativa con apoyo de inteligencia artificial.
            </p>

            <div className="lp-hero-cta">
              <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">
                Ingresar al sistema
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <a href="#como-funciona" className="lp-btn lp-btn-ghost lp-btn-lg">Ver cómo funciona</a>
            </div>

            <div className="lp-chips" aria-label="Características">
              <span className="lp-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h10M4 17h16" /></svg>
                Contexto por programa
              </span>
              <span className="lp-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 4v16" /></svg>
                Curso con datos oficiales
              </span>
              <span className="lp-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2z" /></svg>
                Bibliografía asistida
              </span>
              <span className="lp-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                Sugerencia metodológica
              </span>
              <span className="lp-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M6 16l8-8 4 4-8 8H6v-4z" /></svg>
                Edición docente
              </span>
            </div>
          </div>

          {/* Right: visual */}
          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-hv-bg-glow" />

            <div className="lp-hv-chip c1">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 4v16" /></svg>
              </div>
              <div>Contexto activo<span className="sub">FACHSE · 2026-I</span></div>
            </div>

            <img
              src="/landing_page/hero-brain-book.png"
              alt="Inteligencia artificial + conocimiento"
              className="lp-hv-illo"
            />

            <div className="lp-hv-chip c2">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </div>
              <div>Método sugerido<span className="sub">Edición docente</span></div>
            </div>

            <div className="lp-hv-chip c3">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2z" /></svg>
              </div>
              <div>Bibliografía asistida<span className="sub">PDF · Markdown</span></div>
            </div>

            <div className="lp-director-float" aria-label="Director de la Escuela Profesional de Educación">
              <div className="lp-df-name">Dr. Carlos Vásquez Crisanto</div>
              <div className="lp-df-role">Director de la Escuela Profesional de Educación</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE ── */}
      <section className="lp-value">
        <div className="lp-container lp-value-grid">
          <div>
            <span className="lp-kicker">Valor inmediato</span>
            <h2>El sílabo no empieza desde cero.</h2>
            <p>
              La plataforma organiza el trabajo por contexto académico, recupera la información oficial del curso
              y guía al docente paso a paso para lograr mayor coherencia curricular, menos retrabajo y mejor
              trazabilidad por semestre.
            </p>
          </div>
          <div className="lp-value-stats">
            <div className="lp-stat">
              <div className="k">Contexto</div>
              <div className="v">Programa + semestre</div>
              <div className="d">Trabajo organizado por periodo académico activo.</div>
            </div>
            <div className="lp-stat">
              <div className="k">Base oficial</div>
              <div className="v">Datos del curso</div>
              <div className="d">Sumilla, competencias y resultados ya precargados.</div>
            </div>
            <div className="lp-stat">
              <div className="k">Apoyo IA</div>
              <div className="v">Sugerencia metodológica</div>
              <div className="d">Orientación pedagógica según la naturaleza del curso.</div>
            </div>
            <div className="lp-stat">
              <div className="k">Control</div>
              <div className="v">Decisión docente</div>
              <div className="d">El contenido generado es siempre revisable y editable.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FLOW ── */}
      <section className="lp-section" id="como-funciona">
        <div className="lp-container">
          <div className="lp-sec-head">
            <span className="lp-kicker">Cómo funciona</span>
            <h2>Así funciona el flujo docente</h2>
            <p>Cinco pasos claros desde la selección del contexto académico hasta la generación del sílabo editable.</p>
          </div>

          <div className="lp-flow-steps">
            {[
              {
                n: 'Paso 01', title: 'Selecciona tu contexto académico',
                desc: 'Elige facultad, escuela, programa y semestre para trabajar dentro del marco correspondiente.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 12l9 4 9-4M3 17l9 4 9-4" /></svg>
              },
              {
                n: 'Paso 02', title: 'Elige el curso del programa activo',
                desc: 'El sistema muestra sumilla, créditos, ciclo, competencia de egreso y resultado de aprendizaje.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></svg>
              },
              {
                n: 'Paso 03', title: 'Complementa la bibliografía',
                desc: 'Apóyate en NotebookLM y sube un archivo en PDF o Markdown para enriquecer las fuentes. Paso opcional.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13l2 2 4-4" /></svg>
              },
              {
                n: 'Paso 04', title: 'Revisa la sugerencia metodológica',
                desc: 'La IA propone un método pedagógico según la naturaleza del curso, pero el docente mantiene la decisión final.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
              },
              {
                n: 'Paso 05', title: 'Genera y edita tu sílabo',
                desc: 'Se crea una base alineada al esquema institucional para revisión, ajuste y publicación.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M6 16l8-8 4 4-8 8H6v-4z" /></svg>
              },
            ].map((s) => (
              <article className="lp-step" key={s.n}>
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section className="lp-section lp-modules" id="modulos">
        <div className="lp-container">
          <div className="lp-sec-head">
            <span className="lp-kicker">Capacidades</span>
            <h2>Una plataforma pensada para la elaboración académica real</h2>
            <p>Cinco módulos que estructuran el trabajo docente desde el contexto hasta la publicación.</p>
          </div>

          <div className="lp-mod-grid">
            {[
              {
                title: 'Contexto académico activo',
                desc: 'Cada periodo de trabajo se organiza por programa y semestre, evitando mezcla de datos entre ciclos.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 4v16" /></svg>
              },
              {
                title: 'Información del curso en solo lectura',
                desc: 'La base institucional aporta los datos clave para la elaboración, sin riesgo de alterar el catálogo.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
              },
              {
                title: 'Bibliografía asistida',
                desc: 'El docente puede enriquecer el sílabo con fuentes procesadas desde sus propios materiales en PDF o Markdown.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2z" /></svg>
              },
              {
                title: 'Metodología sugerida',
                desc: 'La plataforma orienta la selección pedagógica según el tipo y naturaleza del curso del plan de estudios.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l3-3 3 3 6-6 6 6" /><path d="M3 19h18" /></svg>
              },
              {
                title: 'Edición y seguimiento',
                desc: 'El resultado generado puede revisarse, ajustarse y gestionarse dentro del sistema con trazabilidad completa.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" /></svg>
              },
              {
                title: 'Alineación institucional',
                desc: 'El sílabo se produce bajo el esquema oficial de la FACHSE, manteniendo coherencia curricular por defecto.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
              },
            ].map((m) => (
              <div className="lp-mod" key={m.title}>
                <div className="lp-mod-icon">{m.icon}</div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUALITY + INNOVATION ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-split">
            <div className="lp-split-card">
              <span className="lp-kicker">Calidad</span>
              <h2>Calidad académica desde la construcción del sílabo.</h2>
              <p>
                La plataforma fortalece la coherencia entre sumilla, resultados de aprendizaje, metodología,
                evaluación y planificación del curso, alineando la elaboración del sílabo con el marco institucional.
              </p>
              <ul className="lp-split-bullets">
                <li>Coherencia curricular entre componentes del sílabo.</li>
                <li>Trazabilidad del resultado por docente, curso y semestre.</li>
                <li>Estructura alineada al esquema oficial de la FACHSE.</li>
              </ul>
            </div>

            <div className="lp-split-card blue">
              <div className="lp-split-deco" />
              <span className="lp-kicker">Innovación</span>
              <h2>Innovación con criterio docente.</h2>
              <p>
                La inteligencia artificial acompaña la elaboración, sugiere rutas metodológicas y ayuda a
                organizar insumos, pero la decisión académica final permanece en manos del docente.
              </p>
              <ul className="lp-split-bullets">
                <li>Sugerencia metodológica por naturaleza del curso.</li>
                <li>Bibliografía enriquecida desde materiales propios.</li>
                <li>El docente ajusta, aprueba y publica el resultado.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── INSTITUTIONAL ── */}
      <section className="lp-inst" style={{ padding: '72px 0' }}>
        <div className="lp-container lp-inst-strip">
          <div className="lp-inst-logos">
            <img src="/unprg-logo.png" alt="UNPRG" />
            <img src="/logo_fachse.png" alt="FACHSE" />
            <div className="lp-inst-txt">
              <div className="nm">Universidad Nacional Pedro Ruiz Gallo</div>
              <div className="role">Facultad de Ciencias Histórico Sociales y Educación<br />Escuela Profesional de Educación</div>
            </div>
          </div>
          <div className="lp-inst-right">
            <span className="lp-kicker">Respaldo institucional</span>
            <p>
              Sílabo.AI forma parte del esfuerzo por modernizar la elaboración académica,
              mejorar la consistencia curricular y brindar herramientas de apoyo a la docencia
              en la FACHSE-UNPRG.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section" id="faq" style={{ background: 'var(--bg-softer)' }}>
        <div className="lp-container lp-faq-grid">
          <div className="lp-sec-head left">
            <span className="lp-kicker">FAQ</span>
            <h2>Preguntas frecuentes</h2>
            <p>Dudas típicas del docente sobre el alcance del sistema y el margen de decisión académica.</p>
          </div>

          <div className="lp-faq-list">
            {[
              { q: '¿El docente puede modificar el resultado generado?', a: 'Sí. La plataforma asiste el proceso, pero el contenido puede revisarse y ajustarse antes de su publicación definitiva.', open: true },
              { q: '¿La bibliografía es obligatoria?', a: 'No. Es un paso opcional que permite enriquecer el resultado con fuentes adicionales cargadas por el docente.' },
              { q: '¿El método pedagógico queda fijo?', a: 'No. El sistema sugiere una opción, pero el docente puede cambiarla según su criterio académico.' },
              { q: '¿El trabajo se organiza por programa y semestre?', a: 'Sí. El contexto académico define el entorno de trabajo de cada periodo y mantiene los datos separados por ciclo.' },
              { q: '¿Qué formatos acepta para complementar bibliografía?', a: 'Archivos en PDF o Markdown, procesables a través de herramientas como NotebookLM dentro del flujo asistido.' },
            ].map((faq) => (
              <details key={faq.q} className="lp-faq-item" open={faq.open}>
                <summary>{faq.q}</summary>
                <div className="lp-faq-answer">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="lp-cta-wrap" id="ingresar">
        <div className="lp-cta">
          <div className="lp-cta-inner">
            <div>
              <h2>Una elaboración de sílabos más coherente, ágil y contextualizada.</h2>
              <p>Ingresa al sistema y gestiona tu trabajo académico dentro de un flujo guiado, alineado al programa y al semestre vigente.</p>
            </div>
            <div className="lp-cta-actions">
              <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">
                Ingresar al sistema
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <a href="#como-funciona" className="lp-btn lp-btn-ghost lp-btn-lg">Ver flujo</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-foot-top">
            <div>
              <div className="lp-foot-brand">
                <img src="/unprg-logo.png" alt="UNPRG" style={{ height: '56px' }} />
                <img src="/logo_fachse.png" alt="FACHSE" style={{ height: '56px' }} />
                <div className="nm">Sílabo<span>.AI</span></div>
              </div>
              <p style={{ color: '#8896ae', maxWidth: '360px', lineHeight: 1.55 }}>
                Plataforma de apoyo a la elaboración de sílabos de la Escuela Profesional de Educación,
                FACHSE — Universidad Nacional Pedro Ruiz Gallo.
              </p>
            </div>

            <div className="lp-foot-col">
              <h4>Producto</h4>
              <ul>
                <li><a href="#como-funciona">Cómo funciona</a></li>
                <li><a href="#modulos">Beneficios</a></li>
                <li><a href="#faq">Preguntas frecuentes</a></li>
                <li><a href="#ingresar">Ingresar</a></li>
              </ul>
            </div>

            <div className="lp-foot-col">
              <h4>Institución</h4>
              <ul>
                {/* TODO: reemplazar "#" con URL oficial de UNPRG */}
                <li><a href="https://www.unprg.edu.pe/univ/portal/index.php">UNPRG — Lambayeque</a></li>
                {/* TODO: reemplazar "#" con URL oficial de FACHSE */}
                <li><a href="https://fachse.unprg.edu.pe/">FACHSE</a></li>
                {/* TODO: reemplazar "#" con URL de la Escuela Profesional de Educación */}
                <li><a href="https://fachse.unprg.edu.pe/escuelas-profesionales/educaci%C3%B3n">Escuela Profesional de Educación</a></li>
                {/* TODO: cambiar correo de contacto si es diferente */}
                <li><a href="mailto:carvascri23@gmail.com">Contacto</a></li>
              </ul>
            </div>
          </div>

          <div className="lp-foot-bottom">
            <div className="lp-foot-credit">
              © 2026 Sílabo.AI · Desarrollado por <b>Esgardo Mechan Yaipen</b>
            </div>
            <div className="lp-social" aria-label="Redes del desarrollador">
              <a href="https://github.com/Esgard1101" aria-label="GitHub" title="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.73.8 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.67.41.35.78 1.05.78 2.12 0 1.53-.01 2.77-.01 3.14 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" /></svg>
              </a>
              <a href="https://www.linkedin.com/in/esgardo-enrique-mechán-yaipén-7031a2222" aria-label="LinkedIn" title="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.2 8.5h4.6V23H.2V8.5zm7.6 0h4.4v2h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 7v7.87h-4.58v-6.98c0-1.66-.03-3.8-2.31-3.8-2.31 0-2.66 1.81-2.66 3.68V23H7.8V8.5z" /></svg>
              </a>
              <a href="https://www.instagram.com/esgard.m.y" aria-label="Instagram" title="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2.5" y="2.5" width="19" height="19" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
