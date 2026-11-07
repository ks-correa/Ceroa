# Bloque 2: hechos documentales y contratos de agentes

Rama `refactor/n8n-multiagent`, continuación de `4790c1d`, `bbba774` y `e477e04`.

## Implementación desplegada

- V25 crea `document_financial_facts`, con RLS sin políticas para clientes, referencias a documento/versión/fragmento, cita y posiciones, tipo, unidad, moneda, modalidad, estado y versión del extractor. Spring Boot validó 26 migraciones, aplicó V25 y arrancó. No se modificaron datos canónicos de deudas, pagos o estrategias.
- Los hechos se generan al persistir fragmentos dentro de la transacción de indexación existente. Se reconocen etiquetas explícitas de saldo, pago mínimo, cuota, tasa, fechas, entidad y movimientos con referencia/fecha. Los bordes incompletos de fragmentos se excluyen. Los formatos no reconocidos siguen usando RAG; los desconocidos no se completan por inferencia.
- Un símbolo `$` sin moneda o una tasa sin modalidad no habilitan comparaciones verificadas. Las fechas conservan su valor documental; el período de selección procede de los metadatos actuales y se declara como `DOCUMENT_METADATA`.
- Los documentos ya indexados derivan hechos una sola vez desde sus fragmentos actuales. Un marcador en los metadatos incluye versión documental y del extractor, incluso cuando no se encuentran hechos. No se leen originales ni se recalculan embeddings. `POST /api/v1/financial-documents/{id}/facts/rebuild` permite reconstrucción autenticada y protegida por CSRF, con revalidación documental y bloqueo transaccional.
- `FACT_ANALYSIS` es un valor adicional del contrato de consulta existente. Ofrece hechos persistidos y diferencias calculadas por Spring Boot. Las diferencias requieren obligación vinculada, unidad/moneda/modalidad compatibles y períodos no superpuestos. La cobertura incompleta se declara parcial; no se consolidan comparaciones entre páginas como si fueran completas.
- Los subtotales de movimientos exigen referencias estables, evitan duplicados y rechazan referencias contradictorias. Se identifican expresamente como un subconjunto documental firmado, nunca como pagos registrados ni como todos los movimientos del período.
- El asistente reutiliza evidencia dentro de una solicitud, revalidando acceso y versión antes de reutilizarla y entregarla. El contexto recuperado tiene presupuestos por intención; al agotarse, se mantienen documentos y cobertura y se informa el recorte. La aritmética genérica no puede eludir las comparaciones tipadas usando los números de `FACT_ANALYSIS`.
- Solo cambió el workflow publicado `ceroaHybridQuery20`: prioridad de hechos para preguntas numéricas compatibles, máximo de iteraciones acotado por presupuesto del backend y tres nodos nativos para medición/restauración de respuesta. Un fallo de métricas no bloquea la respuesta ni salta la validación. Las otras once definiciones publicadas, incluido el procesador compartido, se compararon y permanecen iguales.

## Contratos y observabilidad

`AgentContracts.java`, los esquemas `integrations/n8n/contracts/agent-*.schema.json` y `tools.json` preparan Orquestador, Financiero, RAG y Soporte. Incluyen correlación, referencias, errores y presupuestos. `GET /assistant-tools/requests/{id}/agent-context` devuelve contexto ligado a una solicitud vigente. No se crearon todavía los agentes ni se exponen herramientas de escritura. Los permisos siguen siendo responsabilidad del backend; una capacidad declarada no es una credencial.

`CEROA_QUERY_METRICS` registra correlación, ruta, tiempo de recorrido n8n, procesamiento Spring, tiempos de herramientas y recuperación, documentos/fragmentos, contexto serializado, caché y errores, sin preguntas ni contenido privado. El worker puede registrar la duración agregada del agente y acciones de herramientas mediante el endpoint privado `/observe`; los reportes duplicados son idempotentes por ejecución.

**Límite de medición:** `llmCalls`, duración exclusiva del modelo e iteraciones exactas permanecen nulos cuando no existe una traza nativa que los demuestre. El agregado n8n y el mínimo de llamadas observado no se presentan como mediciones exactas del proveedor. No hay aún una distribución de latencia integral con modelos reales. El tiempo de la traza del asistente no incluye los filtros HTTP/autenticación anteriores a su creación.

## Pruebas y rendimiento

- 98 pruebas Java aprobadas, sin omitidas, incluidas Flyway/PostgreSQL/pgvector aislados, autorización, evidencia, versiones, caché, cálculos, recordatorios y centinela. Se volvió a ejecutar el benchmark después de ajustar su referencia a la recuperación por lotes ya implementada en el bloque anterior.
- 23 pruebas Node y ocho validaciones de esquemas con Ajv de la instancia instalada.
- Tres ejecuciones reales de n8n, con la misma imagen y sin red: cola vacía, trabajo documental sintético y consulta con fallo de métricas. Proveedores y persistencia externa se sustituyen por fixtures; no constituyen pruebas productivas de Gemini o conversaciones reales.
- Backend y n8n disponibles después del despliegue; webhook de consultas sin credencial: HTTP 403. No se enviaron mensajes ni se efectuaron operaciones financieras reales.

Benchmark PostgreSQL aislado, 100 muestras y 20 de calentamiento por escenario. Ambas rutas realizan **una lectura por lote**; misma evidencia y extractor. Se mide recuperación, análisis determinista y serialización, excluyendo HTTP, n8n, modelos y primera reconstrucción de hechos:

| Escenario | p50 al consultar / persistido (ms) | p95 al consultar / persistido (ms) | JSON al consultar / persistido (bytes) |
|---|---:|---:|---:|
| Un extracto | 0,479 / 0,298 | 0,737 / 0,529 | 8.110 / 553 |
| Dos períodos | 0,559 / 0,286 | 0,914 / 0,454 | 16.549 / 1.487 |
| Tres extractos | 0,677 / 0,262 | 1,003 / 0,368 | 24.989 / 2.422 |

Estos resultados no son tiempos de Supabase remoto ni garantías de latencia conversacional. Datos completos y registro de pruebas: `docs/benchmarks/document-facts-2026-11-07.json` y `document-facts-verification-2026-11-07.json`.

## Recuperación y pendientes

Respaldos autenticados antes/después: `backups/n8n/refactor-block2-2026-11-07-*.ceroa`; clave local excluida de Git: `backups/n8n/refactor-block2-2026-11-07.key`. La conciliación posterior está en `refactor-block2-2026-11-07-deployment.json`. No ejecutar el generador para sobrescribir workflows activos: `prepare-query-refactor.mjs` aplica únicamente la extensión sobre una exportación publicada.

```powershell
./integrations/n8n/rollback-query-refactor.ps1 -PublishedBackup ./backups/n8n/refactor-block2-2026-11-07-published.ceroa -KeyFile ./backups/n8n/refactor-block2-2026-11-07.key
```

La imagen anterior se conserva como `ceroa-backend:pre-document-facts-20261107`. V25 es aditiva: no borrar la migración ni los hechos al preparar una reversión del backend. Verificar el binario anterior con la versión de esquema vigente en un entorno aislado antes de usarlo para recuperación. No se ejecutó esta reversión contra producción.

Pendientes: ampliar formatos documentales con fixtures reales autorizados, validar conversaciones y métricas completas con modelos reales e implementar después la delegación de agentes usando estos contratos. No se añadieron Gmail, Drive, Sheets, Calendar ni MCP.
