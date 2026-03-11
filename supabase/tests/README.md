# Supabase SQL Tests

Phase 2A collaboration test:

1. Apply migrations.
2. Run:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_2a_circle_collaboration.sql
```

The script runs inside a transaction and ends with `ROLLBACK`, so it does not persist test data.

Phase 2B invite token preview test:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_2b_circle_invite_preview.sql
```

This script also runs in a transaction and ends with `ROLLBACK`.

Phase 3A canonical event domain test:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_3a_event_domain.sql
```

This script also runs in a transaction and ends with `ROLLBACK`.

Phase 3A idempotence/authz/timezone verification test:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_3a_event_domain_idempotence.sql
```

This script also runs in a transaction and ends with `ROLLBACK`.

Phase 5A notifications/trust/privacy/deletion foundation test:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_5a_foundation.sql
```

This script also runs in a transaction and ends with `ROLLBACK`.

Event library overhaul canonical dataset/materialization test:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/event_library_overhaul.sql
```

This script also runs in a transaction and ends with `ROLLBACK`.
