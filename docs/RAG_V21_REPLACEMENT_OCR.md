# RAG V21: reemplazo, OCR y nodos Supabase

Actualización V22: la biblioteca también admite cargas, búsquedas, descargas, versiones y gestión desde Telegram. Consulta [funcionamiento y comandos de Telegram](TELEGRAM_DOCUMENT_LIBRARY.md).

Estado verificado el 25 de octubre de 2026: desplegado en el entorno local de Ceroa, conectado a Supabase y n8n. Esta actualización sustituye los estados de activación y pendientes de OCR de los documentos anteriores.

## Uso desde Ceroa

Actualización de carga automática: el asistente muestra **Subir documento / Mis documentos**. La sección **Subir documento** permite enviar solo el archivo y el consentimiento, sin completar metadatos. El backend guarda el original privado y Gemini extrae los campos con citas del contenido; los campos válidos se aplican automáticamente al terminar la indexación. No se inventan campos ausentes. Los datos encontrados se muestran al terminar y se pueden corregir. Los filtros de identificación, entidad, tipo y periodo están separados en la búsqueda y, por defecto, se incluyen todos los tipos de documento.

La carga multipart acepta omitir `metadata`; las integraciones existentes pueden seguir enviándolo. El modo automático se registra en el JSON del documento, sin otra migración. Solo completa campos ausentes y el tipo provisional `OTHER`, sin cambiar propietario ni asociación a deuda. Las fechas inválidas y propuestas contradictorias se descartan; el fin inclusivo escrito en un extracto se normaliza al día siguiente para las búsquedas con fin exclusivo. Se mantienen las citas de las propuestas para su revisión. Un dato no encontrado puede dejar el documento en revisión, pero no exige inventarlo para poder subir el archivo.

La prueba real reproducible de esta modalidad es `integrations/n8n/rag/evaluate-automatic-upload.mjs`: sube un PDF sin parte `metadata`, comprueba la extracción y lo recupera por filtros. Usa exclusivamente una cuenta y documento sintéticos y elimina el documento al terminar.

Resultado verificado: carga solo con archivo, tipo CC, clasificación como extracto, entidad, fecha de emisión y periodo extraídos automáticamente; el fin inclusivo 30/09/2026 se convirtió a 01/10/2026 exclusivo. El documento terminó `INDEXED` y se recuperó por identificación, tipo y periodo. Reporte local: `tmp/rag-v21/automatic-report.json`. Verificación de esta actualización: 29 pruebas backend, 181 frontend, TypeScript y 6 pruebas de workflows aprobadas. También se comprobó visualmente el selector y botón de subida en móvil.

En el asistente, abre **Mis documentos financieros** y consulta el documento. La opción **Versiones y reemplazo** permite descargar los originales anteriores o cargar un nuevo archivo. Confirma que los metadatos conservados todavía corresponden al nuevo original; si cambió el periodo o la entidad, revísalos.

El reemplazo conserva la identidad del documento, archiva el original anterior en Storage privado, incrementa la versión y vuelve a indexar. Los fragmentos anteriores salen de la búsqueda. Los procesos atrasados no pueden sobrescribir una versión nueva. Reenviar el mismo original actual no crea otra versión; los conflictos de versión o duplicados de otro documento devuelven 409.

El historial conserva los originales y sus metadatos al reemplazarlos; no pretende guardar una instantánea de cada edición de metadatos. Eliminar un documento elimina también sus originales históricos. Las descargas requieren sesión y autorización vigente, con tickets del backend de 60 segundos. No se entregan URLs directas de Supabase.

## OCR con la credencial existente

Los PDF sin texto utilizable pasan al nuevo workflow `hybrid-rag-ocr.json`. Gemini recibe el PDF completo, con consentimiento explícito, usando la misma credencial de proveedor que ya utiliza n8n. No se agregó otro proveedor de OCR.

El backend comprueba el PDF con PDFBox; admite hasta 8 MiB y 25 páginas. Gemini devuelve una transcripción por página. Se rechazan respuestas inciertas, páginas faltantes o duplicadas y contenido fuera de los límites. La extracción queda marcada como `NATIVE` o `GEMINI_OCR`. La lectura con IA puede necesitar revisión y no registra deudas ni pagos automáticamente.

Configuración local:

