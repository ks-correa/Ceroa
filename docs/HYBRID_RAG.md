> Estado vigente: V21 desplegada, con OCR, historial de originales y cuatro workflows activos. Consulta [RAG V21: reemplazo, OCR y Supabase](RAG_V21_REPLACEMENT_OCR.md). El estado anterior se conserva debajo como referencia.

# Biblioteca financiera y RAG híbrido

Actualización de despliegue: V20 ya se aplicó en Supabase y los tres workflows se instalaron inactivos. La biblioteca permanece desactivada a la espera de Storage. Véase [estado y comprobaciones del despliegue](HYBRID_RAG_DEPLOYMENT.md). El resto de este documento describe la implementación y sus requisitos de activación.

Implementación del 25 de octubre de 2026 en el repositorio raíz. Código integrado y pruebas locales con PostgreSQL/pgvector; **no activado en el entorno de Supabase/n8n existente**. No se modificaron credenciales, datos financieros ni workflows publicados. Storage y OCR requieren configuración externa.

## Diagnóstico y decisiones

Se inspeccionaron backend, frontend, migraciones V1–V19, pruebas y workflows existentes. El directorio anidado `Ceroa/` contiene otro checkout: no es el proyecto que ejecuta el compose de la raíz y no se modificó. Se conservaron los cambios locales anteriores sobre pagos, deudas y formularios.

Referencias disponibles: `docs/RA-N8N-001.md`, `RA-N8N-002.md`, `RA-N8N-003.md`, `N8N.md` y `SUPABASE.md`. Los dos PDF citados en la solicitud no estaban en el repositorio ni entre los adjuntos; sus textos completos no se verificaron.

Componentes reutilizados:

| Componente | Reutilización |
|---|---|
| Sesiones propias, CSRF y CurrentUserService | Identidad web; jamás se acepta identidad propuesta por el modelo |
| AssistantService y AssistantAnalysisService | Contextos efímeros por cuenta/canal, herramientas de lectura, BigDecimal, sustitución de referencias numéricas |
| TelegramService | Vinculación, autorización previa y revocación de entrega existentes |
| DocumentTextExtractor | PDFBox/POI, límites de 8 MiB/25 páginas/80.000 caracteres, validación MIME/contenido/ZIP y selección de hoja |
| RagEmbeddingClient | Webhook privado existente, contrato Gemini embedding 768 dimensiones y validación de norma/modelo |
| RAG aprobado n8n_aux | Se conserva como corpus independiente de ayuda pública aprobada |
| apiRequest y AssistantFab | Sesión, CSRF, errores y biblioteca integrada sin nueva navegación |

No existía tipo de identificación en `User`: `document_id` es su número. El nuevo tipo se captura **por documento** y puede permanecer desconocido. No se modifica el registro ni se infiere el tipo de usuarios existentes. No había RBAC administrativo general: las concesiones documentales actor–propietario con vencimiento constituyen la autorización explícita; un nombre de rol `ADMIN` no amplía el alcance.

## Flujo implementado

1. Sesión + CSRF o token de conector autorizado, fijo a un propietario.
2. Validación del archivo, consentimiento, metadatos y relación confirmada con deuda propia.
3. Original en bucket privado; identificador de objeto aleatorio y hash SHA-256 por propietario. Mismo archivo/propietario devuelve el documento existente.
4. Documento y trabajo durables en PostgreSQL. Evento de despertar sin información financiera; el workflow de sincronización consulta la cola cada minuto como respaldo.
5. Spring Boot toma un trabajo con bloqueo, lease de cinco minutos y número de intento. Extrae texto; OCR solo si hay adaptador configurado; XLSX requiere hoja explícita.
6. Minimiza identificaciones, números largos, cuentas y correos antes de entregar texto a n8n. Fragmentos de hasta 1.800 caracteres, solapamiento de 200, ubicación/página original, máximo 120.
7. n8n propone metadatos con esquema fijo/citas y genera embeddings como `RETRIEVAL_DOCUMENT`. No tiene conexión SQL financiera ni herramientas de escritura.
8. Backend valida número de intento, versión, vigencia, cuenta activa, modelo, dimensiones, norma, cobertura exacta y citas presentes. Persiste todos los fragmentos en una transacción.
9. Tipo de identificación o periodo de extracto desconocidos dejan `REVIEW_REQUIRED`; nunca se inventan. Las propuestas permanecen separadas de las columnas confirmadas. El usuario revisa el original y guarda los metadatos; se crea nueva versión/trabajo.
10. Consultas aplican permisos y filtros en una CTE materializada **antes** de puntuar y limitar fragmentos. El asistente incorpora evidencia con referencias y vuelve a validar acceso/versión antes de entregar la respuesta.

