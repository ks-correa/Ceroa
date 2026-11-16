# CEROA AI — Recuperación, validación integrada y preparación de despliegue

Fecha: 14 de noviembre de 2026, America/Bogota. Rama `docs/ceroa-ai-architecture`, base y HEAD remoto `8c6ac23939211228e58112e92b010bd675f7ba86`. Cambios locales sin commit ni push.

## A. Resumen ejecutivo

Se recuperaron las condiciones de prueba sin arrancar ni reiniciar los servicios operativos. Docker Desktop responde, se reutilizó Maven/JDK 25 en contenedores desechables y se verificó Maven Wrapper. Se localizó el candidato B12 original por hash y se autenticaron los tres respaldos en WSL. El preflight actual confirma PostgreSQL 17.6, Flyway V30 y V31 ausente: **Bloque 13 continúa pendiente**.

Se ejecutaron 51 pruebas Node, 403 pruebas Java de una batería de 437 registradas, dos pruebas combinadas Spring+n8n, seis escenarios nativos de agentes y cuatro negativos nativos. Se añadió una prueba MAS-01 exacta y tres pruebas de frontera Calendar; las suites específicas finales pasaron 22/22 y 3/3. Los números corresponden a suites y capas diferentes; no se suman como escenarios únicos.

La arquitectura ejecuta delegación real con proveedores simulados. La aceptación de 18 conversaciones completas nuevas no se declara: la matriz identifica consultas exactas e integración documental todavía parciales. No se ejecutó Gemini real nuevo. La evidencia posterior B6 con Gemini real se incorporó correctamente. El PDF fue revisado directamente; exige explícitamente MCP Calendar en su implementación de referencia, frontera que Ceroa aún resuelve mediante REST/nodos nativos.

## B. Entorno inicial y recuperación

| Componente | Comprobación actual | Acción realizada |
|---|---|---|
| Git | Rama docs/ceroa-ai-architecture; base y HEAD remoto en 8c6ac23 | Se preservaron los cambios previos y main; sin commit/push. |
| Docker Desktop | Engine 29.9.2, Desktop 4.98.0; accesible en desktop-linux | Solo inspección y contenedores de prueba nuevos. No se reinició Desktop. |
| Compose | 5.6.1 | No se aplicó compose up al producto. |
| WSL Ubuntu | Daemon Docker separado 29.1.3; sin contenedores Ceroa | Se reutilizó para verificar respaldos locales, no se tocó minikube. |
| Java del host | 21.0.11 | Se mantuvo; no se cambió java.version. |
| Java de pruebas | Temurin 25.0.1 en imagen Maven existente | Copias aisladas bajo tmp/ceroa-recovery; sin montar .env ni respaldo restaurado. |
| Maven | 3.9.11; Wrapper 3.3.4 configurado para 3.9.11 | Wrapper verificado; copia Linux normalizada a LF, distribución oficial descargada en caché. Tests posteriores offline. |
| Node | 24.20.0 host; Node propio de n8n en su imagen | Tests locales y simulador de proveedor en loopback aislado. |
| Backend/frontend/n8n | Contenedores detenidos; imágenes históricas preservadas | No se arrancaron. No hay servicio de producto en sus puertos locales. |
| Telegram proxy/túnel | Detenidos | Sin mensajes ni cambios. |
| Supabase | Configuración existente reutilizada privadamente; conexión real de lectura correcta | Transacción REPEATABLE READ READ ONLY con rollback; no se imprimieron credenciales. |

El bloqueo inicial de acceso a Docker ya no existe. Para las pruebas realizadas no hace falta intervención manual. Para volver a operar el producto se necesita una autorización expresa de arranque/ventana; no basta con ejecutar indiscriminadamente compose up. La imagen operativa anterior, compatible con V30, y el candidato V31 son artefactos distintos.

## C. Candidato B12 y respaldos

Candidato recuperado en `tmp/block10-build-results/ceroa-backend-0.1.0-SNAPSHOT.jar`, SHA-256:

`dbc8b235ecc7cb94934c88037729cc903e7dbd66eaf0608f33f7290e3f248b8b`

Coincide exactamente con el validado B12. Se verificaron sus 31 migraciones frente al código, normalizando CR. No se recompiló ese JAR, no se sobrescribió backend/target y no se mezclaron los cambios de nombres con una imagen candidata. [Evidencia del candidato](benchmarks/ceroa-recovery-2026-11-14/candidate-verification.json).

