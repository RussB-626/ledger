# Plan: Convert Google Apps Script Checkbook Register to Express + Angular + MySQL

## Context

The current app is a Google Apps Script (GAS) web app that uses Google Sheets as its database. It is a personal checkbook register with transaction management, balance tracking, and category analysis. The goal is to convert it to a standard, self-hosted stack: **Express (Node.js) backend**, **Angular frontend**, and **MySQL database**.

**Deployment:** Strictly internal localhost — not internet-accessible. No HTTPS, no auth tokens, no CORS concerns beyond the local dev proxy.

**Users:** Multiple users are supported without login. An always-visible user switcher in the navbar lets anyone switch the active user. Each user's accounts, transactions, and categories are fully isolated — one user cannot see another's data.

---

## Current App Summary

### Data Model (Google Sheets → MySQL)

**Transactions sheet (txns):** 8 columns — date, account, category, description, note, amount, type (W/D/TW/TD), pending (boolean)

**Reference sheets (single-column lists):** accounts, expenses, income, transfers, common_txns, cats_to_ignore

### Business Logic
- **Withdrawals (W):** subtract from account balance
- **Deposits (D):** add to account balance
- **Transfers:** create TWO transactions — a TW (withdraw from source) and TD (deposit to destination) sharing the same date, description, amount, and category
- **Balance calculation:** per-account SUM(deposits) - SUM(withdrawals)
- **Category analysis:** group transactions by year/month/category with totals
- **Common transactions:** track recurring withdrawal descriptions across months
- **Pending flag:** mark transactions as tentative

### Current Frontend Features
1. Create transaction tabs — withdrawal, deposit, transfer forms
2. Balances tab — per-account balance summary
3. Transactions tab — full sortable/filterable DataTable
4. Pending tab — filterable pending-only view
5. Categories box — year/month selectors, expenses/income tabs with pie charts
6. Differences card — monthly (Income - Expenses) summary
7. Common Withdrawals box — recurring withdrawal analysis by month

---

## New Architecture

```
gs-checkbook-register/
├── backend/               # Express API
│   ├── src/
│   │   ├── routes/        # Express routers
│   │   ├── controllers/   # Business logic
│   │   ├── models/        # DB query layer (mysql2)
│   │   ├── middleware/     # Error handling, validation
│   │   └── db.js          # MySQL connection pool
│   ├── .env               # DB credentials
│   └── package.json
└── frontend/              # Angular app
    ├── src/app/
    │   ├── core/          # Services, interceptors, models
    │   ├── shared/        # Reusable components
    │   └── features/      # Feature modules
    └── package.json
```

---

## Database Schema (MySQL)

### Tables Overview

| Table | Purpose | Scope | Parent |
|-------|---------|-------|--------|
| `users` | User accounts (no auth) | Global | - |
| `transactions` | Financial transactions (W/D/TW/TD) | Per-user | users |
| `accounts` | Bank/savings account names | Per-user | users |
| `categories` | Category names with type flags (expense/income/transfer) and ignore flag | Per-user | users |
| `txn_descriptions` | Transaction descriptions with common flag | Per-user | users |

---

### Detailed Table Definitions

#### 1. `users` table
**Purpose:** Stores user profiles. No passwords — users are selected by name from a dropdown.

**Columns:**
- `id` (INT, PK): Unique user identifier
- `name` (VARCHAR 100, UNIQUE): User's display name (e.g., "Russ", "Jane")
- `created_at` (TIMESTAMP): When user was created

**Relationships:** Parent table for all user-scoped data (accounts, transactions, categories)

