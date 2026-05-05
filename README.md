# Ledger

A self-hosted full-stack financial ledger application built with Express.js, Angular, and MySQL. Features multi-user support without authentication, dark theme with customizable colors, and comprehensive transaction tracking with categories, accounts, and pending transactions.

## Features

- **Multi-user support** — User dropdown switcher for seamless account switching (no login required)
- **Transaction management** — Deposits, withdrawals, transfers with categories and descriptions
- **Pending transactions** — Flag transactions as pending for review before finalizing
- **Account balances** — Real-time balance calculations per account
- **Customizable theme** — Built-in themes with dark mode support
- **Customizable formatting** — Currency symbols, decimal separators, negative amount formatting
- **Backup system** — Automatic and manual backups with scheduled jobs
- **Responsive design** — Dark theme with teal/cyan accents
- **Containerized** — Docker support for easy deployment

## Requirements

- **Docker** and **Docker Compose** (for containerized deployment)
  - Docker uses Node.js v20 (handled automatically in container)
- **MySQL** v5.7+ (database server, can be local, remote, or in separate container)

*For local development without Docker:*
- **Node.js** v20.19 or higher (Angular requirement)
- **npm** v9+

## Quick Start (Docker)

### 1. Database Setup

Ensure MySQL is running and accessible. Create a database and user:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE ledger;
CREATE USER 'ledger_user'@'%' IDENTIFIED BY 'ledger_password';
GRANT ALL PRIVILEGES ON ledger.* TO 'ledger_user'@'%';
GRANT CREATE ON ledger.* TO 'ledger_user'@'%';
FLUSH PRIVILEGES;
```

> **Note:** Replace `'%'` with your specific host (e.g., `'localhost'`, `'192.168.1.100'`) for security.
> The `GRANT CREATE` permission is required for automatic schema initialization.

### 2. Configure Docker Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env  # Or create manually
```

**.env file contents:**
```
DB_HOST=192.168.1.100        # Your MySQL server IP/hostname
DB_PORT=3306
DB_NAME=ledger
DB_USER=ledger_user
DB_PASSWORD=ledger_password
```

Or use `localhost` if MySQL is running on your machine:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ledger
DB_USER=ledger_user
DB_PASSWORD=ledger_password
```

### 3. Build and Run with Docker

```bash
# Build the Docker image
docker-compose build

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f app
```

The app will be available at **http://localhost:3000**

### 4. Stop the Container

```bash
docker-compose down
```

### 5. View Backups

Backups are stored in a Docker volume and accessible via:

```bash
docker-compose exec app ls -la /app/backups/
```

Or from your filesystem at: `./backups/` (mounted directory)

---

## Local Development (Without Docker)

For development, you can run the backend and frontend in separate terminals:

### 1. Database Setup

Create a MySQL database and user:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE ledger;
CREATE USER 'ledger_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ledger.* TO 'ledger_user'@'localhost';
GRANT CREATE ON ledger.* TO 'ledger_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ledger
DB_USER=ledger_user
DB_PASSWORD=your_password
PORT=3000
NODE_ENV=development
EOF

# Start backend (development mode with auto-reload)
npm run dev
```

**Expected output:**
```
✓ Database connected successfully
[Database] Starting initialization...
✓ Database schema initialized successfully
✓ Express server running on http://localhost:3000
```

### 3. Frontend Setup

In a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start Angular dev server (with proxy to backend)
ng serve --proxy-config proxy.conf.json
```

Frontend runs on **http://localhost:4200** and proxies API requests to http://localhost:3000.

---

## Usage

Open the app in your browser and:

1. **User Management** — Use the **User dropdown** (top-right) to switch users or create new users
2. **Dashboard tab:**
   - View account balances
   - See pending transactions
   - Browse transaction history with year/month filtering
3. **Admin tab:**
   - Manage accounts, categories, descriptions
   - Configure user settings (theme, currency formatting, negative format)
   - Access backup settings and manage backups

## Transaction Types

- **W (Withdrawal)** — Money out (expense)
- **D (Deposit)** — Money in (income)
- **TW (Transfer Withdrawal)** — Transfer out from account
- **TD (Transfer Deposit)** — Transfer in to account

Transfers are created as paired TW/TD transactions with identical amounts.

## Troubleshooting

### Docker: Can't connect to MySQL

The app container is trying to reach MySQL at the DB_HOST you specified in `.env`.

**If MySQL is on localhost (same machine):**
```env
DB_HOST=host.docker.internal  # Special hostname Docker provides
```

**If MySQL is on a remote server:**
```env
DB_HOST=192.168.1.100  # Use the server's IP address
```

**Test connection:**
```bash
mysql -h <DB_HOST> -u ledger_user -p
```

### Docker: "address already in use" for port 3000

Another container is using port 3000. Kill it or use a different port:

```bash
# Stop all containers
docker-compose down