Los tres archivos cifrados B12 están en `/home/kevin/.local/share/ceroa-backups` de Ubuntu y mantienen sus hashes del manifiesto. Se autenticaron nuevamente con sus claves privadas existentes mediante un contenedor Node sin red, raíz de solo lectura, cgroup sin swap y descifrado solo en memoria. Las pruebas de clave incorrecta y alteración rechazaron cada archivo. No se exportó contenido financiero ni se escribió contenido descifrado. [Verificación](benchmarks/ceroa-recovery-2026-11-14/backup-verification.json).

El primer intento de autenticación del complemento de metadatos eligió una clave por nombre y no autenticó. Se comprobó después cuál de las dos claves existentes correspondía criptográficamente: el complemento autenticó correctamente. No se cambió ninguna clave. No se repitió restauración: la prueba histórica B12 conserva su evidencia suficiente. Estos respaldos siguen en el mismo equipo y su punto de recuperación es del 9 de noviembre; antes de desplegar se necesita un respaldo actualizado.

## D. Revisión directa del PDF y correspondencia académica

Fuente: `C:/Users/User/Downloads/14 - 2 Multi-Agent_Architecture.pdf`, 12 páginas, SHA-256 `452ace1f827bd3d848440545c8aef9e287259f9fab64189acf52b6c2e324b8b4`. Se renderizaron e inspeccionaron las doce páginas; el PDF no tiene texto extraíble. No se utilizó un resumen anterior en sustitución de la fuente.

| Páginas | Principio o implementación del profesor | Ceroa: correspondencia y diferencia |
|---|---|---|
| 2–4 | Evitar God Agent, sobrecarga del prompt y selección incorrecta de herramientas; separación funcional | NEXUS tiene tres delegaciones y carece de herramientas financieras/documentales directas. No se infiere reducción de costo/latencia por el solo patrón. |
| 5 | Supervisor/router que clasifica y delega sin herramientas pesadas; ejemplo Webhook/If/Simple Memory | NEXUS más clasificación/capacidades de Spring. Contexto autorizado en backend; Simple Memory no es necesaria para preservar esa función. |
| 6 | FRIDAY estructurado y JARVIS semántico, determinismo frente a recuperación/citación | ATLAS usa APIs/cálculos deterministas; ORACLE usa RAG/pgvector mediante backend. No se expone SQL libre al LLM. |
| 7 | Preparar acción, barrera lógica de auditoría, aprobación humana y commit | AEGIS es determinista y transversal. Propuestas persistentes, confirmación/expiración y control de efectos; no se necesita un LLM decisor de seguridad. |
| 8–9 | VERONICA como agendamiento mediante MCP Calendar; tabla técnica señala MCP Client/Google Calendar Server | CHRONOS tiene agendamiento real por REST → webhook n8n → nodos Google Calendar. Otro cliente MCP público/acotado no convierte esa ruta en MCP Calendar. Diferencia literal pendiente. |
| 9 | ULTRON como QA/auditor, reglas de negocio/HITL y createDraft | AEGIS valida y mantiene propuestas/outbox. No crea un borrador Gmail mediante createDraft en esta ruta: equivalencia funcional de aprobación, diferencia técnica literal. |
| 10 | Decisión compuesta: supervisor divide, FRIDAY consulta, VERONICA agenda vía MCP, ULTRON prepara borrador | Ceroa coordina especialidades y prepara propuestas; la ejecución sensible queda detrás de confirmación. Las pruebas nuevas compuestas son financiera/documental, no una réplica completa de ese caso Calendar+Gmail. |
| 11–12 | Entregables con canvas integrado, borrador y demostración viva de extremo a extremo | Identidades y delegación nativa demostradas en sandbox. Producto detenido y publicación pendiente: no se declara entrega operativa completa. |

**Veredicto académico:** alineación de patrones de supervisión, especialización, recuperación, gobernanza y HITL. **No hay equivalencia literal completa del stack TeachIA.** Si se evalúa el mecanismo técnico de las páginas 8–11, Calendar mediante MCP sí requiere un ajuste funcional, no un renombrado. La exigencia aparece explícitamente en la presentación; la aceptación de una adaptación de transporte para el dominio financiero requiere validación del profesor, no se presupone.

