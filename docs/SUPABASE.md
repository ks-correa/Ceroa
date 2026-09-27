# PostgreSQL administrado en Supabase para Ceroa

## Resultado y alcance

React + TypeScript → API Spring Boot → JPA/Hibernate y JDBC → PostgreSQL Supabase.
La autenticación, cookies, CSRF, validaciones, transacciones, repositories y services
siguen perteneciendo a Spring Boot. No se requiere Supabase Auth, SDK, URL de Data API,
publishable/anon key ni service_role key. Nunca poner credenciales de base en variables `VITE_*`.

La conexión real a Supabase fue comprobada el 26 de septiembre de 2026 con las
credenciales privadas de `.env`. El backend utiliza Session Pooler y el esquema
`ceroa`; PostgreSQL local quedó detenido, conservando su volumen.

## Análisis del repositorio y decisiones

| Área | Estado anterior | Cambio necesario |
|---|---|---|
| `application.yml` | JDBC con defaults localhost/ceroa/ceroa_dev; import de `.env` relativo a backend | Credenciales obligatorias, sin fallback local; import configurable con `CEROA_ENV_FILE` |
| `.env.example` | PostgreSQL local y credenciales de desarrollo | Perfil `supabase`, campos JDBC vacíos y pool de 5 conexiones |
| Compose | Backend esperaba healthcheck de postgres y sobreescribía JDBC con host `postgres` | Compose principal solo backend/frontend; copia local independiente en `docker-compose.local.yml` |
| Dependencias | Spring Boot 3.5, Java 21, driver pgJDBC, Flyway core + PostgreSQL | Ninguna dependencia adicional |
| Flyway | V1–V14, SQL sin esquema explícito | Scripts intactos; esquema e historial aislados en `ceroa`; validate habilitado, baseline automático y clean deshabilitados |
| Entidades | 10 tablas, UUID generados en Java, NUMERIC, TIMESTAMPTZ, JSONB, enums como texto, version de deuda | Sin cambios de mapeo; Hibernate sigue en `ddl-auto=validate`, con esquema predeterminado `ceroa` |
| SQL JDBC | `MonthlyHistoryService` consulta tablas sin calificar | `currentSchema=ceroa` también dirige JDBC al esquema correcto |
| Frontend | Servicios REST con cookies/CSRF hacia `VITE_API_URL` | Se conserva el cliente; la URL sigue apuntando al backend |
| Pruebas | H2 con Flyway deshabilitado; perfil postgres-test separado | Prueba PostgreSQL optativa usando configuración principal y perfil Supabase |

Las migraciones crean users, financial_profiles, debts, payments, auth_sessions,
external_identities, password_recoveries, notifications, plus_subscriptions y
monthly_balance_history, además de sus índices y restricciones. No requieren
superusuario, extensiones ni pgvector. El usuario JDBC necesita permisos DDL para
crear el esquema y aplicar migraciones y permisos DML para operar la aplicación.

El esquema dedicado evita colisiones con `auth.users`, objetos de `public` y otros
esquemas administrados. No cambiar `DB_SCHEMA` después del primer arranque: Flyway
interpretaría otro esquema como una instalación nueva. Para datos locales existentes,
seguir el apartado de transferencia; seleccionar un esquema nuevo no mueve datos.

## Lo que debes obtener en Supabase

En el proyecto, abrir **Connect**, elegir **Direct connection** o **Session pooler**
y copiar los parámetros exactos:

- Host completo, puerto y nombre de base (habitualmente `postgres`).
- Usuario exacto: Direct suele usar `postgres`; Session suele usar `postgres.<project-ref>`.
- Contraseña de la base de datos, no contraseña de cuenta Supabase ni API key.
- Modo elegido y disponibilidad de IPv6/IPv4 desde la máquina que ejecuta backend.
- Requisitos SSL y certificado CA si se utilizará `verify-full`.
- Restricciones de red/IP del proyecto y límite de conexiones disponible.

