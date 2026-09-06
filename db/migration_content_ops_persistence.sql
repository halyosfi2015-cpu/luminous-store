-- ======================================================================
-- CONTENT OPERATIONS PERSISTENCE MIGRATION — Phase 10 Part 2
-- Moves Phase 10 Part 2 operational state out of the single
-- site_settings JSON blob (content_operations_state_v1) into durable
-- canonical Supabase tables.
--
-- Design notes (mirrors db/migration_phase_store_ops_persistence.sql):
-- * Primary keys mirror the engine's own stable IDs (text) so writes are
--   idempotent upserts (safe under retries/concurrency).
-- * Each table keeps the full engine-typed record in `data JSONB` alongside
--   queryable key columns — engines keep their exact TypeScript types.
-- * Idempotency for publications uses the composite key
--   `itemId:versionId:channel:scheduleId` (also stored as PK).
-- * Settings remain in site_settings (small config blob) for backward
--   compatibility; the new tables are the canonical source after migration.
-- * RLS: service_role writes (server-only store modules); active admins
--   read. Public has no access — published_content is exposed only via the
--   dedicated /api/content/published endpoint which filters visible=true.
-- ======================================================================

-- 1. content_items — ops envelope around Part 1 ContentItem (lifecycle)
create table if not exists public.content_items (
  id text primary key,
  status text not null check (status in ('GENERATED','VALIDATING','REVIEW_REQUIRED','APPROVED','SCHEDULED','PUBLISHING','PUBLISHED','ARCHIVED','VALIDATION_FAILED','PUBLISH_FAILED','CANCELLED')),
  campaign_id text,
  idea_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null
);

