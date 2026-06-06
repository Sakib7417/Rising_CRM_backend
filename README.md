# Sales CRMBackend API

Production-ready Sales CRMbackend built with **Node.js**, **Express**, **TypeScript**, **Prisma**, **PostgreSQL**, **Redis**, **JWT**, **Socket.IO**, and **Docker Compose**.

## Features

- JWT access + refresh tokens with rotation
- Role-based access: `SUPER_ADMIN`, `ADMIN`, `SALES_MANAGER`, `SALES_AGENT`, `EMPLOYEE`
- Leads (search, filter, pagination, timeline, CSV import, IndiaMART paste import)
- Follow-ups (daily list, missed, upcoming, cron auto-inactive)
- Customers, deals pipeline, quotations (PDF), tasks
- Dashboard analytics & report export (Excel/PDF)
- Activity logging & browser notifications (Socket.IO)
- Swagger UI at `/api/docs`

## Quick start (Docker)

```bash
cd backend
cp .env.example .env
docker-compose up --build
```

Services:

| Service  | Container     | Port |
|----------|---------------|------|
| API      | crm_backend   | 5000 |
| Postgres | crm_postgres  | 5432 |
| Redis    | crm_redis     | 6379 |

After containers are healthy, seed a super admin (run locally or exec into backend):

```bash
npm run seed
# Default: admin@salescrm.com / Admin@12345
```

## Local development

```bash
cp .env.example .env
# Point DATABASE_URL and REDIS_URL to localhost
docker-compose up postgres redis -d
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

API: `http://localhost:5000`  
Swagger: `http://localhost:5000/api/docs`

## Environment variables

See `.env.example`:

- `PORT`, `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`
- `NODE_ENV`, `CORS_ORIGIN`

## API overview

Base path: `/api`

### Auth `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Public register (EMPLOYEE role) |
| POST | `/register-staff` | Admin creates staff with role |
| POST | `/login` | Login |
| POST | `/refresh` | Refresh tokens |
| POST | `/logout` | Logout (optional refresh token body) |
| GET | `/me` | Current user |
| POST | `/change-password` | Change password |
| POST | `/forgot-password` | Request reset token |
| POST | `/reset-password` | Reset with token |

### Users `/api/users` (manager+)

CRUD, `POST /:id/assign-leads`, `GET /:id/performance`

### Leads `/api/leads`

CRUD, search/filter, `POST /import-indiamart`, `POST /bulk-import` (multipart `file`), assign, status, active toggle, convert, timeline.

**IndiaMART import body:**

```json
{ "rawText": "2026-05-19\n07408929542\nATUL YADAV\n..." }
```

### Follow-ups `/api/followups`

Create/update/delete, `GET /lead/:leadId`, `GET /daily`, `GET /missed`, `GET /upcoming`

### Notes `/api/notes`

`POST /`, `GET /lead/:leadId`

### Customers `/api/customers`

List, get, create, `POST /:id/notes`

### Deals `/api/deals`

CRUD-style create/update, `GET /pipeline`, `GET /analytics`

### Quotations `/api/quotations`

Create, `POST /:id/generate-pdf`, `GET /:id/download`, `POST /:id/send`

### Tasks `/api/tasks`

CRUD + list (agents see own tasks)

### Dashboard `/api/dashboard`

`GET /` overview stats, `GET /analytics`

### Reports `/api/reports` (manager+)

`GET /:type/excel` and `GET /:type/pdf` where `type` is `leads|followups|employees|sales|revenue`

### Activities `/api/activities` (manager+)

`GET /` audit log

### Notifications `/api/notifications`

`GET /`, `POST /:id/read`

## Socket.IO

Connect with JWT in `auth.token` or `Authorization` header.

Events: `lead:created`, `lead:assigned`, `followup:reminder`, `deal:updated`, `task:alert`, `notification:*`

## Project structure

```
backend/
├── prisma/schema.prisma
├── src/
│   ├── config/       # env, db, redis, socket, swagger
│   ├── middleware/   # auth, rbac, validation, errors
│   ├── modules/      # feature modules
│   ├── services/     # shared services + cron
│   ├── routes/
│   ├── app.ts
│   └── server.ts
├── docker-compose.yml
└── Dockerfile
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with tsx watch |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:push` | Push schema |
| `npm run seed` | Seed SUPER_ADMIN |

## Security

Helmet, CORS, rate limiting, bcrypt passwords, Zod validation, Prisma parameterized queries.

## License

MIT
