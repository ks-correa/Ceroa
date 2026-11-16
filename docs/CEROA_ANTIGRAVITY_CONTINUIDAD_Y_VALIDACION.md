# CEROA AI — Informe de Continuidad (Codex → Antigravity) y Validación Integral

> Nota de vigencia RC2 (14/11/2026): este informe conserva observaciones históricas. El candidato actual, las correcciones R1/R2 y el estado del PR se documentan en [validación final RC2](CEROA_RC2_CORRECCIONES_Y_VALIDACION_FINAL.md). El Grant es autorizado y ligado al servidor, sin firma HMAC/JWS; la ruta actual es `POST /api/v1/workspace-actions/{code}/draft`.

**Fecha:** 14 de noviembre de 2026 (`America/Bogota`)
**Rama Git:** `docs/ceroa-ai-architecture`
**Commit base (`HEAD` / `origin/main`):** `8c6ac23939211228e58112e92b010bd675f7ba86`
**Estado de Git:** Sin *commit* ni *push* automáticos; todos los cambios de Codex y Antigravity permanecen en el árbol de trabajo local listos para revisión.

---

## 1. Estado inicial encontrado al recibir el proyecto desde Codex

Al asumir la continuidad del proyecto en `C:/Users/User/Desktop/Ceroa`, se ejecutó primero una auditoría no destructiva del entorno:

- **Git:** Rama `docs/ceroa-ai-architecture` posicionada en `8c6ac23` (`Close Ceroa technical audit and block 12 readiness`), coincidiendo exactamente con `origin/main` y `origin/docs/ceroa-ai-architecture`, con **21 archivos modificados bajo seguimiento** y **22 rutas nuevas sin seguimiento** (cero archivos en *staging*).
- **Procesos activos:** Ningún proceso residual de Codex estaba ejecutándose sobre el árbol de trabajo al momento del relevo (última escritura de Codex registrada a las `15:45:23 -05:00` en `tmp/functional-demo/acceptance-sequence.json`).
- **Docker y contenedores:**
  - El stack operativo original `ceroa` (`ceroa-backend`, `ceroa-frontend`, `ceroa-n8n`) permanecía detenido (`Exited (8)` desde hacía 4–5 días), preservando intactos sus contenedores, volúmenes (`ceroa_n8n_data`) y la base de datos productiva Supabase (PostgreSQL 17.6 en Flyway `V30`).
  - El artefacto candidato validado del Bloque 12 (`tmp/block10-build-results/ceroa-backend-0.1.0-SNAPSHOT.jar`) conservaba intacto su hash `SHA-256: dbc8b235ecc7cb94934c88037729cc903e7dbd66eaf0608f33f7290e3f248b8b`.
  - Codex había levantado un entorno funcional aislado de demostración (`docker-compose.demo.yml`, proyecto `ceroa-demo`) con **5 contenedores activos y saludables**, expuestos únicamente en loopback (`127.0.0.1`):
    - `ceroa-demo-frontend-1` → `127.0.0.1:3001->3000/tcp`
    - `ceroa-demo-backend-1` → `127.0.0.1:8081->8080/tcp`
    - `ceroa-demo-n8n-1` → `127.0.0.1:5679->5678/tcp`
    - `ceroa-demo-db-1` → `pgvector/pgvector:pg17` (red interna `ceroa-demo_default`, base `ceroa_demo` con Flyway `V1`–`V31` aplicado)
    - `ceroa-demo-adapter-1` → `node /scripts/adapter.cjs` (red interna `ceroa-demo_default`, puertos internos `3100` HTTP para MCP Streamable HTTP / Calendar / Gmail `createDraft` y `3443` HTTPS para Storage privado simulado).

---

## 2. Inventario clasificado de actividades previas

| Actividad / Componente | Estado al recibir de Codex | Estado final tras Antigravity | Evidencia principal |
|---|---|---|---|
| Recuperación B12, verificación de 3 respaldos WSL cifrados y preflight Supabase V30 | **COMPLETADA Y VERIFICADA** | **COMPLETADA Y VERIFICADA** | `docs/CEROA_RECUPERACION_Y_VALIDACION_INTEGRADA.md`, `docs/benchmarks/ceroa-recovery-2026-11-14/summary.json` |
| Identidad académica oficial (`NEXUS`, `ATLAS`, `ORACLE`, `LUMEN`, `CHRONOS`, `AEGIS`) y parche selectivo | **COMPLETADA Y VERIFICADA** | **COMPLETADA Y VERIFICADA** | `integrations/n8n/ceroa-identity.mjs`, `integrations/n8n/prepare-identity-update.mjs` |
| Entorno aislado `ceroa-demo` (`docker-compose.demo.yml` + `integrations/demo/demo.ps1`) | **COMPLETADA Y VERIFICADA** | **COMPLETADA Y VERIFICADA** | `docker-compose.demo.yml`, `integrations/demo/demo.ps1` |
| Corpus RAG aprobado (`gemini-embedding-001` 768 dims) + PDF sintético `statement.pdf` (`INDEXED` v2, vinculado a deuda) | **COMPLETADA Y VERIFICADA** | **COMPLETADA Y VERIFICADA** | `integrations/demo/seed-knowledge.cjs`, `tmp/functional-demo/hybrid-search.json` |
| `CHRONOS` MCP Server (`Streamable HTTP` JSON-RPC `/mcp`) + nodo `@n8n/n8n-nodes-langchain.mcpClient` | **COMPLETADA Y VERIFICADA** | **COMPLETADA Y VERIFICADA** | `integrations/demo/adapter.cjs`, `integrations/demo/prepare-extensions.mjs`, `tmp/functional-demo/mcp-traces.json` |
| Flujo `AEGIS` Gmail `createDraft` HITL (`WorkspaceDraftController`, `WorkspaceDraftService`, `AssistantFab.tsx`, `ceroaDemoDraft`) | **COMPLETADA Y VERIFICADA** | **COMPLETADA Y VERIFICADA** | `tmp/functional-demo/gmail-ui.json`, ejecución n8n `24` |
| Escenarios Gemini reales A (`debts`), B (`ATLAS`), C (`ORACLE` conceptual), D (`LUMEN` soporte), F (`ORACLE`+`ATLAS`), G (contexto), H (abstención) y soporte sin Calendar | **COMPLETADA Y VERIFICADA** | **COMPLETADA Y VERIFICADA** | Ejecuciones n8n `19`–`23`, `36`–`38`, `41`, `43`–`44`, `82`–`85` |
| Consulta de disponibilidad MCP (`LUMEN` → `CHRONOS`) y propuesta de asesoría (`LUMEN` → `CHRONOS`) desde el navegador | **FALLIDA** (`400 ASSISTANT_INVALID_INPUT` en `Validar resultado en Spring Boot`, ejecuciones `86`–`92`) | **COMPLETADA Y VERIFICADA** (`200 OK`, `functionalStatus=COMPLETE`, ejecuciones `95`–`100`) | Corrección en `FinancialClaimGrounding.java`, `AssistantAnalysisService.java` y `AssistantService.java`; `tmp/functional-demo/antigravity-sequence.json` |
| Confirmación humana determinista (`Confirmar asesoria <CODE>`) e idempotencia ante doble confirmación | **BLOQUEADA** (no alcanzada en `acceptance-sequence.json` por el fallo previo de propuesta) | **COMPLETADA Y VERIFICADA** (`200 OK`, `PENDING_MEET`, ejecuciones `101`–`102` y 2.º envío idempotente) | `tmp/functional-demo/antigravity-sequence.json` (`confirm-0`, `confirm-1`) |
| Escenario E — Análisis documental individual enfocado en el extracto cargado (`NEXUS` → `ORACLE`) | **PENDIENTE** (no ejecutado por Codex) | **COMPLETADA Y VERIFICADA** (`200 OK`, `PARTIAL` histórico en `93`–`94`; `COMPLETE` en `103`–`104` tras descomposición en 4 hechos verificados) | `tmp/functional-demo/stabilized-mas04.png`, `tmp/functional-demo/stabilization-sequence.json` |
| Consulta compuesta de 3 dominios cognitivos (`NEXUS` → `ORACLE` + `ATLAS` + `LUMEN`, validada por `AEGIS`) | **PENDIENTE** | **COMPLETADA Y VERIFICADA** (`200 OK`, `functionalStatus=COMPLETE`, ejecuciones `108`–`111`) | `tmp/functional-demo/stabilized-mas17-3domain.png`, `tmp/functional-demo/stabilization-sequence.json` |
| Casos negativos HITL de `AEGIS` y aislamiento entre propietarios en `ceroa-demo` (código inválido, expirado, estado ambiguo, otro propietario en Calendar/Gmail/Documentos) | **IMPLEMENTADA PERO NO PROBADA** en `ceroa-demo` vivo | **COMPLETADA Y VERIFICADA** | `tmp/functional-demo/aegis-hitl-and-isolation.json` |
| Suite de pruebas Node (`51/51`) y batería completa Java (`452` registradas, `418` ejecutadas, `34` omitidas, `0` fallos) | **FALLIDA** (1 test en `ceroa-identity.test.mjs` desincronizado) | **COMPLETADA Y VERIFICADA** (`51/51` Node y `418/418` Java ejecutadas aprobadas) | `integrations/n8n/ceroa-identity.test.mjs`, suite Maven Temurin 25 |
| Exportación pública redactada `docs/benchmarks/ceroa-functional-2026-11-14/executions.json` y actualización de `docs/CEROA_MULTIAGENT_VALIDATION.md` | **PENDIENTE** (enlace roto en `docs/CEROA_DEMO_FUNCIONAL.md`) | **COMPLETADA Y VERIFICADA** (`117` ejecuciones exportadas sin secretos y correlacionadas con sus IDs reales) | `docs/benchmarks/ceroa-functional-2026-11-14/executions.json`, `docs/CEROA_MULTIAGENT_VALIDATION.md` |