**SQL:**
```sql
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `transactions` table
**Purpose:** Stores all financial transactions. Core ledger of the app.

**Columns:**
- `id` (INT, PK): Unique transaction identifier
- `user_id` (INT, FK): Owner of the transaction (references `users.id`)
- `date` (DATE): Transaction date (YYYY-MM-DD)
- `account` (VARCHAR 100): Account name (e.g., "Checking", "Savings")
- `category` (VARCHAR 100): Category name (e.g., "Food", "Salary", "To Savings")
- `txn_description_id` (INT, FK): References `txn_descriptions.id` — normalized description
- `note` (VARCHAR 500, nullable): Optional user notes
- `amount` (DECIMAL 12,2): Transaction amount (positive, regardless of type)
- `type` (ENUM): Transaction type:
  - `W` = Withdrawal (subtract from account)
  - `D` = Deposit (add to account)
  - `TW` = Transfer Withdraw (part of transfer pair)
  - `TD` = Transfer Deposit (part of transfer pair)
- `pending` (TINYINT 1): Boolean flag (0=confirmed, 1=pending/tentative)
- `created_at` (TIMESTAMP): When transaction was created

**Indexes:** 
- `user_id` (for fast user filtering)
- `date` (for date range queries)
- `type` (for balance calculations)
- `txn_description_id` (for common transaction tracking)

**SQL:**
```sql
CREATE TABLE transactions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  date              DATE NOT NULL,
  account           VARCHAR(100) NOT NULL,
  category          VARCHAR(100) NOT NULL,
  txn_description_id INT NOT NULL,
  note              VARCHAR(500),
  amount            DECIMAL(12,2) NOT NULL,
  type              ENUM('W','D','TW','TD') NOT NULL,
  pending           TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (txn_description_id) REFERENCES txn_descriptions(id),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  INDEX idx_type (type),
  INDEX idx_txn_description_id (txn_description_id)
);
```

#### 3. `accounts` table
**Purpose:** List of account names available to a user (e.g., "Checking", "Savings", "Credit Card").

**Columns:**
- `id` (INT, PK): Auto-incrementing ID
- `user_id` (INT, FK): Owner (references `users.id`)
- `name` (VARCHAR 100): Account name
- **Constraint:** UNIQUE(user_id, name) — each user can have one account with each name

**SQL:**
```sql
CREATE TABLE accounts (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name    VARCHAR(100) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_account (user_id, name)
);
```

---

#### 4. `categories` table
**Purpose:** Unified list of all category names available to a user, with type flags (expense, income, transfer) and an ignore flag.

A single category can be marked as multiple types (e.g., a category could be both an expense and income category if needed).

**Columns:**
- `id` (INT, PK): Auto-incrementing ID
- `user_id` (INT, FK): Owner (references `users.id`)
- `name` (VARCHAR 100): Category name (e.g., "Food", "Salary", "To Savings")
- `is_expense` (TINYINT 1): Boolean — category can be used for expenses (Withdrawal transactions)
- `is_income` (TINYINT 1): Boolean — category can be used for incomes (Deposit transactions)
- `is_transfer` (TINYINT 1): Boolean — category can be used for transfers (TW/TD transactions)
- `ignore` (TINYINT 1): Boolean — exclude from category analysis/reports (pie charts, totals)
- **Constraint:** UNIQUE(user_id, name) — each user can have one category with each name

**SQL:**
```sql
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  is_expense  TINYINT(1) NOT NULL DEFAULT 0,
  is_income   TINYINT(1) NOT NULL DEFAULT 0,
  is_transfer TINYINT(1) NOT NULL DEFAULT 0,
  ignore      TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_category (user_id, name)
);
```

---

#### 5. `txn_descriptions` table
**Purpose:** Stores transaction descriptions with a flag indicating if they are common (recurring).

Used to normalize transaction descriptions and track which descriptions appear frequently across multiple months for the "Common Withdrawals" section.

**Columns:**
- `id` (INT, PK): Unique description identifier
- `user_id` (INT, FK): Owner (references `users.id`)
- `description` (VARCHAR 255): Description text (e.g., "Starbucks", "Rent", "Groceries")
- `is_common` (TINYINT 1): Boolean — marks descriptions that recur frequently
- **Constraint:** UNIQUE(user_id, description) — each user can have one description with each text

**SQL:**
```sql
CREATE TABLE txn_descriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_common   TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_description (user_id, description)
);
```


---

## Backend: Express API Endpoints & Calculations

All routes that return user-scoped data require a `user_id` query param (e.g. `?user_id=1`) or it is part of the URL. The active user ID is stored in Angular state (loaded from localStorage on startup) and attached to every request by an HTTP interceptor.

**Important Architectural Decision:** All totals, balances, and aggregates are **calculated on the backend** and returned as pre-calculated values. This ensures a single source of truth, better performance, and simpler frontend logic.

### Data Loading Strategy
- **Initial load:** `/api/users/:userId/page-data` returns transactions for the current calendar year only (plus pre-calculated balances and totals)
- **Date range expansion:** Frontend can request transactions for a different year via query param: `/api/users/:userId/transactions?year=2024`
- **Sorting/filtering:** Backend handles server-side sorting and filtering — frontend sends filter criteria, backend returns filtered results
- This keeps the frontend lightweight and avoids loading thousands of old transactions

### User routes
| Method | Route | Notes |
|---|---|---|
| GET | `/api/users` | List all users (for the navbar switcher) |
| POST | `/api/users` | Create a new user |
| DELETE | `/api/users/:id` | Remove a user |

### Transaction routes (all scoped by user_id)
| GAS Function | Method | Route | Query Params | Notes |
|---|---|---|---|---|
| `getPageInfo()` | GET | `/api/users/:userId/page-data` | - | Initial load: current year's transactions + all pre-calc balances, monthly totals, category totals |
| `getTransactionsList()` | GET | `/api/users/:userId/transactions` | `?year=YYYY` | Transactions for a specific year (defaults to current year) |
| `createTransaction(txn)` | POST | `/api/users/:userId/transactions` | - | Single txn; returns updated balances |
| `createTransactions(txns)` | POST | `/api/users/:userId/transactions/batch` | - | Transfer pair (DB transaction); returns updated balances |
| `editTransaction(idx, txn)` | PUT | `/api/users/:userId/transactions/:id` | - | Edit by DB id; returns updated balances |
| `deleteTransaction(idx)` | DELETE | `/api/users/:userId/transactions/:id` | - | Delete by DB id; returns updated balances |

### Reference routes (all scoped by user_id)
| Method | Route | Notes |
|---|---|---|
| GET/POST/DELETE | `/api/users/:userId/accounts` | Account names |
| GET | `/api/users/:userId/categories` | All categories for the user |
| GET | `/api/users/:userId/categories?type=expense` | Categories marked as expenses |
| GET | `/api/users/:userId/categories?type=income` | Categories marked as incomes |
| GET | `/api/users/:userId/categories?type=transfer` | Categories marked as transfers |
| POST/PUT/DELETE | `/api/users/:userId/categories` | Create, update, or delete categories |
| GET | `/api/users/:userId/txn-descriptions` | All transaction descriptions |
| GET | `/api/users/:userId/txn-descriptions?common=true` | Common (recurring) descriptions only |
| POST/PUT/DELETE | `/api/users/:userId/txn-descriptions` | Create, update, or delete descriptions |

### Analytics routes (for charts and summaries)
| Method | Route | Query Params | Returns |
|---|---|---|---|
| GET | `/api/users/:userId/categories` | `?year=YYYY&month=MM` | Category totals for the month (expenses and incomes, broken down by category name) |
| GET | `/api/users/:userId/monthly-difference` | `?year=YYYY&month=MM` | Single value: Income - Expenses for that month |

**Response format:** JSON `{ data, error }` — consistent with existing pattern.

### Page Data Response (/api/users/:userId/page-data)
Returns the complete initial dataset and reference data:
```json
{
  "transactions": [ /* array of transactions for current year */ ],
  "accounts": [ /* all account names */ ],
  "categories": [
    { "id": 1, "name": "Food", "is_expense": true, "is_income": false, "is_transfer": false, "ignore": false },
    { "id": 2, "name": "Salary", "is_expense": false, "is_income": true, "is_transfer": false, "ignore": false },
    { "id": 3, "name": "To Savings", "is_expense": false, "is_income": false, "is_transfer": true, "ignore": false }
    /* all categories with type and ignore flags */
  ],
  "txnDescriptions": [
    { "id": 1, "description": "Starbucks", "is_common": true },
    { "id": 2, "description": "Rent", "is_common": true },
    { "id": 3, "description": "Gas", "is_common": false }
    /* all descriptions with common flag */
  ],
  "balances": {
    "Checking": 1234.56,
    "Savings": 5678.90
    /* per-account current balance as of today */
  },
  "years": [ /* list of years that have transactions */ ],
  "months": [ /* list of months in current year that have transactions */ ]
}
```

### Category Data Response (/api/users/:userId/categories?year=2026&month=04)
Returns category totals for a specific month:
```json
{
  "expenses": {
    "Food": 250.50,
    "Utilities": 125.00,
    "Entertainment": 50.00
  },
  "incomes": {
    "Salary": 3000.00,
    "Bonus": 500.00
  }
}
```

### Monthly Difference Response (/api/users/:userId/monthly-difference?year=2026&month=04)
Returns the difference between income and expenses for a month:
```json
{
  "income": 3500.00,
  "expenses": 425.50,
  "difference": 3074.50
}
```

**Key backend files:**
- `backend/src/db.js` — mysql2 connection pool
- `backend/src/routes/transactions.js` — transaction CRUD routes
- `backend/src/routes/references.js` — all reference-list routes
- `backend/src/controllers/transactions.js` — business logic (transfer pair creation, balance calc)
- `backend/src/middleware/errorHandler.js` — centralized error handling

---

## Frontend: Angular Structure

### Modules / Feature Areas

```
src/app/
├── core/
│   ├── services/
│   │   ├── api.service.ts          # HTTP wrapper
│   │   ├── transactions.service.ts # Transaction CRUD
│   │   └── reference.service.ts    # Accounts, categories, etc.
│   └── models/
│       ├── transaction.model.ts    # Transaction interface
│       └── page-data.model.ts      # PageData interface
├── features/
│   ├── create-transaction/         # Modal with Withdrawal/Deposit/Transfer tabs
│   ├── transactions/               # Balances + Txns + Pending tabs
│   ├── categories/                 # Category analysis: Expenses & Incomes (Pie Charts)
│   ├── differences/                # Monthly Income - Expenses card
│   └── common-withdrawals/         # Common txn analysis box
└── shared/
    ├── components/
    │   ├── loading-overlay/        # Replaces GAS overlay div
    │   └── edit-txn-modal/         # Edit/delete modal
    └── pipes/
        └── currency-format.pipe.ts
