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