# 10xcoder.club

<div align="center">

[![Bun](https://img.shields.io/badge/Bun-1.2+-black?logo=bun&logoColor=white)](https://bun.sh)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.6+-EF4444?logo=turborepo&logoColor=white)](https://turbo.build)
[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Elysia](https://img.shields.io/badge/Elysia-1.3+-000000?logo=elysia&logoColor=white)](https://elysiajs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**One place for developers to learn, build, and grow together.**

A community-driven platform built with modern technologies to help developers become 10x better.

[Getting Started](#-getting-started) •
[Project Structure](#-project-structure) •
[Contributing](#-contributing) •
[Development](#-development)

</div>

---

## ✨ Features

- 🚀 **Turborepo** - High-performance monorepo build system with intelligent caching
- ⚡ **Bun** - Fast JavaScript runtime and package manager
- 🌐 **Next.js 16** - React framework for the web frontend
- 🔥 **Elysia** - High-performance TypeScript backend framework
- 📦 **Shared Packages** - Reusable schemas, UI components, and configurations
- 🎨 **Shadcn/UI** - Beautiful, accessible component library
- 🔒 **Type-Safe** - End-to-end TypeScript with shared Zod schemas
- 📝 **Code Quality** - ESLint, Prettier, Husky, and Commitlint

---

## 📁 Project Structure

```
10xcoder.club/
├── apps/
│   ├── web/                 # Next.js frontend application
│   │   ├── app/             # App router pages
│   │   ├── components/      # App-specific components
│   │   ├── env/             # Environment configuration
│   │   └── lib/             # Utility functions
│   │
│   └── api/                 # Elysia backend API
│       └── src/
│           ├── config/      # Environment & app configuration
│           └── db/          # Database utilities (Drizzle ORM)
│
├── packages/
│   ├── schemas/             # Shared Zod schemas & TypeScript types
│   ├── ui/                  # Shared UI components (Shadcn/UI)
│   ├── eslint-config/       # Shared ESLint configuration
│   └── typescript-config/   # Shared TypeScript configuration
│
├── scripts/                 # Utility scripts
│   ├── ui-add.sh            # Add shadcn/ui components
│   └── ui-diff.sh           # Diff shadcn/ui components
│
├── turbo.json               # Turborepo configuration
└── package.json             # Root package configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **[Bun](https://bun.sh)** v1.2+ - Install with:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **[PostgreSQL](https://www.postgresql.org/)** - For the API database
- **[Redis](https://redis.io/)** - For caching (install via Homebrew: `brew install redis`)
- **[Git](https://git-scm.com/)** - Version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/techysiddhant/10xcoder.club.git
   cd 10xcoder.club
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   Copy the example environment files and configure them:

   ```bash
   # API environment
   cp apps/api/.env.example apps/api/.env

   # Web environment
   cp apps/web/.env.example apps/web/.env.local
   ```

   Edit the files with your configuration (see [Environment Variables](#-environment-variables) section).

4. **Set up the database**

   Make sure PostgreSQL is running and create a database matching your `.env` configuration.

5. **Start development servers**

   ```bash
   bun run dev
   ```

6. **Open in browser**
   - **Web App**: [http://localhost:3001](http://localhost:3001)
   - **API Server**: [http://localhost:3000](http://localhost:3000)
   - **API Docs**: [http://localhost:3000/swagger](http://localhost:3000/swagger)

---

## 🔐 Environment Variables

### API (`apps/api/.env`)

| Variable                | Required | Default       | Description                                                  |
| ----------------------- | -------- | ------------- | ------------------------------------------------------------ |
| `NODE_ENV`              | No       | `development` | Environment mode: `development`, `test`, `production`        |
| `PORT`                  | No       | `3000`        | API server port                                              |
| `LOG_LEVEL`             | No       | `info`        | Logging level: `debug`, `info`, `warn`, `error`              |
| `CORS_ORIGIN`           | No       | -             | Comma-separated allowed origins (permissive in dev if unset) |
| `POSTGRES_USER`         | **Yes**  | -             | PostgreSQL username                                          |
| `POSTGRES_PASSWORD`     | **Yes**  | -             | PostgreSQL password                                          |
| `POSTGRES_DB`           | **Yes**  | -             | PostgreSQL database name                                     |
| `POSTGRES_HOST`         | **Yes**  | -             | PostgreSQL host                                              |
| `POSTGRES_PORT`         | No       | `5432`        | PostgreSQL port                                              |
| `REDIS_URL`             | **Yes**  | -             | Redis connection URL for caching                             |
| `API_URL`               | **Yes**  | -             | Public API URL (for auth callbacks)                          |
| `BETTER_AUTH_SECRET`    | **Yes**  | -             | Secret key for session encryption (min 32 chars)             |
| `DOMAIN`                | **Yes**  | -             | Domain for cookies (e.g., `localhost` or `yourdomain.com`)   |
| `GITHUB_CLIENT_ID`      | **Yes**  | -             | GitHub OAuth App client ID                                   |
| `GITHUB_CLIENT_SECRET`  | **Yes**  | -             | GitHub OAuth App client secret                               |
| `YOUTUBE_API_KEY`       | No       | -             | YouTube Data API v3 key (enables rich video/playlist data)   |
| `GEMINI_API_KEY`        | No       | -             | Gemini API key for semantic search embeddings                |
| `RESEND_API_KEY`        | No       | -             | Resend API key for transactional emails                      |
| `AWS_ACCESS_KEY_ID`     | No       | -             | AWS access key for S3 uploads                                |
| `AWS_SECRET_ACCESS_KEY` | No       | -             | AWS secret key for S3 uploads                                |
| `AWS_S3_BUCKET`         | No       | -             | S3 bucket name for uploads                                   |
| `AWS_REGION`            | No       | `ap-south-1`  | AWS region                                                   |

### Web (`apps/web/.env.local`)

| Variable              | Required | Default                 | Description     |
| --------------------- | -------- | ----------------------- | --------------- |
| `NEXT_PUBLIC_API_URL` | No       | `http://localhost:3000` | Backend API URL |

---

## 💻 Development

### Available Scripts

Run from the repository root:

| Command                      | Description                            |
| ---------------------------- | -------------------------------------- |
| `bun run dev`                | Start all apps in development mode     |
| `bun run build`              | Build all apps and packages            |
| `bun run lint`               | Lint all apps and packages             |
| `bun run typecheck`          | Run TypeScript type checking           |
| `bun run format`             | Format code with Prettier              |
| `bun run format:check`       | Check code formatting                  |
| `bun run clean`              | Clean all build outputs                |
| `bun run ui:add <component>` | Add shadcn/ui component to packages/ui |
| `bun run ui:diff`            | Check for shadcn/ui updates            |

### Adding UI Components

Use the helper script to add shadcn/ui components to the shared UI package:

```bash
# Add a single component
bun run ui:add button

# Add multiple components
bun run ui:add button dialog sheet avatar
```

### Shared Schemas

Edit schemas in `packages/schemas/src/index.ts`. These Zod schemas are used by both the frontend and backend for:

- API request/response validation
- Form validation
- TypeScript type inference

```typescript
// Example usage in apps
import { z, UserSchema } from '@workspace/schemas'

// Get inferred type
type User = z.infer<typeof UserSchema>
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Workflow

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/10xcoder.club.git
   cd 10xcoder.club
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/techysiddhant/10xcoder.club.git
   ```

4. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

5. **Make your changes**
   - Write clean, documented code
   - Follow the existing code style
   - Add tests if applicable

6. **Commit your changes**

   We use [Conventional Commits](https://www.conventionalcommits.org/). Your commit messages should follow this format:

   ```
   <type>(<scope>): <description>

   [optional body]

   [optional footer(s)]
   ```

   **Types:**
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation changes
   - `style`: Code style changes (formatting, etc.)
   - `refactor`: Code refactoring
   - `perf`: Performance improvements
   - `test`: Adding or updating tests
   - `chore`: Maintenance tasks
   - `ci`: CI/CD changes

   **Examples:**

   ```bash
   git commit -m "feat(api): add user authentication endpoint"
   git commit -m "fix(web): resolve hydration mismatch in header"
   git commit -m "docs: update README with contribution guidelines"
   ```

7. **Keep your branch updated**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

8. **Push your changes**

   ```bash
   git push origin feature/your-feature-name
   ```

9. **Open a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template with details about your changes

### Code Quality Guidelines

- **TypeScript**: All code must be written in TypeScript with proper types
- **Linting**: Run `bun run lint` before committing
- **Formatting**: Run `bun run format` to format code with Prettier
- **Type Checking**: Run `bun run typecheck` to ensure no type errors
- **Commit Hooks**: Husky will automatically run lint-staged and commitlint on commits

### Pull Request Guidelines

- ✅ Title should follow conventional commit format
- ✅ Include a clear description of changes
- ✅ Reference any related issues (e.g., "Fixes #123")
- ✅ Ensure all CI checks pass
- ✅ Request review from maintainers
- ✅ Respond to feedback promptly

### Reporting Issues

Found a bug or have a feature request?

1. Check [existing issues](https://github.com/techysiddhant/10xcoder.club/issues) first
2. Open a new issue with:
   - Clear, descriptive title
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior (for bugs)
   - Use case and benefits (for features)
   - Screenshots if applicable

---

## 🐳 Docker

### Building the API

Build the Docker image from the repository root:

```bash
docker build -f apps/api/Dockerfile -t 10xcoder-api:latest .
```

### Running the Container

```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e CORS_ORIGIN=http://localhost:3001 \
  -e POSTGRES_USER=your_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=your_database \
  -e POSTGRES_HOST=host.docker.internal \
  -e POSTGRES_PORT=5432 \
  10xcoder-api:latest
```

### Production Binary Build

For non-Docker production deployments using Bun's compile feature:

```bash
bun --cwd apps/api run build:binary
./apps/api/server
```

---

## 🌐 Deployment

### Frontend (Vercel)

In your Vercel project settings:

| Setting          | Value           |
| ---------------- | --------------- |
| Root Directory   | `apps/web`      |
| Install Command  | `bun install`   |
| Build Command    | `bun run build` |
| Output Directory | `.next`         |

**Environment Variables:**

- `NEXT_PUBLIC_API_URL` → Your deployed API URL

### Backend (Docker/EC2)

1. Build the Docker image
2. Push to a container registry (ECR, Docker Hub, etc.)
3. Deploy to your server (EC2, DigitalOcean, etc.)
4. Configure reverse proxy (Nginx) for SSL

---

## 📄 License

This project is open source. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Turborepo](https://turbo.build) - Monorepo build system
- [Bun](https://bun.sh) - JavaScript runtime
- [Next.js](https://nextjs.org) - React framework
- [Elysia](https://elysiajs.com) - Backend framework
- [Shadcn/UI](https://ui.shadcn.com) - UI components
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [Zod](https://zod.dev) - Schema validation

---

<div align="center">
  <sub>Built with ❤️ by the 10xcoder.club community</sub>
</div>
