# Ceroa — Bloque 8: consolidación y verificación

Fecha: 9 de noviembre de 2026, America/Bogota. Alcance: código, datos sintéticos, proveedores simulados y auditoría de lectura del despliegue existente. No se realizaron pagos, comunicaciones reales, publicaciones de workflows, push ni merge.

## A. Estado de Git y despliegue

- Inicio: árbol limpio en `fix/bloque-7-e2e-defects`, HEAD `337802ea68d5c9d3023e326ff77cd56e4a96c955`.
- Trabajo: `fix/bloque-8-security-consolidation`, derivada directamente de ese commit.
- `git fetch origin` al inicio y al cierre: `origin/main` permanece en `ed316f97f5068c0fc1150cc158087e85d1b26547`. Es ancestro de la rama; no existen cambios remotos posteriores que conciliar en esta comprobación.
- Backend desplegado: sus **394 clases** coinciden, byte a byte, con una compilación independiente de `337802e`. No se sustituyó el contenedor existente.
- Frontend desplegado: el contenido de `src` coincide; la única diferencia binaria de `App.tsx` era LF/CRLF. No se modificó el contenedor existente.
- El código nuevo de este bloque **no está desplegado en el entorno actual**.

Auditoría SQLite transaccional de solo lectura en n8n **2.40.7**:

| Comprobación | Resultado |
|---|---:|
| Workflows totales | 30 |
| Activos y publicados | 15 |
| Inactivos y sin publicación | 15 |
| Borradores distintos de su versión publicada | 0 |
| Webhooks registrados | 6 |
| Credenciales | 22 |
| Referencias a credenciales inexistentes | 0 |
| Referencias estáticas a subworkflows inexistentes | 0 |

Los hashes de nodos, conexiones y configuración, sus identificadores de versión y los estados de los **30 workflows** permanecieron iguales entre la lectura inicial y la final. La presencia de un trigger habilitado es inventario de configuración, no prueba de ejecución de su proveedor.

Los cuatro workflows conversacionales tienen diferencias de despliegue respecto a las plantillas portables: prevalidación Supabase en el orquestador, descripciones de delegación, serialización del parser y ausencia deliberada del cliente MCP público sin configurar. Se conservan en `integrations/n8n/block8-runtime-profile.json`, sin asociaciones de credenciales. Al aplicar el perfil a las cuatro plantillas, nodos y conexiones coinciden con el runtime, normalizando orden de propiedades, posiciones y credenciales. El perfil no publica ni activa nada; las credenciales se deben enlazar separadamente. No debe aplicarse una plantilla portable cruda sobre el runtime.

Evidencia: [inventario](benchmarks/block8/n8n-runtime.json), [comparación de despliegue](benchmarks/block8/deployment-comparison.json). No hay un snapshot E2E anterior inmutable en Git que permita probar identidad histórica más allá de esta conciliación y de las regresiones ejecutadas.

## B. Revisión de seguridad del grounding

Se reprodujo la debilidad de `337802e` ejecutando las once pruebas nuevas de `FinancialClaimGroundingTest` contra una copia independiente de ese commit: **10 fallaban** porque se aceptaban afirmaciones que debían rechazarse. La misma clase pasa sus **11 pruebas** en el código final.

Corrección `bfb04b6`:

- La coincidencia literal ya no basta para los conceptos cubiertos: se comprueban campo financiero, contexto de la línea, moneda y modalidad explícita de tasa.
- Página, fecha, identificador interno y referencia enmascarada no se intercambian con saldo, cuota, pago mínimo o tasa.
- Las referencias explícitas `{{fN}}`, la sustitución automática y el fallback conservador pasan la comprobación contextual. El fallback omite referencias indebidas, además de cifras inventadas.
- Se impide fundamentar parcialmente una cifra mayor con un dígito de otra evidencia.
- Los operandos documentales monetarios requieren moneda explícita compatible. Se revisan también los operandos de cálculos encadenados; no se permite mezclar un total documental con una cifra estructurada arbitraria para eludir la comprobación.
- Los valores documentales ambiguos entre archivos requieren procedencia suficiente; el contexto de periodo se coteja con los metadatos recuperados. Los cálculos de varias fuentes conservan su linaje.
- Se conservan un dígito legítimo, cuentas enmascaradas usadas como referencia, fechas documentales, tasas válidas y comparaciones documentales válidas. Los fixtures monetarios de integración ahora indican COP, en vez de presuponer una moneda a partir de `$`.