- `DOCUMENT_LIBRARY_OCR_URL=http://n8n:5678/webhook/ceroa-library-ocr-v1`.
- `DOCUMENT_LIBRARY_OCR_KEY`: secreto interno del webhook, instalado en la credencial `Ceroa OCR privado`. No es la clave de Gemini.
- La credencial existente de Gemini permanece cifrada en n8n; el instalador reutiliza su asociación.

La API de Gemini admite PDF como entrada nativa: [documentación del proveedor](https://ai.google.dev/gemini-api/docs/document-processing).

## Nodos nativos de Supabase

Los cuatro workflows publicados incluyen un nodo `n8n-nodes-base.supabase` conectado al flujo de ejecución:

| Archivo | Función |
|---|---|
| `hybrid-rag-ingestion.json` | Ingestión e indexación de la versión vigente |
| `hybrid-rag-sync.json` | Sincronización de trabajos |
| `hybrid-rag-query.json` | Consulta y respuesta del asistente |
| `hybrid-rag-ocr.json` | Transcripción de PDF escaneado |

El nodo lee realmente la fila `financial-library-v1` de `public.ceroa_rag_configuration`, a través del gateway restringido del backend. Comprueba el contrato de esquema, modelo y dimensiones antes de continuar. La fila declara `gemini-embedding-001`, 768 dimensiones y OCR `gemini-3.5-flash-lite`.

Estos nodos consultan configuración: no son nodos Vector Store ni escriben documentos financieros directamente. PostgreSQL/pgvector, la autorización por propietario y las operaciones documentales siguen controlados por el backend. n8n recibe una credencial limitada al gateway, no la `service_role` real de Supabase. Se permiten únicamente lecturas de esa configuración; tablas financieras y escrituras están bloqueadas.

Las plantillas exportadas permanecen inactivas por seguridad al importarlas. Las cuatro instancias instaladas en este entorno están publicadas y activas. Ejecutar nuevamente el instalador requiere volver a publicar las cuatro.

## API y datos

Rutas bajo `/api/v1/financial-documents`:

- `POST /{id}/replace?expectedVersion=...&consent=true`: multipart `file`; `sheet` opcional para XLSX.
- `GET /{id}/versions`: original actual e históricos autorizados.
- `POST /{id}/versions/{version}/download`: ticket temporal protegido.

V21 agrega `financial_document_versions` y la configuración pública no personal. Las tablas tienen RLS; el acceso documental continúa pasando por la autorización del backend. V21 ya está aplicada: no editar su contenido tras desplegarla.

Antes del despliegue se guardaron copias locales ignoradas en `tmp/rag-v21/pre-v21.dump` y `tmp/rag-v21/pre-workflows.json`. El SQL de rollback documentado solo sirve para una biblioteca vacía y no se ejecutó.

## Comprobaciones realizadas

- Backend: 320 pruebas, sin fallos ni errores; 3 omitidas. Incluye integración real con PostgreSQL/pgvector para reemplazo, permisos, historial, eliminación e indexación.
- Frontend: 179 pruebas aprobadas y comprobación TypeScript correcta.
- Workflows: 6 pruebas aprobadas, incluida la construcción del cuerpo OCR que consume Gemini.
- Evaluación real: tres documentos sintéticos, uno escaneado de dos páginas; seis casos cubren OCR con referencias de página, filtros de identificación y periodo, búsqueda semántica, búsqueda híbrida y reemplazo. Precisión y recall documentales medios: 1,00 en este corpus pequeño. Latencia de consulta p50: 2180 ms; p95: 2445 ms. No incluye ingestión ni generación completa del chat ni demuestra calidad universal.
- Se comprobó que el original histórico conserva exactamente sus bytes y que solo la nueva versión aparece tras reindexar. Se eliminaron los documentos y la cuenta sintética; no se alteraron registros financieros de usuarios.

Para repetir la evaluación se usan `integrations/n8n/rag/WriteRagEvaluationFixtures.java` y `integrations/n8n/rag/evaluate-library.mjs`. El reporte de esta ejecución está en `tmp/rag-v21/evaluation-report.json`.

`integrations/n8n/rag/ReconcileDocumentStorage.java` compara, en modo de solo lectura, las rutas actuales e históricas de PostgreSQL con Storage. Guarda el inventario privado en `tmp/rag-v21/storage-reconciliation.json`. La ejecución final no encontró originales faltantes ni objetos sin referencia. No borra objetos automáticamente: la retención requiere una política explícita y considerar cargas concurrentes.
