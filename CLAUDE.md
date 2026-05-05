# Ledger: Implementation Guidelines

## Project Context

**Goal:** Ledger — a self-hosted full-stack financial ledger application:
- **Backend:** Express.js + TypeScript
- **Frontend:** Angular
- **Database:** MySQL
- **Design:** Dark theme with teal/cyan accents (see `plans/plan_file.md` and `plans/ui_imgs/`)
- **Deployment:** Docker containers (Express + Angular) + separate MySQL container
- **Users:** Multi-user without authentication (dropdown switcher for user isolation)

**Status:** Active development — core features implemented, ongoing refinement.

---

## Current Implementation Status

### ✅ Fully Implemented
- Database schema with auto-initialization
- User management (multi-user dropdown, no authentication)
- Transaction CRUD (W/D/TW/TD types)
- Account, category, description management
- Dashboard with balances, transactions, and pending tabs
- Pending transaction flag and quick removal
- Admin panel with reference management
- Theme system with dark mode support
- Backup scheduling and restore functionality
- Docker containerization
- Mobile-responsive UI

### 📋 NOT Currently Implemented
- **Charts/Analytics:** Pie charts, category analytics, and monthly differences dashboard not built
  - References like `is_common`, `ignore` flags are database-ready but not used in UI
  - These are reserved for future analytics features
- **Analytics API endpoints:** Category totals and monthly difference routes not needed

### 🎯 Development Priorities
1. **Bug Fixes & UX Refinement:** Recent commits show focus on mobile UI, date formatting, styling
2. **Feature Stability:** Ensure all transaction types and user isolation work correctly
3. **Performance:** Optimize queries for large transaction sets
4. **Testing:** Add comprehensive testing coverage

---

## 🔴 HARD RULES (Non-Negotiable)

