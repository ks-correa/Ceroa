# Ceroa

Ceroa es una aplicación web de bienestar financiero para registrar, organizar y dar seguimiento a obligaciones y pagos. No presta dinero, no refinancia deudas y no reemplaza a una entidad financiera.

La aplicación conserva la experiencia React existente y agrega persistencia real para cuentas, sesiones, perfil personal y financiero, deudas, pagos y estrategia mediante una API Java y PostgreSQL.

## Arquitectura

```text
React + TypeScript + Vite
          |
       REST API
          |
Java 21 + Spring Boot
          |
Spring Data JPA / Hibernate
          |
      PostgreSQL
```

El backend es un monolito modular. React nunca se conecta directamente a PostgreSQL.

La clasificación de hallazgos, decisiones y validaciones de la refactorización está en [ARCHITECTURE_AUDIT.md](ARCHITECTURE_AUDIT.md).

El estado de vencimientos y notificaciones, incluidas las tareas pendientes de Telegram, está en [EP12.md](EP12.md).

El alcance, funcionamiento y límites del resumen mensual están en [README_EP16.md](README_EP16.md).

## Navegación

El área autenticada mantiene exactamente cinco secciones principales, tanto en escritorio como en móvil:

- Inicio
- Deudas
- Estrategia
- Simular
- Perfil

Detalle de deuda, pagos, vencimientos, notificaciones y suscripción son flujos secundarios, no destinos principales.

## Stack

- Frontend: React 19, TypeScript, Vite y Tailwind CSS 4.
- Backend: Java 21, Spring Boot 3.5, Spring Web, Spring Data JPA, Hibernate, Validation y Spring Security.
- Datos: PostgreSQL 17 y Flyway.
- API: OpenAPI 3 y Swagger UI.
- Pruebas backend: JUnit 5, Mockito y AssertJ.
- Desarrollo local: Docker Compose y Maven Wrapper.

## Estructura

```text
.
|-- frontend/                  # Prototipo React conectado a la API
|   |-- src/components/
|   |-- src/context/
|   |-- src/services/
|   `-- src/types/
|-- backend/                   # API Spring Boot
|   |-- src/main/java/com/ceroa/
|   |   |-- api/               # Controllers, DTOs y errores HTTP
|   |   |-- config/            # Security, CORS y OpenAPI
|   |   |-- domain/            # Entidades y enumeraciones
|   |   |-- repository/
|   |   `-- service/
|   `-- src/main/resources/db/migration/
|-- docker-compose.yml
`-- .env.example
```

## Requisitos previos

- Java 21 y Node.js 20 o superior con npm para ejecutar sin Docker.
- Docker Desktop para ejecutar frontend/backend con Compose (opcional).
- Proyecto Supabase Cloud y credenciales PostgreSQL Direct o Session Pooler.

## Configuración y ejecución con Supabase

El backend mantiene JPA/Hibernate y Flyway V1–V14, y agrega V15 para credenciales
e idempotencia de automatizaciones. El perfil `supabase` usa SSL,
un pool limitado y el esquema privado `ceroa`. El Compose principal ejecuta
frontend/backend sin PostgreSQL local. No requiere SDK ni API keys de Supabase.

El análisis, plan, configuración manual, transferencia de datos y comprobaciones
están en [docs/SUPABASE.md](docs/SUPABASE.md). La conexión real fue verificada el
26 de septiembre de 2026 con Supabase como única base de datos. Las credenciales permanecen
en `.env` privado; no hay secretos en el ejemplo.

1. Crear `.env` desde [.env.example](.env.example) solo si no existe.
2. Completar `DB_URL` JDBC con el host/puerto/base exactos de **Connect**,
   `DB_USERNAME` y `DB_PASSWORD` de la base. Mantener `SPRING_PROFILES_ACTIVE=supabase`.
3. Mantener `ceroa` fuera de la Data API; Flyway crea sus tablas al arrancar.
4. Ejecutar desde la raíz:

```powershell
docker compose config --quiet
docker compose up -d --build backend frontend
docker compose logs --tail 100 backend
```

No sobrescribir un `.env` existente. No compartir la salida de `docker compose config`
sin `--quiet`, porque puede revelar credenciales. La conexión utiliza exclusivamente Supabase.

Sin Docker, ejecutar desde `backend` `.\mvnw.cmd spring-boot:run`; importa `../.env`.
Desde `frontend`, crear `.env.local` desde su ejemplo si no existe y ejecutar
`npm ci` y `npm run dev`. React sigue llamando a Spring Boot mediante `VITE_API_URL`.

- Aplicación: `http://localhost:3000`
- API: `http://localhost:8080/api/v1`
- Swagger: `http://localhost:8080/swagger-ui.html`
- OpenAPI: `http://localhost:8080/v3/api-docs`

| Variable | Uso |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `supabase` |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexión JDBC obligatoria, sin fallback localhost |
| `DB_SCHEMA` | `ceroa` en perfil Supabase, compartido por Flyway, Hibernate y JDBC |
| `DB_POOL_MAX_SIZE`, `DB_POOL_MIN_IDLE` | 5 y 1 por instancia por defecto |
| `SERVER_PORT` | Puerto backend; en Compose controla el puerto publicado |
| `FRONTEND_URL` | Origen exacto permitido por CORS |
| `SESSION_DAYS`, `SESSION_SECURE_COOKIE` | Duración de sesión y cookie HTTPS |
| `VITE_API_URL` | URL REST de Spring Boot, nunca de Supabase |

La base de datos de Ceroa se aloja exclusivamente en Supabase.

