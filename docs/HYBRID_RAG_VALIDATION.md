# Validación de la entrega RAG híbrida

Este informe corresponde a la validación inicial. La fase posterior ya aplicó V20 y desplegó backend/frontend, con workflows todavía inactivos por falta de Storage: véase [HYBRID_RAG_DEPLOYMENT.md](HYBRID_RAG_DEPLOYMENT.md).

Fecha: 25 de octubre de 2026, America/Bogota. Se trabajó en el checkout raíz. No se desplegó sobre los contenedores activos de Ceroa ni se migró Supabase. No se enviaron mensajes a Telegram ni se hicieron llamadas al proveedor con documentos financieros reales.

## Resultados ejecutados

| Comprobación | Resultado |
|---|---|
| Regresión general backend, Java 25/Maven 3.9.11 | 308 contabilizadas: **305 pasaron, 0 fallos, 0 errores, 3 omitidas**; BUILD SUCCESS |
| Pruebas dirigidas después de los últimos ajustes de privacidad/estado de evidencia | **40 pasaron**, 0 fallos/errores/omisiones; biblioteca PostgreSQL, privacidad, asistente, RAG aprobado y Telegram |
| PostgreSQL 17.11 + pgvector, instancia desechable | V1–V20 aplicadas; Flyway validado e idempotente; Hibernate validó las entidades existentes |
| Integración documental PostgreSQL | 14 pruebas pasaron; proveedores Storage/embeddings sustituidos únicamente dentro de pruebas |
| Latencia sintética (diez consultas, dos vectores controlados) | **p50 4 ms / p95 5 ms**, excluye proveedor real y escritura de auditoría posterior; umbral de regresión 2 s |
| Frontend Vitest | **177 pruebas pasaron**, 22 archivos |
| TypeScript `npm run lint` | Correcto |
| Producción `npm run build` | Correcto; advertencia existente de bundle >500 kB |
| Node: workflows híbridos + corpus aprobado | **5 pruebas pasaron** |
| Importación de tres JSON en n8n 2.40.7 desechable | Tres importaciones exitosas; sin credenciales ni activación |

Las tres omitidas pertenecen al conjunto opt-in previo `PostgresMigrationIntegrationTest` (`PG_MIGRATION_TEST`). El conjunto nuevo `HybridDocumentIntegrationTest` sí corrió contra PostgreSQL/pgvector y verificó todas las migraciones. Los conteos de la ejecución dirigida se solapan con la regresión general; no deben sumarse como pruebas distintas. El último ajuste añadió una prueba de conservación de fechas durante redacción y se volvió a comprobar la integración afectada.

Evidencia local de ejecución, ignorada por Git: `tmp/hybrid-backend-regression.log`, `tmp/hybrid-final-focused.log`, `tmp/hybrid-frontend-tests.log`, `tmp/hybrid-frontend-lint.log`, `tmp/hybrid-frontend-build.log`, `tmp/hybrid-workflow-tests.log`, `tmp/hybrid-workflows-import.log`. Los informes JUnit quedan en `backend/target/surefire-reports/`. Estos archivos son evidencia de desarrollo, no artefactos que contengan credenciales de producción.

## Archivos de esta implementación

Backend, creados:

- `backend/src/main/resources/db/migration/V20__financial_document_library.sql`
- `backend/src/main/java/com/ceroa/api/dto/DocumentContracts.java`
- `backend/src/main/java/com/ceroa/api/DocumentLibraryController.java`
- `backend/src/main/java/com/ceroa/api/DocumentLibraryErrorAdvice.java`
- `backend/src/main/java/com/ceroa/config/DocumentLibrarySecurityConfig.java`
- `backend/src/main/java/com/ceroa/config/DocumentConnectorSecurityConfig.java`
- `backend/src/main/java/com/ceroa/repository/FinancialDocumentRepository.java`
- `backend/src/main/java/com/ceroa/service/DocumentLibraryService.java`
- `backend/src/main/java/com/ceroa/service/DocumentLibraryDispatcher.java`
- `backend/src/main/java/com/ceroa/service/DocumentPrivacy.java`
- `backend/src/main/java/com/ceroa/service/PrivateDocumentStorage.java`
- `backend/src/main/java/com/ceroa/service/DocumentOcrClient.java`
- `backend/src/test/java/com/ceroa/config/HybridDocumentIntegrationTest.java`
- `backend/src/test/java/com/ceroa/service/DocumentPrivacyTest.java`

Backend, modificados:

- `backend/src/main/java/com/ceroa/api/AssistantController.java`: herramienta privada con filtros tipados.
- `backend/src/main/java/com/ceroa/service/AssistantService.java`: recuperación dentro del contexto vivo, evidencia, referencias y revalidación antes de entregar a web/Telegram.
- `backend/src/main/resources/application.yml`: propiedades privadas con defaults desactivados.
- `backend/src/test/java/com/ceroa/config/PostgresMigrationIntegrationTest.java`: versión esperada actualizada a V20.

Frontend, creados:

- `frontend/src/services/documentLibraryService.ts`
- `frontend/src/hooks/useDocumentLibrary.ts`
- `frontend/src/components/assistant/DocumentLibraryPanel.tsx`
- `frontend/src/components/assistant/DocumentReferences.tsx`
- `frontend/src/components/assistant/DocumentLibraryPanel.test.tsx`

Frontend, modificado: `frontend/src/components/assistant/AssistantFab.tsx`, con acceso a biblioteca y referencias autorizadas. La navegación principal conserva sus cinco opciones y no se añadieron restricciones comerciales.

Orquestación, creados:

- `integrations/n8n/build-hybrid-rag-workflows.mjs`
- `integrations/n8n/hybrid-rag-ingestion.json`
- `integrations/n8n/hybrid-rag-query.json`
- `integrations/n8n/hybrid-rag-sync.json`
- `integrations/n8n/hybrid-rag-workflows.test.mjs`

Configuración/documentación: `.env.example`, enlace añadido a `README.md`, `docs/HYBRID_RAG.md`, este informe y `docs/sql/rollback_financial_document_library.sql`.

Los demás archivos que ya aparecían modificados o sin seguimiento al iniciar la tarea (incluida V19, cambios de calendario de pagos y formularios, Dockerfile/pom y el checkout anidado) **no forman parte de esta implementación** y se conservaron. No se creó un commit que mezclara esos cambios.

## Alcance comprobado y límites

La integración local comprueba autorización, SQL real, filtros, ranking de vectores controlados, estados, sincronización y regresiones. La importación prueba que n8n acepta los JSON, no que todos los proveedores externos hayan ejecutado el flujo completo.

No hay evidencia de funcionamiento en el Storage de Supabase del usuario porque no estaba configurada su URL/clave para esta biblioteca. No se crearon bucket, concesiones administrativas, conectores ni proveedor OCR en su cuenta. Los workflows entregados siguen inactivos; se requiere asociar credenciales y cambiar el webhook del asistente al activar. La ruta operativa existente web/Telegram continúa usando sus workflows publicados.

Los pendientes de despliegue, RLS, retención, conciliación de objetos huérfanos, calibración y coste real se detallan en [HYBRID_RAG.md](HYBRID_RAG.md). Referencias de contratos externos consultadas: [descargas privadas de Supabase](https://supabase.com/docs/guides/storage/serving/downloads), [URLs firmadas](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl), [autenticación HTTP de n8n](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/credentials/httprequest.md).
