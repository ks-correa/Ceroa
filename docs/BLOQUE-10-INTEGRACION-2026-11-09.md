# Ceroa — Bloque 10: validación para integración controlada

Fecha: 9 de noviembre de 2026, America/Bogota. Autorización: integrar las correcciones B7/B8 en main y publicarlas mediante push normal, condicionadas a verificaciones satisfactorias. No autoriza despliegue ni cambios operativos.

## Alcance y Git

Se verificó la cadena completa, objetos y padres: `ed316f9 → 337802e → bfb04b6 → 8aacb7e → ec6d4f5 → bcb997c → c5e3322`. `git fetch origin` confirmó main en `ed316f9`, sin divergencia, 0 detrás/6 delante. `git fsck --connectivity-only --no-dangling` y `git diff --check origin/main...HEAD` pasaron. Diff funcional/documental anterior al cierre: 59 archivos, 6.056 adiciones y 113 eliminaciones; se revisó la lista exacta, incluida V31 y las regresiones, sin cambios funcionales nuevos en B10.

El árbol inicial no tenía cambios versionados: solo documentos/evidencias y las dos fuentes recibidas sin seguimiento. El XLSX y Markdown de origen se archivaron fuera del repositorio en el directorio privado de fuentes de auditoría, verificando SHA-256 antes de retirar las copias del árbol. Sus hashes originales permanecen en [reconciliation.json](benchmarks/block9/reconciliation.json). No se publica el material fuente completo. Los documentos de cierre se versionan en un commit independiente; después se exige árbol limpio y una nueva consulta del remoto antes del fast-forward y push normal. No se usa force push ni se reescriben commits. No hay workflows GitHub Actions versionados ni hooks locales activos de despliegue en este checkout.

Este documento registra la validación previa a publicación. El hash del commit documental, el resultado final del push y la igualdad de main/origin/main se informan al terminar la operación, para evitar autorreferencia del hash dentro del propio commit.

## Documentación conciliada

Se revisaron [informe de cierre](CEROA_INFORME_CIERRE_TECNICO_Y_MATRIZ_E2E_CONSOLIDADA.md) y [matriz TSV](CEROA_MATRIZ_E2E_CONSOLIDADA_63.tsv). Las 63 filas, sus IDs, módulos, estados originales y B7 y referencias de evidencia concuerdan con las fuentes inspeccionadas. Se verificaron los nueve grupos DEF. Se corrigieron los enlaces a fuentes privadas para identificarlas por nombre y hash; los enlaces a evidencia versionada se mantienen.

Original: 40 APROBADA, 6 PARCIAL, 8 FALLIDA, 2 BLOQUEADA y 7 NO EJECUTADA. B7: 54 APROBADA, 2 BLOQUEADA y 7 NO EJECUTADA. Son resultados históricos; ni esta integración ni los tests automatizados los convierten en una nueva ejecución E2E de 63 casos. Se mantienen las limitaciones de evidencia histórica no accesible, cobertura posterior parcial de DEF-08 y proveedores reales sin nueva validación.

## Validaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Backend Java 25, Maven package desde copia limpia | BUILD SUCCESS; 437 casos, 0 fallos, 0 errores, 34 opt-in omitidos |
| Seguridad y fronteras | SecurityConfigTest, AgentRuntimeTest y AssistantIntegrationTest ejecutados sin omisiones en el paquete |
| Grounding | FinancialClaimGroundingTest: 11/11; AssistantAnalysisServiceTest y contratos de evidencia aprobados |
| Regresiones B7 | AgentContractsTest, 404 autenticado, parser/asesoría, sanitización, PaymentStatusLifecycleTest; frontend de carga, tarjetas, mora y suscripción aprobado |
| Frontend | TypeScript, Vite y 190/190 Vitest aprobados |
| Contratos n8n | 22/22: multiagent-workflows, block6-contracts, block8-runtime-profile, document-query y hybrid-rag-workflows |
| Flyway V31 aislado | 3/3 PostgresMigrationIntegrationTest; validate, sin pendientes, versión 31 y segunda migración sin operaciones |
| Cobros durables en PostgreSQL migrado | 4/4 SubscriptionPersistenceIntegrationTest: replay, frontera monotónica, rechazado y cancelación |
| Documentos | 63 filas y estados/referencias concordantes; matriz nominal de nueve DEF verificada |
| Runtime operativo | Lectura n8n B10 coincide con B9: 30 workflows, ocho generales inactivos/sin publicación |

La evidencia resumida con clases y nombres de casos está en [validation-results.json](benchmarks/block10/validation-results.json). Las suites se solapan; no sumar sus recuentos como E2E únicos. Los 437 casos del paquete incluyen la prueba informativa de asesoría del estado final; la suite javaClean histórica B8 registraba 436 y su suplemento de asistente ya incluía esa prueba adicional. No hubo modificación de código para alterar el conteo.

El primer intento offline de empaquetado se detuvo por ausencia de maven-jar-plugin en caché, antes de compilar o ejecutar pruebas. Se repitió con una copia desechable de caché y descarga del plugin; el empaquetado completo pasó. Maven emitió avisos de API obsoleta; Vite informó un chunk de más de 500 kB. No son fallos de compilación y no se hicieron cambios funcionales fuera de alcance para eliminarlos.

PostgreSQL 17/pgvector se ejecutó en un contenedor exclusivo, red Docker interna y sin puertos publicados. Se usaron bases independientes para migración y recibos, porque las migraciones también afectan public. Ambas registraron V31 exitosa; la prueba de cobros usó el esquema migrado con validación JPA, no creación automática de tablas. Se montó solo backend como fuente y scripts/resultados aislados, sin .env ni volúmenes productivos. Mercado Pago fue interceptado por MockRestServiceServer. La compilación y los tests generales no emplearon credenciales reales. No se repitieron pruebas externas reales.

## Protección del entorno y preparación posterior

Los contenedores de validación tienen nombres `ceroa-block10-*`; su limpieza se limita a esos recursos y su red dedicada. No se construyen ni despliegan imágenes nuevas del producto. Se comprueba que IDs, imágenes e instantes de arranque de backend/frontend/n8n operativos se mantienen, junto con el inventario de workflows. No se aplica V31 sobre Supabase ni se envían correos, crean reservas o realizan pagos reales.

Se revisan los textos versionados y nuevos con patrones de secretos de alta confianza, y la lista de archivos del commit: solo documentación y JSON de evidencia redactada. Logs de ejecución, JARs de validación, .env, SQLite, backups y fuentes privadas permanecen fuera del commit. Esto no constituye una auditoría completa de secretos del historial.

Integrar en Git no despliega. Siguen pendientes para V31: autorización específica de ventana, identificar versiones/digests efectivos, backup independiente y restaurable de PostgreSQL/Supabase, backup n8n cifrado con clave separada, validación Flyway y compatibilidad en copia restaurada, control del ingreso/consumo de eventos y conciliación de replays históricos, actualización coordinada de backend/frontend y recuperación ensayada. La validación productiva de Mercado Pago y demás proveedores no queda acreditada por pruebas sintéticas. Los ocho conectores generales siguen excluidos de activación. El procedimiento detallado está en la sección G del informe de cierre.
