#!/bin/bash

# Production Migration Verification Script
# Run this script to verify the invoice regeneration migration was applied correctly

DB_PATH="${1:-./prisma/myhours.db}"

echo "🔍 Verifying database migration for: $DB_PATH"
echo "================================================"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found: $DB_PATH"
    exit 1
fi

echo "✅ Database file exists"

# Check table schema
echo ""
echo "📋 Current invoices table schema:"
echo "--------------------------------"
sqlite3 "$DB_PATH" ".schema invoices"

# Check for unique indexes
echo ""
echo "🔍 Checking for indexes on invoices table:"
echo "----------------------------------------"
INDEX_COUNT=$(sqlite3 "$DB_PATH" "PRAGMA index_list(invoices);" | wc -l)

if [ "$INDEX_COUNT" -eq 0 ]; then
    echo "✅ No indexes found (expected - unique constraint removed)"
else
    echo "⚠️  Found $INDEX_COUNT indexes:"
    sqlite3 "$DB_PATH" "PRAGMA index_list(invoices);"
fi

# Test duplicate invoice number insertion (safe test)
echo ""
echo "🧪 Testing duplicate invoice number support:"
echo "------------------------------------------"

# Create test entries
TEST_RESULT=$(sqlite3 "$DB_PATH" "
BEGIN TRANSACTION;
INSERT INTO invoices (invoice_number, client_id, total_amount, status, created_at, updated_at) 
VALUES ('MIGRATION_TEST', 1, 100.0, 'voided', datetime('now'), datetime('now'));
INSERT INTO invoices (invoice_number, client_id, total_amount, status, created_at, updated_at) 
VALUES ('MIGRATION_TEST', 1, 150.0, 'generated', datetime('now'), datetime('now'));
SELECT COUNT(*) FROM invoices WHERE invoice_number = 'MIGRATION_TEST';
DELETE FROM invoices WHERE invoice_number = 'MIGRATION_TEST';
COMMIT;
" 2>&1)

if echo "$TEST_RESULT" | grep -q "2"; then
    echo "✅ Duplicate invoice numbers allowed (migration successful)"
else
    echo "❌ Duplicate invoice numbers not allowed (migration may have failed)"
    echo "Error details: $TEST_RESULT"
fi

# Check for existing duplicate invoice numbers
echo ""
echo "📊 Checking for existing duplicate invoice numbers:"
echo "------------------------------------------------"
DUPLICATES=$(sqlite3 "$DB_PATH" "
SELECT invoice_number, COUNT(*) as count 
FROM invoices 
GROUP BY invoice_number 
HAVING COUNT(*) > 1;
")

if [ -z "$DUPLICATES" ]; then
    echo "✅ No duplicate invoice numbers found"
else
    echo "📝 Found duplicate invoice numbers (this is expected after regeneration):"
    echo "$DUPLICATES"
fi

echo ""
echo "🎉 Migration verification complete!"
echo "If all checks show ✅, the migration was successful."
