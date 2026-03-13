-- Migrate payment provider from Paddle to Stripe
-- Renames the Paddle transaction ID column to Stripe checkout session ID

ALTER TABLE licenses
  RENAME COLUMN paddle_transaction_id TO stripe_checkout_session_id;
