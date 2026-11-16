# CEROA — Revisión final de RC1 y PR #1

> Nota de vigencia RC2 (14/11/2026): este informe conserva observaciones históricas. El candidato actual, las correcciones R1/R2 y el estado del PR se documentan en [validación final RC2](CEROA_RC2_CORRECCIONES_Y_VALIDACION_FINAL.md). El Grant es autorizado y ligado al servidor, sin firma HMAC/JWS; la ruta actual es `POST /api/v1/workspace-actions/{code}/draft`.

Fecha: 14 de noviembre de 2026, America/Bogota. Revisión del candidato `f5a0866fcd9b192902effea05505bddf35745d96`, sin modificarlo.

**REQUIERE CORRECCIÓN ANTES DE INTEGRAR.** Se reprodujeron dos defectos que no estaban cubiertos por las pruebas anteriores. La integridad del artefacto es correcta; integridad no equivale a ausencia de defectos.

**Despliegue productivo: NO-GO**, independiente de la posibilidad técnica de fusionar ramas. Se conserva la demo disponible. No se generó RC2, no se cambió código del candidato, no se marcó el PR listo, no hubo commits/push nuevos, merge ni auto-merge.

## 1. Hallazgos que impiden recomendar la integración

### R1 — P2: una tasa contradictoria obtiene VERIFIED y COMPLETE y puede cambiar de modalidad al mostrarse