---

## 3. Actividades que ya estaban completadas por Codex

1. **Fase de recuperación y verificación en frío (13:53–14:24):**
   - Verificación criptográfica en memoria de los tres respaldos cifrados de WSL (`tmp/ceroa-recovery/backup-memory.json`).
   - Comprobación de que Supabase productivo sigue en Flyway `V30` sin aplicar `V31`.
   - Creación de `integrations/n8n/ceroa-identity.mjs` y `integrations/n8n/prepare-identity-update.mjs` para renombrar de forma segura los agentes a `NEXUS`, `ATLAS`, `ORACLE`, `LUMEN`, `CHRONOS` y `AEGIS`.
2. **Construcción del entorno funcional aislado `ceroa-demo` (15:00–15:38):**
   - Definición de `docker-compose.demo.yml` e `integrations/demo/demo.ps1`.
   - Creación del adaptador `integrations/demo/adapter.cjs` con servidor MCP (`@modelcontextprotocol/sdk` sobre `StreamableHTTPServerTransport`), endpoints simulados de Calendar (`/calendar/availability`, `/calendar/create`, `/calendar/get`, `/calendar/delete`), endpoint simulado de Gmail (`/gmail/createDraft`) y servidor HTTPS privado de Storage compatible con Supabase Storage (`/storage/v1/object/sign/...`).
   - Implementación de `WorkspaceDraftController.java` y `WorkspaceDraftService.java` en el backend y de la tarjeta de revisión de borrador en `frontend/src/components/assistant/AssistantFab.tsx`.
   - Sembrado de los 4 fragmentos del corpus aprobado con embeddings reales `gemini-embedding-001` y carga, indexación, vinculación y reindexación (v2) del extracto bancario sintético `statement.pdf` (`Banco Andino`, saldo `COP 5.240.000`, tasa `28,70% EA`, pago mínimo `COP 310.000`).
   - Ejecución exitosa con Gemini real de los escenarios A, B, C, D, F, G, H, soporte informativo sin Calendar y Gmail `createDraft`.

---

## 4. Actividades que estaban incompletas, pendientes o con fallo

1. **Fallo de validación (`400 Bad Request — ASSISTANT_INVALID_INPUT`) en `LUMEN` al consultar disponibilidad y al proponer asesoría (ejecuciones `86`–`92`):**
   - Al responder a `"Consulta disponibilidad para una asesoría el próximo lunes a las 10:00 de Bogotá."` y `"Propón una asesoría para ese horario."`, `LUMEN` incluía la hora `"10:00"` en prosa junto al marcador `{{f16}}` (`2026-11-16T10:00:00-05:00`) y redactaba `"fecha de finalización {{f18}}"`.
   - `AssistantAnalysisService.groundExactLiterals` solo registraba la cadena ISO completa (`2026-11-16T10:00:00-05:00`) y no sus subcomponentes de fecha (`2026-11-16`) ni hora (`10:00`, `10:00:00`), por lo que `"10:00"` quedaba como dígito literal no anclado y lanzaba `IllegalArgumentException("Respuesta con cifras sin evidencia: [10, 00]")`.
   - Adicionalmente, `FinancialClaimGrounding.permits` no mapeaba los sufijos `/start`, `/end` ni `/expiresAt` al concepto `date` ni permitía de forma directa la familia `supportBooking/*` / `workspaceProposal/*`, rechazando `"fecha de finalización {{f18}}"`.
2. **Confirmación humana determinista e idempotencia (`Confirmar asesoria <CODE>`):**
   - No había podido ejecutarse en la secuencia final de aceptación porque el paso previo de propuesta devolvió `FAILED`.
3. **Escenario E (Análisis documental individual de extracto):**
   - No había sido ejecutado desde el navegador enfocando la conversación en el archivo `statement.pdf`.
4. **Desincronización de plantillas JSON portables con `ceroa-identity.test.mjs`:**
   - Codex modificó `integrations/n8n/multiagent-workflows.mjs` a las 15:39 sin regenerar `multiagent-query.json`, `financial-agent.json`, `knowledge-agent.json` y `support-agent.json`, causando 1 fallo al correr `node --test`.
5. **Artefacto de evidencia faltante (`docs/benchmarks/ceroa-functional-2026-11-14/executions.json`):**
   - Referenciado en `docs/CEROA_DEMO_FUNCIONAL.md` pero aún no generado en `docs/benchmarks/`.

---

## 5. Actividades ejecutadas por Antigravity

