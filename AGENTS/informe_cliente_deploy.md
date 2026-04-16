# Informe para Cliente - Infraestructura y Operacion de SILABOS.AI

Fecha: 2026-04-14

## 1. Objetivo

El presente informe describe la infraestructura operativa requerida para mantener SILABOS.AI en produccion, los servicios incluidos en la administracion tecnica de la plataforma y la propuesta economica mensual para asegurar disponibilidad, seguridad, continuidad y soporte.

## 2. Arquitectura operativa actual

La solucion ha sido organizada sobre una arquitectura separada por funciones, lo que permite mayor estabilidad y mejor control tecnico.

| Componente | Ubicacion operativa | Funcion principal |
|---|---|---|
| Frontend | Hosting cPanel del cliente | Interfaz web accesible para docentes y usuarios finales |
| Backend | VPS administrado | API, autenticacion, logica de negocio, generacion y gestion de silabos |
| Base de datos PostgreSQL | VPS administrado | Almacenamiento persistente de usuarios, cursos, silabos, documentos y configuraciones |
| Servicios de IA | Integracion externa controlada | Generacion automatizada de contenido y asistencia academica |

## 3. Alcance del servicio mensual

La operacion del sistema contempla:

- hosting y administracion del backend;
- administracion de la base de datos PostgreSQL;
- conexion segura entre frontend, backend y base de datos;
- configuracion y resguardo de variables de entorno;
- monitoreo basico, soporte tecnico y atencion inicial de incidencias;
- mantenimiento operativo para sostener el funcionamiento del sistema en produccion.

## 4. Por que cada componente es necesario

### 4.1 Backend en VPS administrado

El backend requiere un servidor dedicado y siempre disponible para ejecutar la API, procesar autenticacion, reglas del sistema, generacion de silabos y operaciones internas.

Sin este servicio:

- la aplicacion quedaria limitada a desarrollo local;
- no existiria una API publica para atender usuarios;
- el frontend no podria conectarse a la logica real del sistema.

### 4.2 Base de datos PostgreSQL en el VPS

La base de datos es necesaria para almacenar de forma persistente toda la informacion critica del sistema.

Sin este servicio:

- no se podrian guardar usuarios, programas, cursos ni silabos;
- no existiria historial ni trazabilidad de trabajo;
- no seria posible operar en modalidad multiusuario.

### 4.3 Servicios de inteligencia artificial

La capa de IA forma parte central de la propuesta de valor de SILABOS.AI.

Sin este servicio:

- el sistema perderia su capacidad de generacion automatizada;
- los flujos se volverian manuales;
- se reduciria de forma importante el valor funcional de la plataforma.

### 4.4 Hosting del frontend

El frontend publicado permite que los usuarios accedan al sistema mediante navegador.

Sin este servicio:

- no existiria una interfaz utilizable para el cliente;
- el sistema no podria ponerse a disposicion de los usuarios finales.

## 5. Criterio tecnico sobre la base de datos

Se ha definido como arquitectura recomendada alojar la base de datos PostgreSQL en el mismo entorno administrado del backend y no en la base de datos del hosting cPanel.

La razon es operativa y tecnica:

| Criterio | PostgreSQL en VPS administrado | PostgreSQL en cPanel compartido |
|---|---|---|
| Control tecnico | Alto, con administracion completa del entorno | Limitado por restricciones del hosting |
| Integracion con backend | Directa y optimizada | Dependiente de configuraciones del hosting |
| Rendimiento | Mejor al operar en infraestructura dedicada | Variable al compartir recursos |
| Escalabilidad | Mayor capacidad de ajuste tecnico | Menor flexibilidad |
| Administracion y respaldo | Centralizada | Parcial y dependiente del proveedor |

Por ello, la base de datos en el VPS ofrece una operacion mas estable, segura y controlable para un sistema que ya trabaja con procesos de backend, autenticacion, almacenamiento academico y generacion asistida.

## 6. Propuesta economica mensual

La siguiente propuesta ya considera la infraestructura actualmente operativa y el servicio administrado necesario para sostenerla correctamente.

| Concepto | Monto mensual propuesto | Incluye |
|---|---:|---|
| Hosting administrado de aplicacion y base de datos | 17 USD | VPS, backend, base de datos PostgreSQL, configuracion, administracion, seguridad basica y soporte operativo |
| Presupuesto operativo de IA | 12 USD | Consumo inicial de servicios de IA y control de uso |
| Hosting frontend en cPanel | 0 USD | Cubierto por el cliente al contar ya con el servicio |

| Resumen mensual | Monto |
|---|---:|
| Total estimado mensual | 29 USD |

## 7. Justificacion del ajuste del servicio backend a 17 USD

El ajuste de 15 USD a 17 USD responde a que el entorno administrado ya no solo cubre el backend de la aplicacion, sino tambien la base de datos PostgreSQL operando en el VPS.

Este monto contempla:

- administracion de la aplicacion;
- administracion de la base de datos;
- monitoreo basico del entorno;
- configuracion y mantenimiento de conectividad interna;
- soporte tecnico operativo;
- reduccion de dependencia de terceros para la capa de datos.

En otras palabras, no se trata solo del alquiler de una maquina virtual, sino de un servicio administrado que sostiene el funcionamiento integral del sistema.

## 8. Gastos ya realizados

| Gasto ya ejecutado | Monto | Justificacion |
|---|---:|---|
| Primer mes de VPS | 15 USD | Habilitacion de servidor real, despliegue inicial, pruebas de conectividad, validacion de operacion y estabilizacion |
| Creditos base para servicios de IA | 5 USD | Reserva inicial para pruebas funcionales, validacion de generacion automatizada, ajuste de prompts y verificaciones tecnicas del flujo asistido por inteligencia artificial |

Los gastos ya realizados responden a necesidades tecnicas concretas de puesta en marcha.

El pago del VPS fue necesario para habilitar un entorno real de produccion donde desplegar la aplicacion, validar conectividad, asegurar disponibilidad publica y completar las pruebas de estabilizacion del backend y la base de datos.

De igual forma, la reserva inicial de creditos para servicios de inteligencia artificial fue necesaria para ejecutar pruebas reales del motor de generacion, confirmar el funcionamiento del flujo automatizado y ajustar el comportamiento del sistema en condiciones operativas. Sin estas validaciones, no habria sido posible comprobar de forma confiable la funcionalidad principal de SILABOS.AI antes de su salida a produccion.

## 9. Beneficios de la arquitectura adoptada

| Beneficio | Impacto para el cliente |
|---|---|
| Menor dependencia de servicios externos para la base de datos | Mayor control operativo |
| Integracion directa entre backend y base de datos | Mejor estabilidad y menor complejidad tecnica |
| Infraestructura centralizada | Soporte y mantenimiento mas ordenados |
| Mejor capacidad de administracion | Mayor previsibilidad para crecimiento y soporte |

## 10. Conclusiones

SILABOS.AI requiere infraestructura operativa real para funcionar como plataforma utilizable en produccion. La solucion implementada aprovecha el VPS administrado para alojar tanto el backend como la base de datos PostgreSQL, mientras el frontend permanece publicado en el entorno web del cliente.

La propuesta mensual de 29 USD cubre la operacion base del sistema en su estado actual, incluyendo la administracion del backend, la base de datos y el presupuesto inicial de inteligencia artificial. Esta arquitectura mejora el control tecnico, evita dependencias innecesarias y permite sostener la plataforma con mejores condiciones de continuidad y soporte.
