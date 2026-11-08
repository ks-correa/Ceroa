# Google Workspace — verificación real autorizada

El 8 de noviembre de 2026 el usuario autorizó usar las credenciales existentes de n8n y realizar tres pruebas: enviar un correo a la propia cuenta conectada, crear `Ceroa - Pruebas Bloque 4` en Drive y añadir `Pruebas Bloque 4` a `Ceroa_Looker_Studio`. La autorización excluye activar las automatizaciones generales. Se reutilizaron las credenciales almacenadas; el secreto OAuth compartido en el chat no se incorporó al código ni al repositorio.

## Resultados reales

| Integración | Verificación | Resultado |
|---|---|---|
| Gmail | Renovación OAuth y consulta de perfil | HTTP 200 |
| Gmail | Un envío con Gmail nativo 2.2 en n8n 2.40.7 | Google devolvió ID de mensaje e hilo |
| Gmail | Lectura posterior de metadatos del mismo mensaje | Mensaje observado con etiqueta `INBOX` en la cuenta autorizada |
| Drive | Renovación OAuth y consulta de metadatos | HTTP 200 |
| Drive | Creación de carpeta con Google Drive nativo 3 | Carpeta real creada y comprobada por ID, nombre, tipo y estado |
| Sheets | Renovación OAuth y localización de la hoja autorizada | HTTP 200 |
| Sheets | Crear pestaña, insertar/actualizar dos veces y leer con Google Sheets nativo 4.7 | Una sola fila con la clave estable de prueba; idempotencia comprobada |

Estas pruebas llamaron a Google real. No utilizaron un adaptador simulado ni datos financieros. Solo se envió un correo; no hubo reintento automático. La pestaña contiene encabezados operativos y una fila sintética; no se sobrescribieron las otras pestañas. La carpeta de prueba quedó disponible y vacía. Los identificadores de los recursos, del mensaje y los logs se conservan en archivos privados ignorados en `tmp/google-verification-20261108/` y `tmp/google-live-*.json`, sin publicarlos en este informe.

Las ejecuciones fueron entre las **07:27 y 07:28, hora de Bogotá**. Se realizó después una lectura independiente del mensaje, carpeta y pestaña para comprobar el resultado. No se probaron reservas ni se generó ningún Meet.

## Configuración aplicada

- `ceroaWorkspaceMail40` usa `Gmail account`.
- `ceroaWorkspaceDrive40` usa `Google Drive account`; sus dos triggers apuntan a la carpeta de prueba autorizada mediante ID literal.
- `ceroaWorkspaceSheets40` usa `Google Sheets account` y apunta a la pestaña de prueba autorizada mediante valores literales.
- Se configuró la credencial privada de transporte `Ceroa Workspace privado`, con el mismo secreto que Spring Boot. El secreto está en el entorno privado y cifrado en n8n, nunca en Git. La prueba del worker autenticado devolvió HTTP 200 y cola vacía con Gmail desactivado.
- Se añadió `WORKSPACE_*` al Compose principal para conservar esta configuración al recrear el backend; los tres flags de proveedor permanecen `false`. El override opcional anterior sigue siendo compatible.
- Se creó `Ceroa Calendar - pendiente de autorizacion`, reutilizando únicamente la configuración del cliente OAuth existente. No se copiaron tokens de Drive como si autorizaran Calendar. La credencial devuelve `CONSENT_REQUIRED` y está vinculada al borrador de Calendar.

Los cuatro workflows de Google siguen **inactivos y sin publicar**. Los otros cuatro conectores MCP también siguen inactivos. Las 15 definiciones publicadas se compararon con el despliegue anterior y permanecen idénticas. Se añadió únicamente el borrador manual `ceroaGoogleVerification41`, utilizado de manera controlada para las pruebas; ahora hay 26 borradores.

## Límites y pendientes

La conexión Gmail está comprobada, pero no se activó el consumidor de eventos reales de registro/suscripción. La escritura nativa de Sheets está comprobada, pero no se activó su consumidor del outbox. La carpeta Drive y las credenciales funcionan, pero **no se declara probada la ingesta automática completa**: falta asociar la fuente aprobada a un propietario de Ceroa y fijar su `sourceId` en el workflow. No se asignó un propietario inventado ni se publicó conocimiento general. Un intento de configuración administrativa se detuvo en la conexión TLS por `SELF_SIGNED_CERT_IN_CHAIN`, antes de consultar o modificar la base de datos; no se deshabilitó la verificación TLS para continuar.

Para Calendar, abrir `Ceroa Calendar - pendiente de autorizacion` en n8n, pulsar **Conectar con Google** y completar la autorización de la cuenta. Después debe seleccionarse un calendario de soporte aprobado y autorizar una prueba de reserva/Meet; todavía no existe esa aprobación de recursos. Gemini mantiene su bloqueo previo `API_KEY_INVALID`, que también limita la comprobación real de la indexación documental. No se sustituyó el proveedor.

El cliente OAuth compartido quedó expuesto en el chat. Debe rotarse su secreto en Google Cloud y actualizarse en las credenciales correspondientes de n8n; no es necesario volver a pegarlo en la conversación.

## Reproducción y protección de las pruebas

`probe-google-connections.cjs` lee credenciales cifradas dentro del contenedor confiable, renueva OAuth en memoria y realiza lecturas acotadas; no imprime tokens ni secretos. `google-live-verification.mjs` construye únicamente las tres operaciones autorizadas. `execute-google-verification.mjs` registra el inicio antes de ejecutar y rechaza repetir una operación con un estado ya existente; un resultado de Gmail incierto queda marcado para revisión sin reenvío automático. `check-google-live-resources.cjs` consulta solo los recursos de prueba por ID.

El consentimiento para estas pruebas **no está embebido en un script automático**: repetirlas requiere autorización del operador y revisión del estado privado anterior. No borrar el estado de Gmail para forzar un segundo envío. `bind-google-workspace-drafts.mjs` solo modifica borradores inactivos y fija recursos aprobados; no publica ni activa workflows.

Pasaron **17 pruebas Node**, incluidas cuatro nuevas sobre límites de las operaciones reales, destino fijo, ausencia de reintentos y upsert estable. Se validó también la configuración Compose. No se modificó Java en esta continuación; las baterías Java/PostgreSQL anteriores permanecen documentadas en el informe del Bloque 4.

Respaldos cifrados antes y después de vincular las credenciales: `backups/n8n/google-before-bindings-2026-11-08.ceroa` y `backups/n8n/google-after-bindings-2026-11-08.ceroa`. Utilizan la clave local ignorada del Bloque 4. La rotación de tokens realizada por n8n durante el uso normal de OAuth no se revierte restaurando workflows.