1. **Corrección del *grounding* y validación de reclamos para `supportBooking/*` y `workspaceProposal/*` en el backend:**
   - En `backend/src/main/java/com/ceroa/service/FinancialClaimGrounding.java`: se autorizaron explícitamente las rutas `supportBooking/*` y `workspaceProposal/*` en `permits(...)` y se añadieron `start|end|expiresAt|dueDate|nextDueDate` al patrón de conceptos de fecha (`sourceConcept = "date"`).
   - En `backend/src/main/java/com/ceroa/service/AssistantAnalysisService.java`: en `groundExactLiterals(...)`, para hechos textuales `supportBooking/(?:start|end|expiresAt)`, se añadieron como literales candidatos la fecha (`YYYY-MM-DD`) y la hora (`HH:mm` y `HH:mm:ss`) para que menciones de hora como `"10:00"` se anclen automáticamente a su `{{fID}}` emitido.
   - En `backend/src/main/java/com/ceroa/service/AssistantService.java`: en `finishDelegation(...)`, para el rol `SUPPORT`, se garantizó la propagación de todos los hechos emitidos de `supportBooking/*` y `workspaceProposal/*` hacia `updatedRefs` (y por tanto hacia `job.runtime.shared` para `NEXUS`).
   - En `backend/src/test/java/com/ceroa/service/FinancialProjectionGroundingTest.java`: se agregó la prueba unitaria `supportBookingDateTimeAndLiteralsArePermittedAndGrounded` (`6/6` tests aprobados).
2. **Compilación aislada y actualización del contenedor `ceroa-demo-backend-1`:**
   - Se compiló y empaquetó `tmp/functional-demo/backend-delivery.jar` usando `maven:3.9.11-eclipse-temurin-25` con `--network none` sobre `tmp/ceroa-recovery/java`, sin tocar `backend/target` ni alterar el candidato B12 (`SHA-256: DBC8B235ECC7CB94934C88037729CC903E7DBD66EAF0608F33F7290E3F248B8B`), y se reinició `ceroa-demo-backend-1`.
3. **Sincronización de plantillas n8n y verificación de las 51/51 pruebas Node:**
   - Se regeneraron `multiagent-query.json`, `financial-agent.json`, `knowledge-agent.json` y `support-agent.json` a partir de `multiagent-workflows.mjs` y se verificó el pase de las **51/51 pruebas de Node** (`0` fallos).
4. **Ejecución en navegador (Playwright Chromium) del Escenario E y de la secuencia completa `LUMEN` + `CHRONOS` MCP + `AEGIS` HITL:**
   - Se ejecutó el Escenario E (`Analiza el extracto financiero que cargué.` con el documento `d26f7f5e-1d94-4fdd-b301-8bd9ad5dea7a` enfocado desde la Biblioteca Documental), obteniendo `200 OK` (ejecuciones `93`–`94`).
   - Se ejecutó la consulta de disponibilidad MCP (`Consulta disponibilidad para una asesoría el próximo lunes a las 10:00 de Bogotá.`), obteniendo `200 OK` y `functionalStatus=COMPLETE` (ejecuciones `95`–`97`).
   - Se ejecutó la propuesta de asesoría (`Propón una asesoría para ese horario.`), obteniendo `200 OK`, `functionalStatus=COMPLETE` y el código `PGYWOYTBKHCGOPSUHSGF` (ejecuciones `98`–`100`).
   - Se ejecutó dos veces seguidas `Confirmar asesoria PGYWOYTBKHCGOPSUHSGF`, verificando la creación en el primer envío (`PENDING_MEET`, ejecuciones `101`–`102`) y la respuesta idempotente sin nueva creación en el segundo envío.
5. **Verificación de casos negativos HITL de `AEGIS` y aislamiento entre propietarios en vivo:**
   - Se probaron con sesiones autenticadas reales de `demo@ceroa.local` y `other@ceroa.local` los casos de código inexistente (`404`), propuesta expirada (`409`), estado ambiguo del proveedor (`AMBIGUOUS`, `200 OK` sin recreación), confirmación cruzada de asesoría por otro propietario (`404`), preparación cruzada de borrador Gmail por otro propietario (`404`) y lectura/descarga/búsqueda cruzada de documentos privados por otro propietario (`404` y `0` resultados).
6. **Exportación de telemetría redactada y actualización documental:**
   - Se exportaron las **102 ejecuciones** del servidor n8n a `docs/benchmarks/ceroa-functional-2026-11-14/executions.json` (verificando ausencia total de claves o secretos) y se actualizaron `docs/CEROA_DEMO_FUNCIONAL.md`, `docs/CEROA_MULTIAGENT_VALIDATION.md` y el presente informe.

---

## 6. Arquitectura multiagente verificada

La arquitectura implementada y verificada en ejecución real dentro de n8n (`http://localhost:5679`) y Spring Boot (`http://localhost:8081`) cumple la correspondencia académica de **CEROA AI — Multi-Agent Financial Intelligence Ecosystem**:

| Agente Ceroa | Equivalente académico | Workflow ID / Componente | Rol y herramientas verificadas |
|---|---|---|---|
| **NEXUS — Supervisor & Intelligent Router** | Pepper Potts | `ceroaHybridQuery20` (`CEROA AI \| NEXUS — Supervisor & Router`) | AI Agent nativo con `Gemini Ceroa` (`ai_languageModel`), `Contrato de respuesta` (`ai_outputParser`) y únicamente 3 `toolWorkflow` (`Delegar a ATLAS`, `Delegar a ORACLE`, `Delegar a LUMEN`). Sin herramientas directas de lectura/escritura privada (no es un *God Agent*). |
| **ATLAS — Financial Intelligence Agent** | FRIDAY | `ceroaFinancialAgent30` (`CEROA AI \| ATLAS — Financial Intelligence`) | Especialista nativo conectado a `Consultar datos financieros`, `Calcular con evidencia`, `Consultar documentos financieros` (`FACT_ANALYSIS`), `Simular escenario hipotético`, `Consultar sobrecapacidad` y `Proponer correo autorizado`. Cero aritmética mental; cifras validadas por `FinancialClaimGrounding`. |
| **ORACLE — Knowledge & RAG Agent** | JARVIS | `ceroaKnowledgeAgent30` (`CEROA AI \| ORACLE — Knowledge & RAG`) | Especialista nativo conectado a `Consultar documentos financieros` (extractos privados, `FACT_ANALYSIS` / `PERIOD_ANALYSIS` / `HYBRID_SEARCH`) y `Consultar documentación aprobada` (RAG híbrido PostgreSQL + `pgvector` con `gemini-embedding-001`). |
| **LUMEN — Customer Experience & Support Agent** | Especialista de soporte | `ceroaSupportAgent30` (`CEROA AI \| LUMEN — Customer Experience & Support`) | Especialista nativo conectado a `Consultar documentación aprobada`, `Proponer correo autorizado` (`SUBSCRIPTION_INFO`) y las herramientas de agendamiento `consultar_disponibilidad_soporte`, `proponer_asesoria`, `consultar_asesoria` y `cancelar_asesoria`. No invoca Calendar en consultas informativas. |
| **CHRONOS — Scheduling & External Integration** | VERONICA | `ceroaDemoChronos` (`CEROA AI \| CHRONOS — Calendar MCP (SIMULATED)`) + plantillas `ceroaWorkspaceCalendar40` / `ceroaMcpClient40` / `ceroaMcpSupport40` | Frontera arquitectónica explícita sin LLM redundante: utiliza el nodo oficial `@n8n/n8n-nodes-langchain.mcpClient` (`httpStreamable`) hacia el servidor MCP (`http://adapter:3100/mcp`) para `calendar_availability` y delega las operaciones de efecto (`create`, `get`, `delete`) bajo autorización determinista de `AEGIS`. |
| **AEGIS — Governance, Security & Human-in-the-Loop** | ULTRON | `ceroaDemoDraft` (`CEROA AI \| AEGIS — Gmail createDraft (SIMULATED)`) + `AgentRuntime`, `FinancialClaimGrounding`, `SupportBookingService` y `WorkspaceDraftService` | Autoridad determinista transversal en Spring Boot y n8n: emisión de `scopeToken` efímero por delegación, validación de evidencia `{{fID}}` y reclamos financieros, aislamiento por `ownerId`, códigos de confirmación humana con expiración e idempotencia. |

