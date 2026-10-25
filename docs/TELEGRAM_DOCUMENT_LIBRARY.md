# Biblioteca documental desde Telegram

Telegram y la web usan la misma biblioteca privada y los mismos servicios de autorización, extracción, OCR, metadatos, indexación y versiones. No se crea una segunda biblioteca ni se duplican los vectores por canal.

## Empezar

1. Vincula Telegram desde **Perfil → Telegram** en Ceroa.
2. En el chat privado del bot escribe `/ayuda`.
3. Lee el aviso de tratamiento y envía `/autorizar_documentos` para autorizar las cargas. Gemini recibe el PDF completo si necesita OCR.
4. Adjunta un **PDF, DOCX o XLSX de hasta 8 MiB** como documento. No necesitas escribir metadatos. Para XLSX incluye la leyenda `/hoja Nombre exacto`.
5. El bot devuelve el ID del documento y su estado inicial. Consulta `/documento ID` para ver el estado actualizado y los metadatos extraídos. La indexación se ejecuta en segundo plano, igual que en la web.

Las fotografías sueltas no se indexan: conviértelas a PDF y envíalo como documento. Los PDF escaneados usan el OCR con la credencial Gemini existente. Los límites de extracción y validaciones son los mismos de la web.

## Comandos

Reemplaza `ID` por el identificador que entrega el bot. Las fechas son ISO y el final de periodo es exclusivo.

| Comando | Comportamiento |
|---|---|
| `/documentos` | Primera página de documentos autorizados |
| `/documentos 2` | Siguiente página, diez resultados por página |
| `/documento ID` o `/estado ID` | Metadatos, versión actual y estado del análisis |
| `/buscar_documentos identificacion=CC desde=2026-09-01 hasta=2026-10-01` | Filtrar extractos del periodo por tipo de identificación |
| `/buscar_documentos texto="cuota de manejo" entidad="Banco Ejemplo"` | Búsqueda híbrida de contenido y filtros |
| `/versiones ID` | Original actual e históricos disponibles |
| `/descargar ID` | Recibir el original actual como archivo en Telegram |
| `/descargar ID 1` | Recibir el original histórico de la versión indicada |
| `/reemplazar ID 2` | Preparar el reemplazo de la versión actual 2; enviar el nuevo archivo dentro de cinco minutos |
| `/cancelar_documento` | Cancelar reemplazo o eliminación pendientes |
| `/reprocesar ID` | Solicitar un nuevo análisis e indexación |
| `/metadatos ID entidad="Banco Corregido"` | Corregir los campos indicados y volver a indexar |
| `/eliminar_documento ID` | Pedir un código para confirmar la eliminación |
| `/confirmar_eliminacion CODIGO` | Eliminar documento, originales históricos e índice; el código vence en cinco minutos |
| `/revocar_documentos` | Impedir nuevas cargas desde Telegram sin borrar la biblioteca existente |

Los filtros de búsqueda disponibles son `identificacion`, `tipo`, `entidad`, `desde`, `hasta`, `texto` y `pagina`. Usa comillas dobles para valores con espacios. `desde` y `hasta` deben proporcionarse juntos. Los tipos documentales son `BANK_STATEMENT`, `PAYMENT_RECEIPT`, `LOAN_AGREEMENT` y `OTHER`.

Las correcciones admiten `identificacion`, `tipo`, `entidad`, `inicio`, `fin` y `emision`. Usa `-` para borrar un campo opcional. Por ejemplo:

```text
/metadatos ID identificacion=CC tipo=BANK_STATEMENT inicio=2026-09-01 fin=2026-10-01 emision=2026-10-01
```

También se permite adjuntar un reemplazo con la leyenda `/reemplazar ID VERSION_ACTUAL`. Para un XLSX, añade `/hoja Nombre exacto` al final. Se conservan los metadatos existentes; corrígelos si cambian. El original anterior sale de la búsqueda y permanece en el historial privado.

Puedes seguir consultando con lenguaje natural por texto o nota de voz. El asistente usa el RAG híbrido configurado y adjunta identificadores de los documentos recuperados para consultar versiones o descargarlos.

## Permisos y almacenamiento

- Solo se aceptan chats privados del remitente vinculado a una cuenta activa. La identidad nunca procede del modelo ni del contenido del PDF.
- El backend verifica vinculación y consentimiento antes de que n8n descargue un adjunto de Telegram; vuelve a comprobarlos al procesarlo.
- V22 guarda `document_consent_at` en la vinculación existente. Desvincular elimina esa autorización; vincular otra vez exige autorizar de nuevo. No se alteran otras preferencias de Telegram.
- Los originales siguen en Supabase Storage privado; los metadatos, fragmentos y vectores siguen en PostgreSQL. Se reutiliza exactamente el servicio documental de la web.
- Cada evento Telegram se registra una sola vez. Repetir un update no repite la carga ni el reemplazo.
- Las respuestas privadas se entregan mediante un token interno de un uso que vence en 60 segundos. Antes de entregar bytes se vuelve a verificar cuenta, vinculación y permisos del documento. No se envían URLs públicas ni la clave de Storage.
- Descargar entrega una copia del archivo a Telegram: esa copia queda sujeta al manejo del chat de Telegram. Eliminarlo de Ceroa no puede retirar copias que ya se hayan descargado.
- Los estados pendientes de reemplazo y confirmación son temporales y se pierden si se reinicia el backend. Los documentos ya almacenados y el consentimiento persisten.
- n8n mantiene desactivado el almacenamiento de datos de ejecuciones exitosas, fallidas y manuales de este workflow.

## Implementación y despliegue

Se amplía el workflow existente `ceroaTelegram01`; no se cambian su trigger privado ni sus asociaciones a credenciales. `build-telegram-workflow.mjs` genera la plantilla inactiva. `prepare-telegram-documents.cjs`, ejecutado dentro del contenedor de confianza, prepara la importación reutilizando la configuración instalada. Importar requiere publicar el workflow y reiniciar n8n para aplicar los cambios.

El menú de respuestas incluye botones para `/documentos`, `/ayuda`, `/autorizar_documentos` y `/cancelar_documento`.

Pruebas reproducibles:

- `telegram-documents.test.mjs`: rutas de archivo/voz/texto, límites, grupos y entrega binaria sin URLs públicas.
- `HybridDocumentIntegrationTest`: PostgreSQL/pgvector real, consentimiento, biblioteca compartida, permisos, duplicados, historial, reemplazo, bytes históricos, confirmación de eliminación y revocación de entrega.
- `rag/evaluate-telegram-documents.mjs`: backend, Supabase y Gemini reales con una cuenta e identidad Telegram sintéticas. No envía mensajes externos. Comprueba recuperación desde la web, metadatos automáticos, filtros, búsqueda híbrida, descargas exactas, reemplazo, historial, correcciones, reprocesamiento y eliminación.

Las copias locales previas al despliegue se guardan en `tmp/rag-v21/pre-v22.dump` y `tmp/rag-v21/pre-telegram-documents.json`. No se ejecuta un rollback automáticamente.

Verificación del despliegue del 25 de octubre de 2026: V22 aplicada, workflow publicado y n8n saludable. Backend: 327 pruebas, sin fallos ni errores, 3 omitidas; incluye integración documental con PostgreSQL/pgvector real. Workflow: 5 pruebas aprobadas. La evaluación real pasó todos los casos indicados y guardó el reporte en `tmp/rag-v21/telegram-document-report.json`. Se eliminaron los documentos, cuenta, vinculación y recibos de la identidad sintética. La conciliación de Storage no encontró originales faltantes ni objetos sin referencia y no eliminó documentos de usuarios.
