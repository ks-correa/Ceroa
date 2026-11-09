# Ceroa — Bloque 6: estabilización y verificaciones acotadas

## Alcance y autorización

Trabajo iniciado en `refactor/n8n-multiagent` desde `11f5c6d`. Se conserva la arquitectura existente. El usuario autorizó crear un segundo PDF sintético en la carpeta de pruebas ya aprobada, modificarlo una vez, enviar un único correo a la propia cuenta Google autorizada y proyectar su evento en la pestaña `Pruebas Bloque 4`. No se autorizó operación continua. La comprobación visual autenticada desde React quedó pendiente por decisión expresa del usuario.

## Correcciones conversacionales

- Contrato plano de especialistas, versión `1.1`, compatible con Gemini y el parser instalado. Se eliminó del esquema del proveedor la propuesta anidada nullable; las propuestas persistentes siguen procediendo de herramientas autorizadas. Spring mantiene sus validaciones de esquema, propietario, vigencia, números, cobertura y referencias. Las referencias privadas `fN` se resuelven en el backend; las fuentes públicas aprobadas usan `dN` y no admiten identificadores inventados.
- Selección determinista de especialidades en Spring: financiera → Financiero, conceptual/documental → RAG, operativa → Soporte, compuesta → las especialidades necesarias. El contexto anuncia únicamente esas herramientas; el backend rechaza cualquier delegación ajena a esa selección. Se conserva contexto para seguimientos pronominales, con vencimiento, y se excluyen cláusulas negativas del tipo «no necesito…».
- Soporte dejó de funcionar como respaldo genérico. El prompt exige conservar un resultado insuficiente o fallido, sin volver a plantear la misma tarea a otro especialista. Las rutas deterministas existentes evitan el modelo.
- La recuperación de conocimiento aprobado se reutiliza dentro de la solicitud y revalida la vigencia de sus fuentes. No se reconstruyó la biblioteca ni se regeneró el corpus de embeddings.
- Un resultado inválido o sin evidencia utilizable no se transforma en una respuesta financiera aceptada. El API añade `functionalStatus`; React distingue respuesta parcial, evidencia insuficiente y fallo, además de `COMPLETE`.
- La prueba real de propuesta de asesoría detectó un resultado válido de Soporte rechazado porque el orquestador lo etiquetó como documental. La revisión final reconoce el modo personal únicamente cuando existen referencias emitidas por las herramientas persistentes de reserva/comunicaciones y no hay citas públicas. Se añadió regresión con el modo documental incorrecto. No se inventan propuestas, horarios, confirmaciones ni enlaces Meet.

### Workflows y nodos

Se actualizan solamente los cuatro workflows conversacionales existentes: `ceroaHybridQuery20`, `ceroaFinancialAgent30`, `ceroaKnowledgeAgent30`, `ceroaSupportAgent30`.

En los especialistas se modifican instrucciones, parser y rutas de autorización/fallo. Las salidas de error usan el canal regular, comprobado antes de completar la solicitud. Se añaden los controles `Una solicitud por delegacion`, `Rechazar items ambiguos`, `Resultado estructurado presente`, `Resultado autorizado presente` y el retorno validado. Las referencias a solicitud y alcance proceden del nodo de entrada/autorización inmutable. Dos items se rechazan antes de obtener un permiso, evitando mezclar propietarios o resolver expresiones contra un item sin emparejamiento.

`prepare-block6-runtime.mjs` conserva credenciales, herramientas y destinos enlazados del entorno. No añade el cliente MCP externo ausente en el workflow productivo. Antes de preparar el cambio se comprobó que borrador y versión publicada coincidían en esos cuatro IDs; se respaldaron ambos conjuntos cifrados.

## Cuotas y observabilidad

Nuevo control configurable de admisión en el proceso Spring: `ASSISTANT_PROVIDER_LIMITS_ENABLED`, `ASSISTANT_PROVIDER_CALLS_PER_MINUTE` (15), `ASSISTANT_PROVIDER_CONCURRENCY` (1), `ASSISTANT_PROVIDER_COOLDOWN_SECONDS` (60). Reserva conservadora de iteraciones del orquestador y especialistas por ventana móvil; los fallos no devuelven la reserva. La reserva también limita nuevas delegaciones. El rechazo de capacidad devuelve 429 sin iniciar el workflow. Una cuota notificada por el especialista impone cooldown compartido, sin reintento conversacional automático ni rotación de credenciales. Una solicitud cuyo presupuesto exceda la capacidad configurada se rechaza: no se promete ejecutar tres especialistas bajo una reserva superior al límite.