---

## 7. Estado del entorno local

Los servicios del entorno de demostración `ceroa-demo` quedan **levantados y operativos** en `127.0.0.1`, completamente separados del stack productivo detenido `ceroa`:

| Contenedor | Imagen | Estado | Puerto expuesto (loopback) | Función |
|---|---|---|---|---|
| `ceroa-demo-frontend-1` | `ceroa-frontend:block6` | `Up` | `127.0.0.1:3001->3000/tcp` | Interfaz web React 19 / Vite con las 5 secciones principales, asistente y biblioteca documental |
| `ceroa-demo-backend-1` | `ceroa-backend:latest` (con `backend-delivery.jar` montado) | `Up` | `127.0.0.1:8081->8080/tcp` | API REST Spring Boot 3.5 / Java 25, Swagger UI y gobernanza `AEGIS` |
| `ceroa-demo-n8n-1` | `docker.n8n.io/n8nio/n8n:stable` (`2.40.7`) | `Up` | `127.0.0.1:5679->5678/tcp` | Orquestador multiagente `NEXUS`, especialistas `ATLAS`/`ORACLE`/`LUMEN`, `CHRONOS` MCP y `AEGIS` Draft |
| `ceroa-demo-db-1` | `pgvector/pgvector:pg17` (`17.11`) | `Up (healthy)` | Red interna (`5432/tcp`) | Base de datos sintética `ceroa_demo` con Flyway `V1`–`V31` y vectores de 768 dimensiones |
| `ceroa-demo-adapter-1` | `docker.n8n.io/n8nio/n8n:stable` (`node /scripts/adapter.cjs`) | `Up` | Red interna (`3100/tcp`, `3443/tcp`) | Servidor MCP Streamable HTTP (`/mcp`), Calendar simulado, Gmail `createDraft` simulado y Storage HTTPS simulado |

---

## 8. Resultados con Gemini real (Escenarios A a H y adicionales)

Todas las consultas con modelo utilizaron la credencial real de Gemini configurada en el volumen aislado de n8n (`Gemini authorized demo`, `gemini-2.5-flash` y `gemini-embedding-001`), respetando las pausas de enfriamiento del limitador `AssistantProviderGate`:

| Escenario | Pregunta exacta | Ruta / Agentes ejecutados | `executionId` n8n | `functionalStatus` | Resultado verificado |
|---|---|---|---|---|---|
| **A — Determinista** | `¿Qué deudas tengo registradas?` | `Spring Boot` directo (`intent=debts`, 0 llamadas a n8n/Gemini) | N/A (ruta directa) | `COMPLETE` | Lista las 3 obligaciones sintéticas de `demo@ceroa.local` (`Tarjeta principal`, `Préstamo vehículo`, `Crédito de libre inversión` / `Compra de computador`) sin invocar el LLM. |
| **B — Financiero (`ATLAS`)** | `¿Cuál de mis deudas debería pagar primero y por qué?` | `NEXUS` → `ATLAS` (`Consultar datos financieros`) | `82` (`NEXUS`), `83` (`ATLAS`) | `COMPLETE` | Recomienda priorizar `Tarjeta principal` bajo la estrategia `Avalancha` citando su saldo (`5.240.000`) y su tasa más alta (`28,7% EA`). |
| **C — Conocimiento aprobado (`ORACLE`)** | `Explícame la estrategia de avalancha y cómo funciona.` | `NEXUS` → `ORACLE` (`Consultar documentación aprobada`) | `19` (`NEXUS`), `20` (`ORACLE`), `21` (`ceroaRagEmbedding03`) | `COMPLETE` | Explica el método Avalancha usando exclusivamente los fragmentos aprobados de la base vectorial (`Fuentes: • Estrategias de amortización en Ceroa`). |
| **D — Soporte operativo (`LUMEN`)** | `¿Cómo puedo registrar una nueva deuda en Ceroa?` | `NEXUS` → `LUMEN` (`supportGuide/debtRegistration`) | `22` (`NEXUS`), `23` (`LUMEN`) | `COMPLETE` | Indica los pasos exactos en la sección `Deudas` → `Nueva deuda` y los campos requeridos, respaldado por `supportGuide`. |
| **E — Documento individual (`ORACLE`)** | `Analiza el extracto financiero que cargué.` (enfocado en `statement.pdf`) | `NEXUS` → `ORACLE` (`Consultar documentos financieros`) | `93`–`94` (`PARTIAL` previo); `103` (`NEXUS`), `104` (`ORACLE`) | `COMPLETE` | Extrae los 4 hechos verificados de `Banco Andino` (`Entidad financiera: Banco Andino`, `Saldo actual: 5.240.000 COP`, `Tasa de interes efectiva anual: 28,7% EA`, `Pago minimo: 310.000 COP`) y adjunta la referencia autenticada `BANK_STATEMENT · Banco Andino · d26f7f5e-1d94-4fdd-b301-8bd9ad5dea7a`. |
| **F — Compuesto 2 dominios (`ORACLE` + `ATLAS`)** | `Compara mi extracto financiero con mis obligaciones registradas y dime qué deuda debería priorizar.` | `NEXUS` → `ORACLE` (`Consultar documentos financieros`) + `ATLAS` (`Consultar datos financieros`) | `36`–`38` (`PARTIAL` previo); `115` (`NEXUS`), `116` (`ORACLE`), `117` (`ATLAS`) | `COMPLETE` | Ejecuta ambos especialistas en una misma solicitud, verifica la coincidencia del saldo `5.240.000 COP`, tasa `28,7% EA` y pago mínimo `310.000 COP` de `Tarjeta principal` con el extracto de `Banco Andino`, prioriza `Tarjeta principal` y adjunta la fuente documental. |
| **F+ — Compuesto 3 dominios (`ORACLE` + `ATLAS` + `LUMEN`)** | `Compara mi extracto financiero con mis obligaciones registradas para decirme qué deuda priorizar y explícame cómo registrar un pago en Ceroa.` | `NEXUS` → `ORACLE` + `ATLAS` + `LUMEN` (validado por `AEGIS`) | `108` (`NEXUS`), `109` (`ORACLE`), `110` (`ATLAS`), `111` (`LUMEN`) | `COMPLETE` | Coordina los tres especialistas cognitivos en un solo turno: `ORACLE` aporta los 4 hechos verificados del extracto de `Banco Andino`, `ATLAS` prioriza las 3 obligaciones registradas por saldo y tasa, y `LUMEN` explica cómo registrar un pago en la sección `Deudas` (`supportGuide/paymentRegistration`), con fuente documental adjunta. |
| **G — Contexto conversacional (`ATLAS`)** | `¿Y cuánto ahorraría si pago primero esa deuda?` | `NEXUS` → `ATLAS` (`Consultar datos financieros` → `strategy/comparison`) | `84` (`NEXUS`), `85` (`ATLAS`) | `COMPLETE` | Resuelve la referencia anafórica a la pregunta anterior y entrega los valores deterministas: `Ahorro en intereses: 80.517. Diferencia de meses: 0.` |
| **H — Abstención controlada** | `¿Cuál es la capital de Japón?` | `NEXUS` (0 delegaciones a especialistas) | `41` (`NEXUS`) | `INSUFFICIENT` | Devuelve exactamente la abstención canónica: `"No tengo información aprobada suficiente para responder esa pregunta."` sin invocar herramientas. |
| **Soporte informativo sin Calendar** | `Quiero solicitar una asesoría financiera.` | `NEXUS` → `LUMEN` (`supportGuide/advisoryProcedure`) | `43` (`NEXUS`), `44` (`LUMEN`) | `COMPLETE` | Explica cómo indicar fecha, hora hábil de Bogotá y tema para solicitar asesoría, con **0 llamadas** a `CHRONOS`/Calendar y `requiresConfirmation=false`. |