| Riesgo solicitado | Evidencia controlada | Resultado |
|---|---|---|
| Número atribuido a otro campo | `amountCannotChangeFieldOrCurrency`, `pageCannotBecomeBalanceEvenThroughAnExplicitReference` | Rechazado |
| Modalidad de tasa distinta | `rateCannotChangeModality`; pruebas de normalización y hechos tipados | Rechazado en los casos cubiertos |
| Monedas incompatibles o desconocidas | `arithmeticRejectsUnknownOrIncompatibleCurrenciesAndChainedBypasses` | Rechazado |
| Página presentada como importe | Caso de página con literal y fID explícito | Rechazado |
| Cuenta enmascarada presentada como saldo | `maskedReferenceCannotBecomeAnAmountButRemainsDisplayable` | Rechazado; identificación legítima conservada |
| Periodos y documentos distintos | `ambiguousDocumentsAndPeriodsCannotGroundABareClaim`; comparación válida de agosto/septiembre | Ambigüedad rechazada; comparación válida conservada |
| Propietario diferente | `HybridDocumentIntegrationTest`, `AssistantIntegrationTest`, `AgentRuntimeTest` | Lectura/alcance ajeno rechazados |
| fID/dID inexistente y referencias fuera de alcance | `invalidReferenceIdsFailClosed`; contratos RAG y de delegación | Rechazados en sus respectivas fronteras |
| Número en instrucciones no confiables | `untrustedInstructionsDoNotBecomeEvidenceEvenWhenTheyMentionALabel`; prueba de inyección documental | No fundamenta la respuesta del caso probado |
| Respuesta parcialmente correcta con cifra inventada | `fallbackOmitsMisattributedAndInventedValues`, reparación de borradores | Cifra no acreditada omitida |

Estas pruebas acreditan los contratos y expresiones cubiertos. La comprobación contextual es conservadora y lexical; no constituye una demostración formal de toda atribución semántica posible en lenguaje libre. No se presenta como certificación universal contra alucinaciones.

## C. Cobertura de operaciones persistentes

PostgreSQL 17 con pgvector se ejecutó en un contenedor desechable con credenciales sintéticas. Cada instalación con migraciones usó **una base distinta**, porque V21 crea configuración también en `public`; dos instalaciones independientes no deben compartir únicamente esquemas de la misma base. No se alteraron migraciones ya publicadas para resolver la configuración de la prueba.

