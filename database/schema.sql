-- Ledger Database Schema
-- Created according to CLAUDE.md specifications
-- Strict data isolation: ALL tables scoped by user_id

-- Users table: User profiles (no auth, no passwords)
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(100) NOT NULL UNIQUE,
  currency_symbol     VARCHAR(10) NOT NULL DEFAULT '$',
  decimal_places      TINYINT NOT NULL DEFAULT 2,
  thousand_separator  VARCHAR(1) NOT NULL DEFAULT ',',
  decimal_separator   VARCHAR(1) NOT NULL DEFAULT '.',
  currency_position   VARCHAR(10) NOT NULL DEFAULT 'before',
  negative_format     VARCHAR(20) NOT NULL DEFAULT '-prefix',
  negative_color      VARCHAR(7) NOT NULL DEFAULT '#ff6b6b',
  positive_color      VARCHAR(7) NOT NULL DEFAULT '#1dd1a1',
  theme               VARCHAR(50) NOT NULL DEFAULT 'default',
  backup_enabled      TINYINT(1) NOT NULL DEFAULT 1,
  backup_frequency    VARCHAR(20) NOT NULL DEFAULT 'weekly',
  backup_time         TIME NOT NULL DEFAULT '02:00:00',
  backup_day_of_week  TINYINT UNSIGNED,
  backup_day_of_month TINYINT UNSIGNED,
  backup_count        TINYINT NOT NULL DEFAULT 5,
  last_backup_date    DATETIME,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table: Bank/savings account names per user
CREATE TABLE accounts (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name    VARCHAR(100) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_account (user_id, name)
);

-- Categories table: Unified category list with type flags and is_ignored flag
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  is_expense  TINYINT(1) NOT NULL DEFAULT 0,
  is_income   TINYINT(1) NOT NULL DEFAULT 0,
  is_transfer TINYINT(1) NOT NULL DEFAULT 0,
  is_ignored  TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_category (user_id, name)
);

-- Descriptions table: Transaction descriptions with common flag
-- MUST be created before transactions table (FK dependency)
CREATE TABLE descriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_common   TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_description (user_id, description)
);

-- Transactions table: Financial ledger (W/D/TW/TD types)
CREATE TABLE transactions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  date              DATE NOT NULL,
  account           VARCHAR(100) NOT NULL,
  category          VARCHAR(100) NOT NULL,
  description_id    INT NOT NULL,
  note              VARCHAR(500),
  amount            DECIMAL(12,2) NOT NULL,
  type              ENUM('W','D','TW','TD') NOT NULL,
  pending           TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (description_id) REFERENCES descriptions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id, account) REFERENCES accounts(user_id, name) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id, category) REFERENCES categories(user_id, name) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  INDEX idx_type (type),
  INDEX idx_description_id (description_id)
);