---

## 9. Resultados de CHRONOS MCP

Se validó el flujo completo de `CHRONOS` usando el protocolo **Model Context Protocol (MCP)** real sobre transporte **Streamable HTTP** (`@n8n/n8n-nodes-langchain.mcpClient` en `ceroaDemoChronos` → `http://adapter:3100/mcp`):

1. **Trazas de protocolo JSON-RPC verificadas (`tmp/functional-demo/mcp-traces.json`):**
   - Handshake MCP real: `initialize` → `notifications/initialized` → `tools/list` → `tools/call` (`calendar_availability`).
   - El servidor MCP expone únicamente `calendar_availability`; una invocación de prueba a `calendar_create` por MCP fue rechazada con error `Calendar write requires AEGIS confirmation`.
2. **Consulta de disponibilidad desde el navegador (ejecuciones `95`, `96` y `97`):**
   - Consulta: `"Consulta disponibilidad para una asesoría el próximo lunes a las 10:00 de Bogotá."`
   - Recorrido: `NEXUS` (`95`) → `LUMEN` (`96`) → herramienta `consultar_disponibilidad_soporte` → `WorkspaceCalendarGateway` → `CHRONOS` (`97`, nodo `MCP Client Calendar disponibilidad` en `23 ms`) → `Validar respuesta MCP`.
   - Respuesta entregada en la UI (`200 OK`, `functionalStatus=COMPLETE`): confirma disponibilidad del bloque `2026-11-16T10:00:00-05:00` a `2026-11-16T10:30:00-05:00` en `America/Bogota` sin crear ninguna propuesta ni reserva.

---

## 10. Resultados de AEGIS y Human-in-the-Loop

Se verificaron tanto el flujo positivo de propuesta y confirmación como todos los controles negativos y de idempotencia de `AEGIS` (`tmp/functional-demo/antigravity-sequence.json` y `tmp/functional-demo/aegis-hitl-and-isolation.json`):

| Caso de prueba | Entrada / Acción | Resultado HTTP y de negocio | Ejecución n8n |
|---|---|---|---|
| **1. Propuesta válida** | `"Propón una asesoría para ese horario."` | `200 OK` (`functionalStatus=COMPLETE`). Persiste propuesta en `support_bookings` con estado `PROPOSED`, código `PGYWOYTBKHCGOPSUHSGF`, expiración a 10 minutos e instrucción `Confirmar asesoria PGYWOYTBKHCGOPSUHSGF`. No crea evento en Calendar. | `98` (`NEXUS`), `99` (`LUMEN`), `100` (`CHRONOS` MCP) |
| **2. Confirmación humana válida** | `"Confirmar asesoria PGYWOYTBKHCGOPSUHSGF"` (1.er envío) | `200 OK` (`functionalStatus=COMPLETE`, `intent=support`). Ruta determinista en `SupportBookingService.confirm`: verifica disponibilidad MCP (`101`) e invoca `Calendar simulado create` (`102`), actualizando el estado a `PENDING_MEET` (`Horario: 2026-11-16T15:00Z`). | `101` (`CHRONOS` MCP), `102` (`CHRONOS` create) |
| **3. Confirmación duplicada (idempotencia)** | `"Confirmar asesoria PGYWOYTBKHCGOPSUHSGF"` (2.º envío consecutivo) | `200 OK` (`functionalStatus=COMPLETE`). Devuelve el mismo estado `PENDING_MEET` reconciliado sin ejecutar un segundo `Calendar simulado create` (0 eventos duplicados). | Sin nueva creación |
| **4. Código incorrecto / inexistente** | `"Confirmar asesoria CODIGOINEXISTENTEABC"` | `404 Not Found` (`bookings.owned` falla cerrado antes de cualquier llamada a Calendar). | 0 llamadas a n8n |
| **5. Propuesta expirada** | `"Confirmar asesoria EXPIREDBOOKINGCODEAA"` (`expires_at < NOW()`) | `409 Conflict` (`Propuesta vencida`). No invoca Calendar. | 0 llamadas a n8n |
| **6. Otro propietario** | `other@ceroa.local` envía `"Confirmar asesoria PGYWOYTBKHCGOPSUHSGF"` | `404 Not Found`. Un usuario autenticado distinto jamás puede confirmar ni consultar la propuesta de `demo@ceroa.local`. | 0 llamadas a n8n |
| **7. Estado ambiguo del proveedor** | `"Confirmar asesoria AMBIGUOUSBOOKINGCODE"` (`status = AMBIGUOUS`) | `200 OK` con `"Estado de asesoria: AMBIGUOUS. Horario: 2026-11-17T15:00Z."`. Retiene el bloqueo de seguridad sin repetir automáticamente la creación en el proveedor. | Sin recreación |

---

## 11. Resultados de Gmail `createDraft`

Se verificó la extensión controlada de preparación de borrador de Gmail (`WorkspaceDraftController`, `WorkspaceDraftService`, `AssistantFab.tsx` y workflow `ceroaDemoDraft`):

1. **Solicitud de envío por correo (ruta determinista en `AssistantService.workspaceMessage`):**
   - Consulta en UI (`tmp/functional-demo/gmail.cjs`): `"Envíame un resumen financiero a mi correo"`.
   - `AssistantService.workspaceMessage` resuelve determinísticamente la intención de correo en Spring Boot (`workspaceActions.propose(FINANCIAL_SUMMARY)`), generando la propuesta persistente `GNNVFAJBVFESWETG` (`status=PROPOSED`, destinatario fijo `demo@ceroa.local`, `0` llamadas a n8n) y mostrando la instrucción `Confirmar envio GNNVFAJBVFESWETG` y el botón `Preparar borrador para revisar`. *(Nota de correlación: las ejecuciones `15`, `16`, `17` y `18` de n8n corresponden a `ceroaRagEmbedding03` durante el sembrado de los 4 fragmentos del corpus aprobado, no a la propuesta conversacional de correo).*
2. **Preparación y vista previa del borrador Gmail (`createDraft`, ejecución `24`):**
   - Al pulsar `Preparar borrador para revisar` en el panel del asistente (`POST /api/v1/workspace-proposals/GNNVFAJBVFESWETG/gmail-draft`), `WorkspaceDraftService` valida propietario, estado `PROPOSED` y expiración, construye el contenido determinista desde la plantilla aprobada y llama al workflow `CEROA AI | AEGIS — Gmail createDraft (SIMULATED)` (`ceroaDemoDraft`, **ejecución `24`**), que invoca `http://adapter:3100/gmail/createDraft`.
   - Respuesta verificada (`tmp/functional-demo/gmail-ui.json`): `status="DRAFT_READY"`, `provider="SIMULATED"`, `recipient="demo@ceroa.local"`.
   - La interfaz muestra el aviso `"Borrador simulado. No se envían correos."`, el destinatario, el asunto, el cuerpo del mensaje y el botón `Confirmar propuesta`.