Las únicas escrituras son documentales. Extracción y RAG no llaman a servicios de creación de deudas, pagos, suscripciones o estrategias.

## Modelo y migración

`backend/src/main/resources/db/migration/V20__financial_document_library.sql` crea:

- `financial_documents`: metadatos tipados, JSONB variable, origen, hash único por propietario, versión, estado y referencia privada.
- `document_chunks`: FK con cascada, orden único por documento, ubicación/página, versión/modelo, vector 768 y `tsvector` español con índice GIN.
- `document_processing_jobs`: historial de estados, payload temporal minimizado, intentos y lease. Los payloads se eliminan al finalizar o sustituir trabajos.
- `rag_query_audit`: actor, filtros, intención, cantidad y latencia; no guarda pregunta ni contenido documental.
- `document_access_grants`: permisos `DOCUMENT_READ` / `DOCUMENT_MANAGE`, propietario y caducidad.
- `document_source_connectors`: hash de token, propietario fijo, origen, consentimiento, activación y vencimiento.

No modifica las tablas financieras existentes. Hay índices por propietario/identificación/tipo/periodo, por documento/versión, cola y auditoría. La FK de deuda se valida contra el propietario en backend antes de crear la relación.

RLS está habilitada sin políticas para clientes de Supabase: no hay acceso `anon`/`authenticated`. La conexión actual de Spring es propietaria de las tablas y omite RLS; **el aislamiento entre usuarios lo aplica la API**, probado con consultas reales. No se afirma que `auth.uid()` corresponda a la sesión de Ceroa. Si se separan roles de migración/ejecución, hay que definir las políticas o funciones y grants de ese rol y volver a probar; no basta conceder SELECT a un rol sin políticas.

No se añade ANN: el recorrido vectorial exacto sobre candidatos autorizados evita perder resultados por filtrar después de un índice aproximado. Medir con el volumen real antes de introducir HNSW/IVFFlat.

## Contratos HTTP

Todas las respuestas documentales son `Cache-Control: no-store`. Los UUID del modelo no sirven como autenticación. OpenAPI incorpora los controladores y DTO nuevos.

| Método/ruta relativa a `/api/v1` | Contrato |
|---|---|
| POST `/financial-documents?consent=true&sheet=Hoja1` | multipart `file` y parte JSON `metadata`; sesión y CSRF |
| GET `/financial-documents/{id}` | Metadatos y estado autorizados |
| GET `/financial-documents/{id}/jobs` | Historial de procesamiento |
| GET `/financial-documents/{id}/proposals` | Propuestas con cita y ubicación, sin aplicarlas automáticamente |
| POST `/financial-documents/search` | Query tipada, respuesta diferenciada descrita abajo |
| POST `/financial-documents/{id}/download` | Ticket temporal de Ceroa, vigencia 60 segundos, vinculado a sesi?n/propietario; nunca expone una URL portadora de Storage |
| GET `/financial-documents/{id}/content?ticket=UUID` | Descarga a trav?s del backend, con sesi?n y permisos vigentes, `no-store` y revalidaci?n antes de entregar bytes |
| PUT `/financial-documents/{id}/metadata` | Corrección confirmada, nueva versión y retirada inmediata de fragmentos anteriores |
| POST `/financial-documents/{id}/reprocess` | Nueva versión/trabajo conservando metadatos y vínculo confirmado |
| DELETE `/financial-documents/{id}` | Retira fragmentos/trabajos y bloquea descargas, elimina original y confirma ausencia antes de retirar metadatos |
| GET `/financial-documents/audit?offset=0` | Auditoría del actor autenticado, páginas de 50; la revisión global queda al operador de BD |
| POST `/document-connectors/upload?sheet=Hoja1` | multipart, token `X-Ceroa-Connector`; propietario obtenido del registro del conector |
| POST `/library-tools/claim` | Solo worker; `Work` o 204 si no hay trabajo |
| POST `/library-tools/jobs/{id}/complete` | Solo worker; intento/modelo/vectores/propuestas; confirma persistencia con 204 |
| POST `/library-tools/jobs/{id}/fail` | Solo worker; `{ "attempt": 1 }`; código de error seguro |
| GET `/assistant-tools/requests/{id}/financial-documents` | Solo worker del asistente y contexto vivo; consulta tipada y evidencia numérica |