**Límite explícito:** son reservas lógicas, no un contador exacto de peticiones HTTP a Gemini. La versión instalada del nodo Gemini no permite controlar de forma efectiva los reintentos internos del SDK mediante una opción de workflow; no se añadió una opción ficticia. El control cubre las conversaciones del único backend, no los workflows de extracción/embeddings ni varias réplicas. Antes de aumentar carga o replicar el backend se requiere coordinación de cuota para todos los consumidores del proyecto. No se certifica un límite físico global de Gemini.

Las métricas separan resultado funcional, errores tipificados, delegaciones, herramientas, caché y tiempos medidos. Llamadas HTTP exactas, reintentos ocultos y tiempo exclusivo del modelo permanecen `null`, nunca cero inventado. Los tiempos anidados pueden solaparse y no deben sumarse como latencia total.

## Resultados con Gemini real

Spring/H2, autenticación y permisos reales del backend, callbacks HTTP y agentes nativos de n8n con Gemini real. El conocimiento aprobado es un fixture sintético del servicio de recuperación; no acredita conectividad del repositorio público productivo. Cada caso usa datos financieros sintéticos. Pausa de 65 segundos entre conversaciones con modelo.

| Caso final | Resultado | Especialistas esperados/observados | Total ms |
|---|---|---|---:|
| Determinista | COMPLETE | ninguno | 68 |
| Financiero | COMPLETE | Financiero | 8348 |
| Conceptual RAG | COMPLETE | RAG | 4248 |
| Soporte operativo | COMPLETE | Soporte | 4489 |
| Compuesto | COMPLETE | RAG + Financiero | 10770 |
| Desconocido | INSUFFICIENT, abstención correcta | ninguno | 1230 |
| Propuesta de asesoría | COMPLETE, persistida PROPOSED | Soporte | 7036 |
| Soporte sin conocimiento | INSUFFICIENT, abstención correcta | Soporte | 5580 |

Ocho solicitudes finales funcionalmente correctas: seis completas y dos abstenciones esperadas; siete delegaciones necesarias, cero delegaciones innecesarias, cero parciales y cero errores de cuota observados en esta batería final. **Una muestra por caso no permite percentiles concluyentes ni estimar disponibilidad productiva.** La comparación documental mantiene regresiones PostgreSQL controladas; queda pendiente su batería repetida con Gemini real.

Se conservaron dos muestras anteriores: propuesta rechazada con HTTP 503 (5894 ms), corregida; y respuesta HTTP 200 marcada funcionalmente incorrecta (5834 ms) en el ensayo de conocimiento ausente. Este último tenía un fixture inválido que devolvía siempre documentación de pagos; se corrigió para devolver evidencia vacía. No se contabiliza como prueba válida de exactitud productiva. El snapshot nativo reúne 18 ejecuciones conversacionales y 40 invocaciones observadas del nodo de modelo, incluyendo los intentos anteriores; no equivale a 40 peticiones HTTP exactas del proveedor.

Datos públicos sin identificadores privados en `docs/benchmarks/block6/`. Los logs, bases de prueba y estados con IDs permanecen en `tmp/`, excluido de Git.

## Drive real

Se reutilizó temporalmente el workflow manual de pruebas `ceroaBlock5DriveValidation50`, con dos Google Drive Trigger nativos y un filtro exacto por `Ceroa - Prueba integral Bloque 6.pdf`, dentro de la misma carpeta previamente aprobada. No se activó `ceroaWorkspaceDrive40`. Se dejó pasar el polling inicial antes de crear el archivo, sin suministrar su ID al disparador.

