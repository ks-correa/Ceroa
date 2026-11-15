# CEROA — Validación final de release por Codex

Fecha: 14 de noviembre de 2026, America/Bogota. Rama: `docs/ceroa-ai-architecture`. Base recibida: `8c6ac23939211228e58112e92b010bd675f7ba86`.

## Estado recibido y alcance

Se retomó el repositorio existente, con 32 archivos modificados y cambios nuevos sin versionar. HEAD local y main remoto coincidían en 8c6ac23; `ls-remote` no devolvió la rama de trabajo. Docker Desktop funcionaba. Los cinco contenedores operativos originales estaban detenidos desde el 10 de noviembre y se conservaron intactos. No se encontró proceso cuyo nombre contuviera Antigravity. Se consultaron los nueve documentos/evidencias exigidos y los scripts/artefactos posteriores disponibles.

La demo recibida ejecutaba backend-delivery.jar. Se recreó únicamente su backend con un override local, conservando volúmenes, artefactos y Compose anterior en `tmp/codex-release/docker-compose.demo.before.yml`. Compose y demo.ps1 ahora eligen RC1 por defecto y aceptan `CEROA_DEMO_BACKEND_JAR` para reversión. No hubo despliegue productivo, migración operativa, conectores generales, correo ni reserva externos.

## Artefactos y trazabilidad

| Candidato | SHA-256 comprobado |
|---|---|
| B12 original | `DBC8B235ECC7CB94934C88037729CC903E7DBD66EAF0608F33F7290E3F248B8B` |
| Demo anterior | `8400257B3E5C714361E67560B12F34E83DCB06A081CEA750AAC599A3D9D9DE15` |
| RC1 | `4C2F954C53399AE5B8F1E050F5EC10AA0C0CE0A2B39187A744105422010C7004` |

Los tres archivos permanecen en sus rutas originales, sin sobrescritura. `sha256sum /app/backend.jar` dentro de ceroa-demo-backend-1 devuelve exactamente RC1. Una recompilación aislada del código actual con Maven 3.9.11 / Java 25.0.1 produjo **432/432 clases y recursos idénticos byte a byte a las entradas de RC1**. No fue necesaria una corrección funcional ni RC2. No se presenta un nuevo JAR empaquetado como idéntico por hash: se comparó su contenido ejecutable recompilado.

El informe anterior cita el hash fuente `55F3AFEDD8F95011E3C9955D8F36D44EF11A957815D2302AAD49ED578609B61B`, pero no contiene el algoritmo completo de serialización/orden/normalización; no se declara reproducido. Se incorporaron un manifiesto explícito de las rutas originales y otro ampliado, generado por `integrations/verification/ceroa-release-manifest.cjs`, con hashes crudos y normalizados LF. El ampliado incluye dependencias bloqueadas, pom, wrappers, Dockerfiles, configuración, scripts y Compose; excluye entornos, secretos y binarios. Sus hashes se conservan en [release-manifest.json](benchmarks/ceroa-codex-release-2026-11-14/release-manifest.json).

El frontend sirve Vite con frontend/src montado en solo lectura; la fuente validada es la misma del árbol versionado. Sigue siendo una demo de desarrollo, no una imagen de frontend estático reproducible ya liberada. Los hashes/versiones de los workflows realmente publicados están en [demo-workflows.json](benchmarks/ceroa-codex-release-2026-11-14/demo-workflows.json): 10 definiciones, 9 activas/publicadas, 1 inactiva, 5 credenciales, sin referencias de credenciales ausentes. No se republicaron workflows innecesariamente: las expresiones de maxIterations ya leen el Grant del backend.

## Regresiones funcionales nuevas sobre RC1