Ubicación: [DocumentFactExtractor.java:39](../backend/src/main/java/com/ceroa/service/DocumentFactExtractor.java#L39), [FinancialClaimGrounding.java:104](../backend/src/main/java/com/ceroa/service/FinancialClaimGrounding.java#L104). Cambio introducido por `31c6593` al ampliar las etiquetas de tasa e inferir modalidad desde la etiqueta.

Entrada sintética reproducida:

```text
Tasa de interes efectiva anual: 28,70% EM
```

La etiqueta declara anual y el sufijo mensual. El extractor privilegia el sufijo y crea un hecho `RATE`, `rateMode=EM`, `validationStatus=VERIFIED`. `DocumentFactAnalysis.analyze(..., Kind.RATE)` devuelve `complete=true` para el documento indexado con período válido. El grounding añade la modalidad inferida de la cita a la modalidad tipada: su conjunto de unidades contiene tanto EA como EM. Por ello admite y renderiza:

```text
Tasa efectiva anual: 28,7% EA.
```

No hay conversión ni abstención por la contradicción. Esto permite una atribución financiera incorrecta a partir de un documento inconsistente o manipulado, precisamente en el límite de confianza documental. La comprobación conservadora de tasas no puede basarse en que una abreviatura aparezca en cualquier parte de la cita cuando contradice el campo tipado.

Evidencia aislada: `Rc1RateReviewTest.characterizeConflictingRateReachesVerifiedCompleteAndWrongAnnualClaim` pasa y comprueba los tres pasos; `conflictingAnnualLabelAndMonthlySuffixMustNotHaveCompleteCoverage` falla con `expected false, actual true`. No se hizo una consulta Gemini nueva ni se modificó un documento de la demo.

Corrección mínima requerida: detectar conflicto entre etiqueta y sufijo antes de verificar el hecho; mantenerlo en revisión/sin cobertura completa o rechazarlo. En el renderer, una modalidad documental verificada debe ser única y coherente: no autorizar otra modalidad por presencia textual en la cita. Agregar regresiones para EA/EM incompatibles, pares consistentes, modalidad ausente y entrada contradictoria. Verificar también la reconstrucción de hechos de documentos previamente indexados para que no perpetúe hechos contradictorios ya almacenados. No basta cambiar el prompt.

### R2 — P2: el nuevo controlador de borradores pierde los estados HTTP de autorización/vigencia

Ubicación: [WorkspaceDraftController.java:9](../backend/src/main/java/com/ceroa/api/WorkspaceDraftController.java#L9), [WorkspaceErrorAdvice.java:11](../backend/src/main/java/com/ceroa/api/WorkspaceErrorAdvice.java#L11), [GlobalExceptionHandler.java:104](../backend/src/main/java/com/ceroa/api/GlobalExceptionHandler.java#L104).

`WorkspaceDraftService.prepare` lanza NOT_FOUND para una propuesta inexistente o ajena, GONE para una propuesta vencida/confirmada, BAD_REQUEST para un tipo no permitido y BAD_GATEWAY para una respuesta inválida del proveedor. Sin embargo, WorkspaceDraftController no figura entre los tipos de WorkspaceErrorAdvice. Sus excepciones llegan al manejador global de recuperación, que convierte cualquier ResponseStatusException distinta de 429 en:

```text
HTTP 503
code: RECOVERY_UNAVAILABLE
message: La recuperación no está disponible en este momento. Intenta más tarde.
```

Se reprodujo con MockMvc, el controlador real y ambos advice reales: un NOT_FOUND de servicio al hacer `POST /api/v1/workspace-actions/MISSING/draft` termina en 503. La prueba que exige 404 falla. Se conserva el rechazo de acceso y no se demostró filtración entre propietarios; el defecto es el contrato HTTP y el mensaje, que presentan un rechazo permanente como fallo temporal de otra función y pueden inducir reintentos incorrectos.

Corrección mínima requerida: incluir este controlador en un advice de Workspace o darle un manejador específico, preservando 403/404/410/400/502/503 según corresponda y mensajes de borradores sin información sensible. Agregar pruebas HTTP, además de los tests unitarios del servicio; cubrir propietario ajeno, expiración, tipo inválido y fallos del proveedor.

Ambos defectos requieren cambiar clases del backend. Tras corregirlos, cualquier artefacto actualizado debe ser un **RC2 independiente**, preservando RC1 y los otros dos JAR. No se construyó RC2 dentro de esta revisión: el entregable solicitado es la evaluación y sus reproducciones, no una sustitución silenciosa del candidato validado.

## 2. Estado actual de Git y GitHub

PR: [#1 — Validate RC1 runtime and consolidate Ceroa release readiness](https://github.com/ks-correa/Ceroa/pull/1).

| Elemento | Comprobación actual |
|---|---|
| Rama candidata local y remota | `docs/ceroa-ai-architecture`, `f5a0866fcd9b192902effea05505bddf35745d96` |
| main local y remoto | `8c6ac23939211228e58112e92b010bd675f7ba86` |
| Relación | main es ancestro; 0 commits exclusivos de main y 6 de la candidata |
| PR | Abierto, draft=true, merged=false, auto_merge=null |
| API REST actual | mergeable=true, rebaseable=true, mergeable_state=clean |
| Archivos / commits | 100 archivos, 6 commits |
| Checks / status contexts | 0 check-runs y 0 statuses; no equivalen a CI aprobada |
| Actions | La colección consultada de runs devuelve total_count=0; no hay workflows de Actions en el árbol local |
| Conversación | 0 comentarios, 0 revisiones y 0 hilos de revisión |
| Reglas | rulesets=[]; la metadata de main indica protected=false y checks requeridos desactivados |

El endpoint específico de protección clásica devuelve 403 por limitación de la integración. La metadata de la rama sí informa que main no está protegida en esta lectura; no se cambiaron permisos ni restricciones. No se puede dar por aprobada una revisión humana que no existe.

El `mergeable=false` anterior no acredita un conflicto: la lectura REST actual explícita lo descarta. Sin el valor REST original no es posible atribuir retrospectivamente ese false con certeza; pudo ser un estado transitorio o la normalización de una respuesta aún no calculada. Estar en borrador impide completar la integración mientras siga así, pero no explica por sí solo el campo REST mergeable. El `merge_commit_sha` sintético que devuelve GitHub pertenece al cálculo de integración; merged=false y main sin cambios confirman que no se fusionó.

Los seis commits y su cadena de padres se conservaron. `git fsck --no-reflogs` no informó corrupción; sí objetos colgantes locales, que no se eliminaron ni forman parte del PR. No se afirma que los commits estén firmados criptográficamente.

| Commit | Responsabilidad |
|---|---|
| `31c6593efb48a973c1a9d7bbf665d292860c7cc6` | Backend: grounding, presupuesto, contratos y borradores; pruebas asociadas |
| `e0148bcba255e6ad654932028c0ec8fa439e54e4` | Identidades, generadores y definiciones n8n |
| `694fda950ee6085fcb9755acba03345af25e7cce` | Frontend: vista previa de borradores y rótulo de simulación |
| `71c5b4a4fcbbac2de6bffb37f1e549d76a69495c` | Demo reversible, verificación y manifiesto |
| `71cab5ea5314b2f9cf19836eaa14658adb343e2b` | Documentación y evidencias reconciliadas |
| `f5a0866fcd9b192902effea05505bddf35745d96` | Registro del PR y comprobaciones de cierre |

El inventario completo por archivo, categoría y hash queda en `tmp/codex-pr-review/file-review.json`; la captura resumida de GitHub en `tmp/codex-pr-review/github-review.json` y los resultados nuevos en `tmp/codex-pr-review/test-summary.json`.

El árbol versionado estaba limpio al recibirlo y permanece sin modificaciones. Este informe es la única novedad no versionada; las reproducciones y logs se guardaron bajo tmp/codex-pr-review, ignorado por Git. No se publicó un séptimo commit durante la revisión.

## 3. Integridad de RC1 y demo

Se volvieron a calcular los tres hashes, sin sobrescritura:

| Artefacto | SHA-256 |
|---|---|
| B12 `tmp/block10-build-results/ceroa-backend-0.1.0-SNAPSHOT.jar` | `DBC8B235ECC7CB94934C88037729CC903E7DBD66EAF0608F33F7290E3F248B8B` |
| Demo anterior `tmp/functional-demo/backend-delivery.jar` | `8400257B3E5C714361E67560B12F34E83DCB06A081CEA750AAC599A3D9D9DE15` |
| RC1 `tmp/release-candidate/ceroa-backend-0.1.0-SNAPSHOT-rc1.jar` | `4C2F954C53399AE5B8F1E050F5EC10AA0C0CE0A2B39187A744105422010C7004` |

El mismo hash RC1 se comprobó dentro de `/app/backend.jar`. Las **432 clases/recursos** se compararon otra vez con las clases compiladas preservadas de la validación anterior: cero diferencias. No se recompilaron fuentes principales ni se empaquetó otro candidato en esta revisión; solo se compilaron pruebas temporales contra esas clases.

El manifiesto de 692 archivos sigue coincidiendo exactamente con el árbol actual:

- SHA-256 crudo: `0b1f3e7ee597b3cbbce4909e4d2e4ab080a63f6aa4b2e4a5fb9d3a4ac5a26252`.
- SHA-256 con LF normalizado: `1a8f0babf7384c56af748be1ecdf9df598d01c26ba2812b839506eb95a88e181`.

Esto conserva trazabilidad de fuente, lockfiles, configuración y herramientas hasta el candidato anterior; no demuestra que las pruebas cubrieran R1/R2. El hash fuente histórico 55F3AF… conserva la limitación de procedimiento incompleto descrita en el informe anterior y no se da por reproducido.

Compose mantiene RC1 por defecto y admite CEROA_DEMO_BACKEND_JAR para volver al JAR anterior. Las rutas y montajes se conservaron. Los tres volúmenes `ceroa-demo_demo-db`, `ceroa-demo_demo-n8n`, `ceroa-demo_demo-adapter` existen; DB continúa healthy. Los cinco contenedores demo siguen activos sin reinicios: RestartCount=0, backend StartedAt=2026-11-14T23:58:56.755184397Z y los otros cuatro desde aproximadamente 22:56 UTC. No se ejecutó up/down/stop/start sobre la demo.

## 4. Revisión de los 100 archivos, dependencias y seguridad

Se revisó el diff funcional y las relaciones entre servicios, repositorios, controladores, filtros y advice. Se verificaron los 100 archivos por inventario/hash, formato, tipo y contenido; los 38 JSON de evidencia se revisaron como evidencia histórica, no como nuevas conversaciones. Las definiciones JSON generadas se cotejaron con las invariantes de los tests existentes y sus generadores.

| Grupo exclusivo | Archivos |
|---|---:|
| Código/configuración funcional backend y frontend | 13 |
| Pruebas Java y Node | 11 |
| Workflows y generadores n8n, sin sus tests | 15 |
| Infraestructura, demo y verificación | 15 |
| Documentación | 8 |
| Evidencias | 38 |
| Total | 100 |

No hay cambios en pom.xml, package.json ni lockfiles respecto de main: el PR no incorpora dependencias nuevas. El runtime ya requiere Java 25 y Maven 3.9.11; n8n está fijado por digest. Las imágenes demo `ceroa-frontend:latest`, `eclipse-temurin:25-jre` y `pgvector:pg17` no constituyen un empaquetado productivo inmutable; sus digests finales siguen siendo prerrequisito de Bloque 13.

El diff no incorpora .env, JAR, SQLite, claves privadas, certificados, dumps, tmp ni respaldos. Se repitió el escaneo de formatos de claves Google/GitHub, JWT y claves privadas sin coincidencias. Las contraseñas y cabeceras explícitas de Compose/demo son sintéticas, de laboratorio; los identificadores de credenciales n8n son asociaciones, no valores de API keys. No se identificaron documentos ni datos financieros privados de clientes entre los archivos añadidos; los ejemplos financieros revisados corresponden a fixtures sintéticos. git diff --check pasa. Un escaneo de patrones no es una garantía absoluta contra cualquier formato secreto.

Los scripts de siembra, pruebas en vivo y publicación se examinaron como herramientas de ejecución explícita; no se ejecutaron durante esta revisión. `seed-knowledge` modifica únicamente el contenedor demo nombrado y consume Gemini real si se invoca. Las herramientas de lectura operativa evitan imprimir secretos. Los exportadores de ejecuciones incluyen preguntas/errores: solo deben publicar corpus sintético redactado, nunca ejecutarse para exportar conversaciones productivas sin revisión.

## 5. Arquitectura, scopes y grounding

Se conservan **cuatro agentes cognitivos nativos de n8n**: NEXUS, ATLAS, ORACLE, LUMEN. CHRONOS sigue siendo frontera de integración y AEGIS gobernanza determinista. No hay seis LLM ni agentes adicionales. NEXUS usa herramientas toolWorkflow; los especialistas reciben modelo/parser nativos y herramientas de dominio. Se mantienen profundidad uno, máximo cuatro delegaciones, ocho herramientas por scope, presupuesto global, deadline, caché, aislamiento de evidencia y validación de resultados. Los límites globales adicionales se conservan en AssistantService.

Aclaración necesaria de seguridad: el Grant no lleva firma HMAC/JWS ni campo de firma. Es un contrato **autorizado y ligado al estado del servidor**: scopeToken UUID aleatorio, requestId, rol, referencias emitidas y vigencia, con callbacks autenticados por la cabecera compartida X-Ceroa-Assistant y comparación constante en AssistantSecurityConfig. AgentRuntime comprueba el scope almacenado; el modelo no elige propietario. Llamarlo «Grant firmado» en la descripción del PR y algunos informes históricos excede lo implementado. Debe corregirse esa terminología; no se eliminan los controles existentes ni se propone sustituirlos por prompts.

La revisión y los tests existentes verifican rechazo de referencias inventadas, referencias fuera de alcance, monedas incompatibles, valores sin verificar, tasas incompatibles en los casos conocidos, versiones obsoletas, campos financieros intercambiados, fechas/páginas usadas como saldos y propagación de cobertura parcial. Repositorio/biblioteca filtran por actor y versión vigente; los cambios revisados no eliminan esas comprobaciones. Extracción exige líneas etiquetadas completas y valida offsets; fragmentos recuperados no se convierten automáticamente en hechos financieros autorizados. La inyección documental no autoriza herramientas ni confirmaciones humanas. No se declara protección absoluta contra todo prompt injection; R1 demuestra una entrada inconsistente que sí atraviesa el control semántico de modalidad.

Los resultados RC1-01 a RC1-04 se conservan como cuatro muestras con Gemini real. No se volvieron a ejecutar ni se extrapolan a todo tipo de extracto o consulta.

## 6. Presupuesto Gemini y capacidad

La configuración efectiva no ha cambiado: **15 unidades reservadas/minuto, concurrencia 1, cooldown 60 s**, con protecciones habilitadas. No hay overrides de estos valores en el entorno del backend demo inspeccionado en la validación conservada. Las pruebas de AssistantProviderGate y AgentRuntime se repitieron sin fallos.

Tres especialistas: raíz hasta 6, ATLAS/ORACLE/LUMEN hasta 3 cada uno, reserva total 15. Los Grants observados anteriormente tienen maxIterations=3; los nodos leen la expresión del Grant. La traza RC1-04 observó 4/2/3/1 evaluaciones de nodo para NEXUS/ORACLE/ATLAS/LUMEN, no un conteo HTTP físico exacto. El `maxIterations=10` del contexto de presupuesto general no sustituye el tope 6 que aplica la expresión del agente raíz.

Los reintentos internos de LangChain (AsyncCaller por defecto 6) y embeddings gemini-embedding-001 siguen siendo consumo adicional potencial. Las métricas exactas de peticiones/reintentos/tokens permanecen no observadas. Cooldown por cuota y admisión se verifican por componente; no se agotó una cuota real ni se aumentaron límites en esta revisión. Sigue siendo necesario medir capacidad productiva conjunta.

## 7. Borradores Gmail: autorización, repetición y bloqueo transaccional

Se verificó el servicio y sus pruebas: usuario autenticado activo; selección por ownerId+code; estado PROPOSED y expiración; tipo FINANCIAL_SUMMARY; destinatario derivado de user.getEmail(); cifras desde DashboardService; URL interna fija y clave de longitud mínima. El cliente no suministra destinatario ni cifras. El servicio prepara un borrador y no confirma la propuesta ni envía correo. Rechaza proposalId incorrecto, id vacío, respuesta nula, sent=true o sent ausente; `asBoolean(true)` permite coerción de ciertos tipos JSON, por lo que un adaptador productivo debe exigir booleano estricto false.

Las cuatro pruebas HTTP nuevas contra un servidor loopback desechable pasaron: payload confiable y destinatario, errores de contrato, error 500 seguido de reintento, y timeout de lectura. Se ejecutaron con Docker --network none y un alias n8n apuntando a loopback; no hubo Gmail, Calendar ni n8n operativo.

Riesgos no resueltos para activar un proveedor productivo:

- Dos invocaciones prepare para la misma propuesta producen dos POST al proveedor. No existe recibo durable/cache de borrador en backend ni estado ambiguo específico después de un timeout. El proposalId estable permite deduplicación, pero solo si la implementa el adaptador.
- El adaptador demo sí deduplica en estado persistente por proposalId y conserva sent=false. Esto no prueba idempotencia de Gmail real. Si el proveedor crea un borrador y luego se pierde la respuesta, un reintento puede duplicarlo sin un recibo/reconciliación en el adaptador productivo.
- @Transactional engloba current.entityForUpdate y la consulta con PESSIMISTIC_WRITE de la propuesta durante la llamada externa: connectTimeout=3 s y readTimeout=15 s. Se retienen conexión y locks del usuario/propuesta durante la espera; otras operaciones sobre el mismo usuario pueden quedar bloqueadas. El timeout no revierte un efecto ya ocurrido fuera de la base.
- La respuesta del proveedor no valida que recipient/subject/message coincidan con el payload; no vincula criptográficamente la vista previa al contenido que confirmMail recalcula después desde los datos actuales. Es una limitación del contrato pendiente de producción, no evidencia de envío no autorizado en demo.
- La interfaz activa la vista previa por VITE_MAIL_DRAFTS_ENABLED, muestra SIMULATED y envía una confirmación explícita aparte. Los fallos del endpoint nuevo quedan afectados por R2; la preview no debe interpretarse como recibo de envío.

Para el alcance actual con adaptador simulado estos riesgos de proveedor se documentan sin construir un sistema de envío. Antes de habilitar createDraft real son obligatorios idempotencia/reconciliación, validación completa de respuesta y revisión del bloqueo transaccional. Dejar WORKSPACE_DRAFT_URL vacío es la desactivación del servicio; WORKSPACE_GMAIL_ENABLED=false controla el consumidor de envío, no el endpoint de preparación.

## 8. MCP Calendar

Demo: transporte MCP real y herramienta calendar_availability contra servidor simulado; creación/consulta/cancelación del adaptador siguen simuladas. La propuesta no crea una reserva externa real; confirmación y expiración se gobiernan en backend. Se conservan las evidencias HTTP de idempotencia, aislamiento, rechazo de fechas/códigos y expiración, y los tests del gateway se repitieron sin fallos.

Producción: la plantilla workspace-calendar usa webhook interno y nodos Google Calendar; no constituye un puente MCP Calendar. El puente MCP productivo y el adaptador Gmail createDraft continúan pendientes y separados del laboratorio. Calendar y conectores reales deben permanecer deshabilitados si no forman parte del alcance autorizado. No se creó ninguna reserva, borrador Gmail real ni correo real durante la revisión.

## 9. Pruebas históricas y nuevas

Se comprobó que java-results.json contiene 456 claves únicas clase::caso, con **454 PASSED y 2 SKIPPED**, sin duplicar las repeticiones. Las dos omitidas son la suite heredada Gemini sustituida por casos RC1 y la suite con efectos Gmail/Sheets reales no autorizados. Node 51/51, frontend 190/190 y TypeScript correcto son los resultados previos preservados y coherentes con los logs/resúmenes; no se presentan como ejecuciones nuevas de esta revisión.

La repetición de 17 casos de NotificationIntegrationTest/DebtServiceTest con America/Bogota resolvió los cinco incidentes iniciales por fixtures LocalDate.now() frente a zona de servicio. No se sumó como 17 casos únicos adicionales. No se atribuyen R1/R2 a esa zona horaria.

| Ejecución de revisión | Casos | Resultado |
|---|---:|---|
| AgentContracts, AgentRuntime, ProviderGate, DocumentFact, FinancialClaimGrounding, WorkspaceDraftService y CalendarGateway existentes | 48 | 48 aprobados |
| Rc1DraftReviewTest, nuevas pruebas loopback de contrato/error/repetición/timeout | 4 | 4 aprobados, caracterizan también las limitaciones descritas |
| Rc1RateReviewTest, reproducción y guarda de aceptación de tasa contradictoria | 2 | 1 aprobado y 1 fallo que confirma R1 |
| Rc1DraftHttpReviewTest, reproducción y guarda del estado HTTP | 2 | 1 aprobado y 1 fallo que confirma R2 |
| Total de esta revisión | 56 | 54 aprobados, 2 fallos, 0 errores/omitidos |

Las ocho pruebas nuevas existen únicamente en la copia temporal. No se agregaron a la cifra histórica de 456 ni se alteraron las pruebas del candidato para obtener verde. Los dos tests de caracterización pasan al confirmar el comportamiento defectuoso; las dos guardas fallan al exigir el comportamiento correcto. Por tanto, la suite histórica verde no basta para recomendar la integración.

Archivos de reproducción locales: `tmp/codex-pr-review/java/src/test/java/com/ceroa/service/Rc1RateReviewTest.java`, `Rc1DraftReviewTest.java` y `Rc1DraftHttpReviewTest.java`. Logs: `tmp/codex-pr-review/review-tests.log`, `http-review-tests.log`; reportes XML/texto en target/surefire-reports de esa copia. El primer intento de compilar el test de revisión tuvo una importación ambigua de Kind, corregida exclusivamente en la copia temporal; los resultados de la tabla proceden de las invocaciones posteriores que sí ejecutaron los casos. No fue un fallo del candidato.

## 10. Coherencia documental y evidencias

Los informes anteriores describen fases distintas y contienen conclusiones históricas que no deben sumarse como validación única. La evidencia final mantiene success de n8n separado de COMPLETE del negocio. Las ejecuciones 118–121, 122–123, 129–130 y 131–133 corresponden respectivamente a tri-dominio, ATLAS, ORACLE y combinación documental/financiera. Los wrappers simulados de Calendar/Gmail no acreditan COMPLETE cognitivo ni efectos Google reales.

Se conservan las correcciones de V31, variables ASSISTANT_PROVIDER_*, cooldown 60 s y concurrencia 1 del informe Codex. También se requiere corregir la terminología «Grants firmados» y referencias heredadas al endpoint `/workspace-proposals/.../gmail-draft`: el controlador versionado utiliza `/workspace-actions/{code}/draft`. Las afirmaciones de 404/410 de pruebas unitarias no prueban por sí solas el estado HTTP del controlador, como revela R2.

Este informe sustituye, para decidir la integración, el GO anterior limitado a la cobertura entonces disponible. No se alteraron sus evidencias para ocultar los hallazgos nuevos.

## 11. Preparación de integración y despliegue automático

La rama es técnicamente fusionable, pero **no debe marcarse lista ni fusionarse mientras R1/R2 estén abiertos**. No se utilizó ninguna operación para evadir controles del repositorio.

Después de corregirlos y validar RC2, la estrategia recomendada es **merge commit convencional** mediante PR, conservando los seis commits existentes y los commits de corrección posteriores. GitHub permite merge commit; no usar squash/rebase si se exige preservar sus hashes. Volver a leer main/head, comentarios/checks/reglas y el SHA exacto aprobado inmediatamente antes de una integración autorizada. No configurar auto-merge.

No se encontró pipeline de despliegue por push a main dentro del repositorio: no hay .github/workflows ni hooks Git activos locales, core.hooksPath no está configurado y GitHub devuelve cero runs. Las herramientas de publicación/despliegue de integrations son invocaciones explícitas; n8n start restaura publicaciones, no publica las plantillas Git por sí solo. No se modificaron ni ejecutaron esas herramientas.

Esto **no certifica ausencia de webhooks, servicios de hosting o automatizaciones externas al árbol**: el conector no expone aquí todas las APIs de workflows/deployments/hooks, y la configuración externa no se auditó. Antes de autorizar merge, el operador debe comprobar integraciones de despliegue externas; no dar por hecho que actualizar main equivale o no equivale a desplegar. Ninguna restricción se intentó sortear.

## 12. Alcance recomendado y prerrequisitos productivos

Recomendación inmediata: preservar demo académica con datos sintéticos y adaptadores simulados, corregir R1/R2 y ajustar la descripción de seguridad; después construir RC2 por separado y repetir únicamente regresiones afectadas y aceptación del artefacto actualizado. No agregar agentes, conectores ni funcionalidades.

Un lanzamiento productivo posterior debe excluir Calendar/Gmail reales mientras no existan los adaptadores productivos y su validación específica. El empaquetado de backend y frontend compatible, sus digests y variables públicas/cookies/orígenes siguen pendientes de cierre productivo.

El último preflight conservado informa Supabase PostgreSQL 17.6, Flyway V30, V31 ausente, siete SHEETS/PENDING, 30 workflows operativos, 15 publicados y 22 credenciales; los conectores generales permanecían deshabilitados. En esta revisión no se volvió a consultar ni modificar Supabase: se distingue esa evidencia fechada de una lectura nueva de la base. No se arrancaron contenedores operativos ni se procesaron eventos.

Antes de Bloque 13: respaldo actualizado con corte consistente de PostgreSQL/Storage/n8n y claves protegidas, restauración aislada comprobada, candidato corregido probado contra una copia financiera restaurada actualizada, checksums y V31 real (`V31__durable_subscription_charges.sql`), control de escritores/consumidores/outbox, validación de compatibilidad, imágenes por digest y autorización específica. El backup del 9 de noviembre no cubre escrituras posteriores. Revertir backend no revierte una migración ni reconcilia recibos de facturación; mantener esos escritores detenidos durante rollback y tener recuperación de DB separada.

## 13. Decisión final

**Integración: REQUIERE CORRECCIÓN ANTES DE INTEGRAR**, por R1 y R2 reproducidos. Que GitHub indique clean no invalida estos defectos.

**Producción: NO-GO**, además de los defectos por los prerrequisitos de respaldo/restauración, empaquetado, capacidad y adaptadores aún pendientes.

Próximo paso concreto: aplicar la corrección mínima de modalidad contradictoria y del manejo HTTP de borradores, incorporar las guardas al repositorio, producir RC2 trazable sin sobrescribir RC1 y revisar sus resultados antes de solicitar autorización de merge. El PR #1 sigue en borrador y la demo RC1 queda disponible para sustentación, con los límites de esta revisión declarados.
