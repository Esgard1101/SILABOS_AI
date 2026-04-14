# Informe para Cliente - Despliegue y Operacion de SILABOS.AI

Fecha: 2026-04-13

## 1. Objetivo

Este informe resume la infraestructura necesaria para operar SILABOS.AI en produccion, los servicios incluidos en la puesta en marcha y la propuesta mensual para mantener el sistema disponible, seguro y funcional para los usuarios finales.

## 2. Alcance del servicio

La operacion del sistema contempla los siguientes componentes:

- Backend de la aplicacion en un VPS administrado.
- Publicacion del frontend en el hosting del cliente o en el entorno web definido para produccion.
- Base de datos PostgreSQL operativa para almacenar usuarios, cursos, silabos, documentos y configuraciones del sistema.
- Integracion con servicios de inteligencia artificial para generar silabos, sugerir enfoques metodologicos y asistir procesos academicos.
- Configuracion de acceso seguro por HTTPS, variables de entorno, monitoreo basico y soporte tecnico inicial.

## 3. Servicios necesarios y por que son indispensables

### 3.1 Hosting administrado del backend

El backend necesita un servidor siempre encendido, con acceso publico y conexion segura para que docentes y administradores puedan usar el sistema en cualquier momento.

Sin este servicio:

- la aplicacion solo funcionaria en entorno local de desarrollo;
- no existiria una API publica para login, generacion y consulta de silabos;
- no se podria conectar el frontend del cliente con la logica real del sistema.

### 3.2 Base de datos PostgreSQL

La base de datos es necesaria para conservar la informacion del sistema de forma persistente y consistente.

Sin este servicio:

- no se podrian guardar usuarios, programas, cursos ni silabos;
- se perderia el historial de trabajo;
- no seria posible sostener la operacion multiusuario.

### 3.3 Servicios de inteligencia artificial

La capa de IA es parte central del producto porque permite generar contenido academico, asistir sugerencias metodologicas y apoyar procesos de analisis.

Sin este servicio:

- el sistema perderia su funcionalidad principal de generacion automatizada;
- el flujo se reduciria a formularios manuales sin apoyo inteligente;
- se afectaria directamente la propuesta de valor del sistema.

### 3.4 Hosting web del frontend

El frontend necesita estar publicado en un entorno accesible por navegador para que los usuarios puedan ingresar al sistema.

Sin este servicio:

- el cliente no tendria una interfaz publica para operar la plataforma;
- no se podria usar el sistema desde fuera del equipo de desarrollo.

## 4. Propuesta economica mensual

Los siguientes montos ya consideran la administracion tecnica del servicio y el margen operativo necesario para asegurar continuidad, soporte y mantenimiento.

| Concepto | Monto mensual propuesto | Alcance |
|---|---:|---|
| Hosting administrado del backend | 15 USD | VPS, despliegue, configuracion, seguridad basica y soporte operativo |
| Presupuesto operativo de IA | 12 USD | Consumo inicial de APIs de IA y control de uso |
| Hosting frontend en cPanel | 0 USD | Cubierto por el cliente si ya cuenta con el servicio |

Total mensual estimado para operacion base: 27 USD

Notas:

- Si el cliente ya dispone de hosting cPanel, no se agrega un costo adicional por ese componente.
- Si se requiere contratar un nuevo hosting para frontend, ese servicio se cotiza aparte.
- El consumo de IA se revisa mensualmente y puede ajustarse segun uso real.

## 5. Gastos ya realizados

### 5.1 Pago inicial de infraestructura

Ya se realizo el pago del primer mes de VPS por 15 USD para habilitar la etapa inicial de despliegue, pruebas y estabilizacion del sistema.

Este gasto fue necesario porque:

- permitio contar con un entorno real de servidor;
- hizo posible publicar el backend fuera del entorno local;
- habilito pruebas reales de conectividad, seguridad, rutas publicas y disponibilidad.

## 6. Justificacion de la necesidad tecnica del servicio

El sistema no puede operar de forma profesional solo con codigo fuente. Para que SILABOS.AI funcione como plataforma utilizable por el cliente, se requiere combinar:

- infraestructura publica para exponer la aplicacion;
- base de datos persistente para almacenar informacion institucional y academica;
- servicios de IA para ejecutar la funcionalidad principal del producto;
- configuracion tecnica de despliegue, seguridad, dominio y conexion entre frontend y backend.

En otras palabras, estos servicios no son accesorios: son parte de la construccion operativa minima para que el sistema exista, responda y pueda ser utilizado en produccion.

## 7. Observaciones comerciales

- La propuesta mensual cubre la operacion base del sistema en su etapa actual.
- Nuevas funcionalidades, ampliaciones de alcance, migraciones mayores o aumentos de consumo pueden requerir una actualizacion de la cotizacion.
- Se recomienda revisar mensualmente consumo de IA, crecimiento de datos y carga del servidor para mantener la operacion estable.

## 8. Puntos por confirmar antes de emitir la version final al cliente

- Si la base de datos definitiva seguira en la infraestructura actual o si se migrara a una instancia propia dentro del VPS.
- Si el frontend definitivo del cliente se mantendra en cPanel o si se publicara en otro servicio.
- Si existen otros gastos ya asumidos que deban figurar en la version comercial final.