| Funcionalidad | Prueba realizada | Entorno | Resultado | Evidencia |
|---|---|---|---|---|
| Deudas | Alta, validación, edición, recarga y eliminación desde React; lectura HTTP persistida y 404 posterior | Chromium → Spring → PostgreSQL | Aprobado | `frontend/e2e/block8.spec.ts`, recorrido 1 |
| Deudas y planes | CRUD, validaciones por tipo, restricciones Cero/Plus y propietario ajeno | MockMvc → Spring → PostgreSQL real | Aprobado | `DebtIntegrationTest` |
| Pagos | Abono desde React, historial leído por API, reducción de saldo 100.000 → 90.000 y recarga | Chromium → Spring → PostgreSQL | Aprobado | Recorrido 2 |
| Pagos y mora | Capital/intereses, edición/eliminación, pago total, mora y permisos; consistencia de consultas | API/integración y servicios | Aprobado | `PaymentIntegrationTest`, `DashboardIntegrationTest`, `PaymentStatusLifecycleTest` |
| Estrategia | Cambio de radio, escritura HTTP, recarga, lectura posterior y consulta del asistente con estado actualizado | Chromium → Spring → PostgreSQL | Aprobado | Recorrido 3 |
| Estrategia y planes | Prioridades, cambio entre métodos, proyecciones Plus y restricciones Cero | API/integración con PostgreSQL | Aprobado | `StrategyIntegrationTest` |
| Perfil y configuración financiera | Datos permitidos, validaciones, autorización y persistencia; actualización financiera seguida de lectura, actualización inválida que conserva el estado y otro propietario; correo con SMTP local | API/integración con PostgreSQL | Aprobado | `ProfileIntegrationTest`, `integrations/verification/block8-profile-api.mjs`, `profile-api.json` |
| Biblioteca DOCX | Subida, indexación, metadatos, reemplazo, reproceso, versión vigente, duplicados, borrado, invalidación y aislamiento | Spring + PostgreSQL/pgvector; almacenamiento y embeddings simulados | Aprobado | `HybridDocumentIntegrationTest` |
| Biblioteca PDF/XLSX | Binarios sintéticos, extracción real, hoja explícita XLSX, persistencia, indexación, reproceso, propietario ajeno y borrado | Spring + PostgreSQL/pgvector; adaptadores externos simulados | Aprobado | `syntheticPdfAndWorkbookPersistIndexReprocessAndDelete` |
| Suscripciones | Activación, renovación, cobro rechazado, cancelación, replay histórico, frontera temporal y outbox | Spring + PostgreSQL; HTTP del proveedor interceptado | Aprobado | `SubscriptionPersistenceIntegrationTest` |
| Bienvenida / Gmail / Sheets | Transacción de registro, outbox, deduplicación, leases, confirmación y proyección durable | PostgreSQL + pruebas n8n independientes con HTTP simulado | Aprobado por integración; no es un único recorrido combinado React→Gmail | `WorkspaceEventIntegrationTest`, fixture nativo Workspace |
| Drive aprobado → ingesta | Consentimiento, validación de carpeta/versión, cola, invalidación y nueva indexación | Spring + PostgreSQL/pgvector; Drive/almacenamiento simulados | Aprobado por integración | `approvedDriveVersionsReuseQueueAndInvalidateObsoleteChunks` y suite Drive |
| Asesoría / Calendar | Propuesta, propietario, vencimiento, confirmación idempotente, conflicto y ambigüedad | Spring + PostgreSQL; Calendar simulado | Aprobado por integración | `SupportBookingIntegrationTest` |
| MCP | Token sintético, scopes, revocación, vencimiento, límites y aislamiento | API/integración con PostgreSQL | Aprobado | `McpIntegrationTest` |

Corrección adicional `8aacb7e`: migración aditiva **V31**, tabla `subscription_charges`, recibo durable por cobro y frontera observada, comprobación de replay antes y después del bloqueo, y rechazo de retroceso de frontera. El orden de bloqueo es propietario → suscripción, igual que cancelación/outbox. El recibo no depende de que se haya enviado una comunicación.

La prueba no valida cobros ni conciliación productiva de Mercado Pago. No se usaron sus credenciales reales.

## D. Arquitectura multiagente

Se conserva el orquestador y los especialistas Financiero, RAG y Soporte. No se crearon agentes. Pasaron los contratos de alcance, propietario, presupuesto compartido, referencias, cobertura parcial, fallos recuperables y no escalamiento.

`MultiagentEndToEndTest`: **2/2**, Spring y n8n nativo reales, proveedor del modelo simulado. Verifica delegación financiera con evidencia recién persistida y abstención de intención desconocida. La coordinación compuesta, soporte operativo y seguimientos tienen evidencia automatizada en `AgentContractsTest` y `AssistantIntegrationTest`; no se los etiqueta como nuevas ejecuciones con Gemini real.

## E. Rendimiento

Se amplió exclusivamente el reconocimiento determinista de estrategia a «¿Qué estrategia de pago tengo activa?», «¿Qué estrategia tengo activa?» y la variante con «mi estrategia de pago activa». El contrato de regresión verifica que no se invoque el webhook. Chromium confirmó la lectura actualizada después de cambiar la estrategia.

No se añadieron atajos para consultas interpretativas. Se conservan admisión local del proveedor, presupuestos acotados, límites de delegaciones y mensajes de fallo. Las pruebas de `AssistantProviderGateTest`, `AgentRuntimeTest` y contratos Node pasaron. La reserva de capacidad no se informa como número exacto de peticiones HTTP.