- Creación detectada automáticamente por `fileCreated` y `fileUpdated`. La validación/lease del backend convirtió esos eventos concurrentes en **una ingesta y un trabajo**.
- Primera versión indexada, código sintético AMATISTA. Se reconcilió a READY.
- Reinicio de n8n entre las dos escrituras. La única modificación autorizada se detectó por polling después del reinicio; misma entidad documental, versión 2, código TURQUESA. Total final: **dos trabajos INDEXED, un fragmento vigente, propietario correcto**. El fragmento vigente no contiene el código anterior.
- Validar de nuevo metadatos sin cambios devuelve UNCHANGED sin otro trabajo. Carpeta ajena → 403, checksum inconsistente para la misma versión → 409, petición anónima → rechazo. Las rutas de error y reintento del proveedor se verifican con pruebas controladas; no se provocó una caída real de Google.
- Repositorio real PostgreSQL/Supabase: recuperación léxica de la versión 2 y rechazo de otro propietario. Consulta semántica con embedding real `gemini-embedding-001`, 768 dimensiones, sin filtro por ID de documento: la pregunta en inglés no encontró el documento por búsqueda léxica y sí por coseno **0,765153848**, por encima del umbral 0,55. También se rechazó al otro propietario en la consulta vectorial. Es una comprobación puntual, no una evaluación de relevancia del corpus.

Tras el ensayo se despublicó el workflow temporal y se restauró su definición manual inactiva. No se creó otro workflow persistente. Los dos PDFs sintéticos autorizados se conservan; no se incorporaron documentos personales.

**Pendiente React:** no se ejecutó la consulta del PDF en una sesión visual autenticada. El usuario eligió dejarla pendiente. Se distinguen las pruebas reales de repositorio y las regresiones del asistente de ese recorrido completo desde el navegador.

## Gmail y Sheets reales

Inspección previa de producción: cero eventos Gmail pendientes y siete proyecciones Sheets pendientes de los ensayos documentales; no se despachó ninguna. Los flags productivos permanecieron desactivados.

Se usó una base PostgreSQL **separada** `workspace_fixture`, con Flyway y repositorios reales, un usuario sintético cuyo destinatario era exclusivamente la propia cuenta Google autorizada, y dos workflows nativos de n8n en un contenedor aislado con las credenciales cifradas existentes. No se conectó este worker a la cola productiva. La pestaña de destino fue exclusivamente `Pruebas Bloque 4`.

1. Transacción Spring confirma usuario/evento WELCOME; dos llamadas con la misma dedupe key generan un solo evento.
2. Claim → revalidación de destinatario → plantilla existente → Gmail → ACKNOWLEDGED persistente, **un intento y un ID de proveedor**.
3. Nueva ejecución con cola vacía no ejecuta Gmail ni incrementa intentos. El webhook temporal de respuesta al último nodo devuelve 500 «No item to return was found» cuando no hay items, aunque la ejecución nativa termina correctamente. Se conserva esta diferencia entre transporte del ensayo y resultado funcional; los workflows generales usan schedule, no ese webhook temporal.
4. El ACK genera una única proyección operacional, sin destinatario ni propietario. Sheets `appendOrUpdate` confirma el evento; se vuelve a proyectar **la misma clave**, dejando un solo registro y dos intentos de proyección, sin reabrir el correo.
5. Tras reiniciar PostgreSQL, se conservaron ambos ACK y sus intentos (Gmail 1, Sheets 2). Se guardó un dump privado del ensayo y se detuvieron los contenedores de pruebas.
6. Lectura independiente en Google: mensaje con etiqueta SENT, destinatario propio y plantilla WELCOME correctos; exactamente una fila para la clave de proyección, sourceEventId correcto y sin correo en la fila.

Los intentos fallidos del harness quedan documentados: primero se separó la base de pruebas por una tabla de configuración pública ya existente en la base compartida; después se corrigió HTTP/2 por HTTP/1.1 tras un timeout anterior a cualquier intento Gmail; finalmente se trató explícitamente el 500 del webhook vacío, sin reenviar el evento ya aceptado. Las comprobaciones previas al envío y al reanudar rechazaban estados ambiguos o intentos anteriores no confirmados. **No se creó un segundo correo para repetir el ensayo.**

Ambigüedad, vencimiento de lease antes/después de dispatch, destinatario cambiado, deduplicación, confirmaciones vencidas y error/reintento de Sheets sin reabrir Gmail se cubren en `WorkspaceEventIntegrationTest`. Son fallos controlados; no se afirma haber provocado errores reales del proveedor ni probar entrega/leído del destinatario. Mercado Pago y la conciliación comercial siguen pendientes de evidencia suficiente.

