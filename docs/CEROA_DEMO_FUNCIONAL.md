# Ceroa AI: entorno funcional de demostración

14 de noviembre de 2026, America/Bogota. Rama `docs/ceroa-ai-architecture`. Cambios locales para revisión, sin commit ni push.

## Acceso local

| Servicio | URL | Cuenta de demostración |
|---|---|---|
| Ceroa React | http://localhost:3001 | `demo@ceroa.local` / `Demo123!` |
| Spring Boot | http://localhost:8081 | Misma sesión de Ceroa |
| Swagger | http://localhost:8081/swagger-ui.html | Disponible localmente |
| n8n | http://localhost:5679 | `demo-n8n@ceroa.local` / `CeroaDemo2026!` |
| Historial n8n | http://localhost:5679/home/executions | Misma cuenta n8n |

Las cuentas anteriores son exclusivamente sintéticas. La credencial de Gemini permanece cifrada en el volumen independiente de n8n y no se incluye aquí.

Desde la raíz del repositorio:

```powershell
.\integrations\demo\demo.ps1
.\integrations\demo\demo.ps1 -Stop
```

Equivalentes: `docker compose -p ceroa-demo -f docker-compose.demo.yml up -d` y `docker compose -p ceroa-demo -f docker-compose.demo.yml stop`. No usar `down -v`: eliminaría la historia y la base sintética. El inicio reutiliza los artefactos locales preparados en `tmp/functional-demo`; no reconstruye imágenes ni importa sobre el producto.

## Qué está ejecutándose

Proyecto Docker separado `ceroa-demo`, con red y tres volúmenes propios: PostgreSQL/pgvector, n8n y adaptadores simulados persistentes. Solo frontend/backend/n8n publican puertos, vinculados a `127.0.0.1`. PostgreSQL y los adaptadores no publican puertos. Se reutilizaron las imágenes locales. PostgreSQL sintético reporta 17.11; Flyway aplicó V1–V31 exclusivamente sobre esa base nueva.

El backend ejecuta un JAR de revisión independiente (`tmp/functional-demo/backend-delivery.jar`, `SHA-256: 8400257B3E5C714361E67560B12F34E83DCB06A081CEA750AAC599A3D9D9DE15`). El candidato original B12 permanece intacto en su ruta original con `SHA-256: dbc8b235ecc7cb94934c88037729cc903e7dbd66eaf0608f33f7290e3f248b8b`. La configuración de arranque excluye `.env` y no contiene una conexión a Supabase operativo.

Los cuatro agentes cognitivos están publicados: NEXUS, ATLAS, ORACLE y LUMEN. CHRONOS tiene un workflow propio de laboratorio (`ceroaDemoChronos`) que usa el nodo nativo MCP Client (`@n8n/n8n-nodes-langchain.mcpClient`), separado de las plantillas portables de producción (`ceroaWorkspaceCalendar40`, `ceroaMcpClient40`, `ceroaMcpSupport40`). AEGIS conserva controles deterministas en Spring y se identifica en el canvas y en el flujo de borradores simulados (`ceroaDemoDraft`), separado de la plantilla de correo operativo (`ceroaWorkspaceMail40`). No se creó un quinto agente LLM para seguridad.

Gemini real: verificación de credencial HTTP 200, modelos conversacionales nativos y embeddings reales. Consultas secuenciales con pausas de 66 segundos y los límites backend activos. Los 429 observados durante preparación fueron rechazos de admisión del backend; no se disfrazan como errores de cuota de Google. No se cambió de proveedor.

Calendar, almacenamiento compatible con el API privado y Gmail createDraft son adaptadores simulados, identificados como tales. No hay credenciales Google Calendar/Gmail en esos adaptadores. No se enviaron correos, no se crearon borradores Gmail reales, reservas reales ni enlaces Meet inventados.

## Recorrido documental ejecutado

Se creó un PDF completamente sintético con saldo COP 5.240.000 y pago mínimo COP 310.000, relacionado con la Tarjeta principal de demostración. La carga se hizo mediante el selector de archivos y autorización del frontend. El almacenamiento privado usa HTTPS y un certificado de laboratorio confiado solo por este backend.

