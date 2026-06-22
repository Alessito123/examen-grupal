# Sistema de Horarios UNT

Aplicación web para gestionar docentes, cursos, aulas, disponibilidad, carga horaria y generación automática de horarios de la Universidad Nacional de Trujillo.

## Tecnologías

- Next.js 15 (Pages Router), React 19 y TypeScript.
- tRPC y TanStack Query.
- Prisma y PostgreSQL.
- Tailwind CSS.
- Docker Compose para desarrollo local.
- Vercel para despliegue web.

## Desarrollo local con Docker

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Servicios:

- Aplicación: <http://localhost:3000>
- PostgreSQL: `localhost:5433`

Para renovar las dependencias internas después de cambiar `package-lock.json`:

```bash
docker compose -f docker/docker-compose.yml up -d --build --renew-anon-volumes app
```

## Comandos de calidad

```bash
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
```

## Variables de entorno

```dotenv
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=...
```

- `DATABASE_URL`: conexión con pooling para el runtime serverless.
- `DIRECT_URL`: conexión directa utilizada por Prisma para migraciones.
- `JWT_SECRET`: secreto obligatorio para firmar sesiones.

En Docker, ambas conexiones apuntan al servicio interno `db:5432`.

En Neon, `DATABASE_URL` debe usar el host con `-pooler` y límites de
conexión apropiados para funciones serverless. `DIRECT_URL` debe usar el host
directo, sin `-pooler`. Consulta [`.env.example`](.env.example) para ver el
formato recomendado sin credenciales reales.

## Despliegue en Vercel

El proyecto usa Node.js 24, instalación reproducible con `npm ci` y Fluid Compute.

1. Configura `DATABASE_URL`, `DIRECT_URL` y `JWT_SECRET` en Vercel.
2. Aplica migraciones antes de promover una versión con cambios de esquema:

   ```bash
   npm run prisma:migrate:deploy
   ```

3. Despliega. Vercel ejecutará:

   ```bash
   npm run vercel-build
   ```

Las migraciones no se ejecutan durante el build para evitar carreras entre despliegues.
