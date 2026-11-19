# Ceroa

Aplicación para registrar obligaciones y pagos, consultar la situación financiera, comparar estrategias y realizar simulaciones. Incluye asistencia con evidencia, biblioteca documental y automatizaciones sujetas a permisos y confirmación.

React y TypeScript · Spring Boot y Java 25 · PostgreSQL/Supabase · n8n 2.40.7 · Gemini.

NEXUS, ATLAS, ORACLE y LUMEN son los cuatro agentes cognitivos. AEGIS conserva la validación determinista del backend; CHRONOS integra Calendar/MCP sin añadir agentes cognitivos.

## Estructura

- `backend/`: API, seguridad, migraciones Flyway y pruebas.
- `frontend/`: interfaz y pruebas de navegador.
- `integrations/n8n/workflows/`: definiciones definitivas exportadas del runtime.
- `integrations/n8n/workflows.manifest.json`: hashes, dependencias, credenciales y política de publicación.
- `integrations/n8n/rag/`: fuentes aprobadas y herramientas administrativas del RAG.
- `integrations/n8n/testing/`: fixtures de regresión; no se importan al iniciar.
- `integrations/migration/`: traslado privado cifrado.
- `integrations/verification/`: comprobaciones nativas aisladas.

## Inicio

Requiere Git y Docker Desktop con Compose v2 y contenedores Linux. Los scripts de traslado requieren Node.js 24 o posterior y `tar` disponible en PATH.

