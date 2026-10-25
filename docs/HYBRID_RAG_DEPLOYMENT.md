> Estado vigente: V21 desplegada, con OCR, historial de originales y cuatro workflows activos. Consulta [RAG V21: reemplazo, OCR y Supabase](RAG_V21_REPLACEMENT_OCR.md). El estado anterior se conserva debajo como referencia.

# RAG h?brido activo: despliegue y verificaci?n

Estado final verificado el 25 de octubre de 2026, America/Bogota. La biblioteca documental, Storage privado y los tres workflows est?n activos en el entorno local de Ceroa conectado a Supabase y Gemini.

## Configuraci?n desplegada

- PostgreSQL Supabase 17.6, esquema `ceroa`, migraci?n V20 y `extensions.vector` verificados.
- Bucket `financial-documents` privado, l?mite de 8 MiB, exclusivamente PDF/DOCX/XLSX.
- Credencial de Storage guardada en `.env`, ?nicamente en backend. Se verific? que corresponde al mismo proyecto que la base financiera. No se imprimi? ni se incluy? en archivos versionados.
- `DOCUMENT_LIBRARY_ENABLED=true`, webhook privado de ingesta configurado y `ASSISTANT_WEBHOOK_URL` apuntando a `/webhook/ceroa-assistant-hybrid-v1`.
- Workflows `ceroaRagIngest20`, `ceroaRagSync20` y `ceroaHybridQuery20` publicados y activos en n8n 2.40.7; credenciales asociadas. Telegram conserva su workflow/vinculaci?n existentes y llama al mismo backend.
- Backend y frontend reconstruidos/desplegados; se conservaron los servicios ajenos y las cinco opciones de navegaci?n.
- Las seis tablas documentales tienen RLS habilitada; no hay pol?ticas documentales para clientes de Supabase ni para roles del corpus p?blico. El control por propietario contin?a en Spring Boot.

## Recorrido real comprobado

Se usaron PDF generados en memoria, sin datos personales ni obligaciones reales, y una cuenta temporal aislada adem?s de la cuenta demo sint?tica existente.

| Comprobaci?n | Resultado |
|---|---|
| Carga ? Storage ? trabajo durable ? n8n ? Gemini ? pgvector | INDEXED |
| Filtros CC/CE y septiembre/octubre de 2026 | Correctos |
| B?squeda h?brida y referencia a p?gina original | Fragmento pertinente, p?gina uno |
| Respuesta del asistente web | Documento autorizado y referencia real |
| Consulta combinada | Total id?ntico al resumen financiero del backend |
| Usuario B accediendo a documento de A | Lectura y descarga denegadas |
| Documento id?ntico cargado por otra cuenta | ?ndice separado, resultados solo del propietario |
| Canal backend de Telegram | Documento propio recuperado; documento ajeno ausente |
| Desvinculaci?n antes de entregar respuesta Telegram | Entrega revocada |
| Mensajes efectivamente enviados a Telegram por estas pruebas | Cero |
| Descarga temporal desde Ceroa | Bytes id?nticos al original |
| Enlace reci?n emitido despu?s de borrar el documento | 404 inmediato, antes de su vencimiento |
| Documentos, originales, fragmentos y trabajos sint?ticos | Eliminados |
| Cuenta temporal, sesiones y recibos de Telegram sint?ticos | Eliminados; quedan cero cuentas temporales de verificaci?n |
| Deudas y pagos de la demo, comparados antes/despu?s | Sin cambios |

La prueba del canal Telegram ejecut? la vinculaci?n y autorizaci?n real del backend con una identidad sint?tica, pero no envi? mensajes a personas ni acredita una nueva prueba manual desde el tel?fono.

## Ajustes que surgieron durante la integraci?n

**Listados fiables:** `METADATA_SEARCH` se presenta directamente con los resultados tipados y autorizados de PostgreSQL. La prosa y las citas inventadas por el modelo no se usan en esos listados. Las explicaciones sem?nticas y el an?lisis financiero siguen rechazando cifras sin evidencia. La herramienta privada entrega `status` y `evidence.facts`, evitando duplicar valores crudos. Se permiten dos b?squedas privadas por turno; se acumulan y revalidan los documentos de ambas antes de entregar referencias.