No se midió una muestra nueva de Gemini real ni se calcula una mejora porcentual. Los tiempos de la suite del navegador no son latencias estadísticas del producto. Las cifras históricas del Bloque 7 no se reutilizan como un benchmark nuevo.

## F. Regresión del Bloque 7

La matriz original de **63 escenarios** y la asignación nominal completa de los nueve DEF no están en el repositorio ni en el commit indicado. Se solicitó su ubicación. **No se declara 63/63** a partir de una correspondencia inventada.

| Identificador original | Estado trazable |
|---|---|
| DEF-03 | Grounding: vínculo explícito en las instrucciones recibidas; pruebas adversariales y regresiones aprobadas |
| DEF-04 | Aprobado: el test frontend identifica expresamente este ID y comprueba Plan Cero durante carga |
| DEF-07 | Aprobado: el test frontend identifica expresamente este ID y comprueba las acciones de cada tarjeta |
| DEF-01, DEF-02, DEF-05, DEF-06, DEF-08, DEF-09 | Correspondencia nominal pendiente de la matriz original; no se certifican sus IDs por separado |

Sí se verificaron las regresiones funcionales siguientes:

| Comprobación | Evidencia aprobada |
|---|---|
| Soporte operativo, seguimiento y coordinación compuesta | `AgentContractsTest`, `AssistantIntegrationTest` |
| Contrato y fallo de especialistas, referencias inventadas y alcance | `AgentRuntimeTest`, contratos Node, prueba Spring+n8n y pruebas de grounding |
| Información de asesoría sin depender de Calendar | `AssistantIntegrationTest.advisoryInformationDoesNotRequireCalendar`, sin interacciones con Calendar |
| Plan Cero durante carga | `StrategicPlanView.test.tsx` |
| Ruta inexistente devuelve 404 | `SecurityConfigTest.returnsNotFoundInsteadOfInternalErrorForNonexistentAuthenticatedApiRoute` |
| Claves React y obligaciones vencidas | `DashboardView.test.tsx` |
| Acciones asociadas a cada documento | `DocumentLibraryPanel.test.tsx` |
| Un único main y consultas de suscripción compartidas | Chromium comprueba un único main; código preservado y tests frontend para suscripción. No se afirma una nueva medición de tráfico de suscripción en navegador |
| Artefactos de citas y porcentajes | `AssistantAnalysisServiceTest` |
| Historial y mora | `PaymentStatusLifecycleTest`, `PaymentIntegrationTest` |

La ausencia de trazabilidad original no se sustituye por el número de pruebas unitarias. La evidencia actual queda organizada por función y clase en el JSON adjunto.

## G. Integraciones externas

Los ocho workflows generales permanecen **inactivos y sin publicación**: Mail, Sheets, Drive, Calendar, MCP Server, MCP Backend, MCP Client y MCP Support. Sus definiciones no cambiaron durante la auditoría.

Gmail y Sheets: outbox y proyección desarrollados y probados con adaptadores simulados; fixture nativo Workspace aprobado en entrega, ambigüedad, destinatario modificado y cola vacía. Drive: ingesta/versiones probadas con pgvector y almacenamiento simulado. Calendar: propuesta/confirmación probadas con proveedor simulado. MCP: tokens y scopes probados por API. No se ejecutaron proveedores reales durante este bloque.

No se reetiquetan las verificaciones reales de bloques anteriores como pruebas reales nuevas. La activación continua y la conciliación productiva siguen fuera de lo ejecutado.

## H. Preparación de integración

Cadena local a revisar desde `origin/main`:

1. `337802e`: correcciones conservadas del Bloque 7.
2. `bfb04b6`: grounding contextual y monedas, con regresiones.
3. `8aacb7e`: recibos durables, frontera monotónica y V31.
4. `ec6d4f5`: Chromium aislado, conciliación de plantillas, perfil por API, asesoría informativa y recuperación segura.
5. Commit documental de este informe y sus evidencias; consultar `git log --oneline origin/main..HEAD` para su identificador.