3. **Confirmación humana y aislamiento entre propietarios:**
   - Al confirmar (`Confirmar propuesta` / `Confirmar envio GNNVFAJBVFESWETG`), la propuesta pasa a `CONFIRMED` y registra el evento en el outbox local sin enviar correos reales.
   - Cuando `other@ceroa.local` intenta invocar `POST /api/v1/workspace-proposals/GNNVFAJBVFESWETG/gmail-draft`, el backend responde `404 NOT_FOUND` (`tmp/functional-demo/aegis-hitl-and-isolation.json`).

---

## 12. Resultados de RAG y Biblioteca Documental

1. **Carga, procesamiento e indexación con Gemini real (`tmp/functional-demo/statement.pdf`):**
   - Documento sintético PDF subido desde la interfaz con consentimiento explícito: `Extracto bancario` de `Banco Andino`, período `2026-11-01` a `2026-12-01` (exclusivo), saldo `COP 5.240.000,00`, tasa `28,70% EA`, pago mínimo `COP 310.000,00`, intereses `COP 94.300,00`.
   - Correlación exacta con IDs reales en `executions.json`:
     - **Ingesta inicial (v1):** ejecución **`12`** (`ceroaRagIngest20`), ejecución **`13`** (`ceroaDocumentProcessor22`) y ejecución **`14`** (`ceroaRagEmbedding03`).
     - **Sembrado del corpus aprobado (4 fragmentos):** ejecuciones **`15`**, **`16`**, **`17`** y **`18`** (`ceroaRagEmbedding03`).
     - **Reindexación tras vincular a la obligación `Tarjeta principal` (v2):** ejecución **`27`** (`ceroaRagIngest20`) y ejecución **`28`** (`ceroaDocumentProcessor22`), quedando el documento en estado `INDEXED` (versión `2`) con **4 hechos verificados** en `document_financial_facts` (`ENTITY: Banco Andino`, `BALANCE: 5240000.00 COP`, `RATE: 28.70 PERCENT EA`, `MINIMUM_PAYMENT: 310000.00 COP`).
2. **Búsqueda híbrida y consultas conversacionales (`ORACLE`, `ORACLE` + `ATLAS` y `ORACLE` + `ATLAS` + `LUMEN`):**
   - `POST /api/v1/financial-documents/search` con `intent="HYBRID_SEARCH"` (ejecución **`42`** en `ceroaRagEmbedding03`) devolvió `evidenceStatus="AVAILABLE"`, 1 documento y 1 fragmento indexado (`tmp/functional-demo/hybrid-search.json`).
   - En el **Escenario E (`MAS-04`)** (ejecuciones `103`–`104`, `COMPLETE`; precedidas por el histórico `93`–`94`, `PARTIAL`), en el **Escenario F (`MAS-05`)** (ejecuciones `115`–`117`, `COMPLETE`; precedidas por `36`–`38`, `PARTIAL`) y en el **Escenario F+ de 3 dominios (`MAS-17`)** (ejecuciones `108`–`111`, `COMPLETE`), `ORACLE` recuperó los 4 hechos verificados del extracto y el asistente presentó la tarjeta de referencia documental con enlace temporal de descarga autorizada.
3. **Aislamiento documental entre propietarios (`tmp/functional-demo/aegis-hitl-and-isolation.json`):**
   - Con la sesión de `other@ceroa.local`:
     - `GET /api/v1/financial-documents/d26f7f5e-1d94-4fdd-b301-8bd9ad5dea7a` → `404 NOT_FOUND`
     - `POST /api/v1/financial-documents/d26f7f5e-1d94-4fdd-b301-8bd9ad5dea7a/download` → `404 NOT_FOUND`
     - `POST /api/v1/financial-documents/search` (`HYBRID_SEARCH` por `"Banco Andino"`) → `0` documentos y `0` fragmentos devueltos.

---

## 13. Resultados de pruebas desde navegador

Mediante **Playwright Chromium** contra `http://localhost:3001` y `http://localhost:5679` se verificaron visual y funcionalmente:

1. **Las cinco secciones principales obligatorias de Ceroa (sin alteración de navegación):**
   - **1. Inicio:** Dashboard con resumen financiero consolidado (`Deuda total registrada: $15.420.000`, `Obligaciones activas: 3`, `Cuotas del periodo: $1.250.000`, `Estrategia de pago: Avalancha`, `Progreso general: 29% Pagado`, próximos vencimientos y botón `Centinela`). Captura: `tmp/functional-demo/ui-dashboard.png`.
   - **2. Deudas:** Listado y gestión de las 3 obligaciones sintéticas (`Compra de computador`, `Tarjeta principal`, `Crédito de libre inversión`). Captura: `tmp/functional-demo/ui-debts.png`.
   - **3. Estrategia de Pago:** Comparativa detallada `Avalancha` vs. `Bola de Nieve` y orden de priorización. Captura: `tmp/functional-demo/ui-strategy.png`.
   - **4. Simular:** Simulador interactivo de pagos extraordinarios. Captura: `tmp/functional-demo/ui-simulator.png`.
   - **5. Perfil:** Configuración de capacidad mensual y preferencias. Captura: `tmp/functional-demo/ui-profile.png`.
2. **Asistente Inteligente y Biblioteca Documental (`http://localhost:3001`):**
   - Subida, consulta y enfoque de conversación sobre `Extracto - Banco Andino` (`tmp/functional-demo/scenario-e-document.png`).
   - Disponibilidad MCP, propuesta con código `PGYWOYTBKHCGOPSUHSGF` y confirmación `PENDING_MEET` (`tmp/functional-demo/scenario-availability.png`, `tmp/functional-demo/scenario-proposal.png`, `tmp/functional-demo/scenario-confirmed.png`).
   - Vista previa simulada de borrador Gmail (`tmp/functional-demo/ui-gmail-draft.png`).
3. **Consola de n8n (`http://localhost:5679`):**
   - Lista de los 10 workflows publicados con su nomenclatura oficial (`NEXUS`, `ATLAS`, `ORACLE`, `LUMEN`, `CHRONOS`, `AEGIS`) en `http://localhost:5679/home/workflows` (`tmp/functional-demo/n8n-workflows-list.png`).
   - Historial de ejecuciones en `http://localhost:5679/home/executions` mostrando las ejecuciones `93` a `102` en estado `Success` (`tmp/functional-demo/n8n-executions-updated.png`).

---

## 14. Defectos encontrados y corregidos

