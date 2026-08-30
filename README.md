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

- Java 21.
- Node.js 20 o superior y npm.
- Docker Desktop o un PostgreSQL 17 accesible.

No es necesario instalar Maven globalmente: el backend incluye Maven Wrapper.

## Variables de entorno

Usa [.env.example](.env.example) como referencia. No guardes secretos reales en Git.

Variables activas en esta fase:

| Variable | Uso | Valor local predeterminado |
|---|---|---|
| `POSTGRES_DB` | Base creada por Docker | `ceroa` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `ceroa` |
| `POSTGRES_PASSWORD` | Contraseña local | `ceroa_dev` |
| `POSTGRES_PORT` | Puerto publicado | `5432` |
| `DB_URL` | JDBC del backend | `jdbc:postgresql://localhost:5432/ceroa` |
| `DB_USERNAME` | Usuario JDBC | `ceroa` |
| `DB_PASSWORD` | Contraseña JDBC | `ceroa_dev` |
| `SERVER_PORT` | Puerto del backend | `8080` |
| `FRONTEND_URL` | Origen permitido por CORS | `http://localhost:3000` |
| `SESSION_DAYS` | Duración de la sesión persistente | `30` |
| `SESSION_SECURE_COOKIE` | Exige HTTPS para la cookie (activar en producción) | `false` |
| `VITE_API_URL` | Base URL REST | `http://localhost:8080/api/v1` |

Google, Microsoft, Mercado Pago y Telegram están declarados en el ejemplo para fases posteriores, sin credenciales.

## Ejecución local

Desde la raíz del proyecto:

### 1. PostgreSQL

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
docker compose ps
```

Flyway crea el esquema automáticamente al iniciar el backend. Para detener PostgreSQL conservando los datos:

```powershell
docker compose stop postgres
```

### 2. Backend

En otra terminal:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

API: `http://localhost:8080/api/v1`

Swagger UI: `http://localhost:8080/swagger-ui.html`

OpenAPI JSON: `http://localhost:8080/v3/api-docs`

### 3. Frontend

En otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Aplicación: `http://localhost:3000`

## Endpoints implementados

### Autenticación y perfil

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`

Las rutas financieras requieren una sesión válida. El navegador recibe una cookie `HttpOnly`; en PostgreSQL solo se almacena el hash del token de sesión.

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

OAuth2 con Google/Microsoft, recuperación de contraseña por correo, onboarding financiero guiado, simulador backend, suscripciones, Mercado Pago, Telegram y notificaciones persistentes pertenecen a fases posteriores. Los botones OAuth visibles no simulan acceso: informan que la integración aún no está habilitada.
