## 10xcoder.club monorepo (Bun + Next.js + Elysia + shared Zod schemas)

### Structure

- **`apps/web`**: Next.js frontend (Vercel)
- **`apps/api`**: Elysia REST API (Docker on EC2)
- **`packages/schemas`**: shared Zod schemas + inferred TS types

### Prereqs

- Install Bun: `https://bun.sh`

### Local development

Install deps (from repo root):

```bash
bun install
```

Run both apps:

```bash
bun run dev
```

Ports:

- **Web**: `http://localhost:3001`
- **API**: `http://localhost:3000`

Environment (optional):

- **Web**: set `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000`)
- **API**: set `CORS_ORIGIN` (comma-separated) or leave unset for permissive CORS in dev

### Shared schemas

Edit schemas in:

- `packages/schemas/src/index.ts`

The backend validates requests using these Zod schemas, and the frontend uses the same schemas for client-side validation and payload typing.

### Backend: Docker build + run (for EC2)

Build from repo root:

```bash
docker build -f apps/api/Dockerfile -t 10xcoder-api:latest .
```

Run:

```bash
docker run --rm -p 3000:3000 -e PORT=3000 -e CORS_ORIGIN=http://localhost:3001 10xcoder-api:latest
```

#### Production binary build (non-docker)

The API build uses Bun’s compile+minify flow from the Elysia deploy guide:
`https://elysiajs.com/patterns/deploy.html`

```bash
bun --cwd apps/api run build:binary
./apps/api/server
```

### Frontend: Vercel (monorepo)

In Vercel project settings:

- **Root Directory**: `apps/web`
- **Install Command**: `bun install`
- **Build Command**: `bun run build`
- **Environment**: set `NEXT_PUBLIC_API_URL` to your EC2 API URL (e.g. `http://YOUR_EC2_IP:3000`)
