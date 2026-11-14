# CEROA — BLOQUE 11: PREPARACIÓN Y VALIDACIÓN PREVIA AL DESPLIEGUE DE V31

Fecha: 9 de noviembre de 2026, America/Bogota. Código candidato y `origin/main` consultado: `746f840b05854999389694be7866e4312fd87351`.

**Veredicto: PRERREQUISITOS PENDIENTES.** Falta una copia financiera autorizada, íntegra, restaurada y verificada. Por ello se detuvo la fase de V31 sobre copia restaurada. Los ensayos sintéticos de compatibilidad y los resultados B10 no sustituyen esa condición. No se exportaron registros financieros ni objetos Storage, no se migró Supabase y no se desplegó ni reinició ningún servicio operativo.

## 1. Alcance, evidencia y límites

Se inspeccionaron contenedores, imágenes, configuración por presencia, artefactos y contratos; se consultaron metadatos y agregados de PostgreSQL en transacciones `READ ONLY` terminadas con `ROLLBACK`. No se leyeron contenidos de documentos ni filas individuales de clientes/pagos para el informe. Se verificó el respaldo n8n existente en un contenedor efímero sin red, sin arrancar el servidor n8n y sin montar el volumen operativo. Se ensayó compatibilidad de arranque sobre una base **sintética y desechable**, claramente separada de la fase de restauración pendiente.

Evidencias redactadas:

- [Inventario de contenedores, digests y presencia de variables](benchmarks/block11/runtime-inventory.json).
- [Metadatos PostgreSQL, historial Flyway y agregados operativos](benchmarks/block11/postgres-metadata.json).
- [Versiones y comparación de artefactos/configuración](benchmarks/block11/compatibility-inventory.json).
- [Inventario n8n de solo lectura](benchmarks/block11/n8n-runtime.json).
- [Verificación del respaldo n8n](benchmarks/block11/n8n-backup-verification.json).
- [Resumen de comprobaciones y límites](benchmarks/block11/predeployment-results.json).
- [SQL reutilizable de preflight de solo lectura](../integrations/verification/block11-preflight-readonly.sql).

Los informes anteriores conservan su fecha y alcance. La matriz sigue en 54 aprobaciones históricas B7, dos bloqueos y siete casos sin ejecutar; este bloque no es una nueva reválida E2E integral.

## 2. Inventario real del despliegue

| Componente | Estado comprobado | Acción futura |
|---|---|---|
| Git | main y origin/main en 746f840 al consultar; sin cambios funcionales locales iniciales | Fijar ese commit/digests como candidato de la ventana |
| Backend | Spring Boot 3.5.16, Java Temurin 25.0.5, pgJDBC 42.7.11; contenedor running, sin healthcheck Docker configurado | Actualizar a las correcciones B8 solo con V31 disponible |
| Frontend | React 19.2.8, Vite 6.4.3, Node 22.23.3; comando `npm run dev`; HTTP local 200 | No hay diferencia funcional detectada que obligue a sustituirlo por V31; si se publica un artefacto nuevo, coordinar API/origen y conservar el anterior |
| n8n | 2.40.7, healthy, 30 workflows | Mantener imagen, volumen, credenciales, versiones publicadas y conexiones |
| Supabase | PostgreSQL 17.6, base `postgres`, esquema de aplicación `ceroa`; Session Pooler 5432 | Preservar la base; aplicar únicamente V31 tras cumplir las puertas de respaldo/restauración |
| Flyway | 11.7.2 en el JAR; historial real V1–V30 exitoso; V31 pendiente y tabla ausente | Validate y migración coordinada después de ensayo sobre copia restaurada |
| Docker/Compose | Engine 29.9.2, Compose 5.6.1 | No se requiere actualización para este cambio |
| Telegram | Proxy Node y túnel Cloudflare running, imágenes fijadas por digest | Mantener intactos; no generar mensajes de prueba reales |

Digests de imagen observados:

| Componente | Image ID/digest |
|---|---|
| Backend | `sha256:ed6d9ae228bbaf5371f546c9afd6278e303e467caf5e6b4c88197965657ce71b` |
| Frontend | `sha256:a3a5556a7fe159e31b99734dc4e5d8394b1a78d406d1523158c2f7cf232d2f85` |
| n8n | `sha256:ffeb52485f78b1b06c9a832205853cf75da72a07a514c9a27724df85979d6c34` |

