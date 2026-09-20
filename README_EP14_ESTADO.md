# EP-14 — Estado de implementación y pendientes

Auditoría del código al 20 de septiembre de 2026. Este archivo complementa el README principal y distingue **implementado en código**, **probado con mocks** y **pendiente de cierre**. No equivale a una contratación real verificada.

**Estado de cierre:** ninguna de las HU-055, HU-056, HU-057 o HU-058 está verificada al 100 % de extremo a extremo. Todas necesitan al menos las pruebas pendientes indicadas abajo. Esto no significa que todas sus tareas carezcan de pruebas: TT-057.1 y TT-057.4 tienen una prueba de React y partes de TT-058 tienen pruebas backend con mocks. Una tarea puede estar implementada o probada de forma aislada sin que su historia esté cerrada. En este documento, “implementada” describe el código existente; **no** significa “HU completada”.

## Respuesta directa: ¿qué falta de HU-058?

Las cuatro tareas TT-058 tienen una implementación inicial, pero **ninguna está cerrada de extremo a extremo**:

| Tarea | Lo que ya existe | Lo que falta para cerrarla |
|---|---|---|
| TT-058.1 — Crear suscripción desde backend | `PlusSubscriptionService.checkout()` valida periodicidad, toma el precio de configuración backend, usa el usuario autenticado, crea `/preapproval` y guarda la referencia. Hay prueba con `MockRestServiceServer`. | Configurar precios y credenciales reales de un mismo ambiente; probar contra Mercado Pago sandbox y PostgreSQL. Resolver el caso de respuesta exitosa del proveedor seguida de rollback o fallo al guardar: podría quedar una suscripción remota sin referencia local. Probar doble clic y reintento reales bajo concurrencia. |
| TT-058.2 — Redirección y retorno | React usa el `init_point` validado por backend y `FRONTEND_URL` como `back_url`; al regresar consulta `/plus/subscription`. | Probar el recorrido completo en navegador con Mercado Pago. Sustituir o reforzar la marca `sessionStorage` para que el retorno sea fiable si cambia la pestaña, se pierde la sesión del navegador o se abre directamente `back_url`. Comprobar estados de retorno y accesibilidad en móvil, tableta y escritorio. |
| TT-058.3 — Estados normalizados | Backend mapea `pending`, `authorized`, `rejected`, `cancelled/canceled` y otros a `PENDING`, `ACTIVE`, `REJECTED`, `CANCELLED`, `ERROR`; la vista muestra mensajes separados. Hay pruebas de mapeo con respuestas simuladas. | Confirmar con respuestas reales cuáles estados y eventos entrega Mercado Pago para este producto y completar los casos que correspondan. Añadir pruebas de UI para pendiente, activo, rechazado, cancelado, error y retorno; la prueba actual de React solo comprueba el cambio de precio. |
| TT-058.4 — Permisos solo tras ACTIVE | `refresh()` consulta `/preapproval/{id}`, compara ID, referencia, monto, moneda y frecuencia, y solo entonces actualiza `users.plan`; EP-13 sigue leyendo ese plan. Las pruebas comprueban que `PENDING` y otros estados no conceden Plus. | Hacer que el servicio central de EP-13 derive o concilie el permiso desde una suscripción `ACTIVE` persistida, en vez de depender únicamente de la copia `users.plan`. Probar con PostgreSQL la activación y la desactivación, la tercera deuda, Simular y el detalle de estrategia después de una confirmación real. |

### Webhook e idempotencia asociados a HU-058

- **Existe:** endpoint público con validación HMAC de `x-signature`, consulta posterior al proveedor, referencia externa única e índice parcial que impide dos suscripciones locales `PENDING`/`ACTIVE` por usuario. Repetir una respuesta simulada no crea otra fila.
- **Falta:** prueba de webhook firmado real y de entrega duplicada concurrente contra PostgreSQL. No hay tabla de eventos procesados; el código reconcilia el estado actual, pero no registra el ID de cada notificación. Si el webhook llega antes de que el checkout confirme la transacción local, `findByProviderId` no encuentra la suscripción y el endpoint responde éxito; se necesita una estrategia de conciliación/reintento para no perder esa confirmación. También falta verificar que el proveedor acepte la clave de idempotencia enviada al crear la suscripción.
- **Riesgo de datos:** `users.plan` y `plus_subscriptions.status` pueden divergir si falla una actualización o hay datos anteriores. El criterio de EP-13 requiere que Plus dependa de la suscripción activa confirmada.

## Estado por historia y tarea

