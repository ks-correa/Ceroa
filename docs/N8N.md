# Automatizaciones de Ceroa con n8n

## Empezar en tu computadora

En esta instalación, n8n 2.40.7 ya está iniciado en http://localhost:5678 y ambos
workflows se importaron como borradores inactivos, sin credenciales. Se comprobó
desde el contenedor n8n la conexión autenticada a Spring Boot y la lectura de las
deudas demo en Supabase; la credencial temporal se revocó al terminar. Todavía
debes crear tu cuenta local y asociar tu propia credencial para ejecutar workflows.

La opción local está preparada en `docker-compose.n8n.yml`. Desde la raíz de Ceroa:

```powershell
docker compose -f docker-compose.yml -f docker-compose.n8n.yml up -d n8n
```

1. Abrir **http://localhost:5678** y crear tu cuenta de administrador de esta
   instalación local. Es independiente de tu cuenta de n8n Cloud y de Ceroa.
2. Abrir **http://localhost:3000**, entrar con tu cuenta Ceroa y crear una credencial
   de **solo lectura** en Perfil → Automatizaciones. Copiarla una sola vez.
3. En n8n crear **Credentials → Bearer Auth** (o crearla desde el nodo HTTP Request)
   y pegar el token de Ceroa en el campo **Bearer Token**. No usar DB_PASSWORD ni la
   contraseña de acceso a Ceroa como token.
4. Abrir el workflow **Ceroa - Consultar deudas por API**. Si no aparece, importar
   `integrations/n8n/read-debts.json` con la opción Import from File del editor.
5. En el nodo **Consultar deudas**, seleccionar esa credencial y ejecutar el workflow.
   Debe devolver las deudas de tu usuario; `[]` también es correcto si no tiene deudas.

Las plantillas usan `backendUrl=http://backend:8080`, porque n8n y Spring Boot
comparten la red de Docker Compose. Dentro de n8n, `localhost` identifica el propio
contenedor n8n y no el backend. Si ejecutas Spring Boot con Maven en Windows, utilizar
`http://host.docker.internal:8080` en lugar de `http://backend:8080`.

El primer workflow tiene tres pasos: Manual Trigger → Configurar backend → HTTP Request.
No necesitas un agente de IA para comprobar esa conexión. Después puedes añadir
otros nodos o conectar el resultado a un modelo con sus credenciales propias.

Para practicar escritura, crear otra credencial con escritura e importar el workflow
de pago. Completar debtId, monto, fecha y eventId antes de ejecutarlo; leer el apartado
de idempotencia. Nunca usar pruebas de escritura sobre datos financieros reales.

La instalación guarda los workflows, tu cuenta y las credenciales cifradas en el
volumen `ceroa_n8n_data`. La clave de cifrado se genera automáticamente allí. La base
interna de n8n es SQLite local; la base financiera de Ceroa sigue en Supabase. n8n
no recibe las credenciales PostgreSQL de Ceroa ni las lee del `.env`.

Para detener n8n conservando datos:

```powershell
docker compose -f docker-compose.yml -f docker-compose.n8n.yml stop n8n
```

No usar `down -v` para apagarlo: eliminaría el volumen. Guardar una copia privada del
volumen completo, incluida la clave de cifrado, antes de actualizar o cambiar de equipo.
La imagen oficial está fijada por digest; una actualización requiere cambiarlo
deliberadamente tras respaldar datos. El puerto 5678 solo está publicado en loopback;
este Compose no abre un túnel ni permite webhooks desde internet.

[Instalación Docker oficial](https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker).

## Arquitectura

React → Spring Boot → PostgreSQL Supabase.
n8n → API HTTP Spring Boot → los mismos services y repositories → Supabase.
n8n no recibe el usuario JDBC, contraseña de PostgreSQL ni claves service_role de Ceroa.
No tiene permisos directos sobre las tablas financieras, sesiones o credenciales.

La integración del proyecto funciona con n8n Cloud o con una instancia local. Aquí
se ha elegido la opción local. La cuenta de administrador y la credencial del usuario
Ceroa se configuran privadamente en el editor; no pertenecen al repositorio.

## n8n local o Cloud