El JSON de inventario contiene los digests completos de proxy/túnel, IDs, arranques, montajes y puertos. Backend/frontend no tienen un volumen de datos: la persistencia financiera está en Supabase y la biblioteca usa almacenamiento externo. n8n conserva su volumen SQLite/configuración en `/home/node/.n8n` y monta las definiciones de workflows en solo lectura; modificar Git no publica esas definiciones. Backend y frontend exponen 8080/3000 en interfaces del host; n8n 5678 está limitado a loopback. Es un despliegue local observado, no una certificación de exposición pública con TLS.

Se copiaron los JARs para lectura y comparación, sin sustituir el archivo del contenedor. Las 439 entradas de recursos/clases del backend desplegado coinciden con la copia inspeccionada en B8, asociada entonces al código 337802e. Las migraciones V1–V30 contenidas coinciden con el candidato; solo se añade V31. Los 134 archivos de `frontend/src` coinciden tras retirar CR: las dos diferencias iniciales en fuente/test de Estrategia eran higiene de caracteres, no un cambio de comportamiento.

SHA-256 del JAR operativo leído: `e143cbf8de58b154e7baf377179823de9ab3621302aba8a995b9cd7684d1ee7a`. JAR candidato construido en B10 y reutilizado en el ensayo aislado: `dbc8b235ecc7cb94934c88037729cc903e7dbd66eaf0608f33f7290e3f248b8b`. No son digests de una nueva imagen publicada; no se construyó ni sustituyó una imagen del producto.

### Configuración y disponibilidad

Se comprobaron 56 nombres de variables del contrato Spring por presencia en el contenedor, sin exponer sus valores secretos. DB_URL/usuario/password, esquema, perfil Supabase, claves del asistente/Workspace y almacenamiento están presentes. Las tres opciones Workspace Gmail/Sheets/Calendar son `false`; una URL configurada no habilita un conector. Las variables correctas de Mercado Pago son **MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET**: ambas vacías/no configuradas. No se confunden con nombres MERCADOPAGO_* heredados. SMTP tampoco acredita entrega real.

`SESSION_SECURE_COOKIE=false` corresponde al HTTP local observado; para una publicación HTTPS se debe revisar el origen, proxy, CORS, SameSite y cookies Secure. `VITE_API_URL` se comprueba en el artefacto servido según el modo de build: el contenedor actual usa Vite dev; un futuro build estático incorpora variables al compilar y no debe presumirse que las lee al arrancar. No colocar claves de DB/Storage en VITE_*.

HTTP de lectura observado: frontend `/` 200, backend `/api/v1/auth/me` sin sesión 401 esperado, n8n `/healthz/readiness` 200. No se autenticó una cuenta real ni se consultó `/plus/subscription`: su implementación puede refrescar estado desde el proveedor y persistirlo. Tampoco se invocaron endpoints de claim/ack de colas. Estas comprobaciones acreditan disponibilidad básica, no un recorrido funcional autenticado.

La conexión de inspección exigió `sslmode=require`. `pg_stat_ssl` del backend de PostgreSQL devolvió false detrás del pooler: es una observación del tramo servidor/pooler, no prueba de que el cliente se conectara sin TLS. La identidad del servidor no queda validada solo con `require`; revisar CA/verify-full y política de SSL del proyecto antes de una exposición pública, sin cambiar credenciales durante esta preparación.

## 3. Base financiera: alcance y respaldo

### Objetos identificados

La lectura de catálogo identifica 37 tablas entre `ceroa` y la configuración propia en `public`. El listado íntegro está en la evidencia, sin datos de clientes. Debe preservarse al menos:

- Identidades y sesión Spring: users, financial_profiles, auth_sessions, external_identities, password_recoveries; no confundir `ceroa.users` con Supabase `auth.users`.
- Finanzas: debts, payments, monthly_balance_history y plus_subscriptions, junto con relaciones, índices, tipos, secuencias y restricciones.
- Biblioteca: financial_documents, financial_document_versions, document_chunks, document_financial_facts, document_processing_jobs, document_access_grants, document_source_connectors y rag_query_audit; conservar metadatos, hashes, versiones, embeddings y referencias Storage.
- Configuración adicional: **public.ceroa_rag_configuration**, creada por V21; respaldar solo `ceroa` la dejaría fuera.
- Operación: integration_events, workspace_actions, approved_drive_sources/drive_sync_files, support_bookings, tokens MCP, notificaciones, Telegram, Centinela y recordatorios; el listado de catálogo determina el alcance definitivo.
- **ceroa.flyway_schema_history**, incluido esquema, scripts/checksums y filas exitosas V1–V30. Nunca reconstruir el historial manualmente ni usar repair para aceptar una discrepancia no explicada.