| Caso | Resultado observado |
|---|---|
| RC1-01 ATLAS | HTTP 200, COMPLETE; NEXUS 122 → ATLAS 123; prioriza Tarjeta principal con la estrategia avalancha y hechos registrados. |
| RC1-02 ORACLE | HTTP 200, COMPLETE; NEXUS 129 → ORACLE 130; extracto Banco Andino v2, saldo, tasa y mínimo con referencia documental. |
| RC1-03 ORACLE + ATLAS | HTTP 200, COMPLETE; NEXUS 131 → ORACLE 132 + ATLAS 133; comparación con obligaciones y priorización. |
| RC1-04 tres especialistas | HTTP 200, COMPLETE; NEXUS 118 → ORACLE 119 + ATLAS 120 + LUMEN 121; documento, prioridad y guía de registro de pago, todos OK. |
| RC1-05 CHRONOS/AEGIS | Disponibilidad por el workflow MCP simulado, propuesta PROPOSED, confirmación PENDING_MEET y duplicado idéntico. Fecha pasada 400, código inexistente 404, otro propietario 404, propuesta expirada 409. |
| RC1-06 borrador | Propuesta persistente FINANCIAL_SUMMARY, createDraft simulado en ejecución 128, vista previa con destinatario demo@ceroa.local y confirmación humana. Sin envío real. |
| RC1-07 negativos | Aislamiento y referencias/fechas/vigencia se comprobaron vía HTTP; hechos UNVERIFIED, referencias inventadas, fechas de soporte usadas como cifras y documentos insuficientes se comprobaron en las suites Java de grounding, contratos, biblioteca y PostgreSQL. No se presenta esa cobertura por componentes como una conversación Gemini negativa nueva. |

La prueba de expiración alteró exclusivamente expires_at de una propuesta sintética recién creada, dentro de la base demo y con filtro explícito por propietario y código. Se conservaron las propuestas y volúmenes. Los escenarios no realizaron pagos ni escribieron datos financieros de clientes.

Evidencias nuevas: [resultados funcionales](benchmarks/ceroa-codex-release-2026-11-14/functional-results.json), [ejecuciones](benchmarks/ceroa-codex-release-2026-11-14/executions.json), [métricas](benchmarks/ceroa-codex-release-2026-11-14/runtime-metrics.json), [Grant y modelos](benchmarks/ceroa-codex-release-2026-11-14/budget-runtime.json). `success` de n8n se conserva separado de `COMPLETE` del negocio; los wrappers Calendar/Gmail no tienen ese estado cognitivo.

## Gemini: presupuesto, límites y observabilidad

RC1-04 reservó 15 iteraciones: NEXUS hasta 6 y cada especialista hasta 3. Los tres Grants observados autorizan 3. La ejecución observó 4 evaluaciones del nodo Gemini de NEXUS, 2 de ORACLE, 3 de ATLAS y 1 de LUMEN; no se convierten en un conteo exacto de HTTP. Los tres completaron su responsabilidad sin cobertura perdida en esta muestra.

La configuración efectiva heredada de application.yml es **15 por minuto, concurrencia 1 y cooldown 60 segundos**, sin overrides en Compose demo. Corrige las afirmaciones anteriores de concurrencia 2 y cooldown 30. Hubo una respuesta 429 ante consultas demasiado próximas; se esperó la ventana y luego se obtuvo COMPLETE sin elevar límites. Las pruebas AssistantProviderGateTest verifican concurrencia, ventana, no reembolso de reserva y cooldown compartido. AssistantService activa quotaFailure para PROVIDER_LIMIT y PROVIDER_QUOTA. No se provocó deliberadamente una cuota real agotada ni se afirma haber medido su duración en Gemini.

Se inspeccionó el código instalado: LangChain core 1.2.8 AsyncCaller permite por defecto hasta 6 reintentos; el nodo Gemini no establece maxRetries explícito. Hay reintentos internos potenciales, acotados, adicionales a las iteraciones. Las métricas exactas de HTTP/reintentos/tokens siguen no observadas (null). La reserva protege presupuesto lógico y concurrencia, **no garantiza un máximo físico de 15 solicitudes HTTP**. La ingesta/búsqueda usa embeddings gemini-embedding-001 aparte de esa reserva; la búsqueda documental nueva devolvió AVAILABLE con un documento y fragmento. Antes de capacidad productiva se requiere telemetría de proveedor y dimensionar conjuntamente embeddings y reintentos, sin eliminar las protecciones.