El procesador documental existente extrajo el texto, Gemini propuso los metadatos, generó un vector de 768 dimensiones y Spring persistió el índice y los hechos verificados (`ceroaRagIngest20` ejec `12`, `ceroaDocumentProcessor22` ejec `13` y `ceroaRagEmbedding03` ejec `14` en v1; `ceroaRagIngest20` ejec `27` y `ceroaDocumentProcessor22` ejec `28` tras vincular la obligación en v2). El documento quedó `INDEXED`. La búsqueda híbrida desde la interfaz (ejec `42` en `ceroaRagEmbedding03`) recuperó un documento y un fragmento, con `evidenceStatus=AVAILABLE`.

Se reutilizaron los cuatro fragmentos del corpus aprobado existente, verificando los hashes de origen y el snapshot de calibración `da9520daeab31486105962d5fb4686d9331dd58d808c71f03b26fec848c181de`. Se generaron embeddings reales en la base aislada (`ceroaRagEmbedding03` ejecs `15`–`18`); no se reconstruyó la biblioteca operativa. Se conservó su umbral calibrado 0.5418999290466309.

En las corridas iniciales (`93`–`94` individual y `36`–`38` compuesta), `FACT_ANALYSIS` devolvió cobertura `PARTIAL` porque `DocumentFactExtractor` no reconocía la etiqueta compuesta `"Tasa de interes efectiva anual: 28,70%"` y `DocumentFactAnalysis` exigía un único campo explícito por pregunta. Tras mejorar `DocumentFactExtractor` para extraer la modalidad desde la etiqueta (`RATE: 28,70% EA`, `VERIFIED`) y descomponer en `DocumentFactAnalysis` las consultas de análisis/comparación de extracto sobre sus hechos numéricos verificados (`BALANCE`, `MINIMUM_PAYMENT`, `INSTALLMENT`, `RATE`) manteniendo todos los controles de evidencia (`UNVERIFIED_VALUES`, `UNKNOWN_DOCUMENT_PERIOD`, `MISSING_OR_AMBIGUOUS_FIELD`, `OBLIGATION_LINK_REQUIRED_FOR_COMPARISON`), tanto el análisis individual (`103`–`104`) como la comparación compuesta de 2 dominios (`115`–`117`) y la consulta compuesta de 3 dominios (`108`–`111`) alcanzaron `functionalStatus=COMPLETE` cuando todos los hechos del documento son `VERIFIED`, conservando `PARTIAL` cuando faltan datos o unidades.

## CHRONOS, MCP y confirmación humana

Topología probada: LUMEN → herramienta backend con alcance → WorkspaceCalendarGateway → webhook CHRONOS → nodo nativo MCP Client → servidor MCP del laboratorio → Calendar simulado.

El servidor usa el SDK MCP instalado, transporte Streamable HTTP y mensajes JSON-RPC. Las trazas registran `initialize`, `notifications/initialized`, `tools/list` y `tools/call` de `calendar_availability`. Una llamada a `calendar_create` fue rechazada por el servidor: esa herramienta no se anuncia ni se permite. No es un nodo REST renombrado.

La propuesta y su código se persisten en `support_bookings`; la confirmación definitiva continúa en AEGIS. Las operaciones de efecto del proveedor simulado quedan detrás del gateway determinista y no son herramientas MCP del modelo. Se probó `PROPOSED` sin creación, confirmación, repetición sin segunda creación y rechazo 404 desde otro propietario sintético.

El proveedor simulado confirma la existencia del evento sin afirmar que exista Google Meet. Por ello el estado termina en `PENDING_MEET`; la aceptación completa de una reserva con Meet real permanece fuera del alcance autorizado.

Gmail: `WorkspaceDraftService` valida sesión activa, propietario, estado `PROPOSED`, vigencia y plantilla permitida; obtiene cifras del backend y llama al workflow de borrador. El adaptador implementa createDraft con idempotencia por propuesta. La interfaz permite preparar y revisar el contenido antes de confirmar la propuesta persistente. La confirmación deja un evento pendiente en el outbox; el envío real permanece deshabilitado. El borrador no sustituye la propuesta.

## Defectos corregidos durante la ejecución