Ejemplo de metadatos confirmados (fin exclusivo):

```json
{
  "identificationType": "CC", "documentType": "BANK_STATEMENT",
  "financialEntity": "Entidad confirmada", "periodStart": "2026-09-01",
  "periodEnd": "2026-10-01", "issuedAt": null, "debtId": null
}
```

Consulta de septiembre y octubre:

```json
{
  "intent": "METADATA_SEARCH", "question": null,
  "filters": { "identificationType": "CC", "documentType": "BANK_STATEMENT",
    "periodFrom": "2026-09-01", "periodToExclusive": "2026-11-01" },
  "offset": 0, "limit": 10
}
```

Intenciones: `METADATA_SEARCH`, `STRUCTURED_QUERY`, `SEMANTIC_SEARCH`, `HYBRID_SEARCH`, `COMBINED_QUERY`. Límite 1–50, offset 0–10.000, pregunta hasta 2.000 caracteres. El worker conversacional usa páginas de diez. `ownerId` del contrato REST es exclusivamente filtro y no evita la condición obligatoria de permisos; la herramienta del agente no lo admite.

Resultado: `generatedText` (texto de estado de backend), `verifiedData` (resumen financiero del backend, si corresponde), `appliedFilters`, `sources` (documento/fragmento/página/ubicación/versión/texto/puntuación), `documents`, `evidenceStatus`, `traceId`, `elapsedMs`. La respuesta conversacional conserva `answer`/`intent` y añade `documents`/`traceId` opcionales. Los identificadores de propietario se eliminan del payload enviado al agente; no se envían números de identificación registrados. `evidenceStatus` diferencia `AVAILABLE`, `INSUFFICIENT`, `PARTIAL` (solo datos financieros en una consulta combinada) y `TEXT_ONLY` (recuperación textual por fallo del proveedor semántico).

El resumen financiero es **actual y del propietario autenticado**. Los filtros documentales no lo convierten en un resumen histórico ni otorgan acceso financiero a cuentas delegadas. Comparaciones mensuales, pagos paginados y cálculos exactos utilizan las herramientas existentes `data`/`calculate` de RA-N8N-001; fechas y cifras personales deben provenir de sus referencias `{{fID}}`.

Intervalos: inicio inclusivo, fin exclusivo; coincidencia por solapamiento (`period_start < to AND period_end > from`). Un extracto 25/agosto–5/septiembre coincide con septiembre. Un extracto que termina exactamente el 1/septiembre no coincide. Periodos desconocidos no satisfacen filtros de meses. Años ambiguos se aclaran en el agente. Meses no contiguos se consultan con llamadas separadas y deduplicación por ID; no se expande un intervalo intermedio silenciosamente.

Híbrido: puntuación semántica 65% + textual 35% (`ts_rank_cd` español). Coinciden similitud coseno ≥0,55 **o** términos textuales; semántica exige el umbral. Si falla el proveedor de consulta, híbrido/combined pueden usar recuperación textual; semántica devuelve indisponibilidad. El umbral y pesos son iniciales y deben calibrarse con corpus autorizado antes de dar por validada la calidad. Texto minimizado puede ocultar cantidades; los originales son la referencia verificable. No se garantizan totales derivados del OCR ni de un resumen del modelo.

