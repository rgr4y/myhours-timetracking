# Production Deployment Checklist

## Pre-Deployment
- [ ] Create database backup
- [ ] Review migration scripts
- [ ] Test migration on staging environment

## Database Migration
- [ ] Apply `production-migration.sql` script:
  ```bash
  sqlite3 /path/to/myhours.db < production-migration.sql
  ```

## Verification
- [ ] Run verification script:
  ```bash
  ./verify-migration.sh /path/to/myhours.db
  ```
- [ ] Confirm all checks show ✅

## Application Deployment
- [ ] Deploy updated application code
- [ ] Restart application services
- [ ] Regenerate Prisma client if needed:
  ```bash
  npx prisma generate
  ```

## Post-Deployment Testing
- [ ] Test invoice regeneration functionality
- [ ] Verify no constraint violation errors in logs
- [ ] Confirm duplicate invoice numbers are handled correctly

## Files Included
- `production-migration.sql` - The SQL migration script
- `verify-migration.sh` - Verification script
- `PRODUCTION_MIGRATION_GUIDE.md` - Detailed documentation

## Rollback Plan
If issues occur, restore from backup:
```bash
cp /path/to/myhours.db.backup /path/to/myhours.db
```