## Pruebas automatizadas y opt-in

Node: 51/51, cero fallos. Frontend: tsc --noEmit y 190/190 pruebas en 23 archivos, cero fallos. Java: se registraron 456 casos, 34 opt-in omitidos inicialmente. El primer recorrido en UTC cruzó medianoche y produjo cuatro fallos y un error en NotificationIntegrationTest/DebtServiceTest: fixtures usan LocalDate.now() y los servicios usan Bogotá. Repetidas ambas clases con TZ/JVM America/Bogota, sus 17 casos pasan. No se corrigió código del release por esa discrepancia del harness.

Las 34 pruebas omitidas se enumeran individualmente en [opt-in-tests.json](benchmarks/ceroa-codex-release-2026-11-14/opt-in-tests.json):

| Suite | Casos | Clasificación y resolución |
|---|---:|---|
| HybridDocumentIntegrationTest | 27 | PostgreSQL/pgvector real; ejecutada y aprobada en base desechable verification, almacenamiento/embeddings simulados. |
| PostgresMigrationIntegrationTest | 3 | PostgreSQL/Flyway/SSL real; aprobadas en otra base desechable migration_test, V1–V31, validate/idempotencia y JSONB/JPA. |
| MultiagentEndToEndTest | 2 | Infraestructura n8n nativa aislada y proveedor simulado; 2/2 aprobadas, red interna independiente. |
| RealMultiagentEndToEndTest | 1 | Gemini real con fixtures/nombres de red históricos; su escenario se reemplazó para esta validación por RC1-01 a RC1-04 sobre el candidato exacto, sin contar la suite histórica como ejecutada. |
| Block6GoogleEndToEndTest | 1 | Gmail/Sheets reales y un correo real; no autorizada, permanece omitida. |

El primer intento conjunto de las suites PostgreSQL encontró una colisión en public.ceroa_rag_configuration al intentar migrar dos esquemas desde cero en la misma base. Se conservaron los resultados y se repitió únicamente migración en una base distinta, con éxito. No es una regresión de RC1 ni se modificaron migraciones históricas. Los resultados por caso y la reconciliación sin duplicados están en [java-results.json](benchmarks/ceroa-codex-release-2026-11-14/java-results.json).

Reconciliación final: **456 casos únicos, 454 aprobados, 2 omitidos, 0 fallos/errores pendientes**. Se ejecutaron 32 de las 34 pruebas inicialmente omitidas. Es un resultado consolidado de varias invocaciones, no una supuesta ejecución única de 454 pruebas.

## Navegador y operación de demo

Playwright Chromium verificó sesión autenticada, Inicio, Deudas, Estrategia, Simular y Perfil; asistente con distintivo de simulación, biblioteca con documento v2 y búsqueda híbrida; borrador con vista previa; consola n8n, lienzo NEXUS con delegaciones e historial actualizado. Se visitaron frontend :3001 y consola :5679; las acciones del navegador utilizaron backend :8081. Capturas nuevas privadas permanecen en tmp/codex-release y chat-rc1-*.png. No se publicaron capturas con sesiones/tokens ni estados de navegador.

La demo sigue activa en loopback con PostgreSQL local (DB_URL y RAG_DB_URL apuntan a db/ceroa_demo), almacenamiento adapter, n8n local y Gemini real. No usa Supabase operativo. Flyway de demo: V31 checksum 1431353347. Los volúmenes demo-db, demo-n8n y demo-adapter se conservaron.

## Diferencias demo/producción y pendientes concretos

Se conservan NEXUS, ATLAS, ORACLE y LUMEN cognitivos; CHRONOS como frontera; AEGIS determinista, monolito Spring y cinco secciones.

