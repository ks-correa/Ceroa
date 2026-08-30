# Auditoría y refactorización de Ceroa

Fecha de revisión: 30 de agosto de 2026.

## Alcance

Se revisaron el frontend React/TypeScript/Tailwind, el cliente REST, el backend Spring Boot, las entidades y repositorios JPA, las migraciones Flyway y las pruebas. La refactorización conserva el diseño, el modo oscuro, el comportamiento responsive y las cinco secciones principales existentes.

## Hallazgos y resolución

### Crítico

| Hallazgo | Riesgo | Resolución |
|---|---|---|
| Autenticación basada en cookie con CSRF deshabilitado | Una página externa podía intentar ejecutar operaciones con la sesión del usuario | CSRF por cookie habilitado, endpoint de inicialización para la SPA, encabezado `X-XSRF-TOKEN` en el cliente y pruebas de integración |
| El límite de dos deudas del Plan Cero podía sufrir una carrera entre solicitudes concurrentes | Dos altas simultáneas podían superar una regla protegida por backend | Bloqueo pesimista de la fila de usuario dentro de la transacción de creación; el frontend mantiene la guía visual |
| Actualizaciones concurrentes de saldos sin control de versión | Un pago simultáneo podía sobrescribir cambios de otro pago | `@Version` en `Debt`, migración de esquema y respuesta HTTP 409 para conflictos |

### Alto

| Hallazgo | Riesgo | Resolución |
|---|---|---|
| `AppContext` contenía estado local del simulador, overlays, layout, temporizador, datos y orquestación | Acoplamiento alto y ciclos de vida difíciles de mantener | Simulador y estrategia pasaron a hooks de feature; layout, overlays y toast se aislaron; agregados financieros y formato salieron a utilidades puras |
| Calendario monolítico con servicio artificial, fechas y mensajes quemados | Datos incorrectos, duplicación de consultas y fallos al cambiar entre meses | Composición `CalendarView` + `CalendarGrid` + `CommitmentPanel`, hook `useCalendar` y utilidades puras basadas en deudas/pagos reales |
| Solicitudes asíncronas sin estados ni protección ante respuestas antiguas | Race conditions y UI inconsistente | Estados loading/error/empty, identificadores de solicitud y cancelación lógica en carga global, estrategia y simulación |
| Formularios de acceso mezclaban validación, estado y presentación | Duplicación y errores difíciles de mostrar | Validación pura y hooks `useLoginForm`/`useRegisterForm`; errores de API conservados y presentados |
| Acciones de suscripción y exportación simulaban éxito | La UI afirmaba operaciones que no ocurrieron | Suscripción informa que el proveedor no está conectado; exportación usa la impresión real del navegador para guardar PDF |
| Reglas del perfil financiero incompletas en servidor | Podían persistirse cifras imposibles | Validación de gastos contra ingresos y capacidad disponible contra el remanente, con prueba unitaria |

### Medio

| Hallazgo | Resolución |
|---|---|
| Navegación duplicada entre escritorio y móvil | Fuente única, tipada, con exactamente Inicio, Deudas, Estrategia, Simular y Perfil; las subvistas se asocian a su sección padre |
| Cálculos y formato monetario repetidos | `utils/financial.ts` y `utils/formatters.ts` centralizan valores calculados y su representación |
| Fechas creadas con UTC o supuestos fijos | Utilidades de fecha local, meses reales, años bisiestos, cambio de año y ajuste del día seleccionado |
| Filtro/orden de deudas y agregados del dashboard dentro de JSX | Hooks memoizados de feature (`useDebtFilters`, `useDashboardOverview`) |
| Carga inicial y modales aumentaban el bundle principal | Router declarativo y modales cargados de forma diferida; el chunk principal quedó en 390.60 kB (100.94 kB gzip) |
| Consulta N+1 al contar pagos de la lista de deudas | Agregación única por IDs en `PaymentRepository` e índice compuesto |
| `documentId` aparecía editable pero no se persistía | Campo incorporado a entidad, DTOs, mapeo frontend y migración con índice único parcial |
| Clases Tailwind inexistentes y colores de marca repetidos | Clases inválidas eliminadas; colores oficiales centralizados como variables CSS |
| Estados visuales reutilizables repetidos | `AsyncState` unifica carga, error y reintento donde corresponde |

### Bajo

| Hallazgo | Resolución |
|---|---|
| Imports y propiedades sin uso ocultos por TypeScript permisivo | `strict`, `noUnusedLocals`, `noUnusedParameters` y tipos oficiales de React habilitados |
| Botones de icono y formularios sin nombres/asociaciones suficientes | `aria-label`, `htmlFor`, roles de diálogo, estados disabled y controles de teclado añadidos en los flujos modificados |
| Valores de preferencias y datos iniciales repetidos | Constantes predeterminadas centralizadas |

## Decisiones arquitectónicas

- No se impuso una migración masiva de carpetas: los módulos actuales ya representan features y se separaron por responsabilidad dentro de ellas.
- No se dividieron componentes únicamente por cantidad de líneas. Las vistas extensas que permanecen son principalmente presentacionales.
- No se agregó una librería de estado, consultas, formularios ni componentes. Los hooks, servicios y utilidades existentes cubren el alcance sin aumentar complejidad.
- `AppContext` conserva únicamente el estado compartido por varias áreas y la fachada de acciones comunes. El estado del simulador y de comparaciones remotas es local a sus features.
- Calendario deriva sus compromisos del estado financiero ya cargado; no mantiene un segundo origen de verdad ni duplica solicitudes.

## Verificación final

- Frontend: `npm run lint` (TypeScript estricto) aprobado.
- Frontend: `npm run build` aprobado, 1,727 módulos transformados.
- Backend: `mvnw clean test` aprobado, 8 pruebas, 0 fallos y 0 errores.
- Revisión de whitespace: `git diff --check` aprobada.
- Dependencias añadidas: solo `@types/react` y `@types/react-dom`, necesarias para tipado estricto.

## Alcance funcional declarado, no simulado

OAuth, recuperación de contraseña, proveedor de pagos/suscripciones, notificaciones persistentes y simulación remota siguen siendo integraciones futuras. La interfaz ya no presenta como exitosas las operaciones externas que todavía no existen.
