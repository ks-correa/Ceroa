# CEROA — BLOQUE 12: Respaldo, recuperación aislada y validación V31

Actualización final de la continuación 12C: **9 de noviembre de 2026, America/Bogota**. Fuente de código: `746f840b05854999389694be7866e4312fd87351`.

## A. Resumen ejecutivo

**APTO PARA SOLICITAR DESPLIEGUE**, dentro del alcance de respaldo manual, recuperación PostgreSQL de Ceroa y ensayo V31. **No constituye autorización para desplegar.** V31 permanece ausente en Supabase operativo; no se sustituyeron imágenes ni se reiniciaron servicios operativos.

Se resolvió el bloqueo de almacenamiento con cryptsetup autorizado, LUKS2 local y contenedores con swap deshabilitado por cgroup. Se obtuvo un dump completo PostgreSQL y una exportación de roles sin contraseñas; se respaldaron los 21 binarios Storage. El archivo financiero cifrado pasó autenticación, rechazo de alteración/clave incorrecta y restauración aislada. Las 37 tablas de aplicación coinciden por conteos y SHA-256 con el snapshot de origen. V31 se aplicó únicamente a copias locales; se verificaron Hibernate, recibos/idempotencia y recuperación posterior con fixtures independientes.

Supabase Free y la ausencia de backups administrados/PITR son hechos confirmados personalmente por el usuario en 12C. No se requirió Pro, token de administración ni otro proyecto. El destino definitivo sigue siendo la misma DB actual. Las diferencias de servicios administrados, rol local y versiones se delimitan abajo; no se certifica recuperación integral de Supabase ni recuperación ante pérdida física de este equipo.

## B. Respaldo financiero

### Método, cobertura y herramientas

- PostgreSQL origen **17.6**, base postgres, Session Pooler 5432; lectura con PGOPTIONS default_transaction_read_only=on, transacciones READ ONLY terminadas en ROLLBACK.
- pg_dump/pg_restore **17.11**, imagen local pgvector/pgvector:pg17; sin descargar ni sustituir imágenes operativas. Se copiaron imágenes ya presentes al Docker de Ubuntu/WSL, que es distinto de Docker Desktop operativo.
- **pg_dump --format=custom de la base completa, sin filtros de esquema**, más `pg_dumpall --roles-only --no-role-passwords`. El éxito del dump no equivale a que todos los servicios administrados sean reproducibles localmente.
- Dump definitivo, inventario privado y fingerprints por tabla tomados con un mismo **pg_export_snapshot** mantenido abierto en solo lectura; pg_dump usa --snapshot y las consultas SET TRANSACTION SNAPSHOT.
- Cobertura de aplicación: 36 tablas de ceroa y **public.ceroa_rag_configuration**, usuarios/sesiones, finanzas, pagos, suscripciones, documentos/versiones, fragmentos/embeddings, configuraciones/tokens, automatizaciones, outbox e historial Flyway. Funciones/índices/constraints/ACL de la aplicación incluidos en el archivo; roles y membresías sin contraseñas en el complemento.
- Roles globales exportados después del snapshot de DB: no comparten su instantánea. No se observó ni se ejecutó cambio de roles; esta limitación permanece explícita.

**Punto recuperable PostgreSQL:** `2026-11-09T22:00:52.23627+00:00`, equivalente a **17:00:52 America/Bogota**. La operación siguió escribiendo posteriormente; el respaldo no protege automáticamente esas escrituras posteriores.

La primera exportación se comparó con una lectura posterior y detectó un cambio operativo en sentinel_states. Se descartó como prueba de igualdad al corte y se produjo el dump definitivo con snapshot compartido. No se pausó Centinela ni se alteró el registro original.

### Cifrado, ubicaciones y claves

Directorio privado **en Ubuntu/WSL, fuera de Git**:

`/home/kevin/.local/share/ceroa-backups`

Claves independientes en `/root/.ceroa-recovery-keys`, directorio 0700. Clave financiera: `block12c-financial.key`; clave del volumen: `block12c-recovery.key`. No se publicaron sus valores. Archivos cifrados y claves conservados con modo 0400; directorio de respaldo 0700. Separación lógica en el mismo equipo, **no custodia independiente en otro dispositivo**.

| Archivo cifrado | Bytes | Uso |
|---|---:|---|
| block12c-financial-storage.ceroa | 2.252.860 | Snapshot V30, inventario, hashes y 21 binarios |
| block12c-recovery-metadata.ceroa | 358.460 | Roles sin passwords, catálogos, resultados y SQL de verificación |
| block12c-post-v31-fixture.ceroa | 224.800 | Ensayo posterior V31 con dos recibos ficticios; no es un backup productivo V31 |

