# Supabase SQL Tests

Phase 2A collaboration test:

1. Apply migrations.
2. Run:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_2a_circle_collaboration.sql
```

The script runs inside a transaction and ends with `ROLLBACK`, so it does not persist test data.
