CREATE TABLE IF NOT EXISTS credit_cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  interest_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
  closing_date TEXT,
  card_user TEXT,
  issuer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add the foreign key from transactions to credit_cards that was deferred
-- from 003_create_transactions.sql because credit_cards didn't exist yet.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_credit_card_id_fkey'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_credit_card_id_fkey
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;
  END IF;
END $$;