Ajuste posible para revisión posterior: cliente MCP acotado en CHRONOS → servidor MCP controlado → operaciones backend autorizadas de disponibilidad/propuesta; conservar AEGIS y el gateway Calendar existente detrás de esa frontera, sin permitir confirmaciones automáticas al LLM. No se añadiría otro agente cognitivo. Requiere diseño/ensayo del transporte y decisión de alcance; **no fue implementado ni activado en esta entrega**. La variante literal Gmail createDraft también debe evaluarse por separado antes de usar credenciales o comunicaciones externas.

## E. Corrección de la evidencia histórica

El informe anterior destacó únicamente el fallo B3 y dejó incompleta la continuidad del proveedor. Se corrigió incorporando:

- B3: agentes nativos y proveedores simulados; su intento Gemini falló API_KEY_INVALID en esa fecha.
- B6: ocho solicitudes correctas con Gemini real, seis completas y dos abstenciones esperadas. Financiero 8348 ms, RAG 4248 ms, soporte 4489 ms, compuesto RAG+Financiero 10770 ms y propuesta PROPOSED 7036 ms. Una muestra por caso, sin percentiles ni garantía de disponibilidad.
- B6: snapshot con 18 ejecuciones conversacionales y 40 invocaciones observadas del nodo de modelo, incluidos intentos previos. No se convierten en 40 peticiones HTTP exactas del SDK. El conocimiento público aprobado y finanzas de esa prueba son fixtures, no acceso al corpus financiero productivo.
- B7: matriz de 63 IDs reconciliada en el informe consolidado, con 54 aprobaciones históricas. Sus referencias de request/execution no son ejecuciones de hoy; no se reexportó historial privado para aparentar evidencia nueva.
- B8: pruebas de contratos/seguridad, dos casos combinados Spring+n8n con proveedor simulado y otras regresiones delimitadas. No se etiquetan como conversación Gemini real nueva.

Se añadió una nota de continuidad en N8N-MULTIAGENT-2026-11-07.md sin alterar el resultado histórico original. Fuentes: [B6](BLOQUE-6-ESTABILIZACION-2026-11-09.md), [B8](BLOQUE-8-CONSOLIDACION-2026-11-09.md), [conciliación B7/B9](CEROA_INFORME_CIERRE_TECNICO_Y_MATRIZ_E2E_CONSOLIDADA.md).

## F. Pruebas nuevas y resultados

| Batería | Resultado | Alcance |
|---|---|---|
| Node | 51/51 aprobadas | Nombres, expresiones, conexiones AI, contratos, configuración y parche selectivo. |
| Java completa | 437 registradas; 403 ejecutadas correctas, 34 omitidas | JDK 25, Docker sin red, H2, proveedores simulados. Las opt-in PostgreSQL/Gemini no quedan aprobadas por esta ejecución. |
| AssistantIntegrationTest tras añadir MAS-01 | 22/22 aprobadas | Incluye la pregunta exacta MAS-01, dos propietarios y cero webhook; 21 pruebas repetidas no son casos nuevos. |
| WorkspaceCalendarGatewayTest nueva | 3/3 aprobadas | Calendar deshabilitado, URL no permitida y credencial ausente fallan con 503 antes de cualquier petición. |
| Spring+n8n | 2/2 aprobadas | Finanzas frescas y abstención; HTTP real, H2, LLM simulado, red interna Docker. |
| n8n nativo cognitivo | 6/6 aprobadas | AI Agents y parsers nativos; proveedor y herramientas backend simulados. |
| n8n negativos | 4/4 aprobadas | Parser, referencia, correlación e items múltiples. |
| Importación selectiva | 7/7 definiciones almacenadas idénticas a la propuesta | n8n sin red, sin servidor ni publicación y sin credenciales operativas importadas. |

Las ejecuciones repetidas durante instrumentación se excluyen del conteo de seis escenarios finales. La primera regresión MAS-01 falló por texto generado con codificación incorrecta; el fixture se corrigió y la suite final pasó sin cambios en código productivo. Los logs de diagnóstico permanecen privados en tmp. La matriz registra cobertura y pendientes de los 18 MAS sin declarar 18 conversaciones completas nuevas.

No hubo ejecución nueva de Gemini real ni navegador. [Plan Gemini acotado](../integrations/verification/ceroa-gemini-plan.json): cuatro consultas con modelo más control determinista, datos sintéticos, una muestra, pausas de 65 s, concurrencia uno, stop en cuota/credencial/evidencia inválida y autorización explícita antes de ejecutar. Los reintentos internos del SDK no se presentan como controlados por una opción ficticia.

