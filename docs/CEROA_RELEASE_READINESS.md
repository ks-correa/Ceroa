# CEROA — Release readiness verificado

Actualización: 14 de noviembre de 2026, America/Bogota. Rama `docs/ceroa-ai-architecture`; base recibida `8c6ac23`.

**GO para revisar/integrar RC1 y continuar la demostración local. NO-GO para ejecutar producción sin las puertas de Bloque 13.** No hubo despliegue productivo ni merge. Este informe sustituye las conclusiones no verificadas del reporte de transferencia; el detalle y límites están en [validación final Codex](CEROA_CODEX_FINAL_RELEASE_VALIDATION.md).

## Candidato realmente ejecutado

RC1: `tmp/release-candidate/ceroa-backend-0.1.0-SNAPSHOT-rc1.jar`, SHA-256 `4C2F954C53399AE5B8F1E050F5EC10AA0C0CE0A2B39187A744105422010C7004`. Comprobado dentro de ceroa-demo-backend-1. Las 432 clases/recursos del JAR coinciden byte a byte con la recompilación actual. B12 y backend-delivery.jar permanecen intactos con sus hashes originales; no se necesitó RC2.

El manifiesto ampliado incluye código, lockfiles, configuración, wrappers, scripts y despliegue. El hash fuente histórico 55F3AF… no se declara reproducido: faltaba documentar la serialización exacta. [Manifiesto reproducible nuevo](benchmarks/ceroa-codex-release-2026-11-14/release-manifest.json), [comparación con RC1](benchmarks/ceroa-codex-release-2026-11-14/rc1-class-comparison.json).

## Evidencia funcional nueva

| Caso | Evidencia RC1 |
|---|---|
| ATLAS | COMPLETE, ejecuciones 122–123 |
| ORACLE | COMPLETE, ejecuciones 129–130, documento v2 referenciado |
| ORACLE + ATLAS | COMPLETE, ejecuciones 131–133 |
| ORACLE + ATLAS + LUMEN | COMPLETE, ejecuciones 118–121; tres especialistas OK, Grant 3 cada uno, reserva 15 |
| CHRONOS + AEGIS | MCP simulado, propuesta y confirmación PENDING_MEET idempotente; propietario/código/fecha/expiración rechazados correctamente |
| Gmail draft | Propuesta persistente, createDraft SIMULATED, vista previa y confirmación humana, ejecución 128; sin correo real |
| Biblioteca y UI | Cinco secciones, asistente, documento indexado, búsqueda AVAILABLE y consola/historial n8n verificados con Chromium |

Se separa success de n8n de COMPLETE del negocio. [Resultados](benchmarks/ceroa-codex-release-2026-11-14/functional-results.json), [ejecuciones nuevas](benchmarks/ceroa-codex-release-2026-11-14/executions.json), [métricas](benchmarks/ceroa-codex-release-2026-11-14/runtime-metrics.json).

## Pruebas y configuración efectiva

- Node 51/51; frontend tsc y 190/190 en 23 archivos, cero fallos.
- Java: 456 casos registrados. El recorrido inicial en UTC produjo 4 fallos y 1 error por fixtures de fecha en dos clases. Sus 17 casos pasan al repetir con America/Bogota; no se alteró código del candidato.
- Se ejecutaron adicionalmente las 27 pruebas opt-in PostgreSQL/pgvector y las 3 de migración en bases desechables separadas. La reconciliación por caso y las restantes están en [java-results.json](benchmarks/ceroa-codex-release-2026-11-14/java-results.json).
- Gemini: 15 iteraciones reservadas para tres especialistas, no 15 solicitudes HTTP físicas garantizadas. Concurrencia efectiva **1**, cooldown **60 s**. Se observó 429 y recuperación tras esperar ventana; cooldown por cuota se verifica por componente, sin agotar deliberadamente Gemini.
- LangChain admite reintentos internos acotados (AsyncCaller por defecto 6). Embeddings adicionales no pertenecen a la reserva del chat. Peticiones físicas, tokens y reintentos exactos siguen sin instrumentar; no se contabilizan como cero.

