# Bloque 4 — implementación y verificación

**Actualización posterior del 8 de noviembre:** el usuario autorizó usar las credenciales existentes y ejecutar pruebas reales delimitadas. Gmail, Drive y Sheets ya pasaron esas pruebas; los detalles actuales están en [GOOGLE-WORKSPACE-LIVE-2026-11-08.md](GOOGLE-WORKSPACE-LIVE-2026-11-08.md). Las referencias a pruebas externas omitidas en este informe describen el despliegue inicial. Las automatizaciones generales continúan desactivadas y Calendar/Meet sigue pendiente de autorización.

La implementación está desplegada en `refactor/n8n-multiagent`, con los proveedores externos desactivados. **El Bloque 4 no se declara completamente operativo.** El usuario indicó «no lo tengo omite» respecto a credenciales y recursos de prueba de Workspace; por ello se omitieron envíos, archivos, hojas y citas reales. Gemini mantiene su bloqueo previo `API_KEY_INVALID`; no se sustituyó el proveedor ni se modificaron sus credenciales.

## Estado conciliado

Spring Boot arrancó con V26–V30 aplicadas. Las rutas existentes y los tres especialistas se conservaron. Se extendieron las exportaciones publicadas de Finanzas, Soporte y el orquestador; Conocimiento RAG conservó su definición publicada. React, Telegram, recordatorios y Centinela no se reconstruyeron.

Hay **15 workflows publicados, 181 nodos y 38 nodos Code**, frente a 175 nodos y los mismos 38 Code antes del bloque. Se preservaron los otros 12 workflows publicados y 14 borradores mediante comparación de nodos, conexiones y ajustes. Se importaron **8 nuevos borradores inactivos**, con **54 nodos nativos y cero Code**; hay 25 borradores en total. No se publicaron los conectores sin configurar.

| Workflow nuevo | Nodos | Implementación | Verificación externa |
|---|---:|---|---|
| `ceroaWorkspaceMail40` | 8 | Schedule, HTTP Request, Edit Fields, IF, Gmail; nueve plantillas de texto | Pendiente Gmail real |
| `ceroaWorkspaceSheets40` | 6 | Schedule, HTTP Request, Sheets appendOrUpdate y rutas de resultado/reintento | Pendiente Sheets real |
| `ceroaWorkspaceDrive40` | 9 | Dos Drive Trigger, metadatos, validación, IF, Drive download, ingesta y conciliación | Pendiente Drive real |
| `ceroaWorkspaceCalendar40` | 7 | Webhook autenticado, Switch, cuatro operaciones Calendar y respuesta | Pendiente Calendar/Meet real |
| `ceroaMcpServer40` | 8 | MCP Server Trigger 2.1 y siete Call Workflow Tool 2.2 | Protocolo probado en instancia aislada |
| `ceroaMcpBackend40` | 9 | Execute Workflow Trigger, Switch y siete endpoints fijos autorizados | Backend probado con datos sintéticos |
| `ceroaMcpClient40` | 3 | Execute Workflow Trigger, MCP Client 1.1 y respuesta acotada | SDK MCP controlado, autenticado y real en contenedor aislado |
| `ceroaMcpSupport40` | 4 | Autorización de alcance, MCP Client y validación de evidencia en backend | Preparado; conexión externa no anunciada en Soporte publicado |

Las versiones de los nodos se contrastaron con las descripciones de la imagen instalada **n8n 2.40.7**. Las plantillas JSON no contienen credenciales ni recursos personales.

## Cambios en Spring Boot

**Comunicaciones:** `IntegrationEventService`, tabla `integration_events` y API privada `/workspace-tools/events/*`. El registro normal y el alta externa generan bienvenida dentro de la transacción. Plus genera eventos de activación, renovación y cancelación a partir de estados verificados por el proveedor, no de la pantalla de éxito. El evento tiene clave estable, intentos acotados, lease y estados persistentes. Después de iniciar un envío Gmail, un error o lease vencido se retiene como `AMBIGUOUS`; no se reenvía automáticamente. Se vuelve a validar usuario activo y dirección antes de enviar. `ACKNOWLEDGED` acredita aceptación por Gmail, no entrega final al destinatario.