## G. Delegación y trazas redactadas

Las seis trazas finales están en benchmarks/ceroa-recovery-2026-11-14: COMPOSITE, FINANCIAL, RAG, SUPPORT, UNKNOWN y EXTRACTS. Ejemplo COMPOSITE: request sintético terminado en 0001, herramientas Delegar_a_ORACLE y Delegar_a_ATLAS, recuperación documental y datos financieros, dos delegaciones y siete peticiones al proveedor simulado. NEXUS recibió los resultados y devolvió salida estructurada. UNKNOWN no delegó; sí realizó la llamada del orquestador. MAS-01 es la ruta diferente de cero modelo.

Los especialistas registran IDs SQLite disponibles; el root ejecutado por CLI tiene executionId=null porque no se dispone de ese ID persistido. La política de guardado del fixture conserva algunos estados SQLite running sin final durable, incluso tras las salidas correctas: se mantienen como observación, sin inventar success/stoppedAt. El éxito funcional se prueba mediante aserciones de retorno y HTTP. No se publicaron prompts, importes, documentos, tokens ni credenciales.

## H. Procedimiento selectivo preparado y probado

1. Leer el runtime y exportar por separado borradores, versiones publicadas y configuración, preservando recuperación cifrada. No usar las plantillas portables como fuente operativa.
2. Verificar IDs, versiones y que no haya borradores ajenos divergentes. Los cuatro conversacionales observados tienen draft igual a published; volver a comprobarlo en la ventana futura.
3. Ejecutar offline prepare-identity-update.mjs sobre el export autoritativo. Su salida conserva estados/versiones/configuración y no llama al servidor. Rechaza referencias o conexiones rotas; preserva la ausencia de mcp-public en LUMEN.
4. Revisar diff: solo identidad, notas y referencias dependientes de nombre. Para este inventario selecciona cuatro conversacionales y tres fronteras CHRONOS; los otros 23 workflows quedan idénticos, incluidos conectores generales.
5. Probar en sandbox. En esta sesión se importaron únicamente las siete definiciones propuestas en n8n 2.40.7 sin red, sin arrancar el servidor y sin importar credenciales operativas. El almacenamiento de nombres/nodos/conexiones coincidió exactamente. Esto no certifica un rollback de publicaciones productivas.
6. **Detenerse aquí.** Para escribir borradores reales o publicar, solicitar autorización sobre un diff concreto y respaldado. Usar el mecanismo n8n soportado para crear una nueva versión recuperable; no sobrescribir activeVersionId por SQL ni activar/desactivar workflows para forzar reconciliación.
7. Con autorización futura, publicar selectivamente y comprobar registros de webhook/credenciales/roles, trazas y estados; restaurar versión anterior si fuera necesario mediante el procedimiento preparado. No reiniciar servicios ni reactivar conectores como efecto implícito.

La propuesta privada está bajo tmp/ceroa-recovery; contiene configuración específica y no se entrega a Git. Las evidencias públicas solo contienen metadatos estructurales. El parche conserva las asociaciones de credencial aun cuando sus nombres coincidan con antiguas etiquetas de agentes. Los tests verifican idempotencia, ausencia MCP, referencias compuestas y rechazo de grafos inválidos.

## I. Seguridad y acciones externas

AEGIS conserva autoridad determinista; ATLAS no hace aritmética financiera mental, ORACLE conserva versiones/propietarios y NEXUS no obtiene herramientas privadas directas. No se cambiaron contratos, roles, claves, endpoints ni validaciones productivas. CHRONOS mantiene propuestas, confirmación humana, idempotencia y estados ambiguos; se comprobó además el rechazo previo a red de Calendar mal configurado/deshabilitado.

No se aplicó V31, no se procesaron los siete eventos Sheets, no se activaron conectores, no se crearon reservas ni pagos y no se enviaron comunicaciones reales. La única salida de red adicional para preparar herramientas fue la distribución oficial de Maven y PyMuPDF para leer el PDF; las pruebas financieras/proveedor permanecieron aisladas. Supabase solo recibió lecturas de metadatos/agregados, no exportaciones de clientes.

## J. Estado real del Bloque 13