## Configuración de Supabase y n8n

1. Hacer backup y revisar el plan de despliegue. V20 se aplica con Flyway al arrancar la nueva versión, aunque la funcionalidad esté desactivada; verificar permisos de instalación de extensión antes del despliegue.
2. Comprobar `SELECT extname, extnamespace::regnamespace FROM pg_extension WHERE extname='vector';`. Se requiere `extensions.vector`. Si la extensión está en otro esquema, resolverlo con el administrador y revisar otros consumidores antes de moverla. V20 no la relocaliza automáticamente.
3. Crear bucket **privado** `financial-documents`, máximo 8 MiB, MIME PDF/DOCX/XLSX. No conceder lectura pública ni políticas amplias para el navegador. Backend usa credencial de servidor; la comprueba antes de guardar, leer o firmar. Revisar también logs del proveedor.
4. Configurar las variables privadas de backend:

| Variable | Valor requerido |
|---|---|
| `DOCUMENT_LIBRARY_ENABLED` | `true` solo tras provisionar/verificar; default `false` |
| `DOCUMENT_LIBRARY_WORKER_KEY` | Secreto aleatorio ≥32 caracteres, independiente de Assistant/Documents/RAG |
| `DOCUMENT_LIBRARY_STORAGE_URL` | URL HTTPS del proyecto Supabase, sin `/storage/v1` |
| `DOCUMENT_LIBRARY_STORAGE_KEY` | Credencial de servidor de Storage; nunca `VITE_*`, navegador o Telegram |
| `DOCUMENT_LIBRARY_BUCKET` | `financial-documents` o bucket privado equivalente |
| `DOCUMENT_LIBRARY_INGESTION_WEBHOOK_URL` | Webhook privado n8n `http://n8n:5678/webhook/ceroa-library-ingest-v1` en la red Docker |
| `DOCUMENT_LIBRARY_OCR_URL` / `DOCUMENT_LIBRARY_OCR_KEY` | Opcionales: adaptador autorizado, clave ≥32; sin proveedor no se declara OCR operativo |
| `RAG_EMBEDDING_WEBHOOK_URL` / `RAG_WORKER_KEY` | Webhook de embeddings existente, configuración privada |
| `ASSISTANT_WEBHOOK_URL` | Cambiar al nuevo `/webhook/ceroa-assistant-hybrid-v1` al activar el workflow nuevo |
| `ASSISTANT_ENABLED` / `ASSISTANT_WORKER_KEY` | Configuración existente del asistente |

El contrato de embeddings actual fija `gemini-embedding-001`, 768 dimensiones. Se configura el proveedor/puente mediante webhook, pero cambiar modelo o dimensiones exige actualizar contrato/workflows, reindexar y validar: no se mezclan modelos silenciosamente. No se reutilizan los vectores del corpus público para archivos privados.

5. Generar/importar los JSON exportables:

```powershell
node integrations/n8n/build-hybrid-rag-workflows.mjs
node --test integrations/n8n/hybrid-rag-workflows.test.mjs
```

| Archivo | Función |
|---|---|
| `hybrid-rag-ingestion.json` | Webhook autorizado → claim → extracción de propuestas sin herramientas → embeddings → persistencia segura |
| `hybrid-rag-query.json` | Asistente existente ampliado con intención/filtros y herramienta privada de biblioteca |
| `hybrid-rag-sync.json` | Revisión cada minuto de trabajos nuevos y leases vencidos; reutiliza la misma construcción de ingesta |

Compatibilidad comprobada por importación en **n8n 2.40.7** desechable. Los JSON permanecen inactivos y sin credenciales. Asignar `httpHeaderAuth` de biblioteca (`X-Ceroa-Library`) a webhook y HTTP de ingesta/sync; Gemini a nodos de modelo/embeddings. En consultas, conservar Header Auth del asistente (`X-Ceroa-Assistant`), además de las asociaciones de Gemini y RAG aprobado existentes. No exportar credenciales descifradas. No sobrescribir workflows publicados que ya tienen credenciales asociadas.