- Asociación de la credencial Gemini ausente en las plantillas portables al importarlas en una instancia nueva.
- Enrutamiento de “registrar una nueva deuda” y singular “obligación”.
- Distinción de consulta documental privada frente a documentación conceptual pública y obligación de completar ambas delegaciones seleccionadas en el caso compuesto.
- Respuesta del cliente MCP: n8n puede entregar el texto JSON ya convertido a objeto.
- Referencias de LUMEN: fechas, códigos y fuentes requieren evidencia emitida; no se aceptan identificadores inventados.
- Instrucción contradictoria que proponía asesorías al consultar disponibilidad. Se separaron ambas acciones y AEGIS rechaza proponer en una petición de solo disponibilidad.
- Presentación determinista del código de confirmación persistido cuando el supervisor omite la instrucción humana.
- Grounding financiero: reconocimiento de intereses, ahorro, meses, presupuesto, pago base y fechas de pago. Se mantienen pruebas negativas para impedir intercambiar saldos, tasas, intereses totales y ahorro.
- Grounding y reclamos de `supportBooking` / `workspaceProposal` (corregido en continuidad por Antigravity): `AssistantAnalysisService.groundExactLiterals` ahora ancla los componentes de fecha (`YYYY-MM-DD`) y hora (`HH:mm`, `HH:mm:ss`) de `supportBooking/start`, `supportBooking/end` y `supportBooking/expiresAt`; `FinancialClaimGrounding.permits` autoriza hechos de `supportBooking/*` y `workspaceProposal/*` y mapea `/start`, `/end` y `/expiresAt` al concepto `date`; y `AssistantService.finishDelegation` propaga los hechos emitidos de soporte a `updatedRefs`, permitiendo que tanto la consulta de disponibilidad MCP (ejecuciones 95–97) como la propuesta de asesoría (ejecuciones 98–100) finalicen con `functionalStatus=COMPLETE`.
- Descomposición documental en `DocumentFactExtractor` / `DocumentFactAnalysis` y soporte compuesto de 3 dominios (`ORACLE` + `ATLAS` + `LUMEN`): extracción verificada de `"Tasa de interes efectiva anual"` (`EA`) y `"Entidad financiera"`, descomposición de análisis/comparación de extractos en hechos numéricos verificados sin eliminar controles de evidencia, limpieza de filtros `identificationType` no solicitados en la pregunta, normalización de citas `/context` y `/quote` hacia su hecho hermano `/numericValue` o `/literal`, y ajuste de reserva en `AssistantProviderGate` (`Math.min(15, ...)`) junto con `supportGuide/paymentRegistration` para permitir consultas compuestas de tres especialistas cognitivos en un solo turno.

## Secuencia de aceptación verificada en navegador y n8n

