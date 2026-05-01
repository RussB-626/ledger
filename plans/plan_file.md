# Plan: Convert Google Apps Script Checkbook Register to Express + Angular + MySQL

## Context

The current app is a Google Apps Script (GAS) web app that uses Google Sheets as its database. It is a personal checkbook register with transaction management, balance tracking, and category analysis. The goal is to convert it to a standard, self-hosted stack: **Express (Node.js) backend**, **Angular frontend**, and **MySQL database**.

**Deployment:** Strictly internal localhost — not internet-accessible. No HTTPS, no auth tokens, no CORS concerns beyond the local dev proxy.

**Users:** Multiple users are supported without login. An always-visible user switcher in the navbar lets anyone switch the active user. Each user's accounts, transactions, and categories are fully isolated — one user cannot see another's data.

---

## 🎨 Design Reference

**IMPORTANT:** The UI/UX design for this project must be followed **to the letter** as specified in the design system.

**Design System Link:** [Checkbook Register Design (Standalone)](https://api.anthropic.com/v1/design/h/x3OlgPX7GQ-EY7FenDOLlg?open_file=Checkbook+Register+%28standalone%29.html)

All UI components, layouts, colors, typography, spacing, and interactions must strictly adhere to this design specification. Do not deviate from the design without explicit approval.

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
├── backend/               # Express API (TypeScript)
│   ├── src/
│   │   ├── routes/        # Express routers (typed)
│   │   ├── controllers/   # Business logic (typed)
│   │   ├── models/        # DB query layer (mysql2) + TypeScript interfaces
│   │   ├── types/         # Shared TypeScript interfaces and types
│   │   ├── middleware/    # Error handling, validation (typed)
│   │   └── db.ts          # MySQL connection pool (TypeScript)
│   ├── .env               # DB credentials
│   ├── tsconfig.json      # TypeScript configuration
│   ├── dist/              # Compiled JavaScript output
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
| `descriptions` | Transaction descriptions with common flag | Per-user | users |

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
- `description_id` (INT, FK): References `descriptions.id` — normalized description
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
- `description_id` (for common transaction tracking)

**SQL:**
```sql
CREATE TABLE transactions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  date              DATE NOT NULL,
  account           VARCHAR(100) NOT NULL,
  category          VARCHAR(100) NOT NULL,
  description_id INT NOT NULL,
  note              VARCHAR(500),
  amount            DECIMAL(12,2) NOT NULL,
  type              ENUM('W','D','TW','TD') NOT NULL,
  pending           TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (description_id) REFERENCES descriptions(id),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  INDEX idx_type (type),
  INDEX idx_description_id (description_id)
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
- `ignore` (TINYINT 1): Boolean — when true, exclude this category from **analytics only** (pie charts, category totals, Differences calculations). Categories marked with `ignore=true` can still be used in transaction creation (Withdrawals, Deposits, Transfers)
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

#### 5. `descriptions` table
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
CREATE TABLE descriptions (
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

**Technology Stack:** Express.js with TypeScript. All backend code is written in TypeScript with strict type checking enforced. TypeScript interfaces are defined for all data models (User, Transaction, Account, Category, Description) and all API request/response payloads are typed.

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
| GET/POST/PUT/DELETE | `/api/users/:userId/accounts` | Account names (GET all, POST create, PUT update :id, DELETE :id) |
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
| GET | `/api/users/:userId/categories` | `?year=YYYY&month=MM` | Category totals for the month (expenses and incomes, broken down by category name) — **excludes categories marked with `ignore=true`** |
| GET | `/api/users/:userId/monthly-difference` | `?year=YYYY&month=MM` | Single value: Income - Expenses for that month — **excludes transactions in categories marked with `ignore=true`** |

**Important:** The `ignore` flag affects **analytics and reporting only** (pie charts, category totals, Differences calculation). It does **not** restrict which categories can be selected when creating transactions. All categories of a given type (expense/income/transfer) are available for transaction creation, regardless of their `ignore` status.

**Response format:** JSON `{ data, error }` — consistent with existing pattern.

### Page Data Response (/api/users/:userId/page-data)
Returns the complete initial dataset and reference data:
```json
{
  "transactions": [ /* array of transactions for current year */ ],
  "pendingTransactions": [ /* array of all pending transactions across all years */ ],
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
- `backend/src/db.ts` — MySQL connection pool with typed queries
- `backend/src/types/index.ts` — Shared TypeScript interfaces and types (User, Transaction, Account, Category, Description, API responses)
- `backend/src/routes/transactions.ts` — Transaction CRUD routes with typed request/response
- `backend/src/routes/references.ts` — Reference-list routes (accounts, categories, descriptions) with types
- `backend/src/routes/users.ts` — User management routes
- `backend/src/controllers/transactions.ts` — Business logic (transfer pair creation, balance calculations) with strict typing
- `backend/src/controllers/references.ts` — Reference data controllers
- `backend/src/middleware/errorHandler.ts` — Centralized typed error handling
- `backend/tsconfig.json` — TypeScript compiler configuration (strict mode enabled)
- `backend/package.json` — Dependencies (express, mysql2, typescript, @types/node, @types/express, etc.)

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
│   ├── common-withdrawals/         # Common txn analysis box
│   ├── categories/                 # Category analysis: Expenses & Incomes (Pie Charts)
│   ├── differences/                # Monthly Income - Expenses card
│   └── admin/                      # Admin management pages (accounts, categories, descriptions)
└── shared/
    ├── components/
    │   ├── loading-overlay/        # Replaces GAS overlay div
    │   └── edit-transaction-modal/ # Edit transaction modal
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
- Top navbar (includes user switcher dropdown, "New Transaction" button to open the create modal, and "Admin" button to navigate to admin page)
- Main page sections (cards/accordion):
  1. **Balances & Transactions** — tabs: Balances | Transactions | Pending
  2. **Common Withdrawals** — recurring withdrawal tracker
  3. **Categories** — year + month selectors (both preselect current), tabs: Expenses (Pie Chart) | Incomes (Pie Chart)
  4. **Differences** — card showing current year/month's (Income - Expenses) balance

### Balances & Transactions Tabs

**Balances Tab:**
- Displays current balance for each account
- Table columns: Account Name, Current Balance
- Includes a **Totals row** at the bottom that sums all account balances
- No pagination needed (typically fewer accounts than transactions)

**Transactions Tab:**
- Year selector dropdown at the top (preselects current year)
- When year changes, fetches transactions for that year from backend: `/api/users/:userId/transactions?year=YYYY`
- Table columns: Date, Account, Category, Description, Notes, Amount, Type (W/D/TW/TD), Pending, Actions
- Table is sortable and filterable (by any column)
- **Pagination required** — server-side or client-side pagination to handle large transaction volumes
- **Actions column** includes:
  - **Edit button** — opens Edit Transaction modal (see "Edit Transaction Modal" section below)
  - **Delete button** — shows confirmation dialog before deleting

**Pending Tab:**
- Shows all pending transactions (where `pending=true`) across **all years**
- Table columns: Date, Year, Account, Category, Description, Notes, Amount, Type (W/D/TW/TD), Actions
- Table is sortable and filterable
- **Pagination required** — to handle potentially large number of pending transactions
- **Actions column** includes:
  - **Remove Pending button** — quick action to mark the transaction as confirmed (sets `pending=false`) without opening the full edit modal. On click: shows confirmation dialog, then sends PUT request to update the transaction, table refreshes to remove the row (since it no longer matches the pending filter)
  - **Edit button** — opens Edit Transaction modal (see "Edit Transaction Modal" section below)
  - **Delete button** — shows confirmation dialog before deleting

### Create Transaction Modal
- Triggered by a "New Transaction" button in the navbar (or top of page)
- Modal contains three tabs: **Withdrawal** | **Deposit** | **Transfer**
- Each tab has its own form with the following fields:

**Withdrawal Tab:**
- Date (preselect current date)
- Account (dropdown)
- Category (dropdown — filtered to `is_expense=true`)
- Description (dropdown of existing descriptions OR text input to create new)
- Notes (text area, optional)
- Amount (decimal input)
- Pending (checkbox, optional)

**Deposit Tab:**
- Date (preselect current date)
- Account (dropdown)
- Category (dropdown — filtered to `is_income=true`)
- Description (dropdown of existing descriptions OR text input to create new)
- Notes (text area, optional)
- Amount (decimal input)
- Pending (checkbox, optional)

**Transfer Tab:**
- Date (preselect current date)
- From Account (dropdown)
- To Account (dropdown)
- Category (dropdown — filtered to `is_transfer=true`)
- Description (dropdown of existing descriptions OR text input to create new)
- Notes (text area, optional)
- Amount (decimal input)
- Pending (checkbox, optional)

**Modal Behavior:**
- Description field is an autocomplete that shows existing descriptions from the `descriptions` table
- If you type a description that doesn't exist, it will be automatically created in the `descriptions` table when the transaction is submitted
- On successful submit: modal closes, page data refreshes to reflect the new transaction
- Angular component: `CreateTransactionModalComponent` in `features/create-transaction/`

### Edit Transaction Modal
- Triggered by clicking the "Edit" button on a transaction row in either Transactions or Pending tabs
- Modal is pre-populated with all current values for the transaction
- Form fields:
  - **Date** (date input) — changeable
  - **Type** (radio buttons: W / D / TW / TD) — changeable; changing the type may affect available accounts/categories
  - **Account** (dropdown) — changeable; for TW/TD transfers, separate "From Account" and "To Account" dropdowns
  - **Category** (dropdown) — changeable; filtered based on transaction type
  - **Description** (dropdown of existing descriptions OR text input) — changeable; can create new descriptions like in Create modal
  - **Note** (text area, optional) — changeable
  - **Pending** (checkbox) — changeable

- **Modal Behavior:**
  - Submit button sends PUT request: `/api/users/:userId/transactions/:id`
  - On success: modal closes, affected page (Transactions or Pending tab) refreshes to reflect changes
  - If a pending transaction is edited and the pending flag is unchecked, it will disappear from the Pending tab on refresh
  - If a transaction is edited to change the year, it may disappear from the current Transactions tab view (if viewing a different year)
  - Cancel button closes modal without saving
  - Angular component: `EditTransactionModalComponent` in `shared/components/`

### Admin Pages
**Navigation:** "Admin" button in top navbar navigates to `/admin` route.

**Active User Scoping:** All admin operations are scoped to the currently selected user (from the user switcher). The page displays the active user's name prominently and all add/edit/delete operations are for that user only.

**Page Layout:** The admin page has three tabs or sections for managing:
1. **Accounts Tab**
   - Table listing all accounts for the current user
   - Columns: Account Name, Actions (Edit, Delete)
   - "Add Account" button at the top to create new accounts
   - Edit/Delete actions:
     - **Edit:** Opens a modal with account name input, allows changing the name
     - **Delete:** Shows confirmation dialog before deleting account

2. **Categories Tab**
   - Table listing all categories for the current user
   - Columns: Category Name, Is Expense, Is Income, Is Transfer, Ignore, Actions (Edit, Delete)
   - "Add Category" button at the top to create new categories
   - Edit/Delete actions:
     - **Edit:** Opens a modal with fields for category name and type/ignore checkboxes, allows updating
     - **Delete:** Shows confirmation dialog before deleting category

3. **Descriptions Tab**
   - Table listing all descriptions for the current user
   - Columns: Description Text, Is Common, Actions (Edit, Delete)
   - "Add Description" button at the top to create new descriptions
   - Edit/Delete actions:
     - **Edit:** Opens a modal with description text and is_common checkbox
     - **Delete:** Shows confirmation dialog before deleting description

**API Endpoints Used:**
- GET `/api/users/:userId/accounts` — fetch all accounts
- POST `/api/users/:userId/accounts` — create new account
- PUT `/api/users/:userId/accounts/:id` — update account
- DELETE `/api/users/:userId/accounts/:id` — delete account
- GET `/api/users/:userId/categories` — fetch all categories
- POST `/api/users/:userId/categories` — create new category
- PUT `/api/users/:userId/categories/:id` — update category
- DELETE `/api/users/:userId/categories/:id` — delete category
- GET `/api/users/:userId/txn-descriptions` — fetch all descriptions
- POST `/api/users/:userId/txn-descriptions` — create new description
- PUT `/api/users/:userId/txn-descriptions/:id` — update description
- DELETE `/api/users/:userId/txn-descriptions/:id` — delete description

**Angular Component:** `AdminPageComponent` in `features/admin/` with three child components: `AccountsTabComponent`, `CategoriesTabComponent`, `DescriptionsTabComponent`

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
- **Transactions and Pending tables:** Include pagination to handle potentially large transaction volumes. Can use client-side pagination (load all year's transactions at once and paginate in frontend) or server-side pagination (fetch transactions per page from backend).
- **Balances table:** No pagination needed (typically only a few accounts)

---

## Migration Notes

1. **Index vs ID:** The current GAS app uses 0-based row index to identify transactions. The new app will use the `id` primary key from MySQL — the frontend will store `id` on each transaction object.
2. **Transfer creation:** POST `/api/users/:userId/transactions/batch` accepts an array of 2 transactions and wraps them in a DB transaction to ensure atomicity.
3. **Date handling:** Store as `DATE` in MySQL, send as `YYYY-MM-DD` strings over the API — no timezone conversion needed.
4. **Amount:** Store as `DECIMAL(12,2)` in DB, send as number over API (not string like current app).
5. **Pending:** Store as `TINYINT(1)`, expose as boolean in JSON.
6. **Categories UI:** The "Differences" tab from the original Categories section is now a separate card below it. Pie charts replace the original monthly tables for Expenses and Incomes.
7. **Month Selector:** New feature — Categories and Differences cards both depend on year/month selection. They share the same selectors in the Categories section.
8. **Categories Table Consolidation:** The original `expenses`, `incomes`, and `transfers` tables are merged into a single `categories` table with boolean flags (`is_expense`, `is_income`, `is_transfer`). The `cats_to_ignore` table is removed — an `ignore` boolean column is added to `categories` instead.
9. **Category Filtering:** Backend filters categories by type based on transaction type (ignore flag does NOT affect transaction creation):
   - Withdrawal transactions → use categories where `is_expense=true` (all, regardless of ignore flag)
   - Deposit transactions → use categories where `is_income=true` (all, regardless of ignore flag)
   - Transfer transactions → use categories where `is_transfer=true` (all, regardless of ignore flag)
   - Note: The `ignore` flag only filters categories from analytics (pie charts, totals, Differences calculations), NOT from transaction forms
10. **Transaction Descriptions Normalization:** The original `description` column (VARCHAR) in `transactions` is replaced with `description_id` (FK). A new `descriptions` table stores all descriptions with an `is_common` flag. The old `common_txns` table is removed — "common" tracking now happens via the `is_common` flag in `descriptions`. When creating a transaction:
    - If the description already exists in `descriptions`, use its ID
    - If the description is new (typed by user), create a new entry in `descriptions` table, then store the FK reference
    - The "Common Withdrawals" section queries descriptions where `is_common=true`

---

## Development & Deployment

### Development Mode

**Running Locally:**
- Backend: Run TypeScript Express server from terminal — `cd backend && npm run dev`
  - Uses `ts-node` or similar to compile and run TypeScript on-the-fly in development
  - Or compile first with `npm run build` then run compiled JavaScript with `node dist/index.js`
  - Backend runs on `http://localhost:3000` (or configured port)
  - Reads database credentials from `.env` file in `/backend` directory
  - TypeScript strict mode enforces type safety

- Frontend: Run Angular dev server from terminal — `cd frontend && ng serve`
  - Angular runs on `http://localhost:4200` (default)
  - Configured with dev proxy to backend API (in `angular.json` or `proxy.conf.json`)

**Environment Configuration (.env file):**
Create a `.env` file in the `/backend` directory with the following variables:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=checkbook_register
DB_USER=root
DB_PASSWORD=your_password_here
NODE_ENV=development
```

The backend reads these variables using a library like `dotenv` and passes them to the MySQL connection pool in `backend/src/db.ts`.

### Production Deployment (Docker)

**Architecture:**
- **Single container** (`docker-compose.yml` in root): Runs both Express backend and Angular frontend
- **Separate container** (external MySQL Docker container): Database runs independently
- The app container connects to the database container using environment variables

**Dockerfile (backend + frontend):**
The `Dockerfile` in the root should:
1. Use Node.js base image
2. Install backend dependencies (`npm install` in `/backend`)
3. Compile TypeScript backend (`npm run build` in `/backend` to generate `dist/` folder)
4. Build the Angular frontend (`ng build --prod` in `/frontend`)
5. Copy compiled backend and built frontend into the container
6. Serve the built Angular app as static files from the Express backend (via `express.static()`)
7. Start the compiled Express server from `dist/index.js`

**docker-compose.yml (app container only):**
```yaml
services:
  checkbook-app:
    build: .
    ports:
      - "3000:3000"  # or desired port
    environment:
      - DB_HOST=mysql-db  # hostname of separate MySQL container
      - DB_PORT=3306
      - DB_NAME=checkbook_register
      - DB_USER=checkbook_user
      - DB_PASSWORD=${DB_PASSWORD}  # read from system .env or pass via --env-file
      - NODE_ENV=production
```

**Database Container (separate, managed externally):**
The MySQL database runs in its own Docker container, managed separately. The app container connects to it via the `DB_HOST` environment variable (e.g., `mysql-db` if both containers are on the same Docker network).

**Environment Variables:**
- `.env` file in the app root contains database credentials for Docker Compose
- Docker Compose reads this file and passes variables to the container via the `environment` section
- The backend reads these same variables at runtime from `process.env`

**Backend Environment Setup (db.ts):**
The database connection pool should read from `process.env` with strict TypeScript typing:
```typescript
import mysql from 'mysql2/promise';

interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

const config: DBConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'checkbook_register',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(config);
```

**Frontend Static Serving:**
The Express backend serves the built Angular app as static files (TypeScript):
```typescript
import path from 'path';
import { Request, Response } from 'express';

const frontendDistPath = path.join(__dirname, '../frontend/dist/frontend');
app.use(express.static(frontendDistPath));

app.get('/*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});
```

---

## Implementation Order

1. **DB setup** — create MySQL schema (including `users` table), seed with test users and sample data
2. **Express backend (TypeScript)** — Set up TypeScript project with tsconfig.json (strict mode), create typed interfaces in `types/` folder, db connection pool with typed config, user routes, reference routes (scoped by userId, including accounts/categories/descriptions), transaction CRUD + batch route (with description FK handling), analytics endpoints (`/categories`, `/monthly-difference`). All code must be TypeScript with strict type checking.
3. **Angular scaffold** — `ng new`, install dependencies (ng-piechart or similar charting library), set up HttpClient + dev proxy to backend
4. **Docker setup** — Create `Dockerfile` in root that compiles TypeScript backend, builds Angular frontend, and serves both from single container. Create `docker-compose.yml` that configures the app container with environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, NODE_ENV). Ensure .env file is gitignored and documented with example values.
5. **Core services** — `UserService` (with localStorage persistence), `ApiService` (HTTP interceptor to inject userId), `TransactionsService`, `CategoriesService` (handles unified categories table with type filtering), models/interfaces
6. **Navbar + user switcher** — dropdown with all users, active user display, manage users dialog
7. **Create Transaction modal** — `CreateTransactionModalComponent` with tabbed Withdrawal/Deposit/Transfer forms, wired to "New Transaction" button in navbar
8. **Transactions feature** — balances tab, transactions table with year selector, pending table
9. **Common Withdrawals feature** — recurring txn analysis
10. **Categories feature** — year + month selectors, two pie charts (Expenses and Incomes by category)
11. **Differences card** — separate card showing monthly (Income - Expenses), synced with Categories year/month selectors
12. **Edit/Delete modal** — shared modal component wired into transaction table rows
13. **Admin pages** — tabbed admin interface for managing accounts, categories, and descriptions. Add "Admin" button to navbar with routing to `/admin`. Create three tabs with add/edit/delete functionality for each entity.

---

## Verification

- Start backend: `cd backend && npm run dev` (TypeScript development) or `npm run build && node dist/index.js` (compiled) → test all endpoints with Postman/Thunder Client
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
- Test descriptions FK → create a transaction with a description; verify it's stored as a FK reference, not inline text
- Test "Common Withdrawals" section → descriptions marked as `is_common=true` appear in the report, ordered by frequency
