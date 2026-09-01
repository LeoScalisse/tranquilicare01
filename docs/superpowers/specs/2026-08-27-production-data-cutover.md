# Production Data Cutover Specification

The production application must render organizations, stories, campaigns, donations, and post-donation relationships from Supabase only. Hard-coded prototype records must never be merged into a successful production query or used to hide a failed query.

Local demonstrations remain possible only when `VITE_ENABLE_DEMO_DATA=true`; the default is disabled in every mode. Empty or failed queries must produce distinct UI states, and failed profile writes must show an actionable message without leaking database internals.

Removing existing rows from Supabase is outside this cutover. Any destructive cleanup requires an audited list of exact row IDs and explicit approval. The existing duplicate CNPJ conflict must likewise be reconciled only after the user identifies the authoritative account.