Calendar demo usa cliente MCP real hacia un servidor simulado; la plantilla productiva workspace-calendar conserva nodos Google Calendar por webhook REST. **MCP Calendar productivo sigue pendiente**: mínimo requerido es un servidor/puente MCP autenticado que exponga disponibilidad y creación/consulta/cancelación tipadas, revalide alcance e idempotencia y use las credenciales OAuth del operador; el wrapper debe preservar el contrato del gateway. No se activa en esta entrega.

WorkspaceDraftService está incluido en RC1 y no depende de cargar código Java de laboratorio, pero requiere un webhook privado configurado que implemente el contrato de borrador. La plantilla productiva workspace-mail procesa eventos de correo; no equivale a ese endpoint createDraft. **Falta el adaptador productivo de borradores**, mínimo: Google Gmail createDraft (nunca send), destinatario derivado del propietario, propuesta vigente, idempotencia, respuesta ligada a proposalId y sent=false, y política explícita de confirmación/outbox. Activar OAuth por sí solo no resuelve esta diferencia.

Corrección de seguridad documental: los gateways Calendar/draft usan cabecera compartida X-Ceroa-Workspace en URL interna fija; no implementan el HMAC X-Ceroa-Workspace-Signature descrito en el informe heredado. El contrato de Grants de agentes sí conserva sus controles. WORKSPACE_GMAIL_ENABLED=false controla el consumidor de correo, pero no es un flag draft-enabled: el borrador queda inhabilitado al dejar WORKSPACE_DRAFT_URL vacío. No deben confundirse esos mecanismos.

## Estado operativo leído y Bloque 13 actualizado

[Preflight de solo lectura](benchmarks/ceroa-codex-release-2026-11-14/runtime-readonly.json): PostgreSQL Supabase 17.6, V30 exitosa, V31 ausente, siete SHEETS/PENDING; 30 workflows operativos, 15 activos/publicados, 22 credenciales. Contenedores originales detenidos e idénticos antes/después. Las opciones operativas siguen sin habilitarse; no se procesó outbox.

V31 real es **V31__durable_subscription_charges.sql**, crea subscription_charges e índice subscription_charges_subscription, con FK a plus_subscriptions. No es una migración de facts_json. Deben verificarse checksums V1–V30 contra el JAR y el preflight actualizado; V31 esperado 1431353347. El B12 original y RC1 son diferentes candidatos: usar RC1 y su manifiesto final.

Plan de ventana, pendiente de autorización productiva:

1. Acordar ventana con el operador, fijar commit/manifiesto RC1, digests de imagen y rollback; medir en ensayo tiempos de backup/restauración antes de prometer una duración. No hay ventana productiva agendada.
2. Mantener detenidos consumidores, schedulers, Telegram y conectores; bloquear escritores de API y facturación durante el corte. Inventariar siete eventos pendientes y no drenarlos como parte de las pruebas.
3. Obtener respaldo actualizado con snapshot consistente PostgreSQL, roles sin passwords, Storage y exportaciones n8n/credenciales cifradas, con custodia de claves fuera de Git. El snapshot B12 del 9 de noviembre no cubre escrituras posteriores. Restaurar y verificar conteos/hashes en aislamiento antes de avanzar.
4. Validar Flyway/checksums sobre la copia restaurada, aplicar únicamente V31 y ensayar RC1 sobre esa copia. El ensayo sintético actual no sustituye una restauración financiera actualizada.
5. Empaquetar imagen backend con el RC1 exacto y digest fijo; construir frontend compatible desde lockfile y fuente versionada con variables públicas apropiadas. Mantener las seis identidades y revisar CORS/cookies/orígenes.
6. Comparar definiciones publicadas vigentes, preservar IDs, credenciales y configuración operativa. Actualizar selectivamente solo workflows revisados, nunca sustituir la instancia por exportaciones demo. Mantener Calendar/draft productivos pendientes deshabilitados y ocho conectores generales apagados.
7. Validar arranque, login, finanzas/documentos, evidencia/propietario, V31/checksums y estados de negocio, y solo después autorizar por separado escritores y consumidores. Las pruebas externas requieren autorización específica.
8. Interrumpir ante checksum inesperado, backup/restauración no verificados, migración fallida, acceso cruzado, grounding inválido, incompatibilidad contractual o error persistente; mantener escritores bloqueados mientras se decide recuperación.
9. Rollback por componente: restaurar imagen backend y frontend previas y versiones publicadas n8n previas con configuración preservada. **No elimina V31**. Una restauración de DB exige plan separado, corte consistente y reconciliación de escrituras posteriores, sin editar el historial Flyway ni ejecutar DROP como atajo.

