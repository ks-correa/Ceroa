# CEROA — RC2: correcciones y validación final

Fecha: 14 de noviembre de 2026, America/Bogota. Rama `docs/ceroa-ai-architecture`. PR [#1](https://github.com/ks-correa/Ceroa/pull/1), conservado abierto y en borrador. Informe histórico de partida: [revisión RC1](CEROA_RC1_PR_FINAL_REVIEW.md).

## A. Resumen ejecutivo

R1 y R2 corregidos mediante cambios acotados. **GO PARA INTEGRACIÓN DE RC2**, sujeto a aprobación humana del informe y del merge. **Producción: NO-GO**. No se fusionó main, activó auto-merge ni desplegó el entorno operativo.

RC2 se construyó una sola vez después de aprobar las regresiones; RC1, B12 y el JAR anterior de demostración permanecen intactos. No se generó RC3. Primero se arrancó RC2 contra una copia aislada de la base sintética y después se sustituyó exclusivamente el backend de la demo.

Se conservan NEXUS (orquestación), ATLAS (finanzas), ORACLE (RAG) y LUMEN (soporte) como cuatro agentes cognitivos nativos; CHRONOS como frontera de integración y AEGIS como gobernanza determinista. Sin nuevos agentes, migraciones, herramientas, conectores ni cambios de contratos n8n.

## B. Corrección R1

La raíz era combinar la modalidad inferida de la etiqueta con el sufijo sin comprobar su coherencia; el grounding aceptaba la unión de ambas. `Tasa de interes efectiva anual: 28,70% EM` llegaba a VERIFIED y cobertura completa, y permitía renderizar la cifra como EA.

Cambios funcionales: `DocumentFactExtractor`, `DocumentFactAnalysis`, `FinancialClaimGrounding` y el helper interno `DocumentRateMode`. Se distingue etiqueta, sufijo y modalidad canónica. Las contradicciones conservan texto/procedencia/cifra pero quedan NEEDS_REVIEW y modalidad nula; no hay conversión. La cobertura declara UNVERIFIED_VALUES y CONTRADICTORY_RATE_MODALITY. El renderer exige coherencia de fuente y modalidad canónica antes de autorizar una afirmación financiera. EM no respalda EA ni viceversa.

Se mantienen monedas, periodos, identificadores, referencias, propietario y versión documental. EA/EM/NMV/NAMV y la equivalencia léxica MV/EM admiten mayúsculas, acentos, espacios y abreviaturas con puntos. Una cita heredada sin modalidad puede reproducir su porcentaje sin calificarlo; no permite inventar EA/EM. Los hechos RATE tipados siguen requiriendo modalidad canónica coherente.

Persistencia: extractor v1 → v2, sin migración. La lectura del repositorio excluye versiones obsoletas del extractor; el mecanismo existente de reconstrucción perezosa actualiza los hechos y marcador de cada documento consultado desde sus chunks vigentes. No descarga Storage, no solicita embeddings ni reprocesa masivamente documentos. Analysis y grounding además rechazan defensivamente evidencia contradictoria aunque un adaptador entregue un antiguo VERIFIED. Una futura reconstrucción operativa masiva requiere planificación independiente.

La prueba PostgreSQL crea un documento sintético, persiste deliberadamente la extracción RC1 incorrecta, comprueba su exclusión, reconstrucción v2/PARTIAL, preservación del saldo válido, aislamiento de propietario, reconstrucción explícita sin Storage/embeddings y reprocesamiento conservador. No se utilizó evidencia de versiones documentales anteriores.

Pruebas permanentes: `DocumentRateRegressionTest` (18 casos, extracción/análisis/grounding/renderizado) y el caso nuevo de `HybridDocumentIntegrationTest`. Cubren R1-01 a R1-12 y compatibilidad del porcentaje heredado sin modalidad.

## C. Corrección R2

`WorkspaceDraftController` no pertenecía al alcance de `WorkspaceErrorAdvice`; las excepciones caían en el advice global de recuperación y convertían 404 en 503 RECOVERY_UNAVAILABLE. Se incluyó el controlador en el advice Workspace existente, de precedencia -10. `GlobalExceptionHandler` y sus controladores de recuperación no fueron modificados; la suite general conserva sus regresiones.

Ruta vigente: **POST /api/v1/workspace-actions/{code}/draft**.

| Situación | HTTP verificado |
|---|---|
| Sin sesión / CSRF ausente | 401 / 403 |
| Usuario inactivo | 403 |
| Inexistente / propietario distinto | 404 / 404, mismo cuerpo |
| Tipo incorrecto | 400 |
| Vencida o no procesable | 410 |
| Respuesta inválida / error HTTP del proveedor | 502 |
| Adaptador deshabilitado / timeout de transporte | 503 |
| Preparación válida | 200, Cache-Control: no-store |

`WorkspaceDraftHttpIntegrationTest`: 9 casos con Spring Boot, MockMvc, controlador, seguridad y advices reales; solo el servicio se simula para producir cada excepción. No se exponen detalles internos del proveedor y el código de error corresponde a Workspace.

`WorkspaceDraftProviderTest`: 13 casos permanentes, transporte HTTP simulado y servicio real. Exige sent como booleano JSON false, proposalId asociado e id textual no vacío. Rechaza true, cadena, número, null/ausencia, cuerpo vacío/malformado, proposalId distinto e id ausente/vacío; cubre preparación repetida, inactividad, ajenidad/inexistencia, tipo, vencimiento, configuración, timeout y error externo. Destinatario viene del usuario autenticado y cifras de DashboardService. Un timeout conserva incertidumbre sobre un posible efecto del proveedor; no afirma que no se ejecutó.

La demo sintética aislada del entorno operativo confirmó vista previa SIMULATED, sent=false, repetición con el mismo id durable del adaptador, confirmación humana, 404 idénticos y 410 visible en frontend. No se conectó Gmail ni se enviaron correos. [Resultados UI/API](benchmarks/ceroa-rc2-2026-11-14/ui-drafts.json).

## D. Correcciones documentales

El Grant es un contrato autorizado ligado al estado del servidor: scopeToken aleatorio, requestId, rol, referencias emitidas y vigencia, callbacks autenticados y validación backend de alcance. **No existe firma HMAC/JWS**. Se corrigió la descripción del PR y se añadieron aclaraciones a arquitectura, validación multiagente, continuidad, demo y release histórico. Las referencias históricas a workspace-proposals/.../gmail-draft quedan identificadas como incorrectas, sin reescribir los resultados observados. Readiness apunta ahora a RC2.

## E. Regresiones y reproducción diferencial

Las mismas dos guardas de aceptación fallan sobre las clases preservadas de RC1 (2/2 fallos) y pasan sobre las clases extraídas del JAR RC2 final (2/2, sin fallos). No se emplearon pruebas que esperaran el defecto como aceptación.

| Ejecución | Resultado |
|---|---|
| Backend general, Maven package offline, America/Bogota | 497 registrados: 462 pasan, 35 opt-in omitidos, 0 fallos/errores |
| PostgreSQL 17/pgvector desechable, HybridDocumentIntegrationTest | 28/28 pasan |
| Conciliación de casos Java únicos | **490 pasan, 7 opt-in omitidos, 497 registrados** |
| Node | 51/51 |
| Frontend | tsc correcto; 190/190, 23 archivos |

Las ejecuciones focalizadas, diferenciales y repetidas no se suman como casos únicos. Se ejecutaron AgentContracts (5), AgentRuntime (14), AssistantProviderGate (3), WorkspaceCalendarGateway (3), renderer, seguridad y demás regresiones generales. [Inventario reconciliado](benchmarks/ceroa-rc2-2026-11-14/test-audit.json).

Omitidos: Block6GoogleEndToEndTest (1, envío real fuera de alcance), MultiagentEndToEndTest (2), PostgresMigrationIntegrationTest (3, fixture TLS/schema dedicado) y RealMultiagentEndToEndTest (1, recorrido repetitivo opt-in). Las comprobaciones reales acotadas de demo se documentan aparte, sin contabilizarlas como esos tests JUnit. Flyway sí validó y arrancó las bases sintéticas de las pruebas y del JAR; V1–V31 están incluidas sin modificación.

El primer package previo al artefacto detectó una regresión de compatibilidad en una cita legítima `Tasa indicada: 2,5%`. Se corrigió para permitir únicamente el porcentaje sin modalidad; se añadió su regresión permanente y se repitió package completo con éxito antes de crear RC2. No se ocultó el fallo ni se modificó una prueba existente para aprobarlo.

## F. Gemini real

Datos exclusivamente sintéticos, secuenciales, pausa mínima de 66 s entre escenarios. Sin cambios de cuotas: reserva lógica 15/minuto, concurrencia 1, cooldown 60 s. Las reservas no equivalen a solicitudes físicas: embeddings y reintentos del SDK son adicionales; no se afirma conteo físico ni tokens exactos.

| Escenario | HTTP | Estado funcional | traceId |
|---|---|---|---|
| valid-document | 200 | COMPLETE | 5c1e6016-8283-4151-b7e3-8f03eafd8f13 |
| contradictory-document | 200 | FAILED | 94acca83-b22d-40f9-a009-44d21dccd07e |
| financial-interpretation | 200 | COMPLETE | null |
| oracle-atlas | 200 | PARTIAL | 9ad5ad73-ecb2-4f9b-b46c-c3ba512cd195 |
| oracle-atlas-lumen | 200 | PARTIAL | null |
| contradictory-document-bounded-retry | 200 | FAILED | 1b558028-6be7-4ce2-a3f1-1a0ca6f40db5 |
| oracle-atlas-bounded-retry | 200 | COMPLETE | daaba4cc-8be2-44d8-a9dc-8d482d87bbcb |
| oracle-atlas-native-retry | 200 | PARTIAL | 83eb5a24-3cdb-4b26-b8e1-94b046af0304 |
| oracle-atlas-lumen-native-retry | 200 | COMPLETE | 91f010af-3986-4a75-af8a-9021cb822232 |

La tasa válida se conserva como 28,7% EA con su documento. El contradictorio registra FACT_ANALYSIS PARTIAL, RATE NEEDS_REVIEW, rateMode=null y saldo/pago válidos preservados. La primera consulta de inconsistencias agotó las cuatro iteraciones de ORACLE al buscar documentación adicional: FAILED/NONE y abstención segura, sin publicar la tasa como fiable; no es COMPLETE aunque n8n termine success. El intento adicional acotado se conserva sin sustituir ni ocultar ese resultado. No se aumentaron presupuestos para conseguir una respuesta.

Las delegaciones y métricas backend se preservan con lista de campos permitidos, sin scopeTokens, cabeceras ni credenciales. [Respuestas](benchmarks/ceroa-rc2-2026-11-14/gemini-results.json), [métricas/delegaciones](benchmarks/ceroa-rc2-2026-11-14/runtime-metrics.json), [ejecuciones n8n](benchmarks/ceroa-rc2-2026-11-14/executions.json), [hechos contradictorios](benchmarks/ceroa-rc2-2026-11-14/contradictory-facts.json).

La ingestión del fixture quedó inicialmente PENDING; una invocación autenticada y acotada del webhook demo ya existente recuperó la cola y completó INDEXED. No se modificaron workflows ni sus credenciales. La ingestión usa embeddings reales y se distingue de las cinco consultas de aceptación.

### Lectura de los resultados reales y límites de aceptación

La repetición nativa de tres especialistas terminó COMPLETE: ejecuciones 167/168/170/171, ORACLE, ATLAS y LUMEN OK/COMPLETE, cada Grant con tres iteraciones. La ruta nativa de dos especialistas permaneció PARTIAL en ambos intentos por CONTRACT_ERROR de ATLAS. No se sustituyen esos resultados por el control con archivo seleccionado. La respuesta completa de tres especialistas incluyó la expresión descriptiva «entidad 157», que no corresponde al nombre Banco Andino; se conserva como anomalía de redacción del modelo y no se certifica como dato fiable ni como calidad editorial perfecta. Las tasas y cifras comprobadas de ese escenario sí corresponden a la evidencia sintética.

Las rutas nativas ORACLE+ATLAS y ORACLE+ATLAS+LUMEN se ejecutaron realmente, con sus delegaciones registradas; sus resultados iniciales son PARTIAL, no COMPLETE. Se hizo una sola repetición nativa de cada una, también conservada en la tabla. CONTRACT_ERROR corresponde a rechazo del resultado del modelo y el agotamiento de iteraciones queda registrado como PROVIDER_UNAVAILABLE en el contrato actual; ese código no demuestra una caída física de Gemini.

La comprobación con un archivo seleccionado explícitamente (oracle-atlas-bounded-retry) obtuvo COMPLETE pero delegó únicamente a ORACLE. Se conserva como control documental adicional y **no se cuenta como aprobación de colaboración ORACLE+ATLAS**; se canceló la segunda prueba con ese override antes de enviarla. Los resultados nativos son los que sustentan la evaluación de colaboración.

La repetición del documento contradictorio terminó FAILED por CONTRACT_ERROR: abstención genérica, sin tasa validada; no se afirma que Gemini haya explicado detalladamente la contradicción. El backend sí expone CONTRADICTORY_RATE_MODALITY y los hechos en revisión. Esta limitación de redacción/completitud se mantiene visible para sustentación y revisión humana. No hay garantía de que toda consulta compuesta termine completa con el modelo y los presupuestos actuales.

El GO de integración se limita al cierre reproducible R1/R2 y sus regresiones: no certifica completitud universal del modelo ni convierte las respuestas PARTIAL/FAILED en éxitos de negocio. Los rechazos conservadores preservan la seguridad financiera. No se cambió el modelo, prompts, cuotas ni workflows para ocultarlos. No se observó HTTP 429 en estos intentos. [Diferencial RC1/RC2](benchmarks/ceroa-rc2-2026-11-14/differential-results.json).

## G. Artefactos y trazabilidad

| Artefacto preservado/nuevo | SHA-256 |
|---|---|
| B12 | `DBC8B235ECC7CB94934C88037729CC903E7DBD66EAF0608F33F7290E3F248B8B` |
| previousDemo | `8400257B3E5C714361E67560B12F34E83DCB06A081CEA750AAC599A3D9D9DE15` |
| RC1 | `4C2F954C53399AE5B8F1E050F5EC10AA0C0CE0A2B39187A744105422010C7004` |
| RC2 | `19A7DCB8496CB7EC41C6DAF99C3A34585CA69E1F109229110A49B4DA2CE12418` |

RC2: `tmp/release-candidate/ceroa-backend-0.1.0-SNAPSHOT-rc2.jar`, 88567812 bytes. Fuente funcional exacta: `934f0f3a987c5e85b07484e5f5f536c890e9c428`. Java Temurin 25.0.1, Maven 3.9.11, imagen maven:3.9.11-eclipse-temurin-25, dependencias offline del cache verificado. Compilación de 220 fuentes principales; 433 clases/recursos del artefacto coinciden byte a byte con target/classes del build.

Las dependencias embebidas son idénticas a RC1. Los nueve cambios de entradas del JAR son WorkspaceErrorAdvice, DocumentFactRepository y FinancialDocumentRepository (constante VERSION inlined al recompilar), DocumentFactAnalysis y su record local, DocumentFactExtractor, nuevo DocumentRateMode, FinancialClaimGrounding y WorkspaceDraftService. No hay otros cambios de recursos/migraciones. Todas las 31 migraciones coinciden byte a byte con RC1; V31__durable_subscription_charges.sql conserva checksum Flyway **1431353347**.

El [manifiesto de construcción](benchmarks/ceroa-rc2-2026-11-14/source-build-manifest.json) cubre 696 archivos fuente/configuración/scripts/tests con SHA bruto y normalizado LF. El [manifiesto de entrega](benchmarks/ceroa-rc2-2026-11-14/source-final-manifest.json) incorpora únicamente el cambio posterior del JAR demo por defecto RC1 → RC2 en Compose y demo.ps1; el código backend no cambió tras construir el artefacto. [Auditoría del JAR](benchmarks/ceroa-rc2-2026-11-14/artifact-audit.json). Los JAR, estados de navegador, dumps, claves y logs privados permanecen fuera de Git.

## H. Estado de la demo y reversión

Frontend http://localhost:3001, backend http://localhost:8081, n8n http://localhost:5679. El SHA dentro de ceroa-demo-backend-1 es el de RC2. Autenticación, cinco secciones, asistente y borrador verificados. Solo cambió el contenedor backend demo; frontend, DB, n8n, adapter y sus tres volúmenes permanecen. Las diez definiciones, nueve workflows activos/publicados, sus versiones/hashes y cinco credenciales demo no cambiaron; creció únicamente el historial de ejecuciones sintéticas. [Integridad](benchmarks/ceroa-rc2-2026-11-14/runtime-integrity.json).

Antes de actualizar se conservó Compose, los tres JAR anteriores y un snapshot sintético para la prueba aislada. Arranque inicial aislado en 8082: login 200, deudas 200, documento AVAILABLE, borrador inexistente 404. La red de DB era interna; se añadió una conexión de bridge solo al backend de prueba para publicar loopback, con asistente, Calendar y callbacks externos desactivados. No utilizó Supabase operativo.

La configuración por defecto demo ahora selecciona RC2. Reversión exclusivamente del backend demo, sin eliminar volúmenes:

```powershell
$env:CEROA_DEMO_BACKEND_JAR='./tmp/release-candidate/ceroa-backend-0.1.0-SNAPSHOT-rc1.jar'
docker compose -p ceroa-demo -f docker-compose.demo.yml up -d --no-deps backend
```

Volver a RC2 cambiando la variable al archivo rc2.jar o eliminando el override. No usar down -v. La reversión del JAR no revierte una base de datos ni procesos productivos. Se detuvieron únicamente los contenedores nuevos de verificación aislada al cerrar el bloque; la demo continúa disponible.

## I. Git y PR

HEAD recibido f5a0866fcd9b192902effea05505bddf35745d96; base main observada 8c6ac23939211228e58112e92b010bd675f7ba86. Se conservaron los seis commits previos, sin rebase ni force push.

Commits funcionales: 4f5b2fe (modalidad), 8d110e0 (HTTP/contrato proveedor), 934f0f3 (compatibilidad sin inferir modalidad). Los siguientes commits consolidan configuración demo, aclaraciones e inventario de evidencia. Publicación y verificación remota se registran en el cierre de este apartado. No se publica ningún binario ni dato privado.

## J. Estado productivo

No se consultó ni modificó Supabase en este bloque; no se aplicó V31 real ni se arrancaron los cinco contenedores operativos originales. Sus IDs, estado detenido, marcas de arranque y reinicios coinciden con el snapshot inicial. No hubo publicación de workflows operativos, modificación de credenciales, consumo de eventos Sheets, pagos, reservas ni correos reales; no hubo reprocesamiento documental real. El preflight anterior de V30/V31 ausente y siete eventos SHEETS/PENDING es evidencia histórica fechada, no una lectura nueva.

WORKSPACE_DRAFT_URL productivo debe permanecer sin configurar. Pendientes del adaptador Gmail real: idempotencia durable y recibo específico createDraft, reconciliación tras timeout, locks transaccionales durante llamadas externas, validación completa de respuesta/contenido y vinculación estricta de la vista previa con lo confirmado. RC2 refuerza el booleano y estados HTTP; no implementa ese adaptador. MCP Calendar productivo continúa pendiente.

Despliegue futuro: respaldo actualizado de corte consistente PostgreSQL/Storage/n8n y claves protegidas, restauración aislada comprobada, candidato sobre copia financiera restaurada actualizada, empaquetado final/digests y frontend compatible, control de escritores/consumidores/outbox, validación V31 y autorización independiente. El backup histórico no cubre escrituras posteriores; rollback backend no reconcilia recibos ni revierte migraciones.

## K. Veredicto independiente

| Dimensión | Veredicto |
|---|---|
| Calidad funcional RC2 | R1/R2 corregidos; regresiones satisfactorias; abstención de Gemini y límites observados declarados |
| Sustentación académica | GO con datos sintéticos y Calendar/Gmail simulados; explicar estados parciales/abstención |
| Integración | **GO PARA INTEGRACIÓN DE RC2**, pendiente autorización humana; PR sigue draft |
| Producción | **NO-GO**, prerrequisitos y adaptadores independientes pendientes |

No se afirma que una respuesta segura pero incompleta tenga cobertura financiera completa. El cierre de los defectos no autoriza producción ni sustituye la revisión humana del PR.
