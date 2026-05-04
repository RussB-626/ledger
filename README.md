# Checkbook Register

A self-hosted full-stack financial ledger application built with Express.js, Angular, and MySQL. Features multi-user support without authentication, dark theme with customizable colors, and comprehensive transaction tracking with categories, accounts, and detailed analytics.

## Features

- **Multi-user support** — User dropdown switcher for seamless account switching (no login required)
- **Transaction management** — Deposits, withdrawals, transfers with categories and descriptions
- **Pending transactions** — Flag transactions as pending for review before finalizing
- **Account balances** — Real-time balance calculations per account
- **Category analytics** — Pie charts for expenses and incomes by category
- **Customizable theme** — 6 built-in themes (default, light, high-contrast, colorblind variants)
- **Customizable formatting** — Currency symbols, decimal separators, negative amount formatting
- **Backup system** — Automatic and manual backups with scheduled jobs
- **Responsive design** — Dark theme with teal/cyan accents

## Requirements

- **Node.js** v18+ (backend and frontend build)
- **MySQL** v5.7+ (or compatible)
- **npm** v9+

## Setup

### 1. Database Setup

Create a MySQL database and user:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE checkbook_register;
CREATE USER 'checkbook_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON checkbook_register.* TO 'checkbook_user'@'localhost';
-- IMPORTANT: Must grant CREATE permission for schema auto-initialization
GRANT CREATE ON checkbook_register.* TO 'checkbook_user'@'localhost';
FLUSH PRIVILEGES;
```

> **Note:** If using a remote MySQL server, replace `'localhost'` with your host IP. The backend will automatically create tables from `database/schema.sql` on first run, but the MySQL user **must have CREATE TABLE permissions**.

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env  # Or create manually with:
```

**.env file contents:**
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=checkbook_register
DB_USER=checkbook_user
DB_PASSWORD=your_password
PORT=3000
NODE_ENV=development
```

**Start backend (development):**
```bash
npm run dev
```

Or **build and run (production):**
```bash
npm run build
node dist/index.js
```

The backend will:
1. Connect to MySQL
2. Check if tables exist
3. If missing, automatically create them from `database/schema.sql`
4. Start Express server on http://localhost:3000

**Expected startup logs:**
```
✓ Database connected successfully
[Database] Starting initialization...
[Database] Connected to database, checking for existing tables...
⚙  Database tables not found, initializing schema...
[Database] Found 5 SQL statements to execute
[Database] Executing statement 1/5...
✓ Database schema initialized successfully
✓ Express server running on http://localhost:3000
  Environment: development
[Scheduler] Initializing backup scheduler...
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
ng serve --proxy-config proxy.conf.json
```

Frontend will run on http://localhost:4200 and proxy API requests to the backend at http://localhost:3000.

## Usage

1. Open http://localhost:4200 in your browser
2. Use the **User dropdown** (top-right) to switch between users or create new users
3. **Dashboard tab:**
   - View account balances
   - See pending transactions
   - Browse transaction history with year/month filtering
   - View category analytics
   - Check net worth and monthly differences
4. **Admin tab:**
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

### Database initialization fails with "CREATE command denied"

The MySQL user doesn't have CREATE permissions. Fix with:

```sql
GRANT CREATE ON checkbook_register.* TO 'checkbook_user'@'localhost';
FLUSH PRIVILEGES;
```

### GET /api/users returns 500 error

- Ensure database user has CREATE permissions (see above)
- Check `.env` file in backend folder for correct DB credentials
- Verify MySQL is running: `mysql -u root -p` to test connection
- Check backend logs for detailed error message

### Frontend can't connect to backend

- Ensure backend is running on http://localhost:3000
- Check `frontend/proxy.conf.json` for correct proxy target
- Check browser console for CORS errors

### Port 3000 already in use

```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :3000   # Windows (then taskkill /PID <pid> /F)
```

## Project Structure

```
checkbook-register/
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
│   ├── proxy.conf.json         # Dev proxy to backend
│   └── angular.json
├── plans/
│   ├── plan_file.md            # Implementation specification
│   └── ui_imgs/                # UI reference images
├── CLAUDE.md                    # Implementation guidelines
└── README.md                    # This file
```

## Key Files

- **`database/schema.sql`** — MySQL table definitions (users, transactions, accounts, categories, descriptions)
- **`backend/src/database.ts`** — Auto-initializes schema on startup
- **`backend/src/index.ts`** — Express app setup
- **`frontend/src/app/features/dashboard/dashboard.component.ts`** — Main dashboard logic
- **`frontend/src/app/features/admin/admin.component.ts`** — Admin panel (themes, settings, backups)

## Architecture

### Data Flow

1. **Frontend** (Angular) — User interactions → API requests
2. **Backend** (Express) — Receives requests, validates, queries database, returns `{ data, error }`
3. **Database** (MySQL) — Persistent data storage with referential integrity

### State Management

- **Frontend:** BehaviorSubject services (UserService, PageDataService, ThemeService)
- **Backend:** Async controller methods with error handling

### User Isolation

All API endpoints are scoped by `user_id` in the URL path:
- `/api/users/:userId/transactions`
- `/api/users/:userId/accounts`
- `/api/users/:userId/categories`

No cross-user data leakage is possible — all queries filter by `user_id`.

## Development

### Building

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

### Testing

```bash
# Backend API with Postman/Thunder Client
GET http://localhost:3000/api/users
POST http://localhost:3000/api/users (create user)
```

## Deployment

The app is designed for Docker containerization:
- Backend container (Express + Node)
- Frontend container (Angular)
- MySQL container (database)

Refer to `CLAUDE.md` for full deployment specifications.

## Implementation Status

- ✅ Database schema and auto-initialization
- ✅ User management
- ✅ Transaction CRUD operations
- ✅ Account, category, description management
- ✅ Dashboard with analytics
- ✅ Theme system with 6 themes
- ✅ Backup scheduling and restore
- ✅ Admin panel with settings

## Documentation

- **`CLAUDE.md`** — Implementation guidelines and hard rules
- **`plans/plan_file.md`** — Full specification and requirements
- **`plans/ui_imgs/`** — UI reference images (26 screens)
- **Backend code** — TypeScript with strict typing
- **Frontend code** — Angular with explicit component types

## License

Internal project — Checkbook Register