## Calendar, MCP y compatibilidad

No se crearon nuevos eventos Calendar reales. Se conserva la verificación real con Meet del Bloque 4. Las pruebas controladas mantienen propuestas, expiración, confirmación, conflictos, idempotencia, cancelación y estados ambiguos; el ensayo con Gemini persistió una propuesta y verificó que no se invocara creación de eventos. No se reconstruyeron componentes Calendar/MCP.

El cliente MCP externo productivo sigue sin servidor definitivo autorizado y apagado. Se conserva la prueba local de protocolo/timeout/autenticación de `ceroa_capabilities` y el MCP Server financiero propio de Spring con sus permisos. No se añadieron servidores externos ni acceso financiero nuevo.

Se preservan React, Telegram, biblioteca, FACT_ANALYSIS, PERIOD_ANALYSIS, recordatorios 7/3/0, Centinela, simulaciones, planes y eventos durables mediante las suites de regresión existentes.

## Pruebas y operación

Registros privados del trabajo: `tmp/block6-java-regression-final.log`, `tmp/block6-node-final.log`, `tmp/block6-frontend.log`, `tmp/block6-errors.log`, `tmp/block6-google-resume.log`, `tmp/block6-semantic.log` y las muestras sanitizadas adjuntas.

- Java completo: **417 registrados, 384 ejecutados correctos, 33 opt-in omitidos; cero fallos y cero errores**. Los ensayos reales y PostgreSQL descritos arriba se ejecutaron por separado.
- Node: **45/45**.
- Frontend: **187/187**, TypeScript y build Vite correctos.
- PostgreSQL/pgvector: **26/26** en `HybridDocumentIntegrationTest`, con almacenamiento/embedding simulados en esa suite; la comprobación vectorial del PDF descrita arriba sí usa embedding y base remotos reales.
- n8n nativo: seis escenarios base y cuatro de comparación controlada correctos; regresiones BADPARSE, BADREF, BADREQUEST y MULTIITEM correctas. Las tres primeras conservan la solicitud y devuelven FAILED; la última se rechaza antes de autorizar un alcance. El proveedor está simulado en estas pruebas de fallos.
- Gemini real y Google real: resultados separados anteriormente, sin tratar HTTP 200 como prueba suficiente.

El despliegue selectivo se aplicó al backend/frontend y a los cuatro workflows conversacionales. El arranque del backend y el smoke HTTP de React, sesión y CSRF fueron correctos. La auditoría posterior comparó nodos/conexiones de los otros 26 workflows con el respaldo y verificó que sus definiciones no cambiaron; todas las credenciales enlazadas se conservaron. Se mantienen **30 workflows, 15 publicados y 22 credenciales**. Los ocho conectores generales quedan inactivos/despublicados y Gmail/Sheets/Calendar productivos continúan con flag false. No se concede autorización continua por haber terminado estas pruebas.

## Respaldos, rollback y condiciones pendientes

Respaldos de borradores y versiones publicadas previos al cambio en `backups/n8n/block6-before-2026-11-09.ceroa` y `block6-before-published-2026-11-09.ceroa`; claves separadas en el directorio privado `backups/migration-keys/`, fuera de Git. Imagen anterior del backend: `ceroa-backend:pre-block6-20261109`. Se conserva la exportación/restauración cifrada y la imagen n8n fijada por digest. Restaurar únicamente los cuatro workflows desde las versiones publicadas respaldadas y recrear el backend anterior permite revertir el cambio conversacional sin activar conectores. Los efectos externos del PDF/correo/fila no se deshacen con rollback y no se borraron.

Antes de operación continua: completar el recorrido visual autenticado del PDF; ampliar la muestra conversacional y comparación documental cuando la cuota lo permita; coordinar la cuota de todos los consumidores; revisar backlog y habilitar cada conector por separado con autorización expresa; resolver la conciliación comercial; definir servidor/propietario MCP externo si se quiere usar en producción. Las comprobaciones acotadas de Drive y Gmail/Sheets no certifican operación prolongada, entrega garantizada ni recuperación ante toda caída del proveedor.