Variables correctas: `ASSISTANT_PROVIDER_CALLS_PER_MINUTE=15`, `ASSISTANT_PROVIDER_CONCURRENCY=1`, `ASSISTANT_PROVIDER_COOLDOWN_SECONDS=60`. Los valores por defecto ya coinciden; no se aumentaron cuotas.

## Demo y producción

La demo permanece en http://localhost:3001, backend :8081 y n8n :5679, limitada a loopback. PostgreSQL/pgvector, n8n y protocolo MCP son reales; datos financieros, Calendar, Gmail draft y Storage son sintéticos/simulados. Los volúmenes se conservaron. El frontend usa Vite con fuente montada, no una imagen estática final publicada.

Para arrancar: `./integrations/demo/demo.ps1`. Para revertir exclusivamente el JAR demo: establecer `$env:CEROA_DEMO_BACKEND_JAR='./tmp/functional-demo/backend-delivery.jar'` y ejecutar `docker compose -p ceroa-demo -f docker-compose.demo.yml up -d --no-deps backend`. Retirar esa variable y repetir para volver a RC1. No usar down -v.

La plantilla productiva Calendar es REST/Google Calendar, no MCP Calendar. Falta el adaptador MCP productivo si se exige ese transporte. También falta el webhook productivo de createDraft que implemente el contrato de WorkspaceDraftService; la plantilla de envío/outbox no lo sustituye. Dejar `WORKSPACE_DRAFT_URL` vacío deshabilita borradores; no existe la propiedad draft-enabled descrita anteriormente. Los gateways usan X-Ceroa-Workspace compartida en red interna; no el HMAC de Workspace que afirmaba el reporte anterior.

## Bloque 13 corregido

Lectura autorizada actual: Supabase PostgreSQL 17.6, Flyway V30, V31 ausente, siete eventos SHEETS/PENDING. Contenedores operativos originales detenidos, sin cambios. n8n operativo conserva 30 workflows, 15 publicados/activos y 22 credenciales. [Preflight](benchmarks/ceroa-codex-release-2026-11-14/runtime-readonly.json).

V31 real: **V31__durable_subscription_charges.sql**, creación aditiva de subscription_charges e índice, checksum esperado `1431353347`. No es una columna facts_json. El backend operativo anterior se ensayó sobre V31 sintética: arranque, login y lectura de deudas correctos; no certifica escrituras antiguas de facturación.

Antes de la ventana autorizada: fijar commit/manifiesto RC1 e imágenes por digest; controlar escritores y consumidores; obtener y restaurar respaldo actualizado de PostgreSQL/Storage/n8n cifrado; validar checksums y V31 sobre copia restaurada; construir frontend compatible; preparar actualización selectiva de workflows preservando configuración/credenciales; mantener conectores apagados; ejecutar smoke y recién después autorizar consumidores. El snapshot del 9 de noviembre no sustituye ese respaldo actualizado.

Interrumpir ante checksum inesperado, restauración no verificada, migración fallida, aislamiento/grounding incorrectos o incompatibilidad contractual. Rollback separado de backend, frontend y versiones n8n; revertir backend **no revierte V31**. Mantener facturación y consumidores detenidos al volver al backend anterior, hasta reconciliar recibos. Una restauración de DB requiere plan independiente para no perder escrituras posteriores. No se promete rollback completo en dos minutos.

## Versionamiento y siguiente paso

El usuario ya autorizó commits, push normal y PR borrador después de validación y revisión de secretos. No se requiere volver a solicitar ese permiso. Los commits y PR se registran en [el cierre final](CEROA_CODEX_FINAL_RELEASE_VALIDATION.md). No se publican JAR, tmp, backups, claves, SQLite, archivos .env ni datos privados.

Siguiente paso: revisar el PR y acordar alcance y ventana productiva con respaldo/restauración actualizados. No ejecutar merge, migraciones operativas ni activar Calendar/Gmail reales con esta autorización.