-- 2. content_versions — immutable version history per item
create table if not exists public.content_versions (
  id text primary key,
  item_id text not null references public.content_items(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  status text not null check (status in ('draft','approved','rejected','superseded','published')),
  editor text not null,
  created_at timestamptz not null default now(),
  data jsonb not null,
  unique (item_id, version_number)
);

-- 3. content_schedules — scheduled publication slots
create table if not exists public.content_schedules (
  id text primary key,
  item_id text not null references public.content_items(id) on delete cascade,
  version_id text not null,
  channel text not null check (channel in ('website','instagram','facebook','tiktok','whatsapp')),
  scheduled_for timestamptz not null,
  timezone text not null default 'Asia/Aden',
  campaign_id text,
  status text not null check (status in ('scheduled','publishing','published','failed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null
);

-- 4. content_publications — idempotent publication attempts (item:version:channel:schedule)
create table if not exists public.content_publications (
  id text primary key,
  item_id text not null references public.content_items(id) on delete cascade,
  version_id text not null,
  channel text not null check (channel in ('website','instagram','facebook','tiktok','whatsapp')),
  schedule_id text not null,
  status text not null check (status in ('pending','succeeded','failed')),
  attempted_at timestamptz not null default now(),
  completed_at timestamptz,
  data jsonb not null
);

-- 5. content_campaigns — content campaign definitions (separate from message-delivery campaigns)
create table if not exists public.content_campaigns (
  id text primary key,
  name text not null,
  objective text not null,
  status text not null check (status in ('draft','scheduled','running','paused','completed','cancelled')),
  priority integer not null check (priority >= 0 and priority <= 100),
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null,
  check (end_at > start_at)
);

-- 6. content_plans — generated daily/weekly/monthly plans
create table if not exists public.content_plans (
  id text primary key,
  kind text not null check (kind in ('daily','weekly','monthly')),
  label text not null,
  generated_at timestamptz not null default now(),
  data jsonb not null
);

-- 7. content_ideas — planner output + ops status (IDEA→SELECTED→GENERATED→DISMISSED)
create table if not exists public.content_ideas (
  idea_id text primary key,
  status text not null check (status in ('IDEA','SELECTED','GENERATED','DISMISSED')),
  content_type text not null,
  objective text not null,
  priority text not null check (priority in ('high','medium','low')),
  category_id text,
  created_at timestamptz not null default now(),
  data jsonb not null
);

-- 8. published_content — website-channel published surface (visible storefront content)
create table if not exists public.published_content (
  content_id text primary key,
  publication_id text not null,
  channel text not null check (channel in ('website','instagram','facebook','tiktok','whatsapp')),
  published_at timestamptz not null default now(),
  visible boolean not null default true,
  category_id text,
  data jsonb not null
);

-- 9. content_audit_log — durable per-transition audit trail (mirrors store.audit)
create table if not exists public.content_audit_log (
  id text primary key,
  content_id text,
  version_id text,
  actor text not null,
  action text not null,
  previous_status text,
  new_status text,
  channel text,
  reason text,
  publication_result text,
  acted_at timestamptz not null default now(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- 10. content_performance_events — attributable metrics (content+product+campaign+category)
create table if not exists public.content_performance_events (
  id text primary key,
  content_id text not null,
  product_id text,
  campaign_id text,
  category_id text,
  metric text not null check (metric in ('impression','view','like','comment','share','save','click','product_view','add_to_cart','wishlist','checkout','purchase','repeat_purchase')),
  occurred_at timestamptz not null default now(),
  source text not null,
  value integer,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Indexes for operational queries
create index if not exists idx_content_items_status on public.content_items (status, updated_at desc);
create index if not exists idx_content_items_campaign on public.content_items (campaign_id) where campaign_id is not null;
create index if not exists idx_content_versions_item on public.content_versions (item_id, version_number desc);
create index if not exists idx_content_schedules_item on public.content_schedules (item_id);
create index if not exists idx_content_schedules_channel on public.content_schedules (channel, status, scheduled_for);
create index if not exists idx_content_schedules_date on public.content_schedules (scheduled_for);
create index if not exists idx_content_publications_item on public.content_publications (item_id, channel);
create index if not exists idx_content_publications_status on public.content_publications (status);
create index if not exists idx_content_campaigns_status on public.content_campaigns (status, start_at, end_at);
create index if not exists idx_content_ideas_status on public.content_ideas (status, created_at desc);
create index if not exists idx_content_plans_kind on public.content_plans (kind, generated_at desc);
create index if not exists idx_published_content_visible on public.published_content (visible, published_at desc) where visible = true;
create index if not exists idx_published_content_channel on public.published_content (channel);
create index if not exists idx_content_audit_content on public.content_audit_log (content_id, acted_at desc);
create index if not exists idx_content_audit_action on public.content_audit_log (action, acted_at desc);
create index if not exists idx_content_perf_content on public.content_performance_events (content_id, metric, occurred_at desc);
create index if not exists idx_content_perf_product on public.content_performance_events (product_id) where product_id is not null;
create index if not exists idx_content_perf_campaign on public.content_performance_events (campaign_id) where campaign_id is not null;

-- RLS: enable
alter table public.content_items enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_schedules enable row level security;
alter table public.content_publications enable row level security;
alter table public.content_campaigns enable row level security;
alter table public.content_plans enable row level security;
alter table public.content_ideas enable row level security;
alter table public.published_content enable row level security;
alter table public.content_audit_log enable row level security;
alter table public.content_performance_events enable row level security;

-- RLS: active admins may read (service_role bypasses RLS for server writes)
do $$
declare
  t text;
begin
  foreach t in array array[
    'content_items',
    'content_versions',
    'content_schedules',
    'content_publications',
    'content_campaigns',
    'content_plans',
    'content_ideas',
    'published_content',
    'content_audit_log',
    'content_performance_events'
  ] loop
    execute format('drop policy if exists "content_ops_admin_read" on public.%I;', t);
    execute format(
      'create policy "content_ops_admin_read" on public.%I for select using (exists (select 1 from public.admin_users au where au.auth_id = auth.uid() and au.is_active));',
      t
    );
    -- Published content: public may read only visible website publications via the dedicated API (service_role),
    -- but keep RLS read for anon on visible rows so the storefront can fetch directly if needed.
    if t = 'published_content' then
      execute 'drop policy if exists "published_content_public_read" on public.published_content;';
      execute 'create policy "published_content_public_read" on public.published_content for select using (visible = true);';
    end if;
  end loop;
end $$;

-- Triggers: auto-update updated_at where applicable
drop trigger if exists trg_content_items_updated_at on public.content_items;
create trigger trg_content_items_updated_at before update on public.content_items for each row execute function update_updated_at();
drop trigger if exists trg_content_schedules_updated_at on public.content_schedules;
create trigger trg_content_schedules_updated_at before update on public.content_schedules for each row execute function update_updated_at();
drop trigger if exists trg_content_campaigns_updated_at on public.content_campaigns;
create trigger trg_content_campaigns_updated_at before update on public.content_campaigns for each row execute function update_updated_at();