| # | Defecto identificado | Causa raíz | Solución aplicada y verificación |
|---|---|---|---|
| 1 | `400 Bad Request (ASSISTANT_INVALID_INPUT)` al finalizar la delegación de `LUMEN` en consultas de disponibilidad y propuesta de asesoría (ejecuciones `86`–`92`) | `LUMEN` escribía la hora `"10:00"` en prosa junto al marcador ISO `{{f16}}` (`2026-11-16T10:00:00-05:00`) y usaba la frase `"fecha de finalización {{f18}}"`. `AssistantAnalysisService.groundExactLiterals` no extraía la fecha ni la hora de los timestamps ISO de `supportBooking/*`, dejando `"10:00"` como cifra sin evidencia; y `FinancialClaimGrounding.permits` no mapeaba `/start`, `/end` ni `/expiresAt` al concepto `date`. | Se actualizó `AssistantAnalysisService.groundExactLiterals` para incluir `YYYY-MM-DD`, `HH:mm` y `HH:mm:ss` en `supportBooking/(?:start|end|expiresAt)`, se autorizó `supportBooking/*` y `workspaceProposal/*` en `FinancialClaimGrounding.permits`, y se propagaron sus referencias en `AssistantService.finishDelegation`. Verificado con `FinancialProjectionGroundingTest` (`6/6`) y en vivo en las ejecuciones `95`–`100` (`COMPLETE`). |
| 2 | Fallo en `integrations/n8n/ceroa-identity.test.mjs` al ejecutar la suite de pruebas Node | Codex editó `integrations/n8n/multiagent-workflows.mjs` a las 15:39 (añadiendo `currentDate`, `timezone` y mejoras de prompt para Gemini real) sin regenerar los 4 archivos JSON portables (`multiagent-query.json`, `financial-agent.json`, `knowledge-agent.json`, `support-agent.json`) ni actualizar la aserción de invarianza estructural en `ceroa-identity.test.mjs`. | Se regeneraron los 4 archivos JSON desde `buildMultiagent` y se ajustó `ceroa-identity.test.mjs` para validar identidad, IDs, credenciales, webhooks, ajustes y contratos de parser. Las **51/51 pruebas de Node** pasan sin errores. |
| 3 | Enlace roto a `docs/benchmarks/ceroa-functional-2026-11-14/executions.json` y correlación de IDs en `docs/CEROA_DEMO_FUNCIONAL.md` | El archivo no había sido exportado desde `ceroa-demo-n8n-1` y el informe preliminar atribuía las ejecuciones `17`–`18` (que son `ceroaRagEmbedding03`) a la solicitud de correo. | Se exportaron las **117 ejecuciones** redactadas con `workflowName`, `requestId`, `question`/`task` y `functionalStatus` a `docs/benchmarks/ceroa-functional-2026-11-14/executions.json` y se reconciliaron todos los IDs en la documentación. |
| 4 | Respuestas `PARTIAL` en `MAS-04` (`93`–`94`) y `MAS-05` (`36`–`38`, `105`–`107`, `112`–`114`) sobre `statement.pdf` | (a) `DocumentFactExtractor.HEADER` no reconocía la etiqueta compuesta `"Tasa de interes efectiva anual: 28,70%"` ni `"Entidad financiera"`, por lo que la tasa no se persistía como hecho `RATE` (`VERIFIED`). (b) `DocumentFactAnalysis.requestedKind` devolvía `null` en consultas de análisis general o comparación de múltiples campos, forzando `EXPLICIT_SINGLE_FIELD_REQUIRED_FOR_COMPLETE_ANALYSIS`. (c) `ORACLE` enviaba ocasionalmente `identificationType="CC"` no solicitado o citaba el `{{fID}}` de `/context` en lugar de su hermano `/numericValue`. | Se amplió `DocumentFactExtractor` para inferir la modalidad desde la etiqueta (`EA`, `EM`, `NAMV`, `NMV`), se añadió `DocumentFactAnalysis.requestedKinds` para descomponer análisis/comparaciones de extractos sobre sus campos numéricos verificados manteniendo intactos todos los controles de evidencia (`UNVERIFIED_VALUES`, `UNKNOWN_DOCUMENT_PERIOD`, `OBLIGATION_LINK_REQUIRED_FOR_COMPARISON`), se limpió `identificationType` no solicitado en `AssistantService.financialDocuments` y se normalizó `/context`→`/numericValue` en `AssistantAnalysisService`. Verificado en `DocumentFactTest` y en vivo en `MAS-04` (`103`–`104`, `COMPLETE`) y `MAS-05` (`115`–`117`, `COMPLETE`). |
| 5 | Rechazo de admisión (`429`) en consultas compuestas de 3 dominios cognitivos (`ORACLE` + `ATLAS` + `LUMEN`) | `AssistantProviderGate.reservation` sumaba `6 + 4 + 4 + 3 = 17` para los 3 roles, superando el límite de `15` llamadas/minuto (`calls > perMinute`). | Se acotó la reserva de admisión a `Math.min(15, ...)` en `AssistantProviderGate`, manteniendo el presupuesto interno de `AgentRuntime` en `17` y agregando `supportGuide/paymentRegistration`. Verificado en vivo en las ejecuciones `108`–`111` (`MAS-17`, 3 dominios simultáneos, `COMPLETE`). |

---

## 15. Separación entre implementaciones de laboratorio (`SIMULATED`) e integraciones reales portables (`CHRONOS` y `AEGIS`)

| Componente | Implementación de laboratorio (`ceroa-demo`, activa en `:5679`) | Plantilla portable para integración real (`integrations/n8n/`, `active: false`) | Garantía de separación |
|---|---|---|---|
| **CHRONOS — Calendar & MCP** | `ceroaDemoChronos` (`CEROA AI \| CHRONOS — Calendar MCP (SIMULATED)`), generada por `integrations/demo/prepare-extensions.mjs` en `tmp/functional-demo/extensions.json`. Conecta `@n8n/n8n-nodes-langchain.mcpClient` a `http://adapter:3100/mcp` y exige `value.provider === 'SIMULATED'`. Las operaciones `create`/`get`/`delete` llaman a `http://adapter:3100/calendar/*` y terminan en `PENDING_MEET`. | `ceroaWorkspaceCalendar40` (`integrations/n8n/workspace-calendar.json`, nodo nativo `n8n-nodes-base.googleCalendar` con `conferenceDataVersion=1`), `ceroaMcpClient40` (`integrations/n8n/workspace-mcp-client.json`) y `ceroaMcpSupport40` (`integrations/n8n/workspace-mcp-support.json`). | IDs de workflow distintos (`ceroaDemoChronos` vs `ceroaWorkspaceCalendar40`), webhooks distintos (`ceroa-demo-chronos` vs `ceroa-workspace-calendar-v4`) y credenciales sintéticas separadas en el volumen `demo-n8n`. |
| **AEGIS — Gmail Draft & Outbox** | `ceroaDemoDraft` (`CEROA AI \| AEGIS — Gmail createDraft (SIMULATED)`), generada por `integrations/demo/prepare-extensions.mjs`. Recibe llamadas de `WorkspaceDraftService` en `ceroa-demo-draft` e invoca `http://adapter:3100/gmail/createDraft` (`provider: 'SIMULATED'`, cero correos enviados). | `ceroaWorkspaceMail40` (`integrations/n8n/workspace-mail.json`, nodo nativo `n8n-nodes-base.gmail` con reclamación de lease en `/api/v1/workspace-tools/events/claim` y revalidación determinista en `/dispatch`). | El flujo de laboratorio solo existe en `tmp/functional-demo/extensions.json`; las plantillas productivas en `integrations/n8n/` no apuntan a `adapter:3100` y están validadas por `workspace-mcp-drive-calendar.test.mjs` y `workspace-mail-sheets.test.mjs`. |

---

## 16. Inventario de cambios funcionales respecto al candidato B12

- **Candidato B12 original (intacto, no modificado):**
  - Ruta: `tmp/block10-build-results/ceroa-backend-0.1.0-SNAPSHOT.jar`
  - `SHA-256`: `DBC8B235ECC7CB94934C88037729CC903E7DBD66EAF0608F33F7290E3F248B8B`
- **Candidato actualizado de demostración y estabilización (`backend-delivery.jar`):**
  - Ruta: `tmp/functional-demo/backend-delivery.jar`
  - `SHA-256`: `8400257B3E5C714361E67560B12F34E83DCB06A081CEA750AAC599A3D9D9DE15`
  - Pruebas verificadas sobre este candidato: **452 registradas, 418 ejecutadas, 34 opt-in omitidas, 0 fallos, 0 errores** (`JDK 25.0.1 / Maven 3.9.11` sin red), más **51/51 pruebas Node**.