Extensiones reales: vector **0.8.2** en `extensions`, pgcrypto 1.3, uuid-ossp 1.1, pg_stat_statements 1.11, plpgsql 1.0 y supabase_vault 0.3.1. El ensayo sintético disponible usa PostgreSQL 17.11/vector 0.8.7: comparte major de PostgreSQL, pero **no reproduce exactamente estas versiones ni servicios administrados**. La restauración funcional debe fijar versiones compatibles y resolver dependencias administradas; un contenedor pgvector genérico no reproduce Vault/Supabase completo.

Hay nueve tablas del inventario con RLS habilitado; no se observaron políticas explícitas en `ceroa`, ni grants de tabla de ese esquema hacia anon/authenticated/service_role/PUBLIC en la consulta realizada. El rol conectado no es superusuario, pero tiene BYPASSRLS y capacidad de crear DB; la autorización por propietario sigue dependiendo del backend. No interpretar RLS como protección frente a ese rol. El script de preflight también consulta ACL por defecto: revisar su resultado y los permisos del rol migrador antes de que V31 cree una tabla. V31 no incluye una nueva política RLS ni la habilita para subscription_charges; debe permanecer fuera de acceso Data API no autorizado.

Storage registra **un bucket y 21 objetos** al corte. No se descargaron sus contenidos. Las filas de Storage no son los binarios: deben inventariarse versiones/rutas, tamaño, hash y relación con las versiones documentales cuando se autorice el respaldo. [Supabase explica que sus backups de base no incluyen los objetos Storage](https://supabase.com/docs/guides/platform/backups).

### Estado de respaldos financieros

**No se encontró una copia financiera íntegra y restaurable verificada en las ubicaciones locales revisadas.** Se inspeccionaron el directorio privado de respaldos conocido, `backups` y los manifiestos/LEEME de los paquetes de traslado. Esos paquetes guardan proyecto/configuración/n8n y declaran expresamente que no copian los datos Supabase ni Storage remotos. No equivalen a un backup financiero.

No se dispone aquí de evidencia del panel Supabase sobre plan, backups administrados, retención, último backup o PITR; su existencia/recuperabilidad está **sin verificar**, no se declara que no existan. Tampoco se acredita una copia independiente de los 21 binarios Storage. Ningún dump, exportación de datos reales, clonación del proyecto ni restauración financiera se ejecutó en B11.

### Procedimiento preparado — requiere autorización específica antes de ejecutarlo

1. Acordar propietario del respaldo, alcance, ventana, destino privado, cifrado, separación de claves, retención, copia fuera del equipo y RPO/RTO. Confirmar plan/PITR en el panel y si permite recuperar en un destino separado. Nunca usar una restauración sobre el proyecto actual como ensayo.
2. Verificar servidor 17.6, extensiones y rol/permisos necesarios. Usar herramientas PostgreSQL 17 compatibles, fijadas por versión/digest, o la ruta de backup Supabase soportada para ese proyecto. La conexión observada es Session Pooler 5432; puede usarse para la ruta lógica cuando el acceso directo no sea viable. No cambiar a Transaction Pooler. Credenciales mediante servicio/.pgpass privado o gestor de secretos, no en argumentos, consola ni Git.
3. Elegir alcance restaurable completo. Preferir el backup administrado recuperable en destino separado si se puede verificar; para backup lógico independiente, revisar objetos de aplicación y dependencias en una lista explícita. El dump Supabase CLI requiere separar roles/esquema/datos según la guía y no se debe asumir que incluye datos/roles con opciones predeterminadas. Las restauraciones de internals administrados requieren el destino Supabase compatible. [Procedimiento oficial CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
4. Para la ruta PostgreSQL lógica, `pg_dump` en formato custom permite un archivo consistente de una DB y TOC para restauración selectiva. Un archivo completo incluye material administrado/sensible: conservarlo cifrado y revisar su TOC antes de restaurarlo; no importar a ciegas todo el proyecto en PostgreSQL genérico. Si se limita por esquema, incluir explícitamente `ceroa`, su historial, configuración `public.ceroa_rag_configuration` y dependencias/extension definitions mediante un manifiesto revisado. No combinar filtros `-n/-t` sin revisar su semántica ni asumir que incluyen dependencias externas. Guardar roles/permisos necesarios en un manifiesto adicional: pg_dump de una DB no respalda roles globales. [Contrato de pg_dump 17](https://www.postgresql.org/docs/17/app-pgdump.html).
5. Coordinar snapshot y escrituras. pg_dump ofrece consistencia transaccional dentro de su dump, pero roles, varios dumps y los objetos Storage no comparten automáticamente esa instantánea. Si se usan varias exportaciones, mantener snapshot común compatible o una ventana de pausa autorizada de escrituras/jobs documentales; registrar el punto de corte y conciliar cambios posteriores. No pausar servicios ahora. No asumir que un binario sustituido entre dos listados representa una versión respaldada coherente.
6. Cifrar con mecanismo autenticado antes de transferir y guardar hashes del archivo cifrado, manifiesto y fechas; clave en un medio independiente. La herramienta existente backup-crypto.mjs utiliza AES-256-GCM y comprobación de ida/vuelta, pero carga el archivo en memoria: comprobar tamaño y memoria antes de elegirla; para volúmenes grandes, emplear una herramienta de streaming auditada. Evitar temporales legibles; si son imprescindibles, usar volumen cifrado privado, acceso limitado y ciclo de limpieza verificado. No imprimir conexiones ni secretos en logs.
7. Respaldar Storage por separado con autorización: binarios de cada versión referenciada, metadatos, hashes, tamaños y permisos/bucket; cualquier uso del API externo de Storage pertenece a esa exportación autorizada. No confundir consentimiento de inspección con permiso de descargar archivos financieros.
8. Validar autenticidad/descifrado y lectura completa del archivo (`pg_restore --list` solo valida catálogo, no restaurabilidad completa). Restaurar en destino **nuevo**, aislado, sin salida a proveedores y con extensiones compatibles. Antes de restaurar, revisar jobs pg_cron, triggers externos, webhooks, FDW y funciones: no permitir efectos externos al cargar el dump. No iniciar backend/n8n ni workers con credenciales productivas.
9. Verificar restauración sin errores, tablas/columnas/constraints/índices, FK/huérfanos, roles/ACL/default ACL/RLS, extensiones, checksums de migraciones, agregados/hash por tabla y archivos Storage contra el manifiesto del punto de corte. Guardar resultados redactados, tiempos de restore y RPO/RTO observado. Acceso a datos privados limitado al entorno aislado; nunca enviarlos a Gemini ni otros proveedores.
10. Solo después de estas pruebas se habilita la fase siguiente. Mantener intacto y cifrado el backup V30 y una copia de trabajo distinta para ensayar V31; no sobrescribir la única copia verificada.

## 4. Respaldo y recuperación selectiva n8n

Respaldo existente fuera de Git: `%USERPROFILE%\.ceroa-backups\n8n-block8-2026-11-09.ceroa`. Clave externa separada: `%USERPROFILE%\.ceroa-backup-keys\block8-verified-2026-11-09.key`. SHA-256: `b9c24494170a8cc4bdcfbce651c5a09298fe0af4c88bb28d4343920a82b80b9a`.

En B11 se volvió a verificar AES-256-GCM y restauración desde el archivo cifrado, con descifrado en memoria y transferencia directa a un contenedor desechable sin red de la imagen n8n observada. No se escribió el archivo descifrado en el host. SQLite integrity_check correcto; 30 workflows, 15 activos/publicados y 15 inactivos/sin publicar en origen; todas las referencias de credenciales/versiones presentes. Se conservaron aparte las publicaciones y se pusieron en cuarentena los workflows/webhooks de la **copia** antes de usar el CLI. Se descifraron las 22 credenciales dentro de esa copia, sin mostrar valores ni arrancar n8n.

La comparación con el runtime incluye IDs, nodos/conexiones/settings/versiones y referencias entre agentes; además, hashes de las filas cifradas de credenciales, registros webhook y manifest de publicación coinciden. Esto acredita correspondencia estructural/configuración al corte, no identidad de todos los usuarios, ejecuciones o datos internos que puedan cambiar con la operación. El runtime tiene seis webhooks registrados, ningún borrador distinto de publicación y cero referencias a credenciales/subworkflows ausentes. El CLI no prueba vigencia de OAuth/API con proveedores.

Los ocho generales Mail, Sheets, Drive, Calendar, MCP Server, MCP Backend, MCP Client y MCP Support siguen **inactivos y sin publicación**. Permanecen el orquestador y los especialistas Financiero/RAG/Soporte. El perfil portable/runtime B8 sigue siendo necesario; no sobrescribir con plantillas crudas.

Restauración futura selectiva: autenticar backup y fijar 2.40.7/digest; trabajar sin red, guardar manifest original y desactivar todos los workflows/publicaciones/webhooks de la copia **antes** de arrancar; validar IDs/dependencias y exportar exclusivamente un allowlist revisado. No importar ni publicar nada en este bloque. Cualquier importación/publicación posterior necesita autorización específica; excluir siempre los ocho generales salvo permiso adicional. No usar el comando de restauración masiva de un paquete de traslado como recuperación selectiva. Revalidar o renovar backup al abrir la ventana si hashes/configuración cambian. Este backup no cubre PostgreSQL ni los binarios Storage.

## 5. V31 sobre copia restaurada: fase detenida

**Bloqueo concreto:** falta respaldo financiero autorizado e íntegro con restauración aislada verificada. No se aplicó V31 sobre una copia restaurada real; no se declaran preservación de registros reales, permisos restaurados ni compatibilidad completa de extensiones/Storage.

Cuando se autoricen exportación y restauración, ejecutar sobre la copia de trabajo:

1. Confirmar servidor/pgvector y otras dependencias de la copia contra el manifiesto real; aislar red, credenciales y adaptadores externos.
2. Comparar V1–V30, checksums e historial exitoso contra el candidato. Ejecutar Flyway **validate/info** con el mismo artefacto 11.7.2; no migrate sobre el origen ni repair de discrepancias.
3. Registrar conteos/hash de tablas y estados de suscripciones/outbox de la copia antes de migrar; conservar un clon V30 de referencia. Aplicar solo V31 en la copia designada.
4. Comprobar subscription_charges: PK VARCHAR(160), FK subscription_id UUID → plus_subscriptions(id) ON DELETE CASCADE, billing_boundary TIMESTAMPTZ nullable, observed_at TIMESTAMPTZ NOT NULL e índice por subscription_id. Confirmar permisos/default ACL y aislamiento de Data API.
5. Tabla nueva inicialmente vacía: V31 no hace backfill. Comparar datos previos, restricciones/índices y binarios Storage; historial V31 exitoso. Ejecutar validate y segunda migrate, esperando cero migraciones aplicadas.
6. Arrancar candidato con Hibernate validate y adaptadores externos deshabilitados/simulados. Probar persistencia/receipts/outbox y suscripciones con fixtures dedicados en otra copia; no reutilizar un dataset productivo con correos/tokens reales habilitados. Ejecutar los cuatro casos de recibos y los de sesión/CSRF/seguridad relevantes, sin APIs de proveedores reales.
7. Ensayar recuperación de código y de datos como rutas distintas; registrar errores, tiempos y límites. Solo tras obtener esta evidencia puede cambiar el veredicto de este documento.

## 6. Compatibilidad de aplicaciones: evidencia complementaria

Las compilaciones y suites B10 se conservan verificables en [validation-results.json](benchmarks/block10/validation-results.json): Maven package 437 casos, 34 opt-in omitidos, sin fallos/errores; TypeScript/Vite y 190 pruebas frontend aprobadas; 22 contratos n8n; grounding 11; migración aislada 3 y recibos PostgreSQL 4. Las suites se solapan. El código de aplicación no cambió después de esa compilación; se reutilizó el JAR resultante, sin repetir baterías ni generar una imagen nueva.

En B11 se completó un ensayo adicional **sintético**, con PostgreSQL 17.11/vector 0.8.7 en red Docker interna, sin puertos publicados, credenciales inventadas y sin montajes de datos reales:

| Combinación | Resultado y alcance |
|---|---|
| JAR operativo anterior + esquema V30 | Arranque correcto; el JAR crea V1–V30 en la base desechable |
| JAR candidato + V30, Flyway deshabilitado | Arranque rechazado: `Schema-validation: missing table [subscription_charges]` |
| JAR candidato + V30, Flyway habilitado | Migración a V31 y arranque correcto; PK e índice de recibos presentes |
| JAR operativo anterior + esquema V31 | Arranca con advertencia Flyway de esquema más reciente que su última migración V30 |

El candidato requiere **V31 antes de completar su inicialización JPA y antes de recibir tráfico**. No requiere necesariamente una tarea externa anterior al proceso: con configuración actual Flyway la aplica durante el arranque, antes de Hibernate. Para controlar la ventana se recomienda un migrador único explícito o un arranque del candidato sin tráfico, con verificación de Flyway antes de promoverlo. No puede saltarse V31 ni usar ddl-auto=update para crear la tabla fuera del historial.

V31 es aditiva y el arranque del JAR antiguo sobre V31 permite considerar rollback de binario conservando esquema, pero **no acredita seguridad funcional de todas las escrituras**. El JAR anterior no conserva los recibos nuevos al procesar replays y pierde la garantía reforzada B8. Si se revierte el código, el ingreso/consumo de cobros debe seguir pausado hasta conciliar y elegir una versión segura. No borrar recibos ni deshacer V31.

No se detectan cambios incompatibles de endpoints REST del frontend por V31: el cambio es persistencia interna. Sesiones cookie, envío `credentials: include`, token X-XSRF-TOKEN y límites de origen siguen en el cliente; B10 cubre CSRF/aislamiento. Un rollback o cambio de host exige comprobar sesión y origen, no invalidarlos masivamente sin necesidad. No se prueba aquí un login real ni la respuesta de un proveedor real.

## 7. Suscripciones, outbox y conciliación

Al corte real hay **siete eventos PENDING de SHEETS**, cero LEASED/DISPATCHING/AMBIGUOUS/leases vencidos y cero filas en plus_subscriptions. Son agregados de un momento, no garantía de que el estado siga vacío cuando se abra la ventana. No se consumió ni modificó ninguna cola y no se mostraron destinatarios/payloads. No consultar endpoints de polling para “mirar la cola”: claim puede tomar leases y cambiar estados.

Contratos inspeccionados:

- IntegrationEventService mantiene claves de deduplicación, leases e intentos. Al vencer un DISPATCHING no-SHEETS pasa a AMBIGUOUS; no se debe reintentarlo como un envío aún no iniciado. RETRY_BEFORE_DISPATCH solo admite LEASED y RETRY_PROJECTION está acotado a SHEETS/DISPATCHING; los ACK requieren identificador de proveedor. No resetear estados ni attempt counters para “vaciar” el backlog.
- El recibo V31 tiene identidad `MERCADO_PAGO:<paymentId>`, PK global y consulta antes del proveedor y después del bloqueo. Se valida ID/importe/moneda/suscripción del proveedor; la persistencia del recibo y el cambio/outbox ocurren transaccionalmente. La frontera no retrocede y una cancelación confirmada conserva acceso pagado sin reactivar renovación.
- V31 no registra los cobros ocurridos antes de su aplicación. Un replay histórico sin recibo puede volver a consultar el proveedor; las fronteras y outbox ayudan a limitar efectos, pero no permiten declarar todos los replays previos conciliados. Nunca fabricar recibos históricos con una frontera no acreditada ni avanzar nextPaymentAt por comodidad.
- Estas rutas consultan/validan cobros; no son autorización para crear cargos. Una duplicación de evento o notificación debe analizarse separada de un cobro duplicado en el proveedor. Ausencia actual de suscripciones y MP sin configurar no certifica Mercado Pago productivo.

Inmediatamente antes de actualizar: repetir SQL de solo lectura; verificar suscripciones y fronteras, pendientes y AMBIGUOUS/DEAD, leases activos, antigüedad/reintentos y confirmaciones pendientes de workspace_actions/bookings. Registrar IDs/hashes de eventos solo en manifiesto privado autorizado, nunca payloads en el informe. Identificar todos los productores/consumidores reales, incluido webhook Mercado Pago y triggers publicados de agentes/documentos. Conectores generales apagados no significa ausencia de toda automatización activa.

En la ventana autorizada, controlar ingreso de webhooks con retención durable/reintento del proveedor o buffer acordado: no responder éxito y descartar eventos. Esperar fin de transacciones/leases en curso, preservar eventos PENDING y la deduplicación; no importar colas ni restaurar backups sobre el vivo para “sincronizar”. Reabrir consumidores gradualmente tras verificación, sin replay global ni envío de correos históricos. Los siete SHEETS pendientes se conservan; no habilitar ese conector como efecto de desplegar.

## 8. Secuencia de despliegue preparada — no ejecutada

### Antes de la ventana

1. Obtener las autorizaciones de la sección 10. Confirmar responsable, comunicación, duración máxima de indisponibilidad, RPO/RTO y criterios de interrupción; fijar commit/digests de artefactos y conservar el binario anterior.
2. Completar y verificar respaldos financiero y Storage, restauración autorizada y ensayo V31 de la sección 5. Revalidar n8n y conservar clave independiente; repetir inventario y comprobar que main no cambió sin revisión.
3. Validate/info Flyway, extensiones, roles/permisos/default ACL y acceso a Storage. No modificar V1–V30 ni aceptar checksums nuevos sin investigación. Verificar candidato Spring/Java, variables, conexión, TLS y pool; no cambiar credenciales durante el despliegue salvo plan separado.
4. Repetir salud HTTP y agregados de eventos/suscripciones. Acordar control de ingreso/consumo y de ingesta documental antes del punto de respaldo final. No abrir un “staging” conectado a Supabase real para probar escrituras.

### Durante la ventana

5. Con tráfico financiero y consumidores controlados, cerrar escrituras y terminar operaciones en curso según el plan aprobado. Preservar colas, confirmaciones y callbacks; no activar workflows ni conectores. n8n permanece en su imagen, volumen y versiones publicadas; si hay triggers que puedan escribir durante la ventana, controlar su acceso en la frontera aprobada sin publicar cambios.
6. Tomar el respaldo final autorizado y comprobar hash/recuperabilidad conforme al ensayo. Si no existe forma segura de retener eventos o respaldar, detener antes de migrar.
7. Aplicar V31 con un único migrador/artefacto fijado y sin tráfico. Esperar éxito Flyway, versión 31, validate sin pendientes y tabla/PK/FK/índice/ACL correctos. Ante fallo no usar repair automático ni arrancar varias réplicas para intentarlo de nuevo a ciegas.
8. Arrancar candidato backend y comprobar Hibernate/readiness sin tráfico externo. Las rutas de actualización nuevas solo reciben solicitudes cuando las estructuras existen. No mezclar consumidores viejos y nuevos de cobros durante la conmutación.
9. Si se decidió renovar frontend, servir el artefacto validado con API/origen correctos, coordinado con backend; conservar el anterior. El cambio V31 no obliga por sí solo a reconstruir n8n ni a cambiar React. No convertir el servidor Vite dev actual en un despliegue público sin un plan de hosting/HTTPS revisado.

### Después de conmutar

10. Verificar HTTP, autenticación/logout/sesión y CSRF positivo/negativo con cuentas y escrituras explícitamente autorizadas; cinco secciones Inicio, Deudas, Estrategia de Pago, Simular y Perfil. Lecturas de saldos/estado no deben mostrar datos ajenos ni cambios inesperados.
11. Probar rutas deterministas, especialistas Financiero/RAG/Soporte y consulta compuesta con evidencia; RAG debe respetar documento/versión/propietario. Consultas que contacten Gemini u otro proveedor con datos reales requieren autorización de ese ámbito; usar fixtures sintéticos autorizados para la validación del proveedor.
12. Simulación no persistente y comprobación de no mutación; persistencia de suscripciones/recibos/outbox mediante fixtures en preproducción. Las escrituras sobre el entorno real se ejecutan solo en el alcance autorizado, nunca como smoke implícito. Repetir checks de carga Plan Cero, tarjetas documentales, 404, mora y consola React. No presentar los 54 históricos como estos tests nuevos.
13. Abrir tráfico/ingreso gradualmente, verificar fronteras y ausencia de duplicados; tratar AMBIGUOUS por conciliación con evidencia del proveedor, sin reenvío ciego. Observar errores de DB/Flyway, tiempos, leases y deduplicación. Mantener los ocho conectores generales apagados y sin publicación.

### Criterios de interrupción y recuperación

Interrumpir si falla respaldo/restore/validate, hay checksum inesperado, extensión/permiso faltante, pérdida de registros, errores de arranque/HTTP/auth/CSRF, acceso cruzado de owner, retroceso de frontera, duplicados o estado ambiguo que no pueda conciliarse. Antes de V31, conservar servicio anterior si es seguro y el control de eventos lo permite. Después de V31, mantener esquema y recibos y preferir corrección hacia delante.

**Rollback de código:** volver al digest anterior únicamente si se validó esa combinación; el ensayo de arranque no autoriza reabrir procesamiento de cobros con lógica anterior. Mantener consumidores pausados hasta confirmar idempotencia/conciliación; registrar el momento y los eventos afectados. Frontend anterior puede recuperarse separado si API y sesión siguen compatibles.

**Recuperación de datos:** no aplicar un downgrade SQL de V31 ni borrar subscription_charges después de escrituras. Restaurar/PITR en una instancia nueva desde el punto seguro, comparar deltas desde ese punto, pagos/suscripciones/archivos y outbox; conmutar solo tras aprobación. Una restauración antigua puede perder recibos nuevos y reabrir duplicados históricos. No restaurar sobre la única base sin evidencia y autorización adicional.

**Conciliación externa:** DB y código no revierten correos, reservas o pagos que el proveedor ya aceptó. Conservar ACK/IDs/recibos y resolver el estado con fuentes autorizadas; no resetear AMBIGUOUS a PENDING en masa. Recuperar n8n solo si está afectado, con el procedimiento selectivo sin red y allowlist, nunca mediante importación/publicación general.

## 9. Prerrequisitos comprobados y pendientes

| Prerrequisito | Estado exacto |
|---|---|
| Código integrado y fuente fijada | CUMPLIDO al corte: main/origin/main 746f840 |
| Inventario de imágenes, persistencia y variables | CUMPLIDO por lectura; secretos no publicados, sin validar vigencia de proveedores |
| PostgreSQL/Flyway actuales | CUMPLIDO: 17.6, esquema ceroa, historial V30 exitoso, V31 ausente |
| Compilación y contratos | CUMPLIDO por B10 verificable y código sin cambios; ensayo adicional de arranque sintético B11 completado |
| Backup n8n/clave separados y recuperación | CUMPLIDO: autenticado, congruente con runtime, restauración offline y 22 credenciales; revalidar al abrir ventana |
| Backup financiero existente íntegro/restaurable | PENDIENTE: no acreditado localmente; backups/PITR del panel sin verificar |
| Backup independiente de Storage | PENDIENTE: un bucket/21 objetos identificados; binarios no exportados ni validados |
| Exportación y restauración financiera autorizadas | PENDIENTE de autorización específica; no ejecutadas |
| V31 sobre copia financiera restaurada | BLOQUEADO por las tres condiciones anteriores; sintético no la reemplaza |
| Recuperación financiera, preservación de datos y RPO/RTO | PENDIENTE de ensayo y acuerdo |
| Ventana y control de eventos/callbacks | Procedimiento preparado; autorización, mecanismo de retención y ensayo pendientes |
| Publicación/hosting futuro y artefactos | Pendiente fijar imágenes candidatas/rollback y alcance de frontend; no se generaron imágenes nuevas aquí |
| Proveedores reales | No acreditados por B11; MP no configurado y conectores apagados. Su validación no forma parte automática de desplegar V31 |
| Disponibilidad HTTP y estado operativo sin cambios | CUMPLIDO para lecturas básicas; no equivale a E2E autenticado completo |

## 10. Autorizaciones pendientes y veredicto

Se necesita autorización específica para **(a)** obtener/descargar o generar un respaldo financiero real y sus binarios Storage, con destino cifrado y alcance definidos; **(b)** restaurarlos en un destino nuevo aislado y ejecutar allí V31/pruebas sin salida externa; y, solo tras aprobar la evidencia, **(c)** abrir ventana de despliegue, controlar ingreso/consumo de eventos, aplicar V31 en Supabase y sustituir los componentes expresamente incluidos. Cualquier prueba real de pagos, correos, reservas, publicación n8n o activación de conectores requiere un alcance adicional y sigue excluida.

**PRERREQUISITOS PENDIENTES.** La preparación técnica, inventario, respaldo n8n y pruebas complementarias están completos dentro del alcance. La ausencia de una copia financiera restaurada y verificada impide declarar APTO PARA DESPLEGAR. La siguiente acción que requiere autorización es el respaldo/restauración aislada del conjunto financiero y Storage; no el despliegue directo.
