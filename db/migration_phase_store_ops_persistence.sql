-- ======================================================================
-- STORE OPERATIONS PERSISTENCE MIGRATION
-- Moves operational state (stock movements, alert states, reorder
-- recommendation states, business audit trail) out of the single
-- site_settings JSONB blob into durable canonical Supabase tables.
--
-- Design notes:
-- * Primary keys mirror the engine's own stable IDs so writes are
--   idempotent upserts (safe under retries/concurrency).
-- * Each table keeps the full engine-typed record in `data JSONB`
--   alongside queryable key columns — engines keep their exact types.
-- * Settings remain in site_settings (small config blob).
-- * RLS: service_role writes (server-only modules); active admins read.
-- ======================================================================

create table if not exists public.store_ops_stock_movements (
  id text primary key,
  product_id text not null,
  quantity integer not null check (quantity > 0),
  direction text not null check (direction in ('in','out')),
  reason text not null,
  moved_at timestamptz not null default now(),
  actor text not null default 'system',
  source text not null default 'manual',
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_ops_alerts (
  id text primary key,
  severity text not null check (severity in ('critical','high','medium','info')),
  status text not null check (status in ('open','acknowledged','snoozed','dismissed')),
  entity_id text,
  updated_at timestamptz not null default now(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_ops_reorder_recommendations (
  product_id text primary key,
  status text not null check (status in ('open','acknowledged','executed','dismissed')),
  updated_at timestamptz not null default now(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_ops_audit_log (
  id text primary key,
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  acted_at timestamptz not null default now(),
  previous jsonb,
  new jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_ops_movements_product on public.store_ops_stock_movements (product_id, moved_at desc);
create index if not exists idx_store_ops_alerts_status on public.store_ops_alerts (status);
create index if not exists idx_store_ops_audit_entity on public.store_ops_audit_log (entity_type, entity_id, acted_at desc);
create index if not exists idx_store_ops_audit_time on public.store_ops_audit_log (acted_at desc);

alter table public.store_ops_stock_movements enable row level security;
alter table public.store_ops_alerts enable row level security;
alter table public.store_ops_reorder_recommendations enable row level security;
alter table public.store_ops_audit_log enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'store_ops_stock_movements',
    'store_ops_alerts',
    'store_ops_reorder_recommendations',
    'store_ops_audit_log'
  ] loop
    execute format(
      'drop policy if exists "store_ops_admin_read" on public.%I;',
      t
    );
    execute format(
      'create policy "store_ops_admin_read" on public.%I for select
         using (exists (select 1 from public.admin_users au where au.auth_id = auth.uid() and au.is_active));',
      t
    );
  end loop;
end $$;