Se requieren los dos primeros archivos y la clave financiera para la recuperación V30 preparada. El archivo original financiero se conservó intacto. SHA-256 principal:

`a6ae87db40d37e7721c0e445774888fa53c30e72d367c22803afce7bcdd20762`

[Manifiesto con hashes de los tres archivos](benchmarks/block12c/backup-manifest.json). Cifrado **AES-256-GCM**, cabecera autenticada y derivación PBKDF2-SHA256 del cifrador existente. Se verificó ida/vuelta completa, rechazo de alteración del archivo real y rechazo de otra clave, sin crear salida descifrada en esos fallos: [evidencia criptográfica](benchmarks/block12c/crypto-results.json). El tamaño permitió usar el cifrador en memoria; no se extrapola su aptitud a backups grandes.

### Protección del trabajo local

Con autorización explícita se instalaron cryptsetup y cryptsetup-bin **2.7.0**, desde Ubuntu oficial; no se cambió BitLocker ni el swap global. Volumen LUKS2 AES-XTS de 1 GiB en `/home/kevin/.local/share/ceroa-recovery/block12c-recovery.luks`; permisos 0600 durante preparación. Clave separada; prueba sintética de cierre/apertura, rechazo de clave incorrecta y hash coincidente.

Se verificó el montaje dentro del contenedor mediante el fixture y df: `/dev/mapper/ceroa12c_private`. Las primeras pruebas detectaron una ruta subyacente sin cifrar y la rechazaron **antes de escribir datos reales**; se corrigió el namespace de montaje del Docker local. No se asumió que un bind hacia una carpeta nominal garantizara cifrado.

El swap compartido WSL sigue activo. Para los contenedores que manipularon datos se fijaron --memory y --memory-swap al mismo límite y se comprobó **memory.swap.max=0** en cgroup v2. Datos/WAL/logs/temporales de trabajo residieron en LUKS; no se usó tmpfs como sustituto de cifrado. No se deshabilitó swap del host ni se reinició Docker/WSL operativo. LUKS protege almacenamiento en reposo; la autenticidad del respaldo la aporta GCM.

## C. Supabase Storage

**21 objetos descargados, 1.398.483 bytes en total**, usando GET autenticado de la API oficial con la credencial existente del backend. No se crearon credenciales ni se modificaron buckets/objetos. Rutas, IDs, versiones observadas, metadatos, tamaños, ETag y SHA-256 quedaron exclusivamente en manifiestos privados cifrados.

Las 19 referencias actuales y dos archivadas tienen metadatos y binarios correspondientes. Los **21 SHA-256 de los binarios coinciden con content_hash** de las referencias del snapshot PostgreSQL. Se verificaron nuevamente desde disco cifrado. Inventarios Storage anterior/posterior: IDs/rutas/versiones/fechas/metadatos estables. [Resultado agregado](benchmarks/block12c/restoration-results.json).