| Archivo modificado / nuevo respecto a B12 | Cambio funcional incorporado en `backend-delivery.jar` |
|---|---|
| `backend/src/main/java/com/ceroa/api/WorkspaceDraftController.java` *(nuevo)* y `backend/src/main/java/com/ceroa/service/WorkspaceDraftService.java` *(nuevo)* | Endpoint `POST /api/v1/workspace-proposals/{code}/gmail-draft` para preparar borradores revisables por el usuario antes de confirmar una propuesta `PROPOSED`, validando propietario, vigencia y plantilla. |
| `backend/src/main/java/com/ceroa/config/SecurityConfig.java` | Autorización de sesión autenticada para `/api/v1/workspace-proposals/**`. |
| `backend/src/main/java/com/ceroa/service/AgentContracts.java` | Enrutamiento mejorado para consultas operativas (`registrar una nueva deuda`, `registrar un pago`), comparaciones documentales y activación simultánea de los 3 roles (`FINANCIAL`, `RAG`, `SUPPORT`) en consultas compuestas. |
| `backend/src/main/java/com/ceroa/service/AssistantProviderGate.java` | Tope `Math.min(15, ...)` en `reservation(budget, roles)` para admitir consultas compuestas de 3 especialistas bajo la ventana de 15 llamadas/minuto sin debilitar el limitador para 1 (`8`) o 2 (`14`) especialistas. |
| `backend/src/main/java/com/ceroa/service/AssistantService.java` | Soporte de `supportGuide` (`debtRegistration`, `paymentRegistration`, `simulatorUsage`, `plansComparison`, `advisoryProcedure`), propagación de `supportBooking/*` y `workspaceProposal/*` en `finishDelegation`, limpieza de `identificationType` no solicitado en la pregunta e inyección determinista de la instrucción `Confirmar asesoria <CODE>`. |
| `backend/src/main/java/com/ceroa/service/AssistantAnalysisService.java` | Grounding de subcomponentes de fecha (`YYYY-MM-DD`) y hora (`HH:mm`, `HH:mm:ss`) en `supportBooking/(?:start|end|expiresAt)` y normalización de referencias `/context` y `/quote` hacia su hecho hermano `/numericValue` o `/literal`. |
| `backend/src/main/java/com/ceroa/service/FinancialClaimGrounding.java` | Reconocimiento de conceptos de proyección (`interest`, `savings`, `months`, `budget`, `basePayment`), autorización de `supportBooking/*` y `workspaceProposal/*`, mapeo de `/start`, `/end` y `/expiresAt` a `date`, e inferencia de modalidad de tasa (`EA`, `EM`, `NAMV`, `NMV`) desde el contexto documental. |
| `backend/src/main/java/com/ceroa/service/DocumentFactExtractor.java` y `backend/src/main/java/com/ceroa/service/DocumentFactAnalysis.java` | Extracción verificada de `"Tasa de interes efectiva anual"` (`EA`) y `"Entidad financiera"`, y descomposición de consultas de análisis/comparación de extractos en hechos numéricos verificables (`requestedKinds`) sin eliminar controles de evidencia (`UNVERIFIED_VALUES`, `UNKNOWN_DOCUMENT_PERIOD`, `OBLIGATION_LINK_REQUIRED_FOR_COMPARISON`). |
| `backend/src/main/java/com/ceroa/service/SupportBookingService.java` y `backend/src/main/java/com/ceroa/service/WorkspaceCalendarGateway.java` | Soporte de estado `PENDING_MEET` cuando el adaptador de Calendar confirma el evento sin emitir enlace de Google Meet real. |

---

## 15. Guía rápida para que el usuario ingrese y pruebe el sistema por sí mismo

El entorno funcional aislado **`ceroa-demo`** ha quedado **encendido y listo para usar** en tu máquina local:

### URLs y credenciales de acceso

| Servicio | URL | Usuario | Contraseña |
|---|---|---|---|
| **Aplicación Web Ceroa (Frontend)** | http://localhost:3001 | `demo@ceroa.local` | `Demo123!` |
| **API Backend (Spring Boot)** | http://localhost:8081 | *(Autenticación vía sesión web)* | — |
| **Swagger UI (OpenAPI)** | http://localhost:8081/swagger-ui.html | *(Acceso directo local)* | — |
| **Consola n8n (Workflows)** | http://localhost:5679/home/workflows | `demo-n8n@ceroa.local` | `CeroaDemo2026!` |
| **Historial de ejecuciones n8n** | http://localhost:5679/home/executions | `demo-n8n@ceroa.local` | `CeroaDemo2026!` |

### Recorrido sugerido paso a paso

1. **Explorar las 5 secciones de Ceroa:**
   - Abre http://localhost:3001 e inicia sesión con `demo@ceroa.local` / `Demo123!`.
   - Recorre **Inicio**, **Deudas**, **Estrategia**, **Simular** y **Perfil** en el menú izquierdo.
2. **Probar el Asistente Multiagente y la Biblioteca Documental:**
   - Haz clic en el botón flotante inferior derecho (**Abrir asistente financiero**).
   - Para una consulta determinista instantánea: escribe `¿Qué deudas tengo registradas?`.
   - Para consultar el extracto bancario cargado: pulsa **Consultar archivos** → **Ver mis documentos** → **Continuar conversación con este archivo** y pregunta `Analiza el extracto financiero que cargué.`.
   - Para probar **CHRONOS MCP + AEGIS HITL**: pulsa **Nueva conversación**, pregunta `Consulta disponibilidad para una asesoría el próximo martes a las 11:00 de Bogotá.`, espera ~65 segundos (por el limitador de seguridad de 15 llamadas/min a Gemini), envía `Propón una asesoría para ese horario.` y luego copia la instrucción `Confirmar asesoria <CÓDIGO>` que te devuelva el asistente.
   - Para probar **Gmail `createDraft` simulado**: pide `Envíame al correo registrado la información de mi suscripción.` y pulsa **Preparar borrador para revisar**.
3. **Inspeccionar los agentes y ejecuciones en n8n:**
   - Abre http://localhost:5679/home/workflows para abrir los lienzos de `NEXUS`, `ATLAS`, `ORACLE`, `LUMEN`, `CHRONOS` y `AEGIS`.
   - Abre http://localhost:5679/home/executions para inspeccionar nodo por nodo las **102 ejecuciones** registradas.

### Comandos para detener o volver a iniciar el entorno de demostración

Desde PowerShell en `C:\Users\User\Desktop\Ceroa`:

```powershell
# Verificar contenedores activos
docker ps

# Detener el entorno de demostración (conservando todos los datos e historial)
.\integrations\demo\demo.ps1 -Stop

# Volver a iniciar el entorno de demostración
.\integrations\demo\demo.ps1
```


## Aclaración de contratos para RC2

El Grant es un contrato autorizado ligado al estado del servidor (scopeToken aleatorio, requestId, rol, referencias y vigencia), con callbacks autenticados y validación de alcance en backend. No lleva firma HMAC/JWS. El endpoint versionado de preparación de borradores es `POST /api/v1/workspace-actions/{code}/draft`; las referencias históricas a workspace-proposals/.../gmail-draft no describen el controlador actual. Se conservan los resultados históricos tal como fueron registrados; el manejo HTTP del nuevo controlador se corrige y valida por separado en RC2. Véase [correcciones y validación RC2](CEROA_RC2_CORRECCIONES_Y_VALIDACION_FINAL.md).