```

### User Switcher (navbar)
- Navbar contains a dropdown showing all users by name
- Active user name is displayed prominently
- Switching users reloads all page data scoped to the new user
- Active `userId` is persisted to `localStorage` so refreshing the page restores the last active user
- A "Manage Users" option in the dropdown allows adding or removing users

### UI Layout
- Top navbar (includes user switcher dropdown + "New Transaction" button to open the create modal)
- Main page sections (cards/accordion):
  1. **Balances & Transactions** — tabs: Balances | Transactions | Pending
  2. **Categories** — year + month selectors (both preselect current), tabs: Expenses (Pie Chart) | Incomes (Pie Chart)
  3. **Differences** — card showing current year/month's (Income - Expenses) balance
  4. **Common Withdrawals** — recurring withdrawal tracker

### Create Transaction Modal
- Triggered by a "New Transaction" button in the navbar (or top of page)
- Modal contains three tabs: **Withdrawal** | **Deposit** | **Transfer**
- Each tab has its own form matching the current field sets:
  - **Withdrawal:** date, account, expense category, description, note, amount, pending
  - **Deposit:** date, account, income category, description, note, amount, pending
  - **Transfer:** date, from account, to account, transfer category, description, note, amount
- On successful submit: modal closes, page data refreshes to reflect the new transaction
- Angular component: `CreateTransactionModalComponent` in `features/create-transaction/`

### State Management
- Use Angular services with `BehaviorSubject` to hold `activeUser` and `pageData`.
- `UserService` manages the active user — persists `userId` to `localStorage`, exposes `activeUser$` observable that all feature components subscribe to.
- When `activeUser$` changes, `PageDataService` re-fetches all scoped data automatically.
- No NgRx needed for this app's complexity.

### Year/Month Selectors
**Transactions Tab:**
- A dropdown at the top lets users select which year to view
- Defaults to current year (loaded on page init)
- When user switches years, frontend calls `/api/users/:userId/transactions?year=2024` to fetch transactions for that year
- Loading overlay shows while fetching

**Categories Section:**
- Two dropdowns: **Year** and **Month** (both preselect to current year and month)
- When either changes, frontend fetches category data for that month: `/api/users/:userId/categories?year=2026&month=04`
- Pie charts update with the selected month's expense and income breakdowns by category

**Differences Card:**
- Has its own **Year** and **Month** selectors (independent from Categories section)
- Both selectors default to current year and month
- Displays the selected month/year's (Income - Expenses) as a prominent number
- When either selector changes, card updates to show that month's difference

### Charts
- Use a pie chart library for Categories section (e.g., **ng2-charts** with Chart.js, **ngx-charts**, or **Angular Material** if it includes pie charts)
- Pie charts show category breakdown for selected month (separately for Expenses and Incomes)
- Charts are interactive (hover shows values)

### Tables
- Use **AG Grid Community** or **Angular Material Table** to replace DataTables — sortable, filterable, matches current functionality.
- Tables display locally-loaded data only (no server-side pagination) — the backend has already filtered to a single year

---

## Migration Notes

1. **Index vs ID:** The current GAS app uses 0-based row index to identify transactions. The new app will use the `id` primary key from MySQL — the frontend will store `id` on each transaction object.
2. **Transfer creation:** POST `/api/transactions/batch` accepts an array of 2 transactions and wraps them in a DB transaction to ensure atomicity.
3. **Date handling:** Store as `DATE` in MySQL, send as `YYYY-MM-DD` strings over the API — no timezone conversion needed.
4. **Amount:** Store as `DECIMAL(12,2)` in DB, send as number over API (not string like current app).
5. **Pending:** Store as `TINYINT(1)`, expose as boolean in JSON.
6. **Categories UI:** The "Differences" tab from the original Categories section is now a separate card below it. Pie charts replace the original monthly tables for Expenses and Incomes.
7. **Month Selector:** New feature — Categories and Differences cards both depend on year/month selection. They share the same selectors in the Categories section.
8. **Categories Table Consolidation:** The original `expenses`, `incomes`, and `transfers` tables are merged into a single `categories` table with boolean flags (`is_expense`, `is_income`, `is_transfer`). The `cats_to_ignore` table is removed — an `ignore` boolean column is added to `categories` instead.
9. **Category Filtering:** Backend filters categories by type based on transaction type:
   - Withdrawal transactions → use categories where `is_expense=true` and `ignore=false`
   - Deposit transactions → use categories where `is_income=true` and `ignore=false`
   - Transfer transactions → use categories where `is_transfer=true` and `ignore=false`
10. **Transaction Descriptions Normalization:** The original `description` column (VARCHAR) in `transactions` is replaced with `txn_description_id` (FK). A new `txn_descriptions` table stores all descriptions with an `is_common` flag. The old `common_txns` table is removed — "common" tracking now happens via the `is_common` flag in `txn_descriptions`. When creating a transaction, the backend first ensures the description exists in `txn_descriptions`, then stores the FK reference. The "Common Withdrawals" section queries descriptions where `is_common=true`.

---

## Implementation Order

1. **DB setup** — create MySQL schema (including `users` table), seed with test users and sample data
2. **Express backend** — db connection pool, user routes, reference routes (scoped by userId, including accounts/categories/txn-descriptions), transaction CRUD + batch route (with txn_description FK handling), analytics endpoints (`/categories`, `/monthly-difference`)
3. **Angular scaffold** — `ng new`, install dependencies (ng-piechart or similar charting library), set up HttpClient + dev proxy to backend
4. **Core services** — `UserService` (with localStorage persistence), `ApiService` (HTTP interceptor to inject userId), `TransactionsService`, `CategoriesService` (handles unified categories table with type filtering), models/interfaces
5. **Navbar + user switcher** — dropdown with all users, active user display, manage users dialog
6. **Create Transaction modal** — `CreateTransactionModalComponent` with tabbed Withdrawal/Deposit/Transfer forms, wired to "New Transaction" button in navbar
7. **Transactions feature** — balances tab, transactions table with year selector, pending table
8. **Categories feature** — year + month selectors, two pie charts (Expenses and Incomes by category)
9. **Differences card** — separate card showing monthly (Income - Expenses), synced with Categories year/month selectors
10. **Common Withdrawals feature** — recurring txn analysis
11. **Edit/Delete modal** — shared modal component wired into transaction table rows

---

## Verification

- Start backend: `node src/index.js` → test all endpoints with Postman/Thunder Client
  - Verify `/api/users/:userId/page-data` returns pre-calculated balances
  - Verify `/api/users/:userId/transactions?year=2024` filters correctly
  - Verify `/api/users/:userId/categories?year=2026&month=04` returns category totals
  - Verify `/api/users/:userId/monthly-difference?year=2026&month=04` returns correct difference
- Start frontend: `ng serve` → verify all pages render with live data
- Create a withdrawal → confirm it appears in Balances and Transactions tabs, balances update
- Create a transfer → confirm TWO rows appear, correct accounts debited/credited, balances update
- Edit a transaction → confirm table updates and balances recalculate
- Delete a transaction → confirm row removed and balances recalculate
- Switch years in Transactions tab → confirm correct transactions load for that year
- Navigate to Categories section → year/month selectors default to current
  - Switch year/month → pie charts update correctly, showing only expenses/incomes for that month
- Differences card → displays current month's (Income - Expenses), updates when Categories year/month changes
- Check Pending tab → mark a txn pending, confirm it appears
- Verify balances on page load match the pre-calculated values from backend
- Test txn_descriptions FK → create a transaction with a description; verify it's stored as a FK reference, not inline text
- Test "Common Withdrawals" section → descriptions marked as `is_common=true` appear in the report, ordered by frequency
