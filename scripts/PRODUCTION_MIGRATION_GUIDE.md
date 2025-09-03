# Production Database Migration Guide

## Overview
This guide explains how to manually apply the invoice regeneration database migration in production environments without using the Prisma CLI.

## What This Migration Does
- Removes the unique constraint on the `invoice_number` field
- Enables soft delete functionality for invoices
- Allows multiple invoice records with the same invoice number (active vs voided)
- Fixes invoice regeneration constraint violations

## Migration Steps

### Step 1: Backup Your Database
```bash
# Create a backup of your production database
cp /path/to/your/myhours.db /path/to/your/myhours.db.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Apply the Migration
```bash
# Run the migration script
sqlite3 /path/to/your/myhours.db < production-migration.sql
```

### Step 3: Verify the Migration
```bash
# Check the table schema - invoice_number should NOT have unique constraint
sqlite3 /path/to/your/myhours.db ".schema invoices"

# Check for any remaining indexes on the invoices table (should be empty)
sqlite3 /path/to/your/myhours.db "PRAGMA index_list(invoices);"
```

## Expected Results

### Before Migration:
```sql
CREATE TABLE "invoices" (
    "invoice_number" TEXT NOT NULL,
    -- ... other fields
);
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
```

### After Migration:
```sql
CREATE TABLE "invoices" (
    "invoice_number" TEXT NOT NULL,
    -- ... other fields (no unique constraint)
);
-- No unique index on invoice_number
```

## Verification Commands

### Test Invoice Creation (Optional)
```sql
-- This should work after migration (would fail before)
INSERT INTO invoices (invoice_number, client_id, total_amount, status, created_at, updated_at) 
VALUES ('TEST-001', 1, 100.0, 'voided', datetime('now'), datetime('now'));

INSERT INTO invoices (invoice_number, client_id, total_amount, status, created_at, updated_at) 
VALUES ('TEST-001', 1, 150.0, 'generated', datetime('now'), datetime('now'));

-- Clean up test data
DELETE FROM invoices WHERE invoice_number = 'TEST-001';
```

## Rollback (If Needed)
If you need to rollback this migration:

```sql
-- Re-create the unique constraint (only if no duplicate invoice numbers exist)
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
```

Note: Rollback will fail if there are duplicate invoice numbers in the database.

## Production Deployment Checklist

- [ ] Database backup created
- [ ] Migration script applied successfully
- [ ] Schema verification completed
- [ ] Application restarted with updated code
- [ ] Invoice regeneration functionality tested
- [ ] No constraint violation errors in logs

## Troubleshooting

### If the migration fails:
1. Check if the unique index still exists: `PRAGMA index_list(invoices);`
2. Manually drop the index: `DROP INDEX IF EXISTS "invoices_invoice_number_key";`
3. Verify the schema matches the expected result

### If invoice regeneration still fails:
1. Check application logs for constraint violation errors
2. Verify the Prisma client has been regenerated: `npx prisma generate`
3. Restart the application to pick up schema changes