### 1. Design & Layout Adherence
- **Follow the design system from `plans/plan_file.md` EXACTLY**
- **Reference `plans/ui_imgs/` for all visual components**
- **Color scheme:** Dark navy background (#0f1419 or similar) + teal/cyan accents (#00d9ff or #1dd1a1)
- **All buttons, modals, tables, forms, and layouts must match the UI images exactly**
- **No deviations from the design without explicit user approval in this CLAUDE.md file**

### 2. Database Schema & Initialization
- **Database auto-initialization:** Backend automatically creates tables from `database/schema.sql` on first run
  - Check: Backend logs `✓ Database tables already exist` if tables present, or initializes if missing
  - **REQUIREMENT:** MySQL user must have CREATE permissions on the database
    - If you see `CREATE command denied`, grant permissions:
      ```sql
      GRANT CREATE ON database_name.* TO 'user'@'host';
      FLUSH PRIVILEGES;
      ```
- **Table definitions (auto-created from `database/schema.sql`):**
  - `users` — user profiles (no auth, no passwords)
  - `transactions` — financial ledger (W/D/TW/TD types)
  - `accounts` — account names per user
  - `categories` — unified table with `is_expense`, `is_income`, `is_transfer`, `ignore` flags
  - `descriptions` — transaction descriptions with `is_common` flag
- **Add all indexes, foreign keys, and unique constraints exactly as specified**
- **Data isolation: ALL queries must filter by `user_id` — NO cross-user data leakage**

### 3. Backend (Express + TypeScript)
- **Database initialization:** `backend/src/database.ts` automatically creates schema on startup
  - Runs before Express server starts listening
  - Checks if tables exist; if missing, executes `database/schema.sql`
  - Logs progress: `[Database] Starting initialization...` → `✓ Database schema initialized successfully`
- **Strict TypeScript mode enabled — no `any` types except where unavoidable**
- **All code MUST be TypeScript with explicit types on all functions and parameters**
- **All API responses use format: `{ data?: T, error?: string }`**
- **All routes scoped by `user_id` (URL path or query param)**
- **Backend pre-calculates ALL balances, totals, and aggregates — frontend displays only**
- **Transfer pairs created atomically (DB transaction wrapper)**
- **Description FK handling: Create new or reuse existing descriptions when transactions are created**
- **Category `ignore` flag affects ONLY analytics (pie charts, totals, Differences) — NOT transaction creation dropdowns**

### 4. Frontend (Angular)
- **TypeScript strict mode enabled — no `any` types**
- **All components typed with explicit interfaces**
- **State management: BehaviorSubject services (UserService, PageDataService) — NO NgRx**
- **HTTP interceptor attached to ApiService — all requests include `user_id` automatically**
- **localStorage persistence for active `userId` — restore on page refresh**
- **All tables use AG Grid Community or Angular Material (sortable, filterable, paginated)**
- **All charts use ng2-charts with Chart.js (pie charts for categories)**
- **Modals for Create/Edit transactions — exact form fields and tabs from plan**
- **Admin pages: Three tabs (Accounts, Categories, Descriptions) with add/edit/delete**

### 5. Endpoints (Must Implement All)
**User routes:**
- `GET /api/users` — list all users
- `POST /api/users` — create user
- `DELETE /api/users/:id` — delete user

**Transaction routes:**
- `GET /api/users/:userId/page-data` — initial load (current year txns + pending + balances + refs)
- `GET /api/users/:userId/transactions?year=YYYY` — transactions for year
- `POST /api/users/:userId/transactions` — create single transaction
- `POST /api/users/:userId/transactions/batch` — create transfer pair (atomic)
- `PUT /api/users/:userId/transactions/:id` — edit transaction
- `DELETE /api/users/:userId/transactions/:id` — delete transaction

**Reference routes:**
- `GET/POST/PUT/DELETE /api/users/:userId/accounts` — manage accounts
- `GET/POST/PUT/DELETE /api/users/:userId/categories` — manage categories (with type filtering)
- `GET /api/users/:userId/categories?type=expense|income|transfer` — filter by type
- `GET/POST/PUT/DELETE /api/users/:userId/txn-descriptions` — manage descriptions
- `GET /api/users/:userId/txn-descriptions?common=true` — common descriptions only

### 6. UI Components (Must Implement Exactly)

**Navbar:**
- Ledger logo/branding
- Dashboard tab
- Admin tab
- New Transaction button (teal, top-right)
- User dropdown showing all users

**Main Page Cards:**
1. **Balances & Transactions Tabs** — Balances | Transactions | Pending
   - Balances: Account name + balance + totals row
   - Transactions: Year selector, sortable/filterable table with Edit/Delete, pagination
   - Pending: All pending transactions with "Remove Pending" quick action

2. **Create Transaction Modal** (3 tabs)
   - Withdrawal: date, account, category (expense), description, notes, amount, pending
   - Deposit: date, account, category (income), description, notes, amount, pending
   - Transfer: date, from-account, to-account, category (transfer), description, notes, amount, pending

**Admin Pages:**
- Back to Dashboard link
- Three tabs: Accounts (count), Categories (count), Descriptions (count)
- Each tab: Table + Add button + Edit/Delete actions (icons)

**Edit Transaction Modal:**
- Pre-populated form fields
- Type selector (W/D/TW/TD)
- Form updates dynamically based on type

### 7. Data Model Specifics
- **Balance Calculation:** Per-account `SUM(amount WHERE type='D') - SUM(amount WHERE type='W')`
- **Transfer Handling:** Create 2 rows (TW, TD) with identical date/description/amount/category
- **Pending Flag:** Boolean, persisted, filterable
- **Description Normalization:** Use FK to `descriptions.id`, not inline text
- **Category Ignore:** Reserved for future analytics features
- **Date Format:** `YYYY-MM-DD` (DATE in MySQL, string in JSON)
- **Amount Format:** `DECIMAL(12,2)` in DB, number in JSON (not string)

### 7a. Referential Integrity & Cascade Operations
- **Foreign Key Constraints:** All reference tables have `ON DELETE CASCADE ON UPDATE CASCADE`
  - When an **account** is deleted → all transactions with that account are automatically deleted
  - When an **account name** is updated → all transactions with that account automatically update
  - When a **category** is deleted → all transactions with that category are automatically deleted
  - When a **category name** is updated → all transactions with that category automatically update
  - When a **description** is deleted → all transactions with that description are automatically deleted
  - When a **description** is updated → all transactions with that description automatically update
- **Database Enforcement:** All cascade operations are enforced at MySQL level, not application level
- **No Application-Level Checks:** Backend delete functions are simple and rely on database constraints

### 8. Verification Checklist
- [ ] MySQL user has CREATE TABLE permissions on the database
  - If error `CREATE command denied`, run: `GRANT CREATE ON database_name.* TO 'user'@'host'; FLUSH PRIVILEGES;`
- [ ] Backend runs: `npm run dev` (TypeScript) or `npm run build && node dist/index.js` (compiled)
  - Logs: `[Database] Starting initialization...` → `✓ Database schema initialized successfully`
  - Or: `✓ Database tables already exist` (if already initialized)
- [ ] All API endpoints return `{ data, error }` format
- [ ] All endpoints tested with Postman/Thunder Client
- [ ] Frontend runs: `ng serve` with dev proxy to backend
- [ ] Page loads without console errors or TypeScript warnings
- [ ] User switcher works and isolates data per user
- [ ] Create W/D/TW/TD transactions → appear in tables, balances update correctly
- [ ] Edit transaction → table and balances update
- [ ] Delete transaction → row removed, balances update
- [ ] Year selector in Transactions tab filters correctly
- [ ] Pending tab: shows only pending=true, "Remove Pending" unchecks pending flag
- [ ] Admin pages: all CRUD operations work (accounts, categories, descriptions)
- [ ] Cascade deletes work: deleting account/category/description removes related transactions
- [ ] No TypeScript type errors (strict mode)
- [ ] Docker build succeeds

---

## Code Style & Architecture

### TypeScript
```typescript
// ✅ CORRECT: Explicit types everywhere
function calculateBalance(userId: number, accountName: string): Promise<number> {
  // ...
}

interface Transaction {
  id: number;
  userId: number;
  date: string;
  amount: number;
  type: 'W' | 'D' | 'TW' | 'TD';
  pending: boolean;
}

// ❌ WRONG: No 'any' types
function calculateBalance(userId: any, accountName: any): any { ... }
```

### Backend Routes
```typescript
// ✅ CORRECT: All routes include user_id and use consistent response format
router.get('/users/:userId/transactions', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const transactions = await getTransactions(userId);
  res.json({ data: transactions });
});

// ❌ WRONG: Missing userId scope or inconsistent response format
router.get('/transactions', async (req, res) => {
  const transactions = await getAllTransactions(); // No user filter!
  res.json(transactions); // Not wrapped in { data, error }
});
```

### API Response Format
```typescript
// ✅ CORRECT
{ data: { /* result */ } }
{ error: "error message" }

// ❌ WRONG
{ transactions: [...] } // Missing 'data' wrapper
{ success: true, payload: {...} } // Inconsistent format
```

### Frontend Services
```typescript
// ✅ CORRECT: Services with BehaviorSubject
export class UserService {
  private activeUserSubject = new BehaviorSubject<User | null>(null);
  activeUser$ = this.activeUserSubject.asObservable();

  getActiveUser(): Observable<User | null> {
    return this.activeUser$;
  }
}

// ❌ WRONG: Services returning Promises or not using RxJS
export class UserService {
  getActiveUser(): Promise<User> { ... }
}
```

### File Organization
```
backend/
├── src/
│   ├── database.ts (schema auto-initialization on startup)
│   ├── db.ts (MySQL connection pool with typed config)
│   ├── index.ts (Express app entry point)
│   ├── types/index.ts (all shared interfaces)
│   ├── routes/ (typed route handlers)
│   ├── controllers/ (business logic)
│   ├── services/ (backup and scheduler services)
│   └── middleware/errorHandler.ts (centralized error handling)

frontend/
├── src/app/
│   ├── core/
│   │   ├── services/ (typed services with BehaviorSubject)
│   │   └── models/ (interfaces)
│   ├── features/ (feature modules)
│   └── shared/ (reusable components)
```

---

## No Deviations

**ANY changes to layout, design, database schema, or API endpoints require explicit approval in this CLAUDE.md file.**

If you encounter unclear specifications in the plan, ask for clarification rather than making assumptions or deviations.

---

---

## Development Workflow

### Before Making Changes
1. **Review CLAUDE.md** — This file is your source of truth for requirements
2. **Check git status** — Ensure you're on a feature branch, not main
3. **Read recent commits** — Understand what was just changed and why
4. **Verify tests** — If tests exist, run them before starting work

### When Adding Features
1. **Update CLAUDE.md first** if requirements change
2. **Follow TypeScript strict mode** — No `any` types, explicit interfaces everywhere
3. **Use BehaviorSubject in services** — State management, no NgRx
4. **Maintain `{ data, error }` response format** — Consistency across all endpoints
5. **Filter by `user_id`** — Every query must scope to the active user
6. **Test in browser** — Frontend changes require visual verification

### When Fixing Bugs
1. **Identify root cause** — Don't apply band-aids
2. **Check for side effects** — Will this break related features?
3. **Test data isolation** — Switch users and verify data doesn't leak
4. **Verify balances recalculate** — After transaction changes

### Common Patterns

**Backend Route:**
```typescript
router.get('/users/:userId/transactions', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const transactions = await getTransactions(userId); // filtered by userId
  res.json({ data: transactions }); // { data, error } format
});
```

**Frontend Service:**
```typescript
export class TransactionService {
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  transactions$ = this.transactionsSubject.asObservable();
}
```

**Component Usage:**
```typescript
this.transactions$.pipe(takeUntil(this.destroy$)).subscribe(txns => {
  this.displayTransactions = txns;
});
```

### What NOT to Do
- ❌ Don't use `any` types — be explicit
- ❌ Don't bypass cascade deletes — let MySQL handle FK constraints
- ❌ Don't fetch data without user_id filter — security issue
- ❌ Don't break existing tests — run tests before committing
- ❌ Don't add features beyond scope — stick to the spec
- ❌ Don't hardcode URLs/ports — use environment variables

---

## Reference Documents
- **Plan:** `/plans/plan_file.md` — Full specification
- **Design:** `/plans/ui_imgs/` — Visual reference (26 images showing all screens)
- **README:** `/README.md` — User-facing documentation
- **This file:** `/CLAUDE.md` — Implementation guardrails