`WorkspaceActionService` almacena propuestas de correo con propietario, código aleatorio, expiración de diez minutos y confirmación idempotente. La información se obtiene de servicios existentes al confirmar. Los agentes no eligen destinatario ni redactan mensajes libres. Finanzas y Soporte preparan propuestas; el mensaje real `Confirmar envio CODIGO` es quien autoriza. Las frases deterministas de resumen, vencimientos y suscripción funcionan sin invocar Gemini.

**Drive:** `approved_drive_sources` vincula una carpeta expresamente aprobada con un propietario fijo; `drive_sync_files` conserva identificador, versión, checksum, lease y documento/versión de biblioteca. Se comprueban carpeta padre directa, aprobación vigente, tamaño, tipo y versión antes de descargar; los bytes deben coincidir con el checksum. PDF, DOCX y XLSX entran por `DocumentLibraryService.upload/replace`, la misma cola, extracción, OCR e indexación anteriores. Los manuales aprobados se clasifican `OTHER`, sin inventar una identificación personal. Reemplazar invalida los fragmentos y trabajos obsoletos del procesador existente. La conciliación observa el estado real de la biblioteca antes de marcar `READY`; la proyección inicial `QUEUED` no significa indexado.

El conector no publica automáticamente documentos privados en el conocimiento general. RAG conserva propietario y concesiones vigentes; un manual sincronizado es consultable por su propietario o lectores expresamente autorizados. La publicación general y la eliminación/revocación automática por movimiento o borrado en Drive no se habilitaron. Google Docs nativos requieren exportación explícita antes de esta ingesta inicial; no se simula su compatibilidad como PDF.

**Sheets:** recibe proyecciones durables del outbox, con clave estable para upsert, workflow, tipo de evento, fecha, estado, duración y resultado reducido. No recibe email, propietario, tokens, extractos ni resumen financiero. `executionId` es el UUID de la proyección durable; no se presenta como el número de ejecución nativo de n8n. La duración actual de comunicaciones incluye espera en cola. Los estados de Drive `QUEUED/READY/FAILED` se proyectan desde PostgreSQL. Un fallo de Sheets deja la proyección pendiente y no reabre el correo ni bloquea la ingesta. No se añadió un panel de agregados ni una exportación global de todas las métricas conversacionales.

**Calendar:** `support_bookings` conserva propietario, código, horario, vencimiento, ID determinista del proveedor, estado y Meet verificado. Soporte dispone de `consultar_disponibilidad_soporte`, `proponer_asesoria`, `consultar_asesoria` y `cancelar_asesoria`. `confirmar_asesoria` se ejecuta por la ruta determinista del mensaje real o la API de sesión con CSRF, nunca por una afirmación del modelo. La cancelación también requiere un segundo código de confirmación. No se creó otra pantalla principal.

Horario inicial: Bogotá, lunes a viernes de 09:00 a 17:00, intervalos de treinta minutos, anticipación mínima de una hora y ventana de catorce días. La propuesta dura diez minutos; al confirmar se revalida disponibilidad y se reserva el slot de forma única en PostgreSQL. El workflow usa Calendar create con ID estable y solicitud de conferencia Meet. Se comprueban ID, estado y fechas de la respuesta. Solo `hangoutLink` real del proveedor y con dominio válido permite `CONFIRMED`; mientras falta conferencia queda `PENDING_MEET`. Una creación incierta queda retenida y se consulta por el mismo ID; no se vuelve a crear. Gmail de confirmación/cancelación se encola después del resultado del proveedor. La consulta puede reconciliar una creación pendiente; una cancelación ambigua conserva el slot para revisión operativa.

**MCP:** tokens separados de los tokens de automatización, almacenados por hash, con vencimiento de treinta días, revocación, propietario activo y scopes exactos. API de emisión/revocación `/integrations/mcp/tokens`, con sesión y CSRF. `/mcp-tools/*` usa otra cadena stateless, rechaza sesión de navegador como credencial MCP y deriva identidad del token; no acepta `ownerId` como autoridad. Límite de treinta llamadas por minuto y token, paginación de 25, respuesta máxima de 32 KB y operaciones enumeradas.

El servidor expone `consultar_resumen_financiero`, `consultar_deudas`, `consultar_vencimientos`, `consultar_estrategia`, `consultar_estado_suscripcion`, `consultar_disponibilidad_soporte` y `solicitar_asesoria`. Usa los servicios de análisis, suscripción y reservas existentes; no SQL financiero directo, credenciales, archivos indiscriminados, administración ni ejecución de código. `solicitar_asesoria` solo propone.