n8n puede utilizar las APIs de automatización con credenciales por usuario, caducidad,
revocación, permisos e idempotencia. Se gestionan en Perfil → Automatizaciones.
La configuración y workflows importables están en [docs/N8N.md](docs/N8N.md).
Para empezar con n8n local, ejecutar
`docker compose -f docker-compose.yml -f docker-compose.n8n.yml up -d n8n` y abrir
`http://localhost:5678`. Crear la cuenta local y configurar Bearer Auth siguiendo la guía.
RA-N8N-003 está activo con documentación aprobada en PGVector/Supabase, roles auxiliares
sin acceso a `ceroa` y memoria de contexto separada por usuario, canal y conversación.
Los datos personales se consultan mediante las APIs GET del backend. Configuración,
corpus y verificación: [docs/RA-N8N-003.md](docs/RA-N8N-003.md).

## Endpoints implementados

### Autenticación y perfil

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/csrf`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`

Las rutas financieras requieren una sesión válida. El navegador recibe una cookie `HttpOnly`; en PostgreSQL solo se almacena el hash del token de sesión. Las operaciones mutables también requieren el token CSRF que obtiene automáticamente el cliente web.

### Perfil financiero

- `GET /api/v1/financial-profile`
- `PUT /api/v1/financial-profile`

### Deudas

- `GET /api/v1/debts`
- `GET /api/v1/debts/{id}`
- `POST /api/v1/debts`
- `PUT /api/v1/debts/{id}`
- `DELETE /api/v1/debts/{id}`

### Pagos

- `GET /api/v1/payments`
- `GET /api/v1/payments?debtId={debtId}`
- `GET /api/v1/payments/{id}`
- `POST /api/v1/payments`
- `PUT /api/v1/payments/{id}`
- `DELETE /api/v1/payments/{id}`

### Estrategia

- `GET /api/v1/strategies/comparison`

La comparación Bola de Nieve/Avalancha y el orden de prioridad se calculan en el backend con los saldos, tasas y pagos persistidos.

Los pagos se validan como valores positivos y fechas no futuras. Crear, editar o eliminar un pago recalcula el saldo de la deuda dentro de una transacción. Eliminar una deuda elimina sus pagos asociados. El backend bloquea una tercera deuda cuando el usuario tiene Plan Cero.

## Datos de demostración

El asistente web RA-N8N-001 analiza preguntas por texto y audio, combina datos financieros
y cálculos del backend y genera explicaciones para cada usuario autenticado. Su configuración, pruebas y límites están en
[docs/RA-N8N-001.md](docs/RA-N8N-001.md). Telegram permite vincular una cuenta desde
Perfil mediante un enlace de un solo uso y consultar por texto o voz en un chat privado.
La prueba local usa `docker-compose.telegram-local.yml` y un túnel HTTPS temporal;
ver instrucciones en la misma guía. RA-N8N-001 quedó completado y aceptado por el usuario
el 27 de septiembre de 2026, tras confirmar el funcionamiento de Telegram. Los demás requerimientos
de n8n permanecen independientes y con el estado documentado en [docs/N8N.md](docs/N8N.md).


Flyway carga una cuenta y una cartera editable para probar el sistema sin capturar todo desde cero:

- Correo: `demo@ceroa.local`
- Contraseña: `Demo123!`
- Plan: Ceroa Plus
- 3 deudas y 3 pagos simulados, almacenados en PostgreSQL

Los cambios hechos desde la interfaz permanecen después de cerrar sesión o reiniciar la aplicación mientras se conserve el volumen de PostgreSQL.

## Pruebas y compilación

Backend:

```powershell
cd backend
.\mvnw.cmd clean test package
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

## Alcance pendiente

RA-N8N-002 está implementado para leer PDF con texto, DOCX y XLSX desde Registrar/Editar obligación > Leer documento financiero. Requiere consentimiento, revisión y guardado explícito; persiste mediante el backend en Supabase. Los documentos escaneados requieren registro manual (OCR no incluido). Configuración y límites: [docs/RA-N8N-002.md](docs/RA-N8N-002.md).

OAuth2 con Google/Microsoft, recuperación de contraseña por correo, onboarding financiero guiado, simulador backend, suscripciones, Mercado Pago y notificaciones persistentes (incluidos avisos automáticos por Telegram) pertenecen a fases posteriores. Los botones OAuth visibles no simulan acceso: informan que la integración aún no está habilitada.
# Registro y acceso (EP-02)

Consulta [EP02.md](EP02.md) para la configuración de Google/Microsoft, migraciones, ejecución de pruebas y matrices de aceptación. La validación real con proveedores requiere credenciales externas.
# Ceroa Plus (EP-14)

La oferta comercial la publica el backend en `GET /api/v1/plus/offers`. Configure `PLUS_MONTHLY_PRICE`, `PLUS_YEARLY_PRICE` y `PLUS_CURRENCY` en el entorno; no hay precios predeterminados. Sin precios positivos, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`, el checkout permanece deshabilitado.

Configure en Mercado Pago el webhook público `POST https://<backend>/api/v1/plus/webhook` para el tópico `subscription_preapproval`, y copie su secreto de firma a `MP_WEBHOOK_SECRET`. `FRONTEND_URL` debe ser la URL pública HTTPS de Ceroa para el retorno. Use el token y el secreto del mismo entorno de Mercado Pago; las pruebas y producción requieren configuraciones separadas.

El backend crea `/preapproval` con el monto configurado, guarda la referencia y conserva `PENDING` hasta consultar el recurso mediante la API de Mercado Pago. El webhook valida `x-signature` y vuelve a consultar el recurso; el retorno de navegador también consulta al backend. Solo `authorized` con referencia, monto, moneda y frecuencia coincidentes actualiza el plan central a Plus. No se guardan datos de tarjeta.
