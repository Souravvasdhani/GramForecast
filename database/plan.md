# Render PostgreSQL Deployment Plan

This plan runs PostgreSQL yourself as a Docker-based private service on Render. The service must have a Render persistent disk mounted at PostgreSQL's data directory, or all database data will be lost when the container is redeployed.

The existing `database/Dockerfile` is a Python seeder image. It is not a PostgreSQL image. Add a separate PostgreSQL Dockerfile for the database service and keep the existing Dockerfile for the one-shot seed job.

## 1. Prepare the repository

- Confirm `database/schema.sql` is the schema to deploy.
- Confirm `database/seed.py` is appropriate for the target environment.
- Decide whether this is a demo deployment or a production deployment.
- Do not commit real passwords, API keys, or a production database URL.

Important repository notes:

- `schema.sql` creates enum types and tables without migration wrappers. Run it against a new, empty Render database. Do not use it as a repeatable migration on an already-populated database.
- `seed.py` inserts demo data and prints the demo login (`+919876543210` / `Demo@12345`). Run it once only, and change or remove that account before treating the environment as production.
- `seed.py` defaults to localhost when `DATABASE_URL` is absent. Always set `DATABASE_URL` explicitly in Render or in the local shell used for deployment.

## 2. Add a PostgreSQL Docker image

Create `database/postgres.Dockerfile` with this design:

```dockerfile
FROM postgres:15-alpine
COPY schema.sql /docker-entrypoint-initdb.d/01_schema.sql
```

PostgreSQL's official entrypoint runs files in `/docker-entrypoint-initdb.d` only when the data directory is initialized for the first time. This is why the persistent disk must be empty for the initial deployment.

Build and test the database image locally:

```sh
docker build -f database/postgres.Dockerfile -t gramforecast-postgres ./database
```

Run it locally with a named volume and verify that the schema initializes:

```sh
docker volume create gramforecast-postgres-data
docker run --rm --name gramforecast-postgres \
  -e POSTGRES_DB=gramforecast \
  -e POSTGRES_USER=gramuser \
  -e POSTGRES_PASSWORD=change-me \
  -p 5432:5432 \
  -v gramforecast-postgres-data:/var/lib/postgresql/data \
  gramforecast-postgres
```

Do not use a real production password in local commands, shell history, or source control.

## 4. Create the Render Docker database service

1. Sign in to Render and choose the GramForecast workspace.
2. Select **New > Private Service**.
3. Connect the Git repository and set the service root directory to `database`.
4. Select **Docker** as the runtime.
5. Set the Dockerfile path to `postgres.Dockerfile`.
6. Use one Render region for the database, backend, ML service, and seeder.
7. Add these environment variables:

```sh
POSTGRES_DB=gramforecast
POSTGRES_USER=gramuser
POSTGRES_PASSWORD=<strong-secret>
```

8. Add a Render persistent disk mounted at `/var/lib/postgresql/data`.
9. Use a disk size appropriate for the expected data and backups.
10. Do not expose this service as a public web service unless external database access is explicitly required.

Deploy the service and inspect its logs for PostgreSQL startup and schema initialization. The schema is applied automatically by the image on the first boot.

Do not delete or detach the persistent disk during normal redeployments. If the service is redeployed with an existing data directory, the init script will not run again.

## 5. Verify the database structure

Run checks from a temporary Docker client container or a Render shell connected to the private service:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "\dt"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm') ORDER BY extname;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) AS businesses FROM businesses;"
```

Before seeding, `businesses` should normally be `0`. If the schema command failed or the database is not empty, stop and inspect the database rather than rerunning the full schema blindly.

## 6. Run the existing Docker seeder on Render

### Preferred Render approach

Create a temporary Render **Background Worker** using Docker:

- **Runtime:** Docker
- **Dockerfile path:** `Dockerfile`
- **Docker build context/root directory:** `database`
- **Start command:** use the Dockerfile `CMD` (`python seed.py`)
- **Environment variable:** `DATABASE_URL` set to `postgresql://gramuser:<password>@<private-database-host>:5432/gramforecast`

Deploy or run the container once. Check the logs for `Seed complete!`, the inserted sales count, and the generated business ID. Then remove the temporary service or disable its schedule so it cannot seed repeatedly.

For a manual Docker run against a reachable database, use:

```sh
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  gramforecast-seeder
```

For a repeatable production workflow, create a separate migration/bootstrap image whose entrypoint applies versioned migrations before seeding. Do not make the application container run `seed.py` on every restart.

### Local alternative

The seed script can be run from a machine that can reach the database:

```sh
DATABASE_URL="$DATABASE_URL" \
  python database/seed.py
```

The database requirements must be installed first:

```sh
python -m pip install -r database/requirements.txt
```

## 7. Connect the Render application services

For the Render backend and ML service, add this environment variable in each service's settings. Use the private database service hostname supplied by Render:

```text
DATABASE_URL=postgresql://gramuser:<password>@<private-database-host>:5432/gramforecast
```

Also configure the service-specific values already expected by the repository, especially:

- `JWT_SECRET`: a newly generated, long random production secret
- `CORS_ORIGINS`: the deployed frontend URL, not only localhost URLs
- `ML_SERVICE_URL`: the deployed ML service URL for the backend
- `GROQ_API_KEY`: only where AI features require it

Redeploy the backend and ML service after adding the variables. Do not use the local Docker Compose hostname `postgres` unless the Render database service is actually named `postgres` and resolves that way.

## 8. Validate end to end

1. Check the Render backend health endpoint and service logs.
2. Confirm the backend starts without a database connection error.
3. Log in with the seeded demo account only if this is a demo environment.
4. Open dashboard, sales, inventory, forecast, alert, and market views.
5. Confirm the database contains the expected related records:

```sh
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM businesses; SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM products; SELECT COUNT(*) FROM sales; SELECT COUNT(*) FROM forecasts; SELECT COUNT(*) FROM inventory_snapshots; SELECT COUNT(*) FROM market_signals; SELECT COUNT(*) FROM alerts; SELECT COUNT(*) FROM reports;"
```

6. Test a backend write in a non-production/demo environment and verify it is visible after a fresh read.

## 9. Backups and production hardening

- Configure independent backups for the persistent disk. A persistent disk is storage, not a backup.
- Document how to stop the application before restoring a disk backup.
- Record the database region, service owner, backup policy, and restore procedure.
- Rotate the seeded demo password or replace the seed account before production use.
- Restrict database access to the application services where possible.
- Use schema migrations for future changes instead of rerunning the initial `schema.sql`.
- Remove temporary seeder resources and ensure no scheduled job can execute `seed.py` again.
- Keep the database container separate from the application containers; only the database service owns persistent data.

## Completion checklist

- [ ] PostgreSQL Docker image builds successfully.
- [ ] Render private Docker service is running with a persistent disk.
- [ ] Docker seeder image builds successfully.
- [ ] `schema.sql` applied successfully to the empty database.
- [ ] Extensions, tables, indexes, and foreign keys verified.
- [ ] Seed data inserted once, if required.
- [ ] Backend and ML service use the Internal Database URL.
- [ ] Secrets and CORS settings configured in Render.
- [ ] Application smoke tests pass.
- [ ] Backups and production access controls configured.