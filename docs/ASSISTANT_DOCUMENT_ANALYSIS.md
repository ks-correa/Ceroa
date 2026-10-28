# Consultas de extractos y audio

El asistente usa la misma pregunta preparada para texto y audio transcrito. Los
pagos registrados en Ceroa y los movimientos de un extracto son fuentes distintas:
que no exista un pago registrado no demuestra que falte en los archivos.

Para una consulta sobre todo un mes, `PERIOD_ANALYSIS` recupera los fragmentos de
cada archivo del intervalo, con paginación y cobertura explícita. Una comparación
consulta cada mes por separado y calcula sumas y diferencias en el backend. Las
referencias documentales se conservan durante toda la solicitud. Los archivos sin
contenido indexado y las páginas omitidas producen una advertencia de cobertura
parcial, incluso si una búsqueda posterior de recibos devuelve otros resultados.
La fecha de subida y el período del extracto tienen significados diferentes.

Las cifras, tasas y fechas se sustituyen mediante hechos de la solicitud actual.
Antes de completar, `/assistant-tools/requests/{id}/review` revisa el borrador. Si
hay cifras sin evidencia o referencias inválidas, una cadena sin herramientas
intenta corregirlo una sola vez con los hechos ya recuperados. La validación final
permanece obligatoria; la corrección no puede realizar operaciones financieras.
Los registros de fallo incluyen etapa HTTP y contadores, sin preguntas ni datos
financieros. Las preguntas previas conservan el período solicitado; sus respuestas
anteriores no se reutilizan como evidencia financiera actual.

Ejemplos de consulta:

- «Según todos mis extractos de agosto de 2026, ¿qué pagos realicé y qué tasas aparecen?»
- «Compara esos pagos y tasas con septiembre. Indica qué archivos respaldan cada hallazgo».
- «¿Cuántos extractos del período encontraste? ¿Falta contenido por revisar?»

Para actualizar una instalación existente hay que reconstruir el backend y
actualizar el workflow persistido en n8n; reiniciar contenedores no importa el JSON:

```powershell
node integrations/n8n/build-hybrid-rag-workflows.mjs
docker exec ceroa-n8n n8n export:workflow --id=ceroaHybridQuery20 --output=/tmp/ceroa-hybrid-export.json
docker exec ceroa-n8n node /opt/ceroa-workflows/update-assistant-runtime.cjs
docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-hybrid-updated.json
docker exec ceroa-n8n n8n publish:workflow --id=ceroaHybridQuery20
docker restart ceroa-n8n
```

El actualizador conserva las credenciales instaladas y las opciones del proveedor.
El endpoint de revisión requiere el backend actualizado antes de activar el flujo.
Las pruebas cubren preparación de audio, corrección, aislamiento de solicitudes,
comparación entre meses, paginación y contenido faltante. La prueba del proveedor
se realizó con audio y hechos sintéticos, sin consultar archivos de una cuenta.

## Diagnóstico de disponibilidad y Telegram local

La comprobación de salud de los contenedores no prueba una conversación completa.
El flujo devuelve una etapa y categoría de error sin contenido del usuario; el
backend registra esos campos y la ubicación del rechazo, sin guardar el borrador.
La corrección recibe los literales concretos que quedaron sin evidencia para poder
sustituirlos u omitirlos, manteniendo obligatoria la validación final.

Cloudflare Quick Tunnel cambia su dirección al reiniciar. Si el bot sigue apuntando
a una dirección anterior, Telegram acumula actualizaciones con error de entrega.
Después de arrancar los contenedores locales, se puede sincronizar la URL actual:

```powershell
.\integrations\n8n\sync-telegram-tunnel.ps1
```

Este comando conserva la cola de Telegram, actualiza `.env.telegram-local` y recrea
solo n8n cuando su configuración cambió. No reinicia el túnel ni envía mensajes de
prueba. El Compose de Telegram configura también la variable oficial `WEBHOOK_URL`.
`sync-telegram-webhook.cjs --probe`, ejecutado dentro de n8n, verifica la ruta pública
con una actualización sin mensaje ni destinatario.

Tras esta corrección se verificaron solicitudes completas con la cuenta demo:
consulta de agosto, comparación con septiembre y audio, todas con HTTP 200. El
webhook público de Telegram respondió HTTP 200 y su cola quedó sin pendientes.