**No hay snapshot transaccional único DB/Storage.** La suficiencia para estas 21 referencias se demuestra por sus hashes de contenido contra el snapshot y por la estabilidad de los inventarios; dos listados iguales por sí solos no prueban ausencia de cambios intermedios. No se afirma recuperar objetos históricos sobrescritos/borrados que ya no estén disponibles. Las versiones documentales son rutas de aplicación; [Supabase S3 no proporciona versionado histórico de buckets](https://supabase.com/docs/guides/storage/s3/compatibility).

Se restauraron y verificaron los binarios como archivos locales; no se desplegó un servicio Storage local ni se probó reimportación a Supabase real. [API oficial de descarga](https://supabase.com/docs/guides/storage/management/download-objects).

## D. Restauración local

Servidor desechable `ceroa12c-restored-local`, en Docker Ubuntu, **network none**, sin puertos publicados, sin .env productivo y sin backend/n8n/workers. JDK/cliente de pruebas compartieron únicamente su namespace sin salida, para JDBC por loopback. Las pruebas de cobros usaron respuestas HTTP en memoria y un token ficticio. Los datos restaurados pueden contener tokens internos, pero no se arrancó ningún consumidor de esos datos.

Destino: PostgreSQL **17.11**, vector **0.8.7**. Se precrearon esquemas ceroa/extensions, extensiones vector/pgcrypto/uuid-ossp y roles locales NOLOGIN. Se restauraron los objetos de aplicación seleccionando ceroa y public desde el archivo completo; las ejecuciones definitivas finalizaron sin errores. Los primeros intentos incompletos sirvieron para identificar dependencias; no se presentan como restauraciones exitosas.

Resultados:

- **37/37 tablas:** conteos y fingerprint SHA-256 de todas las filas, calculados desde el mismo snapshot que el dump, coinciden con la referencia restaurada.
- RAG configuration, datos documentales, fragmentos/embeddings y todos los eventos incluidos en esa comparación.
- Columnas, índices, restricciones, secuencias, funciones, RLS, políticas y ACL/propietarios de tablas coinciden con catálogo de origen: [comparación](benchmarks/block12c/catalog-results.json).
- El deparser 17.11 representa algunos casts de ARRAY varchar→text de forma distinta a 17.6. La comparación normaliza **exclusivamente esa transformación** antes de comparar índices/checks; no se ignoraron diferencias arbitrarias. Los catálogos originales y restaurados están en el complemento cifrado.
- Roles locales NOLOGIN sin replicar todos los atributos/membresías administrados; SQL global original preservado sin contraseñas. No se afirma equivalencia de autenticación de roles ni de privilegios superusuario del migrador local.

**Diferencias con Supabase:** no se restauraron los servicios Auth, PostgREST, Storage API, Vault ni automatizaciones administradas. El dump completo conserva sus objetos exportables, pero la prueba se limita a los objetos PostgreSQL compatibles de Ceroa. Vault 0.3.1 y otras dependencias administradas deben recuperarse mediante procedimiento compatible si realmente resultan afectadas; no se ensayó su servicio. Se verificó compatibilidad funcional de los datos vectoriales, no igualdad de versiones de pgvector.

## E. V31, Flyway y persistencia

Se conservó `reference_v30`; V31 se ejecutó sobre `migration_v31_verified`. Se reutilizó **sin recompilar Spring Boot** el JAR B10/B8 con SHA-256:

`dbc8b235ecc7cb94934c88037729cc903e7dbd66eaf0608f33f7290e3f248b8b`

El JAR ordinario encontrado en backend/target era distinto y no contenía el bloqueo de entidad esperado. Se reemplazó **solo la copia de ensayo** por el artefacto B10 identificado en B11 y se repitieron las verificaciones definitivas. Ninguna imagen/binario operativo fue sustituido. Las 31 migraciones del artefacto coinciden con el código fijado, normalizando CR de Windows.

[Resultados V31](benchmarks/block12c/v31-results.json):

1. Flyway info en V30 y una pendiente, V31.
2. Validate previo permite explícitamente `*:pending` para esa migración aún no aplicada; no ignora checksums ni usa repair.
3. Migrate ejecuta exactamente una migración; versión 31.
4. Validate posterior y segunda ejecución con cero migraciones aplicadas. Otra validación estricta, sin patrón de pendientes, pasa en el ensayo de recibos.
5. subscription_charges con PK VARCHAR(160), FK hacia plus_subscriptions, índice y tipos temporales compatibles; cero recibos históricos generados.
6. Hibernate valida las **27 entidades** con ddl-auto=validate. No se arrancó el servidor Spring ni sus schedulers sobre los registros restaurados; se validaron Hibernate, repositorios Spring Data y clases de servicio del JAR real mediante harness aislado.
7. Las 36 tablas anteriores excluyendo el historial Flyway conservaron sus conteos/hashes. La tabla nueva quedó vacía tras deshacer los fixtures.

[Pruebas de recibos](benchmarks/block12c/receipt-results.json), con usuario/suscripción/pagos ficticios y rollback de su transacción:

- Recibos persistidos y frontera temporal correcta.
- Replay de un cobro anterior evita una nueva consulta al proveedor.
- Una activación y dos renovaciones sin duplicar eventos.
- Snapshot fuera de orden no retrocede la frontera.
- Cobro rechazado no crea recibo.
- Cancelación conserva acceso pagado y no reactiva renovación.
- PK rechaza duplicado y FK rechaza recibo huérfano: [evidencia adicional](benchmarks/block12c/access-constraint-results.json).

No se probó un pago real, webhook público, alta disponibilidad o concurrencia distribuida nueva. No se repitió toda la batería del proyecto.

## F. Eventos, suscripciones y acceso

Observación final del origen: siete SHEETS/PENDING, cero suscripciones y V31 ausente; [preflight final](benchmarks/block12c/preflight-results.json). No se llamaron claim/ack/dispatch ni endpoints que refresquen estado financiero real.

Los hashes de filas completas del outbox original coinciden antes/después de V31: preservan IDs, deduplicación, payloads y leases del punto de respaldo sin publicarlos. Las pruebas solo produjeron eventos de fixtures dentro de una transacción revertida o una DB adicional de recuperación con identidades ficticias. Nunca se enviaron los eventos restaurados.

RLS/ACL de tablas existentes coinciden. En la tabla nueva no hay grants a PUBLIC/anon/authenticated/service_role; SET ROLE de los tres roles API rechaza SELECT con **42501**. RLS no está habilitado por V31 y no se presenta como protección entre propietarios frente al rol privilegiado del backend. El aislamiento de propietarios sigue siendo responsabilidad del backend; no se repitió un E2E HTTP de dos cuentas reales ni se declara probado por estos tests SQL. Esto debe revisarse en la ventana de validación de aplicación autorizada, con cuentas ficticias.

## G. Ensayos de recuperación y límites

[Resultados y tiempos observados](benchmarks/block12c/recovery-results.json).

| Escenario | Ensayo ejecutado | Tiempo de pg_restore |
|---|---|---:|
| Referencia V30 | Dump del snapshot a reference_v30, 37 tablas iguales | 0,469 s |
| A: fallo antes de V31 | Descifrar/autenticar paquete, extraer en LUKS, restaurar DB nueva; 37 hashes iguales | 0,546 s |
| B: fallo después de V31 | Copia separada con fixtures confirmados, backup cifrado nuevo, descifrado y restauración a otra DB; 38 hashes iguales, incluidos dos recibos ficticios y sus eventos | 0,492 s |

Estos tiempos miden **solo pg_restore**, no aprovisionamiento, descarga Storage, descifrado ni recuperación del servicio. No equivalen al RTO total. El punto recuperable financiero es 17:00:52; no se asigna un RPO garantizado futuro al plan Free.

No hubo downgrade, borrado de subscription_charges ni restauración sobre la base operativa. Recuperar código no revierte datos o efectos externos. El ensayo B conserva recibos/eventos de la copia; no representa conciliación de pagos/comunicaciones aceptados por proveedores reales. Ante fallo posterior a un despliegue, conservar esquema/recibos y preferir corrección hacia delante; una recuperación desde un punto anterior requiere conciliar deltas externos antes de reabrir consumidores.

## H. Seguridad y limpieza

Autenticación real del respaldo verificada; clave incorrecta y corrupción rechazadas sin archivo descifrado de salida. No se enviaron datos a Gemini u otros modelos, ni a servicios externos distintos del origen Supabase autorizado. Git contiene únicamente herramientas, metadatos agregados y hashes de archivos cifrados; no dumps, documentos, rutas documentales ni claves.

Finalizado el ensayo, se detuvo y eliminó **solo el servidor local desechable**. Se verificaron las rutas antes de eliminar los directorios privados de datos, logs, temporales, credenciales y copias descifradas. Se desmontó LUKS en todos los namespaces que conservaban ese montaje, se cerró el mapper y se desacoplaron los loops. Se conserva el volumen cifrado vacío para reutilización. [Limpieza comprobada](benchmarks/block12c/cleanup-results.json). La eliminación es lógica; no se declara borrado forense de sectores.

Backups y claves permanecen en el mismo equipo: no protegen frente a pérdida física simultánea. No se realizó copia fuera del equipo por no haber destino externo autorizado. La retención y custodia independiente deben acordarse antes de depender de este procedimiento como estrategia completa de desastre.

## I. Despliegue existente y procedimiento para la misma base

Backend, frontend, n8n y proxy/túnel conservaron IDs, imágenes, StartedAt y contador de reinicios entre inspecciones. Supabase solo recibió lecturas/exportaciones. No se publicaron workflows, activaron conectores ni procesaron los siete Sheets. Otros clientes continuaron su operación habitual; la igualdad de todos los datos vivos durante ese intervalo no se afirma.

**Secuencia preparada, no ejecutada:**

1. Fijar el commit/JAR correcto y las imágenes candidatas; comprobar lectura de DB, V30/checksums, roles/default ACL, extensiones, suscripciones y eventos.
2. Solicitar autorización separada de ventana/despliegue. Definir control de escritores, ingesta, webhooks y consumidores con retención durable de callbacks; no descartar eventos ni reiniciar estados de leases en masa.
3. Obtener un respaldo manual actualizado al punto que se desea proteger, con la misma protección de almacenamiento y criterio DB/Storage. El backup de hoy no cubre escrituras posteriores a su snapshot. Verificar autenticidad y recuperación antes de aplicar cambios.
4. Ejecutar un único migrador V31 sobre la **misma base Supabase existente**, únicamente tras autorización. Verificar versión 31, validate, ausencia de pendientes, tabla/PK/FK/índice/default ACL y acceso Data API.
5. Actualizar backend al artefacto validado y verificar Hibernate/readiness. Confirmar compatibilidad frontend, cookies/orígenes y acceso por propietario con cuentas ficticias autorizadas. No reconstruir arquitectura ni sustituir n8n.
6. Validar finanzas, recibos e interfaces multiagente sin comunicaciones/pagos reales ni datos financieros enviados a IA. Cualquier prueba de proveedor real necesita alcance separado.
7. Reanudar gradualmente la operación autorizada; mantener los ocho conectores generales apagados y los siete Sheets sin reproceso. Observar fronteras, duplicados, errores y estados ambiguos.
8. Si falla después de V31, conservar tabla/recibos. Recuperación de binario, datos, servicios y conciliación externa son decisiones distintas; no restaurar a ciegas encima de la base operativa ni ejecutar downgrade destructivo.

## J. Matriz y veredicto

| Criterio | Estado | Evidencia/límite |
|---|---|---|
| Herramienta manual compatible y acceso | VERIFICADO | pg_dump/pg_restore 17.11; dump real exitoso |
| Dump financiero y configuración public | VERIFICADO | Archivo completo; 37 tablas de aplicación recuperadas |
| Roles/permisos de respaldo | VERIFICADO | Roles sin passwords y catálogos cifrados; ACL/RLS de tablas comparados |
| Cifrado de trabajo y archivo, clave separada | VERIFICADO | LUKS2, cgroup swap.max=0, GCM, permisos y rechazo de clave/alteración |
| Storage físico e integridad documental | VERIFICADO | 21 binarios y 21 hashes de referencia coincidentes |
| Consistencia DB/Storage para referencias respaldadas | VERIFICADO | Hashes contra snapshot y metadatos estables; sin snapshot transaccional conjunto |
| Restauración PostgreSQL de aplicación | VERIFICADO | 37 conteos/hashes, catálogo y restauración autenticada |
| Historial Flyway restaurado | VERIFICADO | V1–V30 y checksums validados |
| V31 y Hibernate sobre copia | VERIFICADO | Migración única, validate y segunda ejecución; 27 entidades |
| Recibos, replay, fronteras y cancelación | VERIFICADO | Fixtures aislados, sin proveedores reales |
| Eventos originales preservados | VERIFICADO | Hash de filas del outbox intacto, siete pendientes |
| Recuperación A/B de datos | VERIFICADO | V30 y V31+recibos ficticios, hashes iguales |
| Acceso Data API a tabla nueva | VERIFICADO | Grants ausentes y tres roles rechazados con 42501 |
| Equivalencia completa Supabase/local | PARCIALMENTE VERIFICADO | Objetos de aplicación compatibles; servicios/roles administrados sin réplica integral |
| Aislamiento por propietario mediante HTTP | PENDIENTE | No hay nuevo E2E de dos cuentas; revisar en ventana autorizada |
| RTO integral y recuperación física del equipo | PENDIENTE | Solo pg_restore medido; respaldos/claves en el mismo host |
| Despliegue y control temporal de escritores | PENDIENTE | Requiere autorización separada y backup actualizado |
| Ausencia de cambios operativos por esta sesión | VERIFICADO | Solo lecturas/exportaciones del origen; V31 sigue ausente |

**APTO PARA SOLICITAR DESPLIEGUE.** Se demuestra recuperabilidad manual de los datos PostgreSQL de Ceroa, sus binarios relacionados y V31 sobre copia. La solicitud futura debe incluir la ventana, control de eventos, artefacto correcto, respaldo actualizado, comprobaciones de acceso entre cuentas y límites de recuperación aquí descritos. **No se ha autorizado ni ejecutado el despliegue.**

Herramientas de verificación revisables: [snapshot de lectura](../integrations/verification/block12c-snapshot-backup.cjs), [fingerprints](../integrations/verification/block12c-table-fingerprints.sql), [catálogo](../integrations/verification/block12c-catalog-fingerprint.sql), [Storage](../integrations/verification/block12c-storage-backup.mjs), [autenticación](../integrations/verification/block12c-verify-authentication.mjs), [Flyway/Hibernate](../integrations/verification/Block12RecoveryCheck.java), [recibos ficticios](../integrations/verification/Block12ReceiptCheck.java). Los harness requieren el destino local preparado, nunca una URL productiva.