6. Conservar el workflow de embeddings privado existente y su autenticación; la generación documental usa `RETRIEVAL_DOCUMENT` y la consulta `RETRIEVAL_QUERY`. Activar primero ingesta/sync y probar con cuenta/documento sintéticos. Luego activar consultas, actualizar URL privada del backend y reconstruir/desplegar. El workflow Telegram sigue usando TelegramService, que llama al mismo AssistantService y respeta vinculación vigente. No se envían archivos o URLs firmadas a Telegram automáticamente: las referencias permiten abrir la biblioteca desde la web autenticada.
7. Para un administrador autorizado, el operador asigna una fila en `document_access_grants` con actor, propietario, permiso y vencimiento explícitos. `DOCUMENT_READ` no permite corregir/reprocesar/eliminar. `DOCUMENT_MANAGE` añade esas operaciones; no permite vincular una deuda ajena ni consultar sus finanzas. No hay endpoint público para otorgar permisos.
8. Los conectores son adaptadores HTTP entrantes, sin simulación bancaria. Provisionar token aleatorio, guardar **solo SHA-256** en `document_source_connectors` con propietario fijo, consentimiento y caducidad. Activar únicamente después de autorizar la fuente; enviar multipart con `X-Ceroa-Connector`. Revocación por `active=false`. No se ha configurado ningún banco, buzón ni conector externo.

OCR opcional: el adaptador recibe `POST application/pdf`, header `X-Ceroa-Ocr`; responde `{"segments":[{"page":1,"text":"texto extraído"}]}`. Backend exige 1–25 páginas únicas, texto no vacío y máximo 80.000 caracteres. El proveedor debe configurarse y autorizarse aparte. No se implementa un motor OCR ficticio ni se considera operativo sin probar ese contrato real.

## Operación, seguridad y límites

- Límite por proceso de 20 cargas/consultas/cambios por propietario y minuto, más límites existentes del asistente. Para varias réplicas, trasladarlo a infraestructura compartida/API gateway; la memoria conversacional existente también requiere afinidad o almacenamiento compartido.
- Los documentos son evidencia no confiable. El extractor de metadatos no tiene herramientas; el agente de consultas solo tiene lecturas/cálculos. Spring no tiene un endpoint que ejecute SQL propuesto por el modelo. Estas barreras evitan acciones y ampliaciones de acceso; no prueban que toda interpretación del LLM sea correcta.
- Las propuestas exigen cita literal presente, pero no se consideran verdad confirmada. Los importes no se registran como deudas/pagos y nunca se usan como totales exactos transaccionales.
- Redacción conservadora: identificación exacta registrada, identificadores etiquetados, secuencias numéricas largas y correos. No es un clasificador exhaustivo de PII; nombres/direcciones y cantidades cortas pueden permanecer. La autorización y consentimiento del proveedor siguen siendo necesarios. El original permanece intacto en Storage privado.
- Mismo hash/propietario es idempotente; cambios de metadatos/reprocesamiento incrementan versión y retiran índice previo. Un original diferente es un documento nuevo: no se infiere automáticamente que reemplaza otro extracto. El operador puede eliminar la versión documental anterior tras confirmar la relación.
- Leases caducados se reintentan hasta tres intentos con rechazo de callbacks anteriores. Un fallo explícito del proveedor queda `FAILED`; se reintenta desde Reprocesar. No se afirma éxito antes del 204 de persistencia.
- Borrado distribuido: primero tombstone `DELETING`, fragmentos/trabajos fuera; luego Storage y verificación; finalmente metadatos. Un fallo mantiene tombstone sin acceso documental y permite repetir DELETE. No se borra la auditoría junto al documento; solo contiene filtros/IDs mínimos. Definir retención de auditoría, originales y backups antes de producción: no había una regla aprobada que permitiera inventar plazos.
- No hay transacción distribuida entre Storage y PostgreSQL. Hay compensación si falla la inserción, pero un fallo del proceso entre subir y confirmar BD puede dejar objeto huérfano. Requiere reconciliación operativa del bucket frente a referencias antes de habilitar retención automática. No se elimina ningún objeto externo sin esa confirmación.
- La autorización administrativa y consultas quedan en auditoría; la API permite revisar la del propio actor. No se ha creado un panel administrativo global ni un rol RBAC genérico.
- Los enlaces de 60 segundos son tokens portadores durante su vigencia; la revocación de sesión no invalida inmediatamente uno ya emitido. El borrado del objeto sí lo retira. Para revocación instantánea por solicitud usar proxy de descargas autenticado.

