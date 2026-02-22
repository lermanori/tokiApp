-- Add w_new column for boosting newly created events
ALTER TABLE algorithm_hyperparameters ADD COLUMN IF NOT EXISTS w_new NUMERIC(5,4) DEFAULT 0.05;

COMMENT ON COLUMN algorithm_hyperparameters.w_new IS 'NewEventBoost: Boost for recently created events';
