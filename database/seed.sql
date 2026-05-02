-- Checkbook Register Seed Data
-- Sample users and reference data for testing

-- Insert test users
INSERT INTO users (name) VALUES
('Russ'),
('Jane');

-- Insert descriptions for Russ (user_id = 1)
INSERT INTO descriptions (user_id, description, is_common) VALUES
(1, 'Starbucks', 1),
(1, 'Rent', 1),
(1, 'Groceries', 1),
(1, 'Gas', 1),
(1, 'Salary', 0),
(1, 'Bonus', 0),
(1, 'To Savings', 0),
(1, 'From Savings', 0),
(1, 'Electric Bill', 1),
(1, 'Water Bill', 1);

-- Insert descriptions for Jane (user_id = 2)
INSERT INTO descriptions (user_id, description, is_common) VALUES
(2, 'Coffee', 1),
(2, 'Rent', 1),
(2, 'Groceries', 1),
(2, 'Freelance Income', 0),
(2, 'Transfer to Savings', 0),
(2, 'Internet Bill', 1);

-- Insert accounts for Russ (user_id = 1)
INSERT INTO accounts (user_id, name) VALUES
(1, 'Checking'),
(1, 'Savings'),
(1, 'Credit Card');

-- Insert accounts for Jane (user_id = 2)
INSERT INTO accounts (user_id, name) VALUES
(2, 'Checking'),
(2, 'Savings');

-- Insert categories for Russ (user_id = 1)
INSERT INTO categories (user_id, name, is_expense, is_income, is_transfer, is_ignored) VALUES
(1, 'Food', 1, 0, 0, 0),
(1, 'Utilities', 1, 0, 0, 0),
(1, 'Salary', 0, 1, 0, 0),
(1, 'Bonus', 0, 1, 0, 0),
(1, 'To Savings', 0, 0, 1, 0),
(1, 'From Savings', 0, 0, 1, 0),
(1, 'Entertainment', 1, 0, 0, 0),
(1, 'Gas', 1, 0, 0, 0),
(1, 'Miscellaneous', 1, 0, 0, 1);

-- Insert categories for Jane (user_id = 2)
INSERT INTO categories (user_id, name, is_expense, is_income, is_transfer, is_ignored) VALUES
(2, 'Food', 1, 0, 0, 0),
(2, 'Utilities', 1, 0, 0, 0),
(2, 'Freelance Income', 0, 1, 0, 0),
(2, 'To Savings', 0, 0, 1, 0),
(2, 'Internet', 1, 0, 0, 0);

-- Insert sample transactions for Russ (user_id = 1) - May 2026
-- Salaries (deposits)
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-01', 'Checking', 'Salary', 5, 'Monthly salary', 3500.00, 'D', 0, NOW()),
(1, '2026-04-01', 'Checking', 'Salary', 5, 'Monthly salary', 3500.00, 'D', 0, NOW() - INTERVAL 30 DAY);

-- Rent (withdrawal)
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-05', 'Checking', 'Utilities', 2, 'Monthly rent', 1200.00, 'W', 0, NOW()),
(1, '2026-04-05', 'Checking', 'Utilities', 2, 'Monthly rent', 1200.00, 'W', 0, NOW() - INTERVAL 30 DAY);

-- Groceries
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-10', 'Checking', 'Food', 3, 'Weekly groceries', 85.50, 'W', 0, NOW()),
(1, '2026-05-17', 'Checking', 'Food', 3, 'Weekly groceries', 92.00, 'W', 0, NOW()),
(1, '2026-05-24', 'Checking', 'Food', 3, 'Weekly groceries', 78.25, 'W', 0, NOW());

-- Starbucks
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-12', 'Credit Card', 'Food', 1, NULL, 5.50, 'W', 0, NOW()),
(1, '2026-05-15', 'Credit Card', 'Food', 1, NULL, 5.50, 'W', 0, NOW()),
(1, '2026-05-19', 'Credit Card', 'Food', 1, NULL, 5.50, 'W', 0, NOW()),
(1, '2026-05-22', 'Credit Card', 'Food', 1, NULL, 5.50, 'W', 0, NOW());

-- Electric Bill
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-20', 'Checking', 'Utilities', 9, 'Monthly electric', 125.00, 'W', 0, NOW());

-- Gas
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-13', 'Checking', 'Gas', 4, 'Fill up', 45.00, 'W', 0, NOW()),
(1, '2026-05-27', 'Checking', 'Gas', 4, 'Fill up', 48.75, 'W', 0, NOW());

-- Transfer to Savings (TW/TD pair)
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-28', 'Checking', 'To Savings', 7, 'Monthly transfer', 500.00, 'TW', 0, NOW()),
(1, '2026-05-28', 'Savings', 'To Savings', 7, 'Monthly transfer', 500.00, 'TD', 0, NOW());

-- Pending transaction (not yet confirmed)
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(1, '2026-05-29', 'Checking', 'Entertainment', 8, 'Movie tickets (pending)', 25.00, 'W', 1, NOW());

-- Insert sample transactions for Jane (user_id = 2) - May 2026
-- Freelance income
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(2, '2026-05-05', 'Checking', 'Freelance Income', 4, 'Project payment', 1500.00, 'D', 0, NOW());

-- Coffee
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(2, '2026-05-08', 'Checking', 'Food', 1, NULL, 4.50, 'W', 0, NOW()),
(2, '2026-05-15', 'Checking', 'Food', 1, NULL, 4.50, 'W', 0, NOW());

-- Groceries
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(2, '2026-05-10', 'Checking', 'Food', 3, 'Weekly groceries', 65.00, 'W', 0, NOW()),
(2, '2026-05-18', 'Checking', 'Food', 3, 'Weekly groceries', 72.50, 'W', 0, NOW());

-- Rent
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(2, '2026-05-01', 'Checking', 'Utilities', 2, 'Monthly rent', 950.00, 'W', 0, NOW());

-- Internet Bill
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(2, '2026-05-12', 'Checking', 'Internet', 6, 'Monthly internet', 60.00, 'W', 0, NOW());

-- Transfer to Savings (TW/TD pair)
INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending, created_at) VALUES
(2, '2026-05-25', 'Checking', 'To Savings', 5, 'Monthly transfer', 300.00, 'TW', 0, NOW()),
(2, '2026-05-25', 'Savings', 'To Savings', 5, 'Monthly transfer', 300.00, 'TD', 0, NOW());
