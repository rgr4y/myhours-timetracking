-- Manual Production Migration Script
-- Apply this script directly to your production SQLite database
-- This removes the unique constraint on invoice_number to support soft deletes

-- Check if the unique index exists before dropping it
-- SQLite will ignore the DROP INDEX command if the index doesn't exist

-- Drop the unique index on invoice_number (if it exists)
DROP INDEX IF EXISTS "invoices_invoice_number_key";

-- Verify the change by checking table schema
-- You can run: .schema invoices
-- The invoice_number field should NOT have a unique constraint

-- This migration enables:
-- 1. Soft delete functionality for invoices
-- 2. Multiple invoice records with the same invoice_number (active vs voided)
-- 3. Proper invoice regeneration without constraint violations

-- Expected result: invoice_number field allows duplicate values
-- Status field controls whether an invoice is active ('generated') or voided ('voided')
