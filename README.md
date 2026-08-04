# Store Management System

Internal single-login distribution store management app built with Next.js, Prisma, PostgreSQL, and Tailwind CSS.

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET`, `OWNER_USERNAME`, and `OWNER_PASSWORD`.
2. Install dependencies: `npm install`
3. Create tables and seed the shared owner login: `npx prisma migrate dev --name init && npm run prisma:seed`
4. Start locally: `npm run dev`

The app is structured for Railway deployment. Set the same environment variables in Railway and run Prisma migrations during deployment.



Products:        10,000+
Batches:         50,000+
Shops:           10,000+
Invoices:        100,000+
Invoice items:   500,000+
Payments:        200,000+
Trips:           50,000+
Trip items:      300,000+


npm run start -- -p 3003

## Admin database backup

Backups are for developer/admin use only. Do not add backup files to GitHub.

1. Install PostgreSQL client tools on the backup computer so `pg_dump` is available in terminal.
2. Set these values in `.env`:

```env
DATABASE_URL="postgresql://..."
BACKUP_DIR="D:\\SBDP-Backups"
BACKUP_RETENTION_DAYS="60"
```

3. Run a manual backup before migrations or deployments:

```bash
npm run backup
```

The backup file format is PostgreSQL custom format:

```text
sbdp-backup-YYYY-MM-DD-HH-mm-ss.backup
```

Recommended Windows Task Scheduler action:

```text
Program: powershell.exe
Arguments: -NoProfile -ExecutionPolicy Bypass -Command "Set-Location 'C:\Users\TFF_DEAD\Documents\Stock Management'; npm run backup"
```

Use a OneDrive or Google Drive synced folder for `BACKUP_DIR` if possible.