La primera configuración del servidor es **personal y para un único propietario aprobado**: credencial de ingreso y credencial del subworkflow deben contener el mismo token MCP. Para otro propietario se deben clonar tanto servidor como subworkflow, cambiar el path y referencias de workflow y utilizar otra credencial. No compartir una credencial personal entre usuarios de Ceroa. La revocación se verifica en cada acceso al backend; el ingreso n8n puede seguir aceptando un handshake con su credencial estática hasta rotarla, pero las herramientas de datos ya se rechazan.

El cliente consume exclusivamente `ceroa_capabilities`, con argumentos vacíos, autenticación, servidor fijo `http://127.0.0.1:3100/mcp`, timeout de cinco segundos y sin datos personales. El wrapper para Soporte valida alcance y convierte únicamente la respuesta permitida en evidencia backend. La respuesta externa se trata como dato no confiable. No se añadió otro agente LLM. **No es un proxy financiero personal para todos los usuarios**: la consulta personal de vencimientos por MCP se demostró mediante el servidor, su subworkflow y su backend controlado. El wrapper de capacidades está en las plantillas portables; se retiró del especialista publicado mientras no exista servidor/credencial configurados.

## Pruebas y evidencia

| Batería | Resultado | Alcance |
|---|---|---|
| Java/H2 dirigida | 45 sin fallos | Comunicaciones, propuestas, permisos, reservas, Drive y 18 rutas del asistente; proveedores simulados |
| Java con PostgreSQL/pgvector desechable y suites relacionadas | 42 sin fallos | 26 de biblioteca real/Flyway, incluidas actualización Drive e invalidación; 7 Plus, 5 reservas y 4 MCP |
| MCP Java adicional | 5 sin fallos | Añade identidad derivada del token frente a `ownerId` ajeno e inactividad del propietario |
| Node | 13 sin fallos | Contratos, grafo, plantillas, allowlist, configuración nativa y ausencia de Code |
| n8n real, modelos y backend simulados | 10 escenarios sin fallos | Finanzas, RAG, Soporte, compuesto, desconocido, extractos y comparación con arquitectura previa |
| Flujo nativo de comunicaciones | 4 escenarios sin fallos | Aceptación, ambigüedad, cambio de dirección y cola vacía; Gmail sustituido por adaptador HTTP controlado |
| Protocolo MCP nativo | Sin fallos | MCP Client real contra SDK controlado; Server Trigger real, siete herramientas, subworkflow, vencimientos sintéticos, credencial incorrecta y herramienta desconocida |
| Smoke desplegado | Sin fallos | Readiness n8n, CSRF backend y rechazo 401 en workers/MCP sin credencial |

Los conteos de las baterías Java se solapan; no se suman como pruebas distintas. El contenedor PostgreSQL de verificación se detuvo y eliminó después. No hubo envíos reales, citas reales, cambios financieros productivos ni llamadas a Google para estas pruebas. El enlace Meet de la prueba de reservas es un valor sintético devuelto por el proveedor simulado; no acredita una reunión real. No se atribuye mejora de latencia ni calidad del modelo real a este bloque.

Ejecución reproducible: `test-workspace-runtime.ps1`, `test-mcp-runtime.ps1`, `test-multiagent-runtime.ps1`, `workspace-*.test.mjs`, `multiagent-workflows.test.mjs` y las clases Java `WorkspaceEventIntegrationTest`, `DriveSyncIntegrationTest`, `DrivePipelineIntegrationTest`, `SupportBookingIntegrationTest`, `McpIntegrationTest`, `PlusSubscriptionServiceTest`, `AssistantIntegrationTest`, `HybridDocumentIntegrationTest`. Esta última requiere el PostgreSQL/pgvector desechable descrito en `HYBRID_RAG.md` y aplica las 30 migraciones.

## Activación pendiente