## Validación reproducible y evidencia

No usar producción para estas pruebas. Crear PostgreSQL/pgvector desechable:

```powershell
docker run --detach --name ceroa-rag-verification -e POSTGRES_PASSWORD=disposable-test-only -e POSTGRES_DB=ragtest -p 127.0.0.1:55439:5432 pgvector/pgvector:pg17
docker run --rm -e HYBRID_PG_TEST=true -e PG_TEST_URL=jdbc:postgresql://host.docker.internal:55439/ragtest -e PG_TEST_USERNAME=postgres -e PG_TEST_PASSWORD=disposable-test-only -v "${PWD}/backend:/app" -v ceroa_maven_cache:/root/.m2 -w /app maven:3.9.11-eclipse-temurin-25 mvn -B test
cd frontend
npm test
npm run lint
npm run build
```

`HybridDocumentIntegrationTest` usa las veinte migraciones reales, validación Hibernate y SQL pgvector. Solo los proveedores externos Storage/embeddings se sustituyen para obtener pruebas aisladas. Comprueba propietario, ADMIN sin concesión, concesión caducable, CC/CE, septiembre/octubre, periodos cruzados, filtros previos al ranking, referencias, idempotencia, callbacks obsoletos, limpieza de vectores/trabajos, PDF escaneado, metadatos desconocidos, fallo de borrado, fallback textual, origen de totales, conector de propietario fijo y ausencia de modificaciones financieras ante instrucciones maliciosas.

`DocumentPrivacyTest` comprueba minimización e intervalos inválidos. `DocumentLibraryPanel.test.tsx` comprueba filtros, fechas exclusivas, errores, ausencia de resultados, consentimiento y emisión autorizada de enlaces. Las regresiones existentes comprueban login, CSRF, Telegram, deudas, pagos, estrategias, suscripciones y el RAG público. El test Node de workflows valida conexiones, JSON/esquemas, código de nodos y que filtros hostiles no cambien host/ruta ni introduzcan identidad/SQL.

El benchmark sintético reporta p50/p95 y exige p95 <2 s para diez consultas con dos vectores controlados. No equivale a latencia/coste del proveedor ni a precisión de embeddings reales. Antes de producción: evaluar relevancia/recall, abstenciones, fechas ambiguas, tokens y coste por documento/consulta con corpus sintético autorizado y proveedor real. No hay mediciones de coste inventadas.

Los resultados finales de la ejecución de esta entrega se registran en `docs/HYBRID_RAG_VALIDATION.md`.

## Desactivación y pendientes externos

Desactivar `DOCUMENT_LIBRARY_ENABLED`, volver a la URL anterior del asistente y desactivar los tres workflows nuevos permite retirar la funcionalidad sin revertir datos financieros. No ejecutar un DROP para desactivar una función. El SQL de reversión en `docs/sql/rollback_financial_document_library.sql` solo admite tablas documentales vacías y exige gestión manual de Flyway por un administrador; no elimina la extensión compartida.

Pendiente real: provisionar/verificar bucket y clave de Storage (no estaban configurados), aplicar V20 al entorno elegido con backup, asociar credenciales y activar workflows, verificar recorrido completo real de carga/consulta/descarga en web y Telegram, configurar OCR si se requiere, dar de alta conectores autorizados y calibrar recuperación/coste/retención. La importación de JSON y las pruebas con dobles de proveedores **no acreditan** operación en Supabase, Gemini u OCR reales.