No hay un conflicto con el `origin/main` observado: continúa siendo ancestro. Antes de integrar hay que volver a consultar el remoto; esta conclusión no autoriza sobrescribir cambios que aparezcan después.

Se comprobaron diferencias, espacio en blanco y patrones de secretos de alta confianza. No se añaden `.env`, claves, exports legibles, SQLite, logs privados ni el nuevo respaldo cifrado a Git. Existen archivos históricos `.ceroa` cifrados ya presentes en `main`; este bloque no añadió archivos privados a ese conjunto. Una búsqueda por patrones no sustituye una auditoría completa del historial.

**No se ejecutó push ni merge.** La preparación técnica queda disponible para revisión, y el cierre nominal de la matriz original permanece pendiente.

### Recuperación y respaldo

Respaldo nuevo privado: `%USERPROFILE%\.ceroa-backups\n8n-block8-2026-11-09.ceroa`.

Clave externa separada: `%USERPROFILE%\.ceroa-backup-keys\block8-verified-2026-11-09.key`.

SHA-256 del archivo cifrado: `B9C24494170A8CC4BDCFBCE651C5A09298FE0AF4C88BB28D4343920A82B80B9A`.

Contiene snapshot SQLite consistente y configuración de cifrado de n8n. AES-256-GCM, mecanismo existente con PBKDF2, autenticación y comprobación de ida/vuelta. El nuevo test criptográfico rechaza alteración y clave incorrecta sin crear una salida legible.

La recuperación se comprobó en un contenedor desechable **sin red y sin arrancar n8n**: integridad SQLite correcta, 30 IDs, versiones publicadas referenciadas, credenciales enlazadas y descifrado de las 22 credenciales. Antes de cualquier CLI se guardó el manifiesto original y se dejó la copia con `active=0`, `activeVersionId=NULL` y cero webhooks. No se restauró sobre el runtime existente.

Procedimiento de recuperación:

1. Fijar la imagen/versiones del origen y verificar compatibilidad. El README histórico menciona 2.45.4; el runtime observado es **2.40.7**. No importar una base de otra versión a ciegas.
2. Autenticar y descifrar fuera de Git, usando la clave externa. Conservar juntos SQLite y su configuración interna de cifrado, dentro del respaldo externo autenticado.
3. Trabajar sobre una copia aislada sin salida a proveedores. Guardar el manifiesto de publicación y poner en cuarentena automatizaciones/webhooks **antes** de iniciar servicios.
4. Para recuperación selectiva, exportar solo los IDs elegidos de la copia verificada, conservar IDs/referencias/asociaciones de credenciales y validar dependencias antes de importar. La copia completa es respaldo; no es una instrucción de importación masiva.
5. Comparar versión, nodos, conexiones, credenciales y estado contra el manifiesto. Publicar únicamente un allowlist revisado de workflows que deban estar activos. Los ocho conectores generales quedan excluidos salvo autorización específica.
6. Hacer una nueva lectura de inventario y una prueba aislada antes de conmutar. No se ejecutó esa conmutación en este bloque.

Este respaldo es de n8n, **no del PostgreSQL financiero**. V31 requiere el respaldo y plan de despliegue de esa base antes de una futura actualización productiva. Restaurar código no deshace pagos, mensajes entregados, cambios de un proveedor o eventos ya consumidos.

## I. Riesgos y pendientes vigentes

- Falta la matriz original y su correspondencia con los nueve IDs DEF para cerrar formalmente sus celdas sin inventar resultados.
- No hay una medición nueva de Gemini real ni nuevas pruebas reales de Workspace/Mercado Pago. Sus condiciones productivas y activación continua no se validaron aquí.
- La comprobación lexical de grounding tiene el alcance de los contratos/casos cubiertos; no es una prueba general de semántica en lenguaje libre.
- El deploy actual sigue en el código del Bloque 7. La futura actualización requiere V31 y coordinación de código/base; no debe activarse el perfil de n8n como si fuera un despliegue automático.
- La restauración debe fijar la versión real; las referencias históricas a otra versión no garantizan compatibilidad hacia atrás.

