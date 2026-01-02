# Quick Start Guide

This guide will help you get the Shopping Planner application up and running locally using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git
- direnv (recommended for environment variable management)

## Setup Steps

### 1. Clone and Navigate

```bash
cd /Users/sloehr/development/general-supply-shopping-planer
```

### 2. Configure Environment Variables

The project uses direnv for environment variable management:

- If you use direnv: The `.envrc` file will automatically load variables from `.envrc.dist` and parent directories
- If you don't use direnv: You can manually source the file:
  ```bash
  source .envrc.dist
  ```

To customize values, edit `.envrc` (it's gitignored) and add your overrides after the `source .envrc.dist` line.

### 3. Start the Application

Start all services with Docker Compose:

```bash
docker-compose up
```

Or run in detached mode (background):

```bash
docker-compose up -d
```

### 4. Verify Services

Once all containers are running, you should be able to access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **API Info**: http://localhost:3001/api

### 5. View Logs

To view logs from all services:

```bash
docker-compose logs -f
```

To view logs from a specific service:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 6. Stop the Application

Stop all services:

```bash
docker-compose down
```

Stop and remove volumes (⚠️ this will delete database data):

```bash
docker-compose down -v
```

## Development Workflow

### Rebuilding Containers

If you make changes to Dockerfiles or need to rebuild:

```bash
docker-compose build
docker-compose up
```

Or rebuild and start in one command:

```bash
docker-compose up --build
```

### Accessing Containers

To access a running container's shell:

```bash
# Backend container
docker-compose exec backend sh

# Frontend container
docker-compose exec frontend sh

# Database container
docker-compose exec postgres psql -U shopping_planner -d shopping_planner
```

### Installing New Dependencies

If you add new npm packages:

1. **Backend**: Edit `backend/package.json`, then rebuild:
   ```bash
   docker-compose build backend
   docker-compose up backend
   ```

2. **Frontend**: Edit `frontend/package.json`, then rebuild:
   ```bash
   docker-compose build frontend
   docker-compose up frontend
   ```

## Troubleshooting

### Port Already in Use

If you get an error about ports being in use, either:
- Stop the service using the port
- Change the port in `.envrc.dist` or your `.envrc` file

### Database Connection Issues

If the backend can't connect to the database:
1. Check that PostgreSQL container is running: `docker-compose ps`
2. Wait a few seconds for PostgreSQL to fully start
3. Check database logs: `docker-compose logs postgres`

### Container Won't Start

1. Check logs: `docker-compose logs [service-name]`
2. Rebuild containers: `docker-compose build --no-cache`
3. Remove old containers: `docker-compose down -v` (⚠️ deletes data)

## Next Steps

Once the Docker setup is running, you can proceed with:
- Setting up the database schema (Phase 1, Step 1.3)
- Implementing the backend API (Phase 2)
- Building the frontend UI (Phase 3)

See [MVP_PLAN.md](./MVP_PLAN.md) for the full development plan.

