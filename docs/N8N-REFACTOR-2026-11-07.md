# Refactorización incremental de n8n — 7 de noviembre de 2026

Rama: `refactor/n8n-multiagent`. Esta entrega inicia la refactorización; no representa la arquitectura multiagente completa.

## Cambios desplegados

- Arranque de n8n sin republicación automática de borradores.
- Exportación separada de 13 definiciones instaladas y 11 publicadas antes de modificar n8n; tres respaldos cifrados autenticados (antes/borradores/después) en `backups/n8n/refactor-2026-11-07-*.ceroa`.
- Conciliación: seis versiones publicadas diferían de las plantillas. Informe con hashes en `backups/n8n/refactor-2026-11-07-reconciliation.json`. No se reinstalaron esas plantillas.
- Nuevo `ceroaDocumentProcessor22`: toma de trabajo, propuestas, embeddings, validaciones y confirmación/fallo de trabajos. `ceroaRagIngest20` y `ceroaRagSync20` conservan sus disparadores y llaman al procesador mediante Execute Sub-workflow.
- Se preservaron las credenciales referenciadas y las nueve definiciones publicadas ajenas al cambio (comparación de nodos, conexiones y settings).
- Definiciones publicadas: 146 → 137 nodos; 42 → 38 nodos Code. La reducción elimina procesamiento duplicado, no validadores especializados.
- `PERIOD_ANALYSIS`: una lectura de fragmentos por lote/página en vez de una por documento, con autorización y versión vigente en SQL. Si cambia una versión durante la recuperación, la evidencia se marca parcial. Se informa `contextCharacters`; se mantiene el límite existente y la señal de recorte.
- Backend reconstruido y reiniciado con las mismas variables de entorno; sin cambios de credenciales ni migraciones nuevas.

## Verificación realizada

- Spring Boot conectó con PostgreSQL/Supabase, validó 25 migraciones y arrancó correctamente antes y después del despliegue. El rechazo histórico `tenant/user … not found` ya no se reprodujo; no se atribuye una causa administrativa sin evidencia.
- 20 pruebas Node aprobadas: contratos, evidencia, OCR, Telegram y procesador compartido.
- 20 pruebas Java distintas aprobadas: AssistantLibraryIntegrationTest (9), DocumentPrivacyTest (4), DocumentPeriodAnalysisTest (6), DocumentBatchAuthorizationTest (1). Esta última ejecuta SQL real en H2 con modo PostgreSQL: propietario, permisos delegados vigentes/vencidos, estado y versión.
- Dos ejecuciones reales de n8n en contenedores desechables, sin red y con la misma imagen de la instancia: cola vacía y trabajo sintético. En el segundo se sustituyen proveedores/persistencia por fixtures; se ejecutan los validadores y el subworkflow reales. Esto no prueba Gemini ni una escritura documental productiva.
- n8n readiness y CSRF: HTTP 200. Webhook documental sin credencial: HTTP 403.
- Lectura autorizada de configuración RAG: HTTP 200. Mediciones posteriores en `backups/n8n/refactor-2026-11-07-availability-after.json`: CSRF 75 ms, readiness 5 ms, configuración RAG 246 ms. Antes: CSRF 6,5 ms y configuración RAG 364 ms (muestras individuales). No son benchmarks comparables ni latencias conversacionales.

## Operación y recuperación

- `test-document-runtime.ps1` reproduce ambos escenarios aislados; obtiene la imagen exacta desde el contenedor instalado, no desde la etiqueta mutable `stable`.
- `deploy-document-refactor.ps1` respalda, comprueba compatibilidad de los procesadores publicados, ejecuta los escenarios e instala solamente los tres workflows. Si ya están desplegados, conserva el respaldo y no los sobrescribe.
- n8n 2.40.7 necesita reconciliar la publicación desde el servidor antes de ejecutar un subworkflow. El test espera esa reconciliación; no basta con que el CLI acepte la importación/publicación.
- La clave de los tres respaldos está en `backups/n8n/refactor-2026-11-07.key`, excluida de Git. Conservarla por separado del repositorio. Los exports descifrados están en `tmp/`, también excluido.
- Reversión de los dos adaptadores, sin eliminar workflows:

```powershell
./integrations/n8n/rollback-document-refactor.ps1 -PublishedBackup ./backups/n8n/refactor-2026-11-07-published.ceroa -KeyFile ./backups/n8n/refactor-2026-11-07.key
```

- La imagen anterior del backend se conserva como `ceroa-backend:pre-n8n-refactor-20261107`. Para revertirla, etiquetarla nuevamente como `ceroa-backend:latest` y recrear solo backend con los mismos cuatro archivos Compose y ambos env-files. No hay migración que revertir.

## Pendiente para completar la solicitud integral

Persistencia de hechos documentales, contexto adaptable y métricas por herramienta; agentes Orquestador/Financiero/RAG/Soporte; rutas deterministas; outbox de comunicaciones e integraciones Workspace/MCP. Calendar requiere una credencial aún no verificada. No se han probado reservas reales, entrega Gmail, sincronización Drive/Sheets, MCP, conversaciones multiagente ni rendimiento de consultas completas. React y Telegram conservan sus contratos; todavía falta la validación funcional integral con usuarios autorizados. No se hicieron operaciones financieras reales ni envíos externos.