No deducir host del pooler a partir de la región. Direct es preferible para backend
persistente y migraciones si la red lo permite. Session Pooler es la alternativa
para IPv4; comprobar Flyway también con ese endpoint antes de producción.
Este perfil no está preparado para Transaction Pooler (habitualmente puerto 6543):
Flyway y el SQL JDBC necesitan estado de sesión y Hibernate usa prepared statements.
[Conexiones oficiales](https://supabase.com/docs/guides/database/connecting-to-postgres).

En `.env` privado (ignorado por Git), o en el gestor de secretos del despliegue:

```dotenv
SPRING_PROFILES_ACTIVE=supabase
DB_URL=jdbc:postgresql://<HOST_DE_CONNECT>:<PUERTO>/<BASE>?sslmode=require
DB_USERNAME=<USUARIO_DE_CONNECT>
DB_PASSWORD=<CONTRASENA_DE_BASE>
DB_SCHEMA=ceroa
DB_POOL_MAX_SIZE=5
DB_POOL_MIN_IDLE=1
```

Los valores entre `<...>` son marcadores, no endpoints reales. La contraseña se pasa
separada de la URL, sin percent-encoding. Spring importa `.env` como Java properties:
no usar comillas de shell y escapar barras invertidas como `\\`. Para contraseñas con
caracteres que difieran entre parsers dotenv/properties, preferir variables del proceso
o un gestor de secretos. Revisar también que `$` no se interpole inesperadamente en Compose.
El `.env` existente no se modifica ni se sobrescribe automáticamente.

`sslmode=require` exige cifrado, pero no valida la identidad del servidor. Para
validación del certificado, descargar la CA de Database Settings y usar
`?sslmode=verify-full&sslrootcert=<RUTA_ABSOLUTA_CA>` en `DB_URL`; pgJDBC da prioridad
a los parámetros de la URL sobre las propiedades del perfil. En Docker montar la CA
de solo lectura y usar la ruta dentro del contenedor. No usar `sslmode=disable` en nube.
[SSL pgJDBC](https://jdbc.postgresql.org/documentation/ssl/).

No incluir `currentSchema` diferente en la URL: también tendría prioridad y podría
desviar las consultas JDBC respecto de Hibernate/Flyway. Utilizar `DB_SCHEMA` como
única configuración del esquema.

## Configuración manual y privacidad

1. Crear/seleccionar el proyecto y guardar la contraseña en un medio privado.
2. Mantener `ceroa` fuera de los esquemas expuestos de Data API. Si no se necesita
   Data API, deshabilitarla en el proyecto. No conceder acceso a `anon`,
   `authenticated`, `service_role` ni al futuro rol n8n sobre `ceroa`.
   [Protección de la Data API](https://supabase.com/docs/guides/api/securing-your-api).
3. Con un usuario propietario con permiso CREATE, Flyway puede crear `ceroa`.
   Si el DBA prepara el esquema, debe asignarlo al usuario JDBC y darle USAGE/CREATE
   y permisos sobre los objetos existentes. No crear tablas a mano ni ejecutar
   scripts V1–V14 en SQL Editor: debe hacerlo Flyway para conservar el historial.
4. Permitir la IP de salida del backend si hay restricciones de red. Ajustar pool:
   máximo 5 por instancia por defecto; sumar todas las réplicas y otros consumidores.
5. Antes de publicar, desactivar la cuenta demo que V1/V2 crean deliberadamente.
   Ejecutar, después de migrar, en SQL Editor:

```sql
UPDATE ceroa.users SET active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM ceroa.auth_sessions
WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

Esto conserva los scripts y bloquea el acceso demo. Los datos simulados quedan asociados
a esa cuenta; no confundirlos con datos financieros reales. Las pruebas optativas usan
la demo y deben ejecutarse en un esquema desechable antes de esta desactivación.
No habilitar RLS indiscriminadamente para el usuario JDBC: podría bloquear operaciones
del backend. La autorización actual sigue en Spring; aislamiento de roles y ausencia
de exposición de `ceroa` son requisitos del despliegue.

## Ejecución sin PostgreSQL local

Desde la raíz, crear `.env` solo si no existe y completar los campos anteriores:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose config --quiet
docker compose up -d --build backend frontend
docker compose ps
docker compose logs --tail 100 backend
```

No ejecutar `docker compose config` sin `--quiet` para compartir su salida: puede
mostrar secretos. El Compose de nube no declara PostgreSQL ni volumen de base local.
El contenedor mantiene puerto interno 8080; `SERVER_PORT` controla el puerto publicado.
El frontend de Compose mantiene el servidor Vite de desarrollo existente; este cambio
no convierte ese despliegue en un hosting de producción.

Sin Docker, desde `backend`:

```powershell
.\mvnw.cmd spring-boot:run
```

Lee `../.env` por defecto. Para iniciar el JAR desde otro directorio, inyectar las
variables en el proceso o fijar `CEROA_ENV_FILE` a `optional:file:<ruta>/.env[.properties]`.
Desde `frontend`, copiar su `.env.example` a `.env.local` si no existe, luego ejecutar
`npm ci` y `npm run dev`. `VITE_API_URL=http://localhost:8080/api/v1` es correcto
si backend sigue en tu computadora aunque la base esté en la nube. Si backend se aloja
en otro servidor, configurar su URL HTTPS y `FRONTEND_URL` al origen exacto de React.
En despliegue público activar `SESSION_SECURE_COOKIE=true` y mantener frontend/API
en una disposición compatible con las cookies SameSite=Lax actuales.

La opción local explícita es `docker compose -f docker-compose.local.yml up -d --build`.
No combinar ambos Compose como overrides. Para backend Maven con base local, proporcionar
DB_URL/DB_USERNAME/DB_PASSWORD y perfil `local` en variables del proceso; no usar el
perfil Supabase contra datos antiguos de `public`. Los volúmenes locales se conservan.

## Verificación en la nube

1. Confirmar en logs el endpoint cloud, Flyway versión 15 y arranque de Hibernate
   sin errores de validación. Una respuesta CSRF por sí sola no prueba acceso a datos.
2. En SQL Editor comprobar:

```sql
SELECT version, description, success
FROM ceroa.flyway_schema_history ORDER BY installed_rank;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'ceroa' ORDER BY table_name;
SELECT count(*) FROM ceroa.users;
```

   Debe haber V1–V15 exitosas (además de la entrada de creación de esquema) y 12 tablas
   de negocio más flyway_schema_history. En la conexión JDBC autenticada, comprobar SSL:

```sql
SELECT current_database(), current_user, current_schema();
SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();
```

   No atribuir el SSL de SQL Editor al backend: ejecutar esa comprobación usando su
   mismo endpoint/usuario desde un cliente SQL. Con pooler también revisar su configuración
   TLS; la vista refleja el tramo observado por PostgreSQL.
3. Abrir `http://localhost:3000`, registrar una cuenta nueva y crear perfil, deuda y pago;
   consultar estrategia y resumen mensual. Confirmar esas filas en `ceroa` desde Supabase.
4. Reiniciar backend y frontend, volver a iniciar sesión y confirmar persistencia.
   Detener exclusivamente el PostgreSQL local de Ceroa, si estaba activo, y repetir.
   No detener contenedores de otros proyectos ni borrar volúmenes.

Errores frecuentes: timeout/DNS → revisar host, IPv6 o Session Pooler y restricciones;
autenticación → contraseña de base y usuario correspondiente al modo; SSL → CA/ruta;
`relation does not exist` → esquema/currentSchema; Flyway esquema no vacío sin historial
→ inspeccionar proyecto/esquema, no activar baseline ni repair para silenciarlo.

## Prueba automatizada de migraciones y API

Ejecutar únicamente contra una base/esquema desechable autorizado. Usa configuración
principal, perfil Supabase, Flyway real y `ddl-auto=validate`, sin importar `.env` privado.
Migra V1–V15, verifica reinicio idempotente, login/lectura API, JSONB/version y SQL JDBC
de historial. La escritura de deuda/historial se revierte; Flyway y login sí escriben.

Desde `backend`, configurar en la terminal, sin guardar secretos en archivos versionados:

```powershell
$env:PG_MIGRATION_TEST='true'
$env:PG_TEST_URL='jdbc:postgresql://<HOST>:<PUERTO>/<BASE>?sslmode=require'
$env:PG_TEST_USERNAME='<USUARIO>'
# Inyectar PG_TEST_PASSWORD de forma privada desde el gestor de secretos.
$env:PG_TEST_SCHEMA='migration_verification'
.\mvnw.cmd '-Dtest=PostgresMigrationIntegrationTest' test
Remove-Item Env:PG_MIGRATION_TEST
```

Para PostgreSQL local desechable sin TLS, exclusivamente en pruebas,
`PG_TEST_SSLMODE=disable` y URL sin sslmode. La prueba está deshabilitada en la suite
normal. No ejecutar pruebas de integración H2/postgres-test sobre la base productiva.

## Validaciones realizadas

Validación realizada el 26 de septiembre de 2026: V1–V14 aplicadas en PostgreSQL 17.11
con esquema nuevo, 11 tablas incluyendo historial Flyway, validación Hibernate e
idempotencia correctas; las 3 pruebas PostgreSQL optativas pasaron. También pasaron
las 205 pruebas habituales del backend y TypeScript/build/153 pruebas del frontend.
Compose de nube validado con solo backend/frontend y sin dependencia de postgres.
Las pruebas iniciales utilizaron PostgreSQL desechable con SSL deshabilitado
exclusivamente para la comprobación local.

Posteriormente se verificó el proyecto Supabase real (PostgreSQL 17.6): V1–V14
aplicadas por el backend, Hibernate validado y reinicio sin nuevas migraciones.
El cliente psql confirmó TLS 1.3 hacia Session Pooler. En esta conexión,
`pg_stat_ssl` devolvió `false` para el tramo pooler → PostgreSQL; esa vista no mide
el TLS cliente → pooler, que se comprobó mediante `\conninfo` y `sslmode=require`.
Los roles `anon` y `authenticated` no tienen USAGE sobre el esquema `ceroa`.

Con el contenedor `ceroa-postgres` detenido, las APIs comprobaron autenticación,
deudas, estrategia, resumen mensual y creación de deuda/pago con recálculo correcto
del saldo. El pago y la deuda temporales se eliminaron por las APIs; el historial
mensual generado por esas operaciones queda asociado a la cuenta de demostración.
Una prueba de navegador Chromium verificó login desde React, lectura de deuda y
restauración de sesión al recargar tras reiniciar backend. No se transfirieron datos
de la base local ni se desactivó la cuenta demo, que sigue disponible para pruebas.

## Transferir datos locales existentes (si se requieren)

Esta integración crea una instancia nueva; no transfiere automáticamente los datos.
Para conservarlos: parar escrituras y jobs del backend local, hacer backup `pg_dump`
privado y verificar restauración, anotar versión/historial de Flyway y decidir corte.
Migrar primero el destino vacío con Flyway; después exportar/importar solo datos de las
10 tablas con columnas explícitas y esquema destino `ceroa`, respetando claves foráneas
(users antes de perfiles/deudas/sesiones, debts antes de payments/notifications).
Resolver previamente los UUID y filas demo que ambos lados comparten; no restaurar
ciegamente sobre las semillas ni duplicar flyway_schema_history. Transferir también
historial mensual, identidades, suscripciones y recuperaciones según la política elegida.
Validar conteos, saldos, relaciones, sesiones y pagos con una restauración de ensayo.
No aplicar un dump global de public/auth sobre Supabase ni usar Flyway clean.
Cambiar credenciales del backend solo al completar la validación; conservar backup y
origen para rollback. Si hubo nuevas escrituras en cloud, reconciliarlas antes de volver
al origen. La ejecución de esa transferencia requiere definir qué datos conservar.

## n8n posteriormente

n8n consultará/modificará finanzas con HTTP hacia las APIs Spring Boot. El backend
seguirá aplicando autorización por usuario, reglas, transacciones y auditoría.
La API de navegador mantiene sesión y CSRF. La autenticación de automatizaciones
ya se implementó mediante tokens por usuario, revocables y con caducidad/permisos;
ver [N8N.md](N8N.md). V15 agrega dos tablas auxiliares de seguridad/idempotencia
dentro de `ceroa`, sin cambiar V1–V14. Las instalaciones actualizadas llegan a V15
y tienen 12 tablas más flyway_schema_history.
La ruta `/api/v1/notifications/external-reminder` está explícitamente denegada: no asumir
que ya admite n8n. Los endpoints permitidos están bajo `/api/v1/automation`;
no se desactiva la seguridad de las rutas de navegador para integrar n8n.

Para pgvector/RAG y memoria conversacional, utilizar otro esquema o proyecto y un
rol n8n independiente con permisos exclusivamente auxiliares. Nunca entregar a n8n
el usuario postgres/JDBC de Ceroa ni conceder permisos sobre `ceroa`. Sus migraciones
deben quedar separadas de Flyway de negocio. No se instala pgvector ni se crean tablas
auxiliares durante esta migración.
