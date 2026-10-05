-- Adds advance/timbre amounts if they are missing so avances persist on invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(15,2) NULL DEFAULT NULL AFTER amount,
  ADD COLUMN IF NOT EXISTS timbre_amount DECIMAL(15,2) NULL DEFAULT NULL AFTER advance_amount;

-- Optional: normalize any NULLs to zero for existing records
UPDATE invoices
SET advance_amount = IFNULL(advance_amount, 0),
    timbre_amount = IFNULL(timbre_amount, 0);