El preflight nuevo confirma V30 y tabla subscription_charges ausente; no hay despliegue V31 posterior en la base inspeccionada. Imágenes operativas: backend ed6d9ae228bb, frontend a3a5556a7fe1, n8n ffeb52485f78. Los contenedores conservan sus identidades, arranques históricos y contador de reinicios. El candidato correcto está recuperado pero no convertido en una imagen nueva ni desplegado.

Prerrequisitos: autorización de ventana; respaldo actualizado y autenticado/recuperable; control de escritores, ingesta y consumidores; comprobación final de Flyway/checksums/ACL; un único migrador; validación de backend y acceso por propietario. La publicación de identidad queda separada de esa ventana de V31.

## K. Archivos modificados o nuevos

Se conservan los cambios de identidad de la entrega inicial. Esta recuperación añade o ajusta:

- docs/CEROA_MULTIAGENT_ARCHITECTURE.md y docs/CEROA_MULTIAGENT_VALIDATION.md.
- Este informe y docs/N8N-MULTIAGENT-2026-11-07.md, con nota de continuidad histórica.
- integrations/n8n/prepare-identity-update.mjs y su test; ceroa-identity.mjs para referencias en claves compuestas; prueba de parche sobre configuración autoritativa.
- multiagent-provider-stub.cjs para registrar la herramienta realmente seleccionada; multiagent-runtime-fixture.mjs para identificadores sintéticos distintos en EXTRACTS.
- Nombres CHRONOS en generadores/JSON Calendar y MCP, corrigiendo codificación del guion visual sin cambios de contrato.
- backend/src/test/java/com/ceroa/config/AssistantIntegrationTest.java: nueva regresión MAS-01; backend/src/test/java/com/ceroa/service/WorkspaceCalendarGatewayTest.java: tres pruebas nuevas. No cambió backend/src/main.
- integrations/verification/ceroa-recovery-readonly.cjs, ceroa-backup-memory.cjs, ceroa-native-trace.cjs, test-ceroa-native.ps1 y ceroa-gemini-plan.json.
- Evidencias redactadas en docs/benchmarks/ceroa-recovery-2026-11-14. Export autoritativo, bases de sandbox y logs completos permanecen en tmp ignorado.

## L. Limitaciones y pendientes

- Las consultas exactas marcadas parciales en MAS requieren ampliar el fixture combinado Spring+n8n, especialmente documentos/obligaciones, soporte exacto y contexto conversacional. Los resultados por capas no las sustituyen.
- Gemini real nuevo requiere autorización acotada; hay evidencia real B6, sin garantía de vigencia de la credencial actual ni disponibilidad del proveedor.
- Persistencia de estados finales de ejecución en el sandbox: las trazas de CLI y HTTP prueban retorno funcional; SQLite no proporciona en estos fixtures un recibo final completo.
- Calendar mediante MCP y Gmail createDraft son diferencias literales de la presentación. No se declaran implementadas por disponer de otros workflows MCP o propuestas internas.
- Backend/frontend/n8n productivos siguen detenidos. Su reanudación y despliegue no están autorizados por esta tarea.
- No se repitió navegador ni restauración B12 ni migración productiva. Los respaldos están en el mismo equipo y no cubren automáticamente escrituras posteriores al snapshot.

## M. Veredicto y estados

Arquitectura especializada **IMPLEMENTADA** y delegación cognitiva nativa **PROBADA nuevamente** con proveedores simulados. Seguridad y HITL deterministas con regresiones ejecutadas. Identidad y parche selectivo locales, sin regresión observada en las baterías realizadas. No se certifica cumplimiento literal completo del stack académico ni 18 conversaciones E2E nuevas.

**VERSIONADO:** base 8c6ac23; cambios nuevos sin commit ni push. **DESPLEGADO:** ningún cambio de esta entrega. **ACTIVADO:** ningún workflow/conector operativo. **OPERATIVO:** sandbox de pruebas verificado; servicios del producto detenidos. **Bloque 13:** pendiente.

## N. Siguiente acción concreta

Completar las consultas MAS que siguen parciales en el fixture combinado, manteniendo datos sintéticos y proveedor simulado; después ejecutar el plan Gemini únicamente con autorización acotada. Para la sustentación, decidir si se exige equivalencia literal MCP Calendar/createDraft y revisar el ajuste acotado descrito, sin añadir agentes redundantes. Para Bloque 13, el siguiente acto operativo es una ventana autorizada con respaldo actualizado y candidato B12 fijado; no una importación masiva de plantillas ni un reinicio general.
