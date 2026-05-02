# Checkbook Register - Setup Instructions

This document provides instructions for setting up and running the Checkbook Register application locally or with Docker.

## Prerequisites

### Local Development
- **Node.js** 18+ ([download](https://nodejs.org/))
- **MySQL** 8.0+ ([download](https://dev.mysql.com/downloads/mysql/))
- **Angular CLI** `npm install -g @angular/cli`

### Docker Deployment
- **Docker** ([download](https://www.docker.com/))
- **Docker Compose** (included with Docker Desktop)

---

## Local Development Setup

### 1. Database Setup

Create MySQL database and tables:

```bash
# Login to MySQL
mysql -u root -p

# Create database and import schema
CREATE DATABASE checkbook_register;
USE checkbook_register;
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

Or run as a single command:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env

# Edit .env with your MySQL credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password

# Run in development mode (with TypeScript)
npm run dev

# Or compile and run
npm run build
node dist/index.js
```

Backend will be available at `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server with proxy to backend
ng serve

# Or
npm start
```

Frontend will be available at `http://localhost:4200` with automatic proxy to backend API.

### 4. Access the Application

1. Open browser to `http://localhost:4200`
2. The app will initialize with test users ("Russ" and "Jane")
3. Select a user from the dropdown to get started

---

## Docker Deployment

### 1. Prepare Environment

```bash
# Copy and edit the Docker environment file
cp .env.docker .env

# Edit .env with your desired credentials
# DB_PASSWORD=choose_a_secure_password
# DB_ROOT_PASSWORD=root_password
```

### 2. Build and Run with Docker Compose

```bash
# Build and start both containers
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

The app will be available at `http://localhost:3000`

### 3. Database Initialization

The MySQL container will automatically initialize with the schema and seed data from:
- `database/schema.sql`
- `database/seed.sql`

### 4. Stop Containers

```bash
# Stop running containers
docker-compose down

# Stop and remove volumes (caution: deletes database data)
docker-compose down -v
```

---

## Architecture Overview

### Backend (Express + TypeScript)
- **Port:** 3000
- **Database:** MySQL with 5 tables (users, transactions, accounts, categories, descriptions)
- **API:** RESTful endpoints with `{ data, error }` response format
- **Location:** `/backend/src`
- **Build output:** `/backend/dist`

### Frontend (Angular)
- **Port:** 4200 (dev) or served from Express (production)
- **Framework:** Angular 17 with TypeScript strict mode
- **State Management:** Services with BehaviorSubject (no NgRx)
- **Components:** Dashboard (Balances, Transactions, Pending), Categories, Admin
- **Location:** `/frontend/src`
- **Build output:** `/frontend/dist`

### Database (MySQL)
- **Port:** 3306
- **Tables:** users, transactions, accounts, categories, descriptions
- **Seed Data:** Test users (Russ, Jane) with sample transactions

---

## API Endpoints

### Users
- `GET /api/users` — List all users
- `POST /api/users` — Create user
- `DELETE /api/users/:id` — Delete user

### Transactions
- `GET /api/users/:userId/page-data` — Initial load (current year + balances)
- `GET /api/users/:userId/transactions?year=YYYY` — Transactions for year
- `POST /api/users/:userId/transactions` — Create transaction
- `POST /api/users/:userId/transactions/batch` — Create transfer pair (atomic)
- `PUT /api/users/:userId/transactions/:id` — Edit transaction
- `DELETE /api/users/:userId/transactions/:id` — Delete transaction

### References
- `GET/POST/PUT/DELETE /api/users/:userId/accounts` — Manage accounts
- `GET/POST/PUT/DELETE /api/users/:userId/categories` — Manage categories
- `GET /api/users/:userId/categories?type=expense|income|transfer` — Filter by type
- `GET/POST/PUT/DELETE /api/users/:userId/txn-descriptions` — Manage descriptions

### Analytics
- `GET /api/users/:userId/categories?year=YYYY&month=MM` — Category totals
- `GET /api/users/:userId/monthly-difference?year=YYYY&month=MM` — (Income - Expenses)

---

## File Structure

```
checkbook-register/
├── backend/                    # Express + TypeScript backend
│   ├── src/
│   │   ├── types/             # TypeScript interfaces
│   │   ├── controllers/       # Business logic
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Error handling
│   │   ├── db.ts              # MySQL connection pool
│   │   └── index.ts           # Express app entry point
│   ├── dist/                  # Compiled JavaScript (generated)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                   # Database credentials
│
├── frontend/                  # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Services, models, interceptors
│   │   │   ├── features/      # Dashboard, Admin modules
│   │   │   ├── shared/        # Reusable components, directives
│   │   │   └── app.component  # Root component
│   │   ├── styles.scss        # Global styles
│   │   └── main.ts            # Bootstrap entry
│   ├── dist/                  # Built frontend (generated)
│   ├── package.json
│   ├── tsconfig.json
│   ├── proxy.conf.json        # Dev proxy config
│   └── angular.json
│
├── database/
│   ├── schema.sql             # MySQL schema
│   └── seed.sql               # Sample data
│
├── Dockerfile                 # Multi-stage build
├── docker-compose.yml         # Container orchestration
├── .env.example               # Backend env template
├── .env.docker                # Docker env template
├── CLAUDE.md                  # Implementation guidelines
└── SETUP.md                   # This file
```

---

## Troubleshooting

### MySQL Connection Error
**Error:** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solutions:**
- Ensure MySQL is running: `mysql -u root -p`
- Check `.env` file has correct credentials
- Update `DB_HOST` to `localhost` or `127.0.0.1`

### Frontend Cannot Reach Backend
**Error:** `Failed to connect to backend` or CORS errors

**Solutions:**
- Ensure backend is running on port 3000: `npm run dev` from `/backend`
- Check `frontend/proxy.conf.json` points to correct backend URL
- In development, the Angular dev server proxies `/api` requests to the backend

### Docker Build Fails
**Error:** `npm ERR! in /app/backend`

**Solutions:**
- Ensure Docker daemon is running
- Check Node.js version: `docker run node:18-alpine node -v`
- Review Docker build logs: `docker-compose build --no-cache`

### Port Already in Use
**Error:** `bind: address already in use`

**Solutions:**
- Backend (3000): `lsof -i :3000` to find process, `kill -9 <PID>`
- Frontend (4200): Change port with `ng serve --port 4201`
- Docker: Change port in `docker-compose.yml`: `"3001:3000"`

---

## Testing

### Backend Testing with Postman/Thunder Client

1. Create request to `GET http://localhost:3000/api/users`
2. Should return: `{ "data": [{ "id": 1, "name": "Russ", ... }, ...] }`
3. Test other endpoints to verify API responses

### Frontend Testing

1. Navigate to `http://localhost:4200`
2. Verify app loads without console errors
3. Create a transaction and confirm it appears in the table
4. Edit/delete transactions to verify CRUD operations
5. Switch users in dropdown to test data isolation

---

## Environment Variables

### Backend (`.env`)
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=checkbook_register
DB_USER=root
DB_PASSWORD=password
NODE_ENV=development
PORT=3000
```

### Docker (`.env` in root)
```
DB_PASSWORD=secure_password
DB_ROOT_PASSWORD=root_password
NODE_ENV=production
APP_PORT=3000
```

---

## Next Steps

1. **Verify backend** runs and all endpoints respond
2. **Verify frontend** loads and connects to backend
3. **Test CRUD operations** on transactions, accounts, categories
4. **Test user switching** and data isolation
5. **Build Docker images** and test deployment
6. **Customize seed data** with real accounts and categories
7. **Configure deployment environment** (production database, domain, etc.)

---

## Support

For issues or questions:
- Check CLAUDE.md for implementation guidelines
- Review database schema in `database/schema.sql`
- Check console logs for error messages
- Verify all environment variables are set correctly

---

Last updated: May 2026
