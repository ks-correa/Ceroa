# EP-16 — Resumen mensual de progreso

Estado al 20 de septiembre de 2026: **flujo mensual implementado; épica parcialmente cerrada**. La vista, la API, el registro prospectivo de saldos, la comparación y los permisos BASIC/FULL funcionan en las pruebas automatizadas. No se reconstruye historial anterior que Ceroa nunca almacenó. Algunos indicadores siguen sin fuente histórica fiable y no se muestran.

## Acceso y alcance

Desde **Inicio → Ver resumen mensual** se abre una vista secundaria. La navegación principal sigue siendo Inicio | Deudas | Estrategia | Simular | Perfil. El selector permite consultar meses anteriores hasta el mes actual. Consultar o cambiar de mes solo lee datos; no modifica deudas, pagos, estrategia ni suscripción.

La API es `GET /api/v1/monthly-progress?year=2026&month=9`. Requiere sesión autenticada, identifica al usuario en el servidor y acepta únicamente año y mes, no rangos ni `userId`. Usa `America/Bogota` para los límites del periodo. Un mes futuro o inválido se rechaza. La respuesta es un DTO, no una entidad JPA.

## Fuente histórica y política de cambios

EP-10 conservaba pagos editables o eliminables y las deudas solo conservaban el saldo actual. Esto impedía reconstruir con seguridad saldos de meses anteriores. La migración Flyway `V13__monthly_progress_history.sql` crea `monthly_balance_history` para registrar, desde su aplicación en adelante, el saldo agregado confirmado del usuario y los cambios de pagos/cierres. `MonthlyHistoryService` escribe en la misma transacción que la mutación financiera: si esta falla, el registro histórico también se revierte.

Antes de la primera mutación observada se guarda una línea base con el saldo conocido **en ese momento**, sin fecharla retroactivamente. Luego se guarda el saldo confirmado tras crear, editar o eliminar una deuda o un pago. Las correcciones de pagos se imputan al mes **en que se confirman**, mediante un delta positivo o negativo; no reescriben el mes original. `recorded_at` es la fecha de observación del servidor, no la fecha editable del pago.

La ausencia de movimientos entre dos observaciones mantiene el último saldo confirmado. Para mostrar un mes completo debe existir una observación anterior al inicio de ese mes. Por ejemplo, si la primera observación ocurre en septiembre, septiembre puede indicar `INSUFFICIENT_DATA`; octubre puede utilizar ese saldo como apertura. La comparación de octubre con septiembre seguirá sin estar disponible si septiembre carece de apertura fiable.

## Indicadores y estados

| Indicador | Fuente o estado |
| --- | --- |
| Deuda inicial | Último saldo confirmado anterior al inicio del mes. |
| Deuda final | Último saldo confirmado antes del inicio del mes siguiente; para el mes actual, saldo confirmado disponible. |
| Total pagado | Suma neta de altas, ediciones y eliminaciones de pagos confirmadas durante el mes observado. Puede ser negativa por correcciones. No incluye simulaciones ni pagos de suscripción. |
| Pagos registrados | Conteo neto de altas y eliminaciones de pagos observadas en el mes. Disponible solo en FULL. |
| Deudas cerradas | Transiciones netas a estado pagado causadas por pagos observados en el mes. Disponible solo en FULL. |
| Capital reducido | No disponible: no hay separación histórica demostrable entre capital, intereses y cambios manuales del saldo. |
| Interés registrado o proyectado | No disponible como dato mensual histórico fiable; ambos campos son `null`. |
| Progreso de estrategia | No disponible como porcentaje mensual histórico fiable; el campo es `null`. |

`SUCCESS` indica que existen saldos de apertura y cierre fiables. `EMPTY` indica que no hay observaciones disponibles. `INSUFFICIENT_DATA` indica que hay observaciones, pero no una apertura fiable. La interfaz no transforma campos ausentes en `$0` ni en `0 %`. Las cantidades monetarias visibles usan COP.

La respuesta incluye `comparison` para el mes inmediatamente anterior. Si ambos meses tienen estado `SUCCESS`, el backend calcula la diferencia de deuda final, pagos y conteos autorizados. Si falta historial comparable, devuelve el estado anterior y diferencias `null`; React solo las presenta.

## Permisos

`MonthlyProgressService` consulta `PlanAccessService` en cada lectura. Con `BASIC`, Cero recibe saldos y pagos netos, pero los conteos avanzados y sus diferencias llegan como `null`. Con `FULL`, Ceroa Plus vigente recibe también esos conteos. Una cancelación programada conserva FULL mientras el permiso siga vigente; al expirar, una lectura nueva vuelve a BASIC. El CTA abre la vista de Plus y no cambia el plan. Ocultar contenido solo en React no sustituye el filtrado del backend.

## Verificación realizada

- Desde `backend`, `.\mvnw.cmd test -q`: suite backend correcta tras la implementación.
- `MonthlyProgressServiceTest`: saldos, comparación, ausencia de historial y nivel BASIC.
- `MonthlyProgressIntegrationTest`: registro real de deuda y pago en H2, lectura sin mutación, aislamiento entre dos usuarios y filtrado BASIC/FULL. La prueba inserta una observación anterior **solo en la base de tests** para verificar el caso de mes completo; el producto no hace ese relleno.
- `frontend/npm run test -- --run`: 150 pruebas correctas.
- `frontend/npm run lint` y `frontend/npm run build`: correctos.

No se verificó la migración sobre una instancia PostgreSQL accesible con las credenciales del proyecto. El servicio PostgreSQL local respondió, pero rechazó las credenciales de desarrollo; Docker no estaba activo. Antes de desplegar, hay que ejecutar Flyway y una prueba de creación, pago y consulta contra una base PostgreSQL aislada del entorno de destino.

## Estado de las historias

| Historia | Estado | Límite pendiente |
| --- | --- | --- |
| HU-061 — Consultar progreso mensual | Parcial | Saldos y pagos se muestran cuando hay historial; capital, intereses y progreso histórico permanecen no disponibles. |
| HU-062 — Comparar con el mes anterior | Implementada para meses comparables | Requiere dos meses con aperturas fiables; no fabrica el anterior. |
| HU-063 — Restringir detalle por plan | Implementada | Falta validación final en PostgreSQL con una suscripción real vigente y expirada. |

Por estos límites, **no se declara EP-16 COMPLETADA** según la definición de terminado original. El flujo ya puede acumular historial desde ahora para los próximos meses.

## Archivos principales

- Backend: `MonthlyProgressController.java`, `MonthlyProgressResponse.java`, `MonthlyProgressService.java`, `MonthlyHistoryService.java`, `MonthlyBalanceHistory.java`, `DebtService.java` y `PaymentService.java`.
- Migración: `backend/src/main/resources/db/migration/V13__monthly_progress_history.sql`.
- Frontend: `frontend/src/components/monthly/MonthlyProgressView.tsx`, `frontend/src/services/monthlyProgressService.ts`, `DashboardView.tsx` y `AppScreenRouter.tsx`.
- Pruebas: `MonthlyProgressServiceTest.java` y `MonthlyProgressIntegrationTest.java`.
