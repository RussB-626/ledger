# Checkbook Register: Implementation Guidelines

## Project Context

**Goal:** Convert Google Apps Script Checkbook Register to a self-hosted full-stack app:
- **Backend:** Express.js + TypeScript
- **Frontend:** Angular
- **Database:** MySQL
- **Design:** Dark theme with teal/cyan accents (see `plans/plan_file.md` and `plans/ui_imgs/`)
- **Deployment:** Docker containers (Express + Angular) + separate MySQL container
- **Users:** Multi-user without authentication (dropdown switcher for user isolation)

**Status:** Implementation phase — follow the plan file **to the letter**.

---

## 🔴 HARD RULES (Non-Negotiable)

### 1. Design & Layout Adherence
- **Follow the design system from `plans/plan_file.md` EXACTLY**
- **Reference `plans/ui_imgs/` for all visual components**
- **Color scheme:** Dark navy background (#0f1419 or similar) + teal/cyan accents (#00d9ff or #1dd1a1)
- **All buttons, modals, tables, forms, and layouts must match the UI images exactly**
- **No deviations from the design without explicit user approval in this CLAUDE.md file**

### 2. Database Schema
- **Create MySQL database with EXACT table definitions from `plan_file.md` sections:**
  - `users` — user profiles (no auth, no passwords)
  - `transactions` — financial ledger (W/D/TW/TD types)
  - `accounts` — account names per user
  - `categories` — unified table with `is_expense`, `is_income`, `is_transfer`, `ignore` flags
  - `descriptions` — transaction descriptions with `is_common` flag (replaces old reference tables)
- **Add all indexes, foreign keys, and unique constraints exactly as specified**
- **Data isolation: ALL queries must filter by `user_id` — NO cross-user data leakage**

### 3. Backend (Express + TypeScript)
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

**Analytics routes:**
- `GET /api/users/:userId/categories?year=YYYY&month=MM` — category totals (exclude ignored)
- `GET /api/users/:userId/monthly-difference?year=YYYY&month=MM` — (Income - Expenses) excluding ignored

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

3. **Categories Section** (with year/month selectors)
   - Expenses pie chart (by category, exclude ignored)
   - Incomes pie chart (by category, exclude ignored)

4. **Net Total / Differences Card** (with own year/month selectors)
   - Displays (Income - Expenses) as prominent number, excludes ignored categories

5. **Common Withdrawals Section**
   - Recurring withdrawal analysis (descriptions where `is_common=true`)

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
- **Category Ignore:** Affects analytics only (pie charts, Differences card)
- **Date Format:** `YYYY-MM-DD` (DATE in MySQL, string in JSON)
- **Amount Format:** `DECIMAL(12,2)` in DB, number in JSON (not string)

### 8. Verification Before Mark-Complete
- [ ] Backend runs: `npm run dev` (TypeScript) or `npm run build && node dist/index.js` (compiled)
- [ ] All endpoints return `{ data, error }` format
- [ ] All endpoints tested with Postman/Thunder Client
- [ ] Frontend runs: `ng serve` with dev proxy to backend
- [ ] Page loads without console errors or TypeScript warnings
- [ ] User switcher works and isolates data per user
- [ ] Create W/D/T transactions → appear in tables, balances update
- [ ] Edit transaction → table and balances update
- [ ] Delete transaction → row removed, balances update
- [ ] Year selector in Transactions tab filters correctly
- [ ] Categories section: year/month selectors work, pie charts render, exclude ignored
- [ ] Differences card: displays correct (Income - Expenses), excludes ignored
- [ ] Common Withdrawals: shows recurring descriptions
- [ ] Pending tab: shows only pending=true, "Remove Pending" unchecks pending flag
- [ ] Admin pages: all CRUD operations work (accounts, categories, descriptions)
- [ ] No TypeScript type errors
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
│   ├── types/index.ts (all shared interfaces)
│   ├── db.ts (MySQL connection pool with typed config)
│   ├── routes/ (typed route handlers)
│   ├── controllers/ (business logic)
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

## Reference Documents
- **Plan:** `/plans/plan_file.md` — Full specification
- **Design:** `/plans/ui_imgs/` — Visual reference (26 images showing all screens)
- **This file:** `/CLAUDE.md` — Implementation guardrails

**Start implementation from Phase 1 (Database) and follow the Implementation Order exactly.**