1. Copia `.env.example` a `.env`, si todavía no existe.
2. Completa `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y `DB_SCHEMA` de la base Supabase existente. Usa conexión directa o Session Pooler; conserva TLS. No crees otra base financiera.
3. Configura las integraciones opcionales que vayas a utilizar.
4. Ejecuta desde la raíz:

```sh
docker compose up -d --build
```

Accesos predeterminados: [Ceroa](http://localhost:3000), [API](http://localhost:8080/api/v1/auth/csrf), [n8n](http://localhost:5678). Los puertos se pueden cambiar en `.env`. El backend y frontend se construyen desde el código; no usan JAR externos.

Supabase y Storage conservan sus datos remotos. `ceroa_n8n_data` conserva la configuración y clave de cifrado de n8n; `workspace-provider` conserva los recibos de idempotencia. No cambies la clave de cifrado de un volumen existente.

## n8n y credenciales

En un volumen nuevo se verifican los hashes, se importan los 21 workflows con IDs estables y se asocian credenciales por **nombre lógico y tipo**, sin depender de IDs del escritorio. Las claves internas de `.env` crean las credenciales Header Auth correspondientes; `GEMINI_API_KEY` permite preparar Gemini. El gateway Supabase usa una credencial restringida, nunca la contraseña financiera ni una clave con acceso financiero general.

La inicialización indica únicamente los nombres de configuración faltantes. Publica los webhooks y subworkflows preparados; deja sin publicar los flujos incompletos. Telegram, Drive, recordatorios, Centinela, sincronización documental y otros consumidores requieren activación manual. **Sheets permanece deshabilitado; sus eventos pendientes se conservan.**

Los reinicios normales conservan workflows, borradores, credenciales e historial; no reimportan ni republican versiones existentes. Los cambios inesperados o divergencias entre borrador y publicación impiden una actualización automática.

En la primera apertura de n8n crea su cuenta administradora local. Configura las credenciales indicadas en el manifiesto, con sus nombres y tipos exactos. Para Google: `Gmail account`, `Ceroa Calendar`, `Google Drive account`, `Google Sheets account`. Reconecta OAuth cuando lo solicite Google. Para asociar nuevas credenciales:

```sh
docker compose exec n8n node /opt/ceroa-workflows/bootstrap.mjs --configure
docker compose restart n8n
```

Una actualización revisada de las definiciones utiliza `--update` en lugar de `--configure`; se rechazan cambios locales inesperados. La instancia anterior solo se adopta si coincide exactamente con el snapshot verificado del manifiesto y no hay divergencia entre borrador y publicación. Las demás instancias se conservan intactas hasta reconciliar sus versiones.

Gmail durable y Calendar/MCP requieren `COMPOSE_PROFILES=google`, OAuth válido, `SUPPORT_CALENDAR_ID`, `WORKSPACE_PROVIDER_ENABLED=true` y `WORKSPACE_WORKER_KEY`. `WORKSPACE_DRAFT_URL` apunta al webhook durable; un borrador no envía correo. El envío requiere confirmación y un consumidor habilitado por separado.

Telegram requiere `COMPOSE_PROFILES=telegram` (o `google,telegram`), su credencial y un webhook público protegido. Tras comprobar que el escritorio anterior está detenido, publica su workflow y actualiza el webhook con `integrations/n8n/sync-telegram-tunnel.ps1` si usas el túnel local. No se descartan actualizaciones pendientes.

CHRONOS usa el webhook durable de Calendar y el proveedor Google con MCP de disponibilidad. Los cuatro workflows MCP opcionales sin configurar y el webhook Calendar anterior fueron retirados del runtime y del manifiesto. La indexación administrativa aprobada del RAG se conserva como herramienta manual.

SMTP, OAuth Google/Microsoft y Mercado Pago sandbox son opcionales y necesitan credenciales reales locales. Los callbacks de acceso son `/login/oauth2/code/google` y `/login/oauth2/code/microsoft` sobre `OAUTH_REDIRECT_BASE_URL`.

## Traslado al portátil

Clonar Git no restaura credenciales. Antes de trasladar consumidores, detén los del escritorio para no duplicar recordatorios, eventos, cobros ni webhooks. Usa rutas absolutas fuera del repositorio. Desde el escritorio:

```sh
node integrations/migration/export-ceroa.mjs --output RUTA_PRIVADA/paquete --key OTRA_RUTA/traslado.key --handoff
```

El paquete AES-256-GCM incluye configuración privada, entidades de n8n sin historial de ejecuciones, clave de cifrado, OAuth y estado durable del proveedor. No exporta la base Supabase. `--handoff` deja detenidos backend, n8n, proveedor y transportes de Telegram; sin esa opción, el respaldo normal restaura su estado previo. Guarda paquete y clave por separado, fuera de Git.

Las herramientas administrativas RAG pueden usar `.env.rag-admin`, privado y separado de los servicios; el traslado lo incluye si existe.

En el portátil, clona la misma versión del repositorio y restaura **antes** del primer inicio, sin `.env` ni volúmenes de destino existentes:

```sh
node integrations/migration/restore-ceroa.mjs --archive RUTA/archivo.ceroa --key OTRA_RUTA/traslado.key --confirm-source-stopped
docker compose up -d --build
```

La restauración comprueba integridad y descifrado; no inicia servicios ni activa consumidores externos. Usa `--offline-test` para probar la recuperación en volúmenes temporales sin red. Antes de publicar consumidores, verifica de nuevo que el escritorio esté detenido. Google puede exigir reconexión y Telegram un cambio de URL pública.

## Detención y comprobación

```sh
docker compose stop
docker compose ps
docker compose logs --tail 50 n8n
```

No uses `down -v` para detener o trasladar Ceroa. Los perfiles opcionales no deben ejecutarse simultáneamente en ambos computadores contra los mismos recursos.

Para verificar el inicializador y los contratos: `node --test integrations/n8n/*.test.mjs integrations/n8n/rag/*.test.mjs integrations/n8n/testing/*.test.mjs`. El perfil `test` incluye PostgreSQL aislado únicamente para validaciones con variables sintéticas; nunca debe apuntar a Supabase operativo.

Gemini puede devolver PARTIAL o FAILED y debe abstenerse ante tasas contradictorias; ORACLE + ATLAS continúa siendo variable. Las siete pruebas opt-in requieren proveedores/configuración adicional. Los fixtures simulados de Gmail no prueban envíos reales; Calendar/MCP productivo necesita OAuth y validación independiente. El despliegue productivo mantiene sus prerrequisitos y estado NO-GO; arrancar Docker no lo autoriza.

## Consultas de correo y asesorías

El chat devuelve propuestas de correo estructuradas y abre una vista previa con destinatario, asunto y contenido. Solo la confirmación explícita autoriza el envío al correo registrado. Una solicitud a otra dirección recibe orientación para revisar el perfil; no se cambia silenciosamente el destinatario.

Las preguntas sobre horarios consultan los intervalos ocupados de Google Calendar y muestran opciones libres y un selector de fecha. Se ofrecen citas de treinta minutos en Bogotá, en días hábiles, con una hora de anticipación y hasta dos semanas. La disponibilidad se vuelve a comprobar al proponer y confirmar. Un fallo de Calendar muestra orientación y no se interpreta como agenda libre.

El bloqueo por reservas estimadas de iteraciones está desactivado por defecto (`ASSISTANT_ESTIMATED_MINUTE_LIMIT_ENABLED=false`). Siguen activos la concurrencia, el límite de solicitudes por usuario y la pausa ante un límite real informado por el proveedor. `ASSISTANT_PROVIDER_CALLS_PER_MINUTE` solo se aplica cuando se habilita expresamente el presupuesto preventivo estimado; no representa una medición de llamadas reales.