## J. Veredicto técnico y resultados

**BLOQUEADO POR DEPENDENCIAS para el cierre formal de la matriz E2E original.** Falta su artefacto y asignación de IDs. No se identificaron fallos automatizados vigentes en el código final ni conflictos con el `main` observado; la rama está técnicamente preparada para revisión e integración, pero no se certifica un cierre 63/63 ni una operación productiva de proveedores.

| Verificación final | Resultado observado | Clasificación |
|---|---|---|
| Java completo, filesystem interno limpio | 436 registrados: 402 ejecutados aprobados, 34 omitidos, 0 fallos/errores | Automatizada; H2 y fixtures locales |
| Regresión adicional de asistente | 21 aprobados; incluye asesoría informativa sin Calendar | Automatizada focalizada; se solapa con el Java general |
| Operaciones persistentes PostgreSQL | 69 aprobados, 0 omitidos/fallos/errores | API/integración real; proveedores simulados |
| Biblioteca PostgreSQL/pgvector | 27 aprobados, 0 omitidos/fallos/errores | Integración real; almacenamiento/embeddings simulados |
| Spring + n8n nativo | 2 aprobados | Integración; modelo simulado |
| Node | 47 aprobados | Contratos y criptografía |
| Frontend | 190 aprobados; TypeScript y Vite correctos | Automatizada |
| Chromium React → Spring → PostgreSQL | 3 aprobados sobre el jar final | E2E real con datos sintéticos |
| Actualización de perfil financiero | Alta, actualización/lectura, validación sin mutación y aislamiento aprobados | API real → PostgreSQL sintético; no es E2E de navegador |
| n8n Workspace nativo | 4 escenarios aprobados | Proveedor HTTP simulado |
| Recuperación n8n | Integridad, referencias, 22 credenciales descifradas, 0 activos/webhooks en copia | Contenedor sin red; sin arranque de n8n |
| Proveedores reales | No ejecutados | Pendiente/fuera de este bloque |

**No sumar suites**: los 69 casos PostgreSQL, los 27 documentales y los 2 nativos se solapan con clases que en la ejecución Java general se ejecutaron en H2 o quedaron omitidas. De los 34 omitidos, 27 documentales y 2 nativos se ejecutaron después en sus entornos adecuados; los restantes corresponden a pruebas opt-in de otros entornos/proveedores.

Evidencia versionada: [resultados por clase/caso](benchmarks/block8/automated-results.json), [Chromium](benchmarks/block8/browser-results.json), [perfil por API](benchmarks/block8/profile-api.json), [criptografía/operación](benchmarks/block8/operational-results.json), [n8n](benchmarks/block8/n8n-runtime.json) y [despliegue](benchmarks/block8/deployment-comparison.json). Los logs completos y trazas sintéticas quedan en `tmp/block8-*`; no se versionan.

Las primeras ejecuciones presentaron errores intermitentes de carga de clases sobre el directorio Windows compartido y una configuración incorrecta de esquema en el runner. Los errores de carga no se reprodujeron con copias internas independientes del backend; las verificaciones finales usaron además bases distintas para las instalaciones y propiedades de esquema explícitas. Los resultados de intentos fallidos no se cuentan como aprobados. También se corrigieron los selectores de la prueba nueva de navegador a partir del DOM observado, sin cambiar el producto.

Chromium comprobó además ausencia de advertencias React de claves duplicadas y anidamiento HTML en los recorridos ejecutados. Los conteos generales Java se conservan como observados: una regresión adicional de información de asesoría se añadió después y se verificó en una ejecución focalizada de `AssistantIntegrationTest`; se registra por separado para no inflar el total general.

Las fechas de las pruebas nuevas de suscripción se hacen relativas al momento de ejecución para evitar que caduquen los fixtures de acceso pagado; sus cuatro casos se volvieron a aprobar contra PostgreSQL tras ese ajuste exclusivo de pruebas. Al terminar se retiraron los contenedores, la red y el servidor frontend desechables; se conservaron el runtime original, las evidencias y el respaldo cifrado privado.