Se comprobó explícitamente el backend operativo anterior (imagen ed6d9ae…) sobre la base sintética migrada V31: arranca, login 200 y deudas 200, [evidencia](benchmarks/ceroa-codex-release-2026-11-14/previous-backend-v31.json). El carácter aditivo no garantiza idempotencia de los escritores antiguos: al volver atrás mantener facturación/consumidores pausados hasta reconciliar recibos subscription_charges. No se promete rollback completo en dos minutos.

## Git, seguridad, commits y PR

Publicación autorizada únicamente después de las validaciones. La inspección de archivos excluye .env, tokens, claves, SQLite, backups, documentos privados, logs sensibles, JAR y tmp. El escaneo encontró únicamente contraseñas sintéticas explícitas de Compose demo, sin claves Google, JWT, tokens GitHub, Bearer reales ni claves privadas. Los hashes de commits y PR se registran en el cierre de versionamiento de este documento. No hay merge ni force push.

## Veredicto y próximo paso

**GO para revisión/integración del candidato RC1 y demostración local. NO-GO para ejecutar producción ahora.** La autorización productiva sigue pendiente; antes deben verificarse respaldo/restauración actualizados, empaquetado final y configuración operativa. MCP Calendar y createDraft productivos requieren los adaptadores mínimos descritos si forman parte del alcance de lanzamiento. Se puede lanzar sin ellos solamente manteniéndolos deshabilitados y declarando esa limitación.

Próximo paso: revisar el PR borrador y decidir el alcance productivo y la ventana de Bloque 13; no fusionar ni desplegar automáticamente.


## Cierre de versionamiento y publicación

Rama publicada mediante push normal; PR borrador [#1 — Validate RC1 runtime and consolidate Ceroa release readiness](https://github.com/ks-correa/Ceroa/pull/1), base main, sin merge. Commits funcionales y evidencia publicados:

```text
31c6593efb48a973c1a9d7bbf665d292860c7cc6 fix(assistant): consolidate grounded multiagent budgets and governed drafts
e0148bcba255e6ad654932028c0ec8fa439e54e4 feat(n8n): preserve six agent identities and bounded workflow contracts
694fda950ee6085fcb9755acba03345af25e7cce feat(frontend): expose reviewed mail drafts and demo provider labels
71c5b4a4fcbbac2de6bffb37f1e549d76a69495c chore(demo): run verified RC1 with reversible startup and release provenance
71cab5ea5314b2f9cf19836eaa14658adb343e2b docs(release): reconcile RC1 evidence and correct deployment gates
```

El commit documental de cierre contiene este registro y final-integrity.json; su hash se obtiene con git rev-parse HEAD y se entrega también en la respuesta final, evitando una autorreferencia de hash imposible. No cambia clases, recursos, frontend, workflows ni configuración del candidato. El manifiesto ampliado final conserva SHA-256 crudo `0b1f3e7ee597b3cbbce4909e4d2e4ab080a63f6aa4b2e4a5fb9d3a4ac5a26252` y normalizado LF `1a8f0babf7384c56af748be1ecdf9df598d01c26ba2812b839506eb95a88e181`.

La lectura de cierre confirma contenedores operativos, workflows publicados, checksums Flyway y outbox sin cambios frente al preflight. Demo backend, frontend, adapter, DB y n8n permanecen activos; backend ejecuta el hash RC1 original. No hay cambios funcionales posteriores al build que requieran RC2. Logs completos de las invocaciones de prueba se conservan privadamente en tmp/codex-release; los resúmenes publicables preservan los resultados y sus limitaciones.