**Descargas revocables:** la prueba real mostr? que la cach? externa pod?a seguir sirviendo una URL firmada de Supabase tras eliminar el objeto. Por eso la API ya no entrega esas URLs al cliente. `POST /api/v1/financial-documents/{id}/download` emite una ruta de Ceroa con un ticket de sesenta segundos. `GET /api/v1/financial-documents/{id}/content?ticket=UUID` exige sesi?n del mismo propietario, ticket vigente y permisos actuales; revalida el recurso antes de devolver bytes con `Cache-Control: no-store`. Al borrar, se retira el ticket y el documento deja de ser descargable. Los originales nuevos tambi?n usan `private, no-store`; la confirmaci?n de borrado consulta Storage sin cach? y con HTTP/1.1.

Los tickets, l?mites y memoria conversacional viven en este proceso backend. Para varias r?plicas, configurar almacenamiento compartido o afinidad y repetir las pruebas de aislamiento.

## Pruebas finales

- Backend dirigido: **42 aprobadas**, cero fallos/errores/omisiones. Incluye PostgreSQL/pgvector real con V1?V20, descargas autenticadas, referencias de varias b?squedas, revocaci?n y regresiones de asistente/RAG/Telegram.
- Frontend: **177 aprobadas**, 22 archivos; TypeScript correcto.
- Build Docker de backend/frontend: correcto.
- Contratos de workflows Node: **4 aprobados**.
- Verificaci?n contra Storage, Gemini y n8n reales: comprobaciones de la tabla anterior aprobadas.
- La regresi?n general inicial de 305 pruebas aprobadas y tres opcionales omitidas se conserva en `HYBRID_RAG_VALIDATION.md`; los conteos dirigidos se solapan y no se suman como pruebas distintas.

Evidencia local, ignorada por Git: `tmp/hybrid-activation/live-smoke.log`, `live-finish.log`, `final-tests.log`, `frontend-final-tests.log`, `frontend-final-lint.log` y `final-build.log`. Los registros de prueba imprimen estados y trazabilidad, sin credenciales ni contenido financiero real.

## Respaldo y operaci?n

El respaldo previo a V20 est? en `tmp/hybrid-activation/pre-v20.dump` (formato custom, 68.672 bytes, 146 entradas verificadas con `pg_restore --list`). Contiene datos privados y permanece local e ignorado por Git. La copia previa de workflows y configuraci?n est? en el mismo directorio. No se restauraron datos financieros ni se exportaron credenciales descifradas.

Para desactivar la biblioteca: establecer `DOCUMENT_LIBRARY_ENABLED=false`, recuperar ?nicamente la URL anterior del asistente y despublicar los workflows nuevos. No restaurar todo `.env` ni revertir V20 para desactivar la funci?n.

Utilidades de esta fase:

- `hybrid-preflight.java`: BD, migraci?n, extensi?n, bucket, RLS y ausencia de cuentas temporales.
- `install-hybrid.ps1` / `install-hybrid-runtime.cjs`: preparaci?n e importaci?n **inactiva**. No volver a ejecutarlas sobre esta instalaci?n activa sin planificar la actualizaci?n.
- `hybrid-storage-setup.mjs`: verifica proyecto, credencial, privacidad y l?mites; crea el bucket solo si falta.
- `hybrid-live-smoke.mjs`: carga e indexa un PDF sint?tico, comprueba filtros, fuentes y descarga.
- `hybrid-live-finish.mjs`: comprueba asistente, aislamiento, Telegram sin env?os y borrado; elimina los documentos generados por el smoke.
- `hybrid-clean-test.java`: retira exclusivamente la identidad sint?tica registrada por la prueba, comprobando que no tenga datos financieros.
- `hybrid-deployment-smoke.mjs`: comprobaci?n hist?rica previa a activar Storage; espera biblioteca desactivada y no corresponde al estado actual.

## L?mites pendientes

OCR y conectores externos siguen sin proveedor/configuraci?n y no se declaran activos. La recuperaci?n se prob? con documentos sint?ticos controlados: faltan calibraci?n de relevancia sobre un corpus amplio, coste y latencia bajo carga, pol?tica aprobada de retenci?n/backups y conciliaci?n operativa de objetos hu?rfanos ante un fallo entre Storage y PostgreSQL. No hay una nueva prueba manual del env?o del bot desde un tel?fono.
