-- Drop the unique index on invoice_number to allow multiple invoices with same number (for soft deletes)
DROP INDEX IF EXISTS "invoices_invoice_number_key";
