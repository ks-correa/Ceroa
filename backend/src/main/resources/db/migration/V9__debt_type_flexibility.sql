-- V9: Flexibilizar campos para soportar los 10 tipos de obligaciones financieras (EP-06)
-- 1. original_amount opcional para deudas familiares y otras obligaciones
ALTER TABLE debts ALTER COLUMN original_amount DROP NOT NULL;

-- 2. entity opcional según el tipo de obligación
ALTER TABLE debts ALTER COLUMN entity DROP NOT NULL;

-- 3. Relajar el check rígido de current_balance <= original_amount
-- y garantizar que current_balance no sea negativo y original_amount > 0 cuando se registre
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_current_balance_check;
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_original_amount_check;

ALTER TABLE debts ADD CONSTRAINT debts_current_balance_non_negative CHECK (current_balance >= 0);
ALTER TABLE debts ADD CONSTRAINT debts_original_amount_positive CHECK (original_amount IS NULL OR original_amount > 0);