1. Mantener los ocho workflows inactivos y `WORKSPACE_GMAIL_ENABLED`, `WORKSPACE_SHEETS_ENABLED`, `WORKSPACE_CALENDAR_ENABLED` en `false` mientras no existan recursos autorizados. El despliegue actual usa esos valores por defecto y worker key vacío.
2. Cuando existan recursos, configurar una credencial n8n Header Auth `X-Ceroa-Workspace` con el mismo secreto privado del backend y credenciales OAuth2 mínimas de Gmail, Drive, Sheets y Calendar. No utilizar correo de recuperación/seguridad como transporte operativo. El override opcional `docker-compose.workspace.yml` permite pasar las variables al backend; conservar los otros overrides del despliegue.
3. Sustituir en los nodos las referencias `$env.CEROA_APPROVED_DRIVE_FOLDER_ID`, `$env.CEROA_APPROVED_DRIVE_SOURCE_ID`, `$env.CEROA_OPERATIONS_SPREADSHEET_ID`, `$env.CEROA_OPERATIONS_SHEET_NAME`, `$env.CEROA_SUPPORT_CALENDAR_ID` por **valores literales aprobados**, o proveer esas variables mediante una política n8n autorizada. No habilitar acceso global a secretos del entorno para resolver estos identificadores. Crear la fuente aprobada con propietario, carpeta, `active=true` y `approved_at` mediante administración autorizada; no hay alta de fuentes controlada por agentes.
4. Para Calendar, configurar `WORKSPACE_CALENDAR_URL=http://n8n:5678/webhook/ceroa-workspace-calendar-v4`, Header Auth del webhook, calendario de soporte y permiso de conferencia Meet. Publicar y verificar primero disponibilidad controlada; después activar el backend. No cambiar el ID del calendario con reservas activas sin reconciliarlas.
5. Para MCP personal, emitir desde la sesión del propietario solo los scopes requeridos; guardar el token una sola vez como credencial n8n, ligar ingreso y subworkflow al mismo propietario y publicar las dependencias antes del servidor. Para el cliente controlado, instalar un servidor autorizado en el endpoint fijo o revisar explícitamente su allowlist, asociar su credencial y verificar respuesta; entonces añadir `attachMcpSupportTool` al Soporte publicado. No enviar datos personales a ese servidor de capacidades.
6. Respaldar, probar con destinatario/archivo/hoja/calendario autorizados y publicar cada etapa de manera separada. Antes de habilitar Gmail, revisar los eventos pendientes: el despliegue conserva los eventos aunque el proveedor esté desactivado.

Pendientes técnicos conservadores: una renovación solo se notifica cuando coinciden cobro aprobado y avance verificable de la frontera de facturación en esa actualización. Si el webhook de preapproval adelantó antes esa frontera, el correo de renovación puede omitirse; requiere reconciliación de ciclos/cobros antes de declarar exhaustividad. La verificación real de Mercado Pago y del orden de webhooks no se realizó. La consulta del pago autorizado usa el [endpoint oficial de Mercado Pago](https://www.mercadopago.com.co/developers/en/reference/online-payments/subscriptions/get-authorized-payment/get), con importe string o numérico validado, moneda y preapproval coincidentes. No se interpreta el estado visual de compra como pago aprobado.

## Respaldos y rollback

Se conservaron snapshots cifrados autenticados antes de A, antes del despliegue del 8 de noviembre, antes de publicar la extensión de Soporte y después del despliegue. Están en `backups/n8n/block4-*.ceroa`. La clave local ignorada es `backups/n8n/block4-a-2026-11-07.key`; no está versionada. Imagen anterior: `ceroa-backend:pre-workspace-20261108`.

El rollback restaura solo los tres workflows modificados; conserva RAG y los demás workflows. Mantener los proveedores desactivados y los conectores externos sin publicar. Si se activaron posteriormente, despublicarlos antes de restaurar. Ejemplo:

```powershell
powershell -NoProfile -File integrations/n8n/rollback-workspace.ps1 `
  -PublishedBackup backups/n8n/block4-before-2026-11-08-published.ceroa `
  -KeyFile backups/n8n/block4-a-2026-11-07.key
```

Conservar las tablas durables y no revertir automáticamente migraciones ni borrar eventos. El backend nuevo es compatible con las rutas anteriores. Si se requiere volver a la imagen anterior, usar la misma configuración Compose y variables vigentes con el tag de respaldo, sin cambiar proveedores. Después verificar readiness, publicación, credenciales referenciadas y autorización. El script se revisó y parseó; no se ejecutó una restauración destructiva sobre el despliegue final.