Para uso personal con Ceroa en tu computadora, n8n local permite ejecutar workflows,
HTTP, IA y herramientas RAG sin publicar Spring Boot. Debes mantener la computadora
y Docker activos para tareas programadas. Webhooks de servicios externos requieren
un endpoint accesible desde internet. Community no incluye todas las funciones
empresariales: [ediciones oficiales](https://github.com/n8n-io/n8n-docs/blob/main/docs/deploy/host-n8n/community-edition-features.md).

n8n Cloud, accesible desde la página de n8n, se ejecuta fuera de tu computadora.
`localhost:8080` allí NO corresponde a tu Spring Boot. Necesita una URL HTTPS del
backend: mediante hosting permanente o un túnel autorizado para pruebas. Un túnel
no requiere publicar React, pero hace accesible el backend y deja de funcionar al
apagar tu computadora. No se configura ni abre un túnel automáticamente.

## Credenciales por usuario

1. Abrir Ceroa y entrar con la cuenta que n8n va a gestionar.
2. En **Perfil → Automatizaciones → Configurar automatizaciones**, crear una
   credencial con nombre y caducidad (1–90 días). Solo lectura es el valor inicial.
3. Activar escritura únicamente si el workflow necesita crear/editar/eliminar
   finanzas. El permiso no incluye contraseñas, perfil personal, suscripciones ni
   administrar otras credenciales.
4. Copiar el token una sola vez y guardarlo en **Credentials → HTTP Request →
   Bearer Auth** de n8n. No pegarlo en nodos, JSON exportado ni variables `VITE_*`.
5. En el nodo HTTP Request: Generic Credential Type → Bearer Auth → seleccionar
   esa credencial. Enviar `Authorization: Bearer <token>` lo realiza n8n.

En la base solo se guarda SHA-256 del token, nunca el valor recuperable. Cada token
está asociado a un usuario; las consultas y mutaciones reutilizan los servicios
actuales y su autorización. Una cuenta inactiva, token vencido o revocado recibe 401.
La revocación está disponible en Perfil. Máximo 10 credenciales activas por usuario.
No hay renovación automática: rotar antes de caducar y actualizar Credentials de n8n.

La administración usa `/api/v1/integrations/tokens` con la sesión de navegador y
CSRF existentes. El token de automatización solo autentica `/api/v1/automation/**`.
La cadena de seguridad de automatizaciones no admite cookies de navegador y por ello
no requiere CSRF; todas las otras rutas de navegador mantienen su protección.

## Endpoints financieros

| Método | Ruta bajo `/api/v1/automation` | Permiso |
|---|---|---|
| GET | `/debts`, `/debts/{id}` | Lectura |
| GET | `/payments?debtId=<uuid>` (filtro opcional) | Lectura |
| GET | `/financial-profile`, `/dashboard/summary` | Lectura |
| GET | `/due-dates/upcoming`, `/strategies/comparison` | Lectura |
| GET | `/monthly-progress?year=<año>&month=<mes>` | Lectura |
| POST | `/debts`, `/payments` | Escritura |
| PUT | `/debts/{id}`, `/payments/{id}`, `/financial-profile` | Escritura |
| DELETE | `/debts/{id}`, `/payments/{id}` | Escritura |

Solo se actúa sobre la cuenta propietaria del token. Cambiar un UUID o enviar un
userId no permite actuar sobre otra cuenta. Las reglas de pago, saldos, restricciones
de plan, JSONB y bloqueo/version de deuda siguen en los servicios existentes.

Todas las escrituras requieren `Idempotency-Key: <UUID>`. Generarlo al crear el evento
de negocio y conservarlo con ese evento en todos los reintentos, incluso si n8n inicia
otra ejecución. No usar el ID de ejecución de n8n si cambia al reintentar. La clave
está vinculada a la credencial: no rotar credencial en mitad de reintentos pendientes.

La operación y su resultado se guardan en la misma transacción. El backend bloquea
la fila de la credencial para serializar escrituras concurrentes; un segundo intento
con la misma clave devuelve el resultado guardado y no vuelve a descontar el pago.
Cambiar contenido o ruta con la misma clave devuelve 422 `IDEMPOTENCY_CONFLICT`.
Un fallo de negocio revierte la transacción y no reserva la clave. Los registros de
idempotencia no caducan automáticamente: su eliminación acortaría la protección
contra reintentos. La auditoría registra usuario, credencial, operación y clave,
sin tokens ni contenido financiero en logs; el resultado financiero se guarda en DB.

## Workflows importables

- [Consultar deudas](../integrations/n8n/read-debts.json): manual, solo lectura.
- [Registrar pago](../integrations/n8n/create-payment.json): manual, requiere escritura.

Importar el JSON en n8n. Ambos se entregan inactivos, sin credenciales y con la URL
interna real de Compose. Seleccionar Bearer Auth en el nodo HTTP Request. Si se usa
otra instalación, cambiar `backendUrl` sin barra final. Para pago completar un `eventId`
UUID estable, `debtId` real de esa cuenta, monto positivo y fecha `YYYY-MM-DD`.
Los campos vacíos no realizan un pago válido y deben sustituirse antes de ejecutar.
Las plantillas evitan guardar los datos de las ejecuciones exitosas/fallidas en n8n;
verificar también la política de retención de la instancia y quién accede al editor.
[Autenticación HTTP oficial](https://github.com/n8n-io/skills/blob/main/skills/n8n-credentials-and-security-official/references/CUSTOM_CREDENTIALS.md).

Prueba recomendada: importar primero lectura. Para escritura usar una cuenta/datos
de prueba, registrar un pago y repetir EXACTAMENTE el evento; verificar mismo id de
pago, mismo resultado y un único impacto en saldo. Revocar la credencial y comprobar
401. Nunca probar duplicados sobre pagos financieros reales.

## RAG/pgvector y memoria después

Se pueden conectar desde n8n a Supabase con otro usuario PostgreSQL y otro esquema,
por ejemplo `n8n_aux`, que no tenga USAGE ni permisos sobre `ceroa`. Esas credenciales
serían exclusivamente auxiliares. Antes de crear tablas vectoriales se debe elegir
proveedor/modelo de embeddings y dimensión; no inventar una dimensión incompatible.
También se necesita elegir proveedor/modelo de chat y configurar sus API keys
privadamente en n8n. Esa configuración aún no existe en el repositorio.
Sus tablas/migraciones no deben quedar en Flyway de negocio ni permitir acceso a
credenciales, saldos, pagos o perfiles financieros por SQL. Las herramientas de un
agente para finanzas deben llamar a los endpoints Spring Boot con alcance de usuario.

## Cambios de base y despliegue

V1–V14 se mantienen intactas. V15 agrega exclusivamente `automation_tokens` y
`automation_requests` dentro de `ceroa`. No reemplaza repositories ni lógica financiera.
Flyway la aplicará al arrancar la versión nueva del backend. Antes de actualizar una
instancia productiva, guardar backup y validar contra un esquema desechable.
Las pruebas cubren permisos, caducidad, revocación, aislamiento de usuarios, CSRF e
idempotencia de pagos. Estas comprobaciones no equivalen a haber instalado un workflow
en n8n Cloud: eso requiere una instancia accesible y una URL de backend alcanzable.

Verificación realizada el 26 de septiembre de 2026: 212 pruebas backend y 3 pruebas
PostgreSQL desechable pasaron; V1–V15 y Hibernate validados. Las 156 pruebas frontend,
TypeScript y build también pasaron. V15 fue aplicada en Supabase y se probaron dos
solicitudes HTTP simultáneas con el mismo pago: mismo resultado, un solo pago y un
único impacto de saldo; se eliminó la deuda/pago temporales y se revocó el token.
Los registros de idempotencia e historial quedan en la cuenta demo como evidencia
de prueba, sin credenciales recuperables. En esa etapa los JSON solo estaban
validados estructuralmente; posteriormente se importaron en n8n local según el
apartado inicial. La ejecución del workflow desde el editor requiere asociar una
credencial privada del usuario.

También se corrigió un ciclo previo de recarga de Perfil: la tarjeta de suscripción
ya no llama a la recarga global al montarse, lo que desmontaba continuamente el panel.
La actualización explícita y la cancelación mantienen su refresco de datos.

## Sandbox para el asistente de IA de n8n

El dialogo "Add a code sandbox" es obligatorio para el asistente que construye
workflows con IA. Los workflows manuales de Ceroa no requieren este servicio.
Se ha instalado el stack oficial n8n Sandbox 1.3.4 (API, runner Docker-in-Docker
con mTLS y certificados), sin publicar puertos ni montar el socket Docker del host.
El runner usa `privileged: true`, como requiere el stack oficial, dentro de Docker Desktop.

Arrancar incluyendo el overlay:

```powershell
docker compose -f docker-compose.yml -f docker-compose.n8n.yml -f docker-compose.n8n-sandbox.yml up -d n8n sandbox-runner-1
```

La configuracion y claves generadas estan en `.env.n8n-sandbox`, archivo privado
excluido de Git y separado de las credenciales de Ceroa/Supabase. No borrarlo al
reiniciar. La conexion se guarda desde la interfaz de n8n, sin variables N8N de sandbox que bloqueen los campos.
Recargar el navegador despues del arranque. Si el dialogo sigue solicitando los
campos, seleccionar n8n Sandbox, usar esa URL y copiar SOLO el valor de
`SANDBOX_API_KEYS` del archivo privado en API key. No usar el token de
Ceroa, la clave de un proveedor de IA ni la contrasena de Supabase.

Para otra computadora se deben generar secretos nuevos; el overlay requiere
`.env.n8n-sandbox` con las variables indicadas en el instalador oficial:
https://github.com/n8n-io/n8n/blob/master/docker/get-n8n.sh

El sandbox no configura un modelo de IA: las credenciales del modelo se administran
por separado en n8n. No concede acceso directo a las tablas financieras.

## Asistente conversacional y RAG

Contratos y estado de implementación: [RA-N8N-001](RA-N8N-001.md) y [RA-N8N-003](RA-N8N-003.md).
La preparación del corpus RAG está en integrations/n8n/rag; no indexa fuentes sin aprobación.


## Requerimientos separados

- RA-N8N-001: asistente financiero por voz y texto.
- [RA-N8N-002](RA-N8N-002.md): extracción documental y borrador editable, sin guardado automático.
- RA-N8N-003: consultor documental mediante RAG.
- [RA-N8N-004](RA-N8N-004.md): briefing y recordatorios programados con revalidación y estados de entrega.
- [RA-N8N-005](RA-N8N-005.md): evaluación de sobrecapacidad y simulaciones con aprobación humana de un solo uso.

Son workflows independientes; compartir infraestructura no fusiona sus permisos ni sus datos.