| HU / tarea | Estado | Evidencia y pendiente |
|---|---|---|
| HU-055 / TT-055.1 — oferta tras configuración | Implementada en código | `InitialSetupWizard.tsx` marca el fin de configuración; `App.tsx` abre una oferta de sesión una sola vez. Falta prueba automatizada del recorrido completo. |
| HU-055 / TT-055.2 — beneficios vigentes | Implementada en código | El modal consulta `/plus/capabilities`, que usa `PlanAccessService.catalog(PLUS)`. Falta probar fallo de carga y accesibilidad completa del diálogo. |
| HU-055 / TT-055.3 — cerrar, seguir en Cero, mejorar | Implementada en código | Hay X, Escape y dos acciones; cerrar no llama a checkout. Falta prueba de que Inicio sigue disponible y el plan no cambia tras cerrar. |
| HU-056 / TT-056.1 — CTA desde Perfil | Existía y se reutiliza | `ProfileView.tsx` muestra el plan de EP-13 y navega a la vista Plus. Falta prueba de integración de ese recorrido. |
| HU-056 / TT-056.2 — comparativa | Implementada en código | `SubscriptionView.tsx` obtiene las capacidades de Cero y Plus del backend. Falta prueba de que abandonar no crea suscripción. |
| HU-056 / TT-056.3 — navegar a contratación | Implementada en código | Perfil y el modal llevan a `subscription`; el selector está en esa vista. Falta prueba de navegación completa. |
| HU-057 / TT-057.1 — selector exclusivo | Implementada y probada en React | Radios Mensual/Anual con selección única. |
| HU-057 / TT-057.2 — precio/condiciones vigentes | Implementada en código | `/plus/offers` usa `PLUS_MONTHLY_PRICE`, `PLUS_YEARLY_PRICE` y `PLUS_CURRENCY`; no hay precios definitivos en React. Faltan valores comerciales aprobados y validación con el proveedor. |
| HU-057 / TT-057.3 — renovación automática visible | Implementada en código | Texto previo al checkout en `SubscriptionView.tsx`. Falta revisión visual y de accesibilidad en dispositivos. |
| HU-057 / TT-057.4 — actualizar al cambiar modalidad | Implementada y probada en React | La selección actualiza el precio mostrado desde las ofertas recibidas. Falta prueba integral de que el backend cobra exactamente la modalidad seleccionada en ambos ciclos. |
| HU-058 / TT-058.1–TT-058.4 | Parcial | Detalle de pendientes en la tabla inicial. |

## Criterios de aceptación: lectura honesta

| HU | Criterios cubiertos en código | Criterios pendientes de comprobación |
|---|---|---|
| 055 | CA-01 a CA-05: oferta, beneficios, acciones y continuidad Cero | Flujo completo posterior a onboarding, accesibilidad del modal y no reaparición en navegación real. |
| 056 | CA-01 a CA-05: plan en Perfil, CTA, comparativa y navegación sin alta al consultar | Integración Perfil → comparativa → salir/continuar. |
| 057 | CA-01 a CA-05: dos radios, precio servidor, renovación y actualización | Precio comercial aprobado, dos ciclos reales y revisión responsive. |
| 058 | CA-01 a CA-08: adaptador, redirección, estados, confirmación servidor y datos de periodicidad | Contratación real, webhook real, PostgreSQL, concurrencia, retorno y permisos EP-13 completos. CA-07 no debe considerarse cerrado mientras el permiso dependa solo de `users.plan`. |

## Configuración y pruebas necesarias para cerrar EP-14

1. Definir precios aprobados y configurar `PLUS_MONTHLY_PRICE`, `PLUS_YEARLY_PRICE`, `PLUS_CURRENCY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y `FRONTEND_URL` pública HTTPS. Registrar el tópico `subscription_preapproval` en Mercado Pago. No hay `.env` local configurado.
2. Ejecutar Flyway V11 y pruebas de restricciones/concurrencia sobre PostgreSQL real. Docker no estaba disponible en la última verificación.
3. Ejecutar compras de prueba mensual y anual en sandbox: pendiente, autorizada, rechazada, cancelada, retorno y webhook duplicado; inspeccionar que no se guardan datos sensibles y que un retorno visual nunca activa Plus.
4. Cerrar la conciliación webhook/checkout y la derivación de permisos EP-13 descritas arriba; repetir tests de deuda, Simular y estrategia.
5. Ejecutar pruebas de navegador y accesibilidad para oferta, Perfil, selector y retorno; luego repetir `mvn test`, `npm test`, `npm run lint` y `npm run build`.

La última ejecución registrada antes de esta auditoría pasó 199 pruebas backend y 148 frontend, TypeScript y build. Esas cifras prueban el código cubierto por las suites; **no prueban Mercado Pago real ni la migración en PostgreSQL**. EP-15 (cancelación y administración completa) sigue fuera de alcance.