| Escenario | Consulta / Acción | Ejecuciones n8n | Especialistas / Flujos | Estado funcional |
|---|---|---|---|---|
| A — Determinista | `¿Qué deudas tengo registradas?` | 0 (ruta directa Spring) | `AssistantService` (`intent=debts`) | `COMPLETE` (HTTP 200) |
| B — Financiero | `¿Cuál de mis deudas debería pagar primero y por qué?` | `82` (`NEXUS`), `83` (`ATLAS`) | `NEXUS` → `ATLAS` | `COMPLETE` (HTTP 200) |
| C — Conceptual RAG | `Explícame la estrategia de avalancha y cómo funciona.` | `19` (`NEXUS`), `20` (`ORACLE`), `21` (`ceroaRagEmbedding03`) | `NEXUS` → `ORACLE` (RAG aprobado) | `COMPLETE` (HTTP 200) |
| D — Soporte operativo | `¿Cómo puedo registrar una nueva deuda en Ceroa?` | `22` (`NEXUS`), `23` (`LUMEN`) | `NEXUS` → `LUMEN` (`supportGuide`) | `COMPLETE` (HTTP 200) |
| E — Documental individual | `Analiza el extracto financiero que cargué.` (enfocado en `statement.pdf`) | `93`–`94` (`PARTIAL` previo); `103` (`NEXUS`), `104` (`ORACLE`) | `NEXUS` → `ORACLE` (`FACT_ANALYSIS` sobre doc `d26f7f5e-...`) | `COMPLETE` (HTTP 200, 4 hechos `VERIFIED` y fuente adjunta) |
| F — Compuesto (2 dominios) | `Compara mi extracto financiero con mis obligaciones registradas y dime qué deuda debería priorizar.` | `36`–`38` (`PARTIAL` previo); `115` (`NEXUS`), `116` (`ORACLE`), `117` (`ATLAS`) | `NEXUS` → `ORACLE` + `ATLAS` | `COMPLETE` (HTTP 200, fuente adjunta) |
| F+ — Compuesto (3 dominios) | `Compara mi extracto financiero con mis obligaciones registradas para decirme qué deuda priorizar y explícame cómo registrar un pago en Ceroa.` | `108` (`NEXUS`), `109` (`ORACLE`), `110` (`ATLAS`), `111` (`LUMEN`) | `NEXUS` → `ORACLE` + `ATLAS` + `LUMEN` (validado por `AEGIS`) | `COMPLETE` (HTTP 200, 3 dominios y fuente adjunta) |
| G — Seguimiento contextual | `¿Y cuánto ahorraría si pago primero esa deuda?` | `84` (`NEXUS`), `85` (`ATLAS`) | `NEXUS` → `ATLAS` (`strategy/comparison`) | `COMPLETE` (HTTP 200) |
| H — Abstención | `¿Cuál es la capital de Japón?` | `41` (`NEXUS`) | `NEXUS` (0 delegaciones) | `INSUFFICIENT` (HTTP 200) |
| Soporte sin Calendar | `Quiero solicitar una asesoría financiera.` | `43` (`NEXUS`), `44` (`LUMEN`) | `NEXUS` → `LUMEN` (0 llamadas Calendar) | `COMPLETE` (HTTP 200) |
| Disponibilidad MCP | `Consulta disponibilidad para una asesoría el próximo lunes a las 10:00 de Bogotá.` | `95` (`NEXUS`), `96` (`LUMEN`), `97` (`CHRONOS` MCP) | `NEXUS` → `LUMEN` → `CHRONOS` (`mcpClient` → `/mcp`) | `COMPLETE` (HTTP 200) |
| Propuesta de asesoría | `Propón una asesoría para ese horario.` | `98` (`NEXUS`), `99` (`LUMEN`), `100` (`CHRONOS` MCP) | `NEXUS` → `LUMEN` → `CHRONOS` (`PROPOSED`, código `PGYWOYTBKHCGOPSUHSGF`) | `COMPLETE` (HTTP 200) |
| Confirmación HITL + Idempotencia | `Confirmar asesoria PGYWOYTBKHCGOPSUHSGF` (enviado 2 veces) | `101` (`CHRONOS` MCP), `102` (`CHRONOS` create) | `AEGIS` → `CHRONOS` (`PENDING_MEET`, sin duplicado en el 2.º envío) | `COMPLETE` (HTTP 200) |
| Gmail `createDraft` HITL | `Envíame un resumen financiero a mi correo` (propuesta determinista en `workspaceMessage`) + `Preparar borrador para revisar` | `24` (`ceroaDemoDraft` — `AEGIS` draft simulado) | `workspaceMessage` (`PROPOSED` `GNNVFAJBVFESWETG`) → `AEGIS` (`DRAFT_READY`, `SIMULATED`) → `CONFIRMED` | `COMPLETE` (HTTP 200) |

## Evidencia y límites

[Historial redactado y correlación](benchmarks/ceroa-functional-2026-11-14/executions.json), [matriz MAS actualizada](CEROA_MULTIAGENT_VALIDATION.md). Los payloads completos, sesiones de navegador y capturas sintéticas permanecen en `tmp/functional-demo`, fuera de Git.

La historia corresponde al servidor n8n real, con estados finales y `stoppedAt`, no a `n8n execute` por CLI. El extracto relaciona cada pregunta, requestId, workflows, nodos, herramientas, tiempos y executionId. El código HTTP y el estado técnico `success` de n8n no reemplazan `functionalStatus`: los intentos recuperados que devolvieron `FAILED` o `PARTIAL` se conservan en la evidencia.

Se verificó inicio de sesión y navegación real por dashboard, deudas, estrategia, simulador, perfil, chat y biblioteca. No se declara una conversación completa aprobada por existir únicamente pruebas unitarias. Las cuentas y datos son sintéticos; no se ejecutaron efectos operativos ni los siete eventos Sheets pendientes. El entorno queda levantado para revisión manual.


## Actualización posterior Codex: RC1 validado

La demo ahora ejecuta exactamente RC1 (SHA-256 4C2F954C53399AE5B8F1E050F5EC10AA0C0CE0A2B39187A744105422010C7004). Compose/demo.ps1 lo seleccionan por defecto; CEROA_DEMO_BACKEND_JAR permite volver al candidato anterior sin sobrescribirlo. Los resultados históricos anteriores no son pruebas de RC1. Véanse [regresiones nuevas, configuración efectiva y límites](CEROA_CODEX_FINAL_RELEASE_VALIDATION.md). Calendar/Gmail/Storage siguen simulados; Gemini, PostgreSQL/pgvector y n8n son reales.