# Or use a different port in docker-compose.yml:
# Change "3000:3000" to "8080:3000"
```

### Database initialization fails with "CREATE command denied"

The MySQL user doesn't have CREATE permissions. Fix with:

```sql
GRANT CREATE ON ledger.* TO 'ledger_user'@'%';
FLUSH PRIVILEGES;
```

Then restart the app container:
```bash
docker-compose restart app
```

### GET /api/users returns 500 error

Check the Docker logs:
```bash
docker-compose logs app
```

Common issues:
- Database credentials in `.env` are incorrect
- MySQL server is not running or not accessible from the container
- User doesn't have proper permissions (see "CREATE command denied" above)

### Local development: Frontend can't connect to backend

- Ensure backend is running on http://localhost:3000
- Check `frontend/proxy.conf.json` for correct proxy target
- Restart frontend: `ng serve`

---

## Project Structure

```
ledger/
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Multi-stage build for app container
├── .env.example                # Environment variables template
├── database/
│   └── schema.sql              # Database schema (auto-applied on startup)
├── backend/
│   ├── src/
│   │   ├── database.ts         # Database initialization
│   │   ├── db.ts               # MySQL connection pool
│   │   ├── index.ts            # Express app entry
│   │   ├── types/              # Shared TypeScript interfaces
│   │   ├── routes/             # API route handlers
│   │   ├── controllers/        # Business logic
│   │   ├── services/           # Backup and scheduler services
│   │   └── middleware/         # Error handling
│   ├── dist/                   # Compiled JavaScript (generated)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/           # Services, models, interceptors
│   │   │   ├── features/       # Feature modules (dashboard, admin)
│   │   │   └── shared/         # Reusable components, pipes
│   │   └── index.html
│   ├── dist/                   # Compiled Angular (generated)
│   ├── proxy.conf.json         # Dev proxy to backend
│   └── angular.json
├── plans/
│   ├── plan_file.md            # Implementation specification
│   └── ui_imgs/                # UI reference images
├── CLAUDE.md                    # Implementation guidelines
└── README.md                    # This file
```

## Docker Images

The `Dockerfile` uses a multi-stage build:

1. **Builder stage** — Compiles backend TypeScript and builds Angular frontend
2. **Final stage** — Contains only compiled code and node_modules (lightweight)

Result: A single container running both backend (Express) and frontend (served by Express).

```bash
# Build manually
docker build -t ledger .

# Run manually
docker run -p 3000:3000 \
  -e DB_HOST=localhost \
  -e DB_USER=ledger_user \
  -e DB_PASSWORD=ledger_password \
  -v ./backups:/app/backups \
  ledger
```

Or use Docker Compose (recommended): `docker-compose up`

## Architecture

### Deployment (Docker)

```
┌─────────────────────┐
│   Docker Container  │
├─────────────────────┤
│ Angular Frontend    │ → Served by Express
│ + Express Backend   │ → http://localhost:3000
└─────────────────────┘
         ↓
   ┌───────────────┐
   │  MySQL DB     │
   │  (external)   │
   └───────────────┘
```

### Data Flow

1. **Frontend** (Angular) — User interactions → API requests
2. **Backend** (Express) — Validates requests, queries database, returns `{ data, error }`
3. **Database** (MySQL) — Persistent data storage with referential integrity

### User Isolation

All API endpoints are scoped by `user_id`:
- `/api/users/:userId/transactions`
- `/api/users/:userId/accounts`
- `/api/users/:userId/categories`

No cross-user data leakage — all queries filter by `user_id`.

## Development

### Building

```bash
# Backend only
cd backend && npm run build

# Frontend only
cd frontend && npm run build

# Both (via Docker)
docker-compose build
```

### Testing

**Backend API:**
```bash
# Using curl
curl http://localhost:3000/api/users

# Or use Postman/Thunder Client
GET http://localhost:3000/api/users
```

**Frontend:**
Visit http://localhost:3000 (or http://localhost:4200 for dev mode)

## Key Files

- **`database/schema.sql`** — MySQL table definitions (auto-created)
- **`backend/src/database.ts`** — Auto-initializes schema on startup
- **`backend/src/index.ts`** — Express app and server setup
- **`Dockerfile`** — Multi-stage build configuration
- **`docker-compose.yml`** — Docker Compose service definition
- **`frontend/src/app/features/dashboard/`** — Main dashboard component
- **`frontend/src/app/features/admin/`** — Admin panel component

## Deployment Checklist

- [ ] MySQL database created and user has CREATE permissions
- [ ] `.env` file configured with correct DB_HOST, DB_USER, DB_PASSWORD
- [ ] Docker and Docker Compose installed
- [ ] Run: `docker-compose build`
- [ ] Run: `docker-compose up -d`
- [ ] Verify logs: `docker-compose logs app`
- [ ] Access app: http://localhost:3000
- [ ] Create a test user and transaction
- [ ] Verify data persists after restart: `docker-compose restart app`

## Implementation Status

- ✅ Database schema and auto-initialization
- ✅ User management (multi-user without authentication)
- ✅ Transaction CRUD operations (W/D/TW/TD types)
- ✅ Account, category, description management
- ✅ Dashboard with transaction tables and balances
- ✅ Pending transactions support
- ✅ Theme system with dark mode support
- ✅ Backup scheduling and restore
- ✅ Admin panel with settings and reference management
- ✅ Docker containerization
- ✅ Mobile-responsive UI

## Documentation

- **`CLAUDE.md`** — Implementation guidelines and hard rules
- **`plans/plan_file.md`** — Full specification and requirements
- **`plans/ui_imgs/`** — UI reference images (26 screens)
- **Backend code** — TypeScript with strict typing
- **Frontend code** — Angular with explicit component types

## License

Internal project — Ledger
