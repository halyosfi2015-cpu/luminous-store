-- ======================================================================
-- VISUAL CONTENT STUDIO MIGRATION — Luminous Derma Professional Studio
-- Extends the Content Intelligence System (Parts 1-3) with a professional
-- visual/template engine for brand-consistent visual social content.
--
-- Design principles:
-- * Primary keys use stable text IDs for idempotent upserts
-- * Each table stores full engine-typed record in `data JSONB` alongside
--   queryable key columns — engines keep their exact TypeScript types
-- * RLS: service_role writes (server-only); active admins read
-- * Public has no access — assets exposed only via dedicated API endpoints
-- * Supabase Storage integration via brand_assets + generated_assets tables
-- ======================================================================

-- 1. brand_profiles — Centralized Luminous Derma Brand Profile
-- Stores brand voice, visual identity, color palette, typography, logo usage,
-- tone matrix, do/don't rules, and channel-specific format specs.
create table if not exists public.brand_profiles (
  id text primary key default 'luminous-derma',  -- single canonical profile
  name_ar text not null default 'لومينوس ديرما',
  name_en text not null default 'Luminous Derma',
  tagline_ar text default 'الاختيار الصحيح',
  tagline_en text default 'The Right Choice',
  
  -- Visual Identity
  primary_color text not null default '#7A3E9D',      -- Luminous Purple
  secondary_color text not null default '#D4AF37',    -- Luminous Gold
  accent_color text not null default '#F5A6C7',       -- Luminous Pink
  background_color text not null default '#352347',   -- Deep Purple
  surface_color text not null default '#4B2A6F',
  text_primary text not null default '#FFF7F2',
  text_secondary text not null default '#FFF7F2CC',
  text_on_primary text not null default '#352347',
  text_on_secondary text not null default '#FFF7F2',
  
  -- Color Palette (JSONB for extended palette)
  color_palette jsonb not null default '{
    "primary": ["#7A3E9D", "#8B4FC3", "#9C5FD8", "#AD6FED"],
    "secondary": ["#D4AF37", "#DDB84D", "#E6C263", "#EFCC79"],
    "accent": ["#F5A6C7", "#F8BBD0", "#FCD0E0", "#FFE5ED"],
    "neutral": ["#352347", "#4B2A6F", "#613D87", "#774FA0", "#8E61B9"],
    "semantic": {
      "success": "#25D366",
      "warning": "#FFB800",
      "error": "#FF4444",
      "info": "#00BCD4"
    }
  }',
  
  -- Typography
  font_arabic_primary text not null default 'Tajawal',
  font_arabic_secondary text default 'Cairo',
  font_arabic_display text default 'Amiri',
  font_latin_primary text not null default 'Montserrat',
  font_latin_secondary text default 'Inter',
  font_latin_display text default 'Playfair Display',
  font_weights jsonb not null default '{"light": 300, "regular": 400, "medium": 500, "semibold": 600, "bold": 700, "extrabold": 800}',
  
  -- Spacing & Layout
  base_spacing integer not null default 4,           -- 4px base unit
  spacing_scale jsonb not null default '[0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]',
  border_radius jsonb not null default '{"sm": 4, "md": 8, "lg": 12, "xl": 16, "full": 9999}',
  visual_density text not null default 'comfortable' check (visual_density in ('compact', 'comfortable', 'spacious')),
  
  -- Image Style
  image_style text not null default 'editorial_beauty' check (image_style in ('editorial_beauty', 'clinical_clean', 'lifestyle_warm', 'minimal_product', 'modern_editorial')),
  preferred_lighting text not null default 'soft_natural' check (preferred_lighting in ('soft_natural', 'studio_controlled', 'golden_hour', 'high_key', 'dramatic')),
  preferred_background text not null default 'gradient_blur' check (preferred_background in ('gradient_blur', 'solid_subtle', 'texture_paper', 'abstract_shapes', 'lifestyle_context')),
  product_presentation text not null default 'hero_centered' check (product_presentation in ('hero_centered', 'floating_3d', 'lifestyle_in_use', 'flat_lay', 'ingredient_focus')),
  
  -- Logo Usage
  logo_primary_url text,
  logo_white_url text,
  logo_dark_url text,
  logo_icon_url text,
  logo_clear_space_ratio numeric not null default 0.15,  -- 15% of logo width
  logo_min_width integer not null default 80,
  logo_usage_rules jsonb not null default '{
    "never_stretch": true,
    "never_recolor": true,
    "clear_space_required": true,
    "minimum_size_px": 80,
    "preferred_placement": ["top-left", "top-right", "bottom-left", "bottom-right", "center-top", "center-bottom"]
  }',
  
  -- Tone & Voice
  tone_arabic text not null default 'صديقة وخبيرة وراقية',
  tone_english text not null default 'friendly, expert, sophisticated',
  tone_matrix jsonb not null default '{
    "educational": { "ar": "معلومة وموثوقة", "en": "informative and trustworthy" },
    "commercial": { "ar": "مقنعة وأنيقة", "en": "persuasive and elegant" },
    "engagement": { "ar": "ودية وتفاعلية", "en": "friendly and engaging" },
    "seasonal": { "ar": "احتفالية ودافئة", "en": "celebratory and warm" },
    "trust": { "ar": "شفافة وصادقة", "en": "transparent and honest" }
  }',
  
  -- CTA Style
  cta_style jsonb not null default '{
    "primary": { "bg": "#D4AF37", "text": "#352347", "hover_bg": "#F7D98C", "radius": "full" },
    "secondary": { "bg": "transparent", "border": "#D4AF37", "text": "#D4AF37", "hover_bg": "#D4AF37", "hover_text": "#352347", "radius": "full" },
    "ghost": { "bg": "transparent", "text": "#FFF7F2", "hover_bg": "rgba(255,255,255,0.1)", "radius": "full" }
  }',
  
  -- Channel Format Specs
  channel_formats jsonb not null default '{
    "instagram_post": { "width": 1080, "height": 1080, "aspect": "1:1", "safe_zone_pct": 0.9 },
    "instagram_portrait": { "width": 1080, "height": 1350, "aspect": "4:5", "safe_zone_pct": 0.85 },
    "instagram_story": { "width": 1080, "height": 1920, "aspect": "9:16", "safe_zone_pct": 0.8 },
    "facebook_post": { "width": 1200, "height": 630, "aspect": "1.91:1", "safe_zone_pct": 0.9 },
    "tiktok_cover": { "width": 1080, "height": 1920, "aspect": "9:16", "safe_zone_pct": 0.8 },
    "youtube_thumbnail": { "width": 1280, "height": 720, "aspect": "16:9", "safe_zone_pct": 0.9 },
    "custom": { "width": 1080, "height": 1080, "aspect": "1:1", "safe_zone_pct": 0.9 }
  }',
  
  -- Prohibited Visual Styles
  prohibited_styles jsonb not null default '[
    "generic_ai_looking",
    "overcrowded_composition",
    "distorted_logo",
    "unreadable_arabic_typography",
    "clashing_colors",
    "misleading_before_after",
    "medical_claims_visual",
    "excessive_filters",
    "stock_photo_obvious",
    "inconsistent_branding"
  ]',
  
  -- Version & Metadata
  version integer not null default 1,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'
);

-- 2. creative_briefs — Campaign-level creative briefs
-- Links Content Campaigns to visual direction and mandatories
create table if not exists public.creative_briefs (
  id text primary key,
  campaign_id text references public.content_campaigns(id) on delete set null,
  title_ar text not null,
  title_en text,
  
  -- Business Context
  business_objective text not null,
  business_objective_en text,
  target_audience jsonb not null default '{}',  -- personas, demographics, psychographics
  key_messages jsonb not null default '[]',     -- primary, secondary, tertiary messages
  
  -- Visual Direction
  visual_concept_ar text,
  visual_concept_en text,
  mood_ar text,
  mood_en text,
  composition_ar text,
  composition_en text,
  lighting_direction text,
  background_direction text,
  color_direction jsonb,  -- override brand colors for this campaign
  
  -- Mandatories (non-negotiable)
  mandatory_elements jsonb not null default '[]',  -- logo, tagline, legal, certifications
  prohibited_elements jsonb not null default '[]',
  
  -- Deliverables
  deliverables jsonb not null default '[]',  -- format, channel, quantity, specs
  timeline_start timestamptz,
  timeline_end timestamptz,
  
  -- Status
  status text not null default 'draft' check (status in ('draft','review','approved','archived')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'
);

-- 3. design_templates — Reusable visual templates
-- Each template defines a layout with slots, constraints, and brand rules
create table if not exists public.design_templates (
  id text primary key,
  name text not null,
  name_ar text not null,
  description text,
  description_ar text,
  category text not null,  -- product_spotlight, sale, new_arrival, routine, educational, etc.
  category_ar text,
  
  -- Format & Dimensions
  format text not null,  -- instagram_post, instagram_portrait, instagram_story, facebook_post, tiktok_cover, youtube_thumbnail, custom
  width integer not null,
  height integer not null,
  aspect_ratio text not null,
  safe_zone_pct numeric not null default 0.9,
  
  -- Template Family
  family text not null,  -- product_spotlight, premium_product, sale, flash_sale, new_arrival, best_seller, routine, etc.
  family_ar text,
  
  -- Layout Definition (JSONB - interpreted by rendering engine)
  layout jsonb not null,  -- layers array with position, constraints, default values
  slot_definitions jsonb not null,  -- references template_slots table
  
  -- Brand Constraints
  brand_rules jsonb not null default '{}',  -- overrides brand_profile rules for this template
  editable_fields jsonb not null default '[]',  -- which slots are user-editable
  locked_fields jsonb not null default '[]',   -- which slots are brand-locked
  
  -- Supported Inputs
  supported_channels jsonb not null default '["instagram", "facebook", "tiktok", "youtube"]',
  supported_objectives jsonb not null default '["awareness", "education", "conversion", "engagement"]',
  required_inputs jsonb not null default '["product"]',  -- product, image, copy, etc.
  optional_inputs jsonb not null default '["reference_image", "campaign_tagline", "offer"]',
  
  -- Preview & Metadata
  preview_url text,  -- rendered preview image
  thumbnail_url text,
  tags jsonb not null default '[]',
  is_active boolean not null default true,
  is_system boolean not null default false,  -- system templates cannot be deleted
  sort_order integer not null default 0,
  
  -- Version & Metadata
  version integer not null default 1,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'
);

-- 4. template_slots — Slot definitions for design templates
-- Each slot defines a content area with type, constraints, and validation
create table if not exists public.template_slots (
  id text primary key,
  template_id text not null references public.design_templates(id) on delete cascade,
  slot_key text not null,  -- unique within template: headline, body, cta, product_image, badge, logo, background
  slot_type text not null check (slot_type in ('text', 'image', 'cta', 'badge', 'logo', 'price', 'discount', 'product_name', 'background', 'shape', 'divider')),
  
  -- Position & Size (relative to template dimensions, 0-1)
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null default 1,
  height numeric not null default 1,
  
  -- Text Constraints
  max_chars integer,
  min_chars integer,
  font_size_min integer,
  font_size_max integer,
  font_weight text,
  text_align text check (text_align in ('left', 'center', 'right', 'justify')),
  line_height numeric,
  text_transform text check (text_transform in ('none', 'uppercase', 'lowercase', 'capitalize')),
  
  -- Image Constraints
  aspect_ratio text,  -- e.g., "1:1", "4:5", "9:16", "16:9", "auto"
  fit_mode text check (fit_mode in ('cover', 'contain', 'fill', 'scale-down')),
  allow_background_removal boolean not null default false,
  
  -- Validation Rules
  required boolean not null default true,
  editable boolean not null default true,
  locked_by_brand boolean not null default false,
  validation_rules jsonb not null default '{}',  -- custom validation (regex, min/max, etc.)
  
  -- Default Values
  default_text_ar text,
  default_text_en text,
  default_image_url text,
  default_color text,
  
  -- Layer Ordering
  z_index integer not null default 0,
  
  -- RTL/LTR Behavior
  rtl_behavior text not null default 'mirror' check (rtl_behavior in ('mirror', 'keep', 'auto')),
  
  -- Safe Zone
  safe_zone_pct numeric not null default 0.9,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}',
  
  unique (template_id, slot_key)
);

-- 5. generated_assets — Rendered visual outputs
-- Each asset is a final rendered creative linked to content_items or standalone
create table if not exists public.generated_assets (
  id text primary key,
  content_item_id text references public.content_items(id) on delete set null,
  template_id text references public.design_templates(id) on delete set null,
  creative_brief_id text references public.creative_briefs(id) on delete set null,
  generation_job_id text,  -- references visual_generation_jobs
  
  -- Asset Identification
  title text not null,
  title_ar text,
  format text not null,  -- instagram_post, instagram_portrait, instagram_story, etc.
  channel text not null check (channel in ('website', 'instagram', 'facebook', 'tiktok', 'whatsapp', 'youtube')),
  
  -- Source
  generation_mode text not null check (generation_mode in ('native', 'ai', 'hybrid')),
  provider text,  -- openai, stability, self, native
  model text,
  
  -- Asset Files (stored in Supabase Storage)
  storage_bucket text not null default 'generated-assets',
  storage_path text not null,  -- e.g., "generated/2026/08/asset_id.png"
  file_name text not null,
  mime_type text not null default 'image/png',
  file_size integer,
  width integer not null,
  height integer not null,
  
  -- Variants (responsive)
  has_variants boolean not null default false,
  variant_count integer not null default 0,
  
  -- Validation
  validation_status text not null default 'pending' check (validation_status in ('pending', 'passed', 'failed', 'skipped')),
  validation_errors jsonb,
  validation_warnings jsonb,
  
  -- Usage
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'exported', 'published', 'archived')),
  exported_at timestamptz,
  exported_by text,
  export_format text check (export_format in ('png', 'jpg', 'webp')),
  
  -- Metadata
  prompt_used text,
  generation_params jsonb,
  render_time_ms integer,
  generation_cost_usd numeric,
  
  -- Metadata
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'
);

-- 6. asset_variants — Responsive variants of generated assets
create table if not exists public.asset_variants (
  id text primary key,
  asset_id text not null references public.generated_assets(id) on delete cascade,
  format text not null,  -- instagram_post, instagram_portrait, instagram_story, etc.
  channel text not null,
  
  -- Dimensions
  width integer not null,
  height integer not null,
  aspect_ratio text not null,
  
  -- Storage
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'image/png',
  file_size integer,
  
  -- Generation
  source_variant_id text references public.asset_variants(id) on delete set null,  -- if derived from another variant
  transform_applied jsonb,  -- crop, resize, pad operations applied
  
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'
);

-- 7. brand_assets — Brand assets stored in Supabase Storage
-- Logos, fonts, color swatches, patterns, iconography
create table if not exists public.brand_assets (
  id text primary key,
  asset_type text not null check (asset_type in ('logo', 'font', 'color_swatch', 'pattern', 'iconography', 'background', 'illustration')),
  name text not null,
  name_ar text,
  description text,
  
  -- Storage
  storage_bucket text not null default 'brand-assets',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer,
  
  -- Metadata
  dimensions jsonb,  -- {width, height} for images
  color_values jsonb,  -- for color swatches: {primary: "#7A3E9D", secondary: "#D4AF37"}
  font_metadata jsonb,  -- for fonts: {family, weight, style, format}
  
  -- Usage
  is_primary boolean not null default false,
  usage_context jsonb not null default '[]',  -- where this asset is used (templates, channels)
  is_active boolean not null default true,
  
  -- Version
  version integer not null default 1,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'
);

-- 8. visual_generation_jobs — Track AI/native visual generation jobs
create table if not exists public.visual_generation_jobs (
  id text primary key,
  asset_id text references public.generated_assets(id) on delete set null,
  creative_brief_id text references public.creative_briefs(id) on delete set null,
  template_id text references public.design_templates(id) on delete set null,
  
  -- Job Info
  job_type text not null check (job_type in ('visual_generation', 'visual_editing', 'variant_generation', 'composite_rendering', 'batch_generation')),
  generation_mode text not null check (generation_mode in ('native', 'ai', 'hybrid')),
  provider text,  -- openai, stability, self, native
  model text,
  
  -- Request
  prompt text,
  reference_image_url text,
  input_params jsonb not null default '{}',
  
  -- Status
  status text not null default 'pending' check (status in ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  current_step text,
  
  -- Result
  output_asset_id text references public.generated_assets(id) on delete set null,
  output_variants jsonb,
  error_message text,
  error_code text,
  
  -- Metrics
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  tokens_used integer,
  generation_cost_usd numeric,
  render_time_ms integer,
  
  -- Retry
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  parent_job_id text references public.visual_generation_jobs(id) on delete set null,
  
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'
);

-- Indexes
create index if not exists idx_brand_profiles_updated on public.brand_profiles (updated_at desc);
create index if not exists idx_creative_briefs_campaign on public.creative_briefs (campaign_id) where campaign_id is not null;
create index if not exists idx_creative_briefs_status on public.creative_briefs (status, created_at desc);
create index if not exists idx_design_templates_family on public.design_templates (family, is_active);
create index if not exists idx_design_templates_format on public.design_templates (format, is_active);
create index if not exists idx_design_templates_category on public.design_templates (category, is_active);
create index if not exists idx_template_slots_template on public.template_slots (template_id, z_index);
create index if not exists idx_generated_assets_content on public.generated_assets (content_item_id) where content_item_id is not null;
create index if not exists idx_generated_assets_template on public.generated_assets (template_id);
create index if not exists idx_generated_assets_brief on public.generated_assets (creative_brief_id);
create index if not exists idx_generated_assets_status on public.generated_assets (status, created_at desc);
create index if not exists idx_generated_assets_channel on public.generated_assets (channel);
create index if not exists idx_asset_variants_asset on public.asset_variants (asset_id);
create index if not exists idx_brand_assets_type on public.brand_assets (asset_type, is_active);
create index if not exists idx_visual_jobs_status on public.visual_generation_jobs (status, created_at desc);
create index if not exists idx_visual_jobs_asset on public.visual_generation_jobs (asset_id) where asset_id is not null;
create index if not exists idx_visual_jobs_brief on public.visual_generation_jobs (creative_brief_id);

-- RLS: enable
alter table public.brand_profiles enable row level security;
alter table public.creative_briefs enable row level security;
alter table public.design_templates enable row level security;
alter table public.template_slots enable row level security;
alter table public.generated_assets enable row level security;
alter table public.asset_variants enable row level security;
alter table public.brand_assets enable row level security;
alter table public.visual_generation_jobs enable row level security;

-- RLS: active admins may read (service_role bypasses RLS for server writes)
do $$
declare
  t text;
begin
  foreach t in array array[
    'brand_profiles',
    'creative_briefs',
    'design_templates',
    'template_slots',
    'generated_assets',
    'asset_variants',
    'brand_assets',
    'visual_generation_jobs'
  ] loop
    execute format('drop policy if exists "visual_studio_admin_read" on public.%I;', t);
    execute format(
      'create policy "visual_studio_admin_read" on public.%I for select using (exists (select 1 from public.admin_users au where au.auth_id = auth.uid() and au.is_active));',
      t
    );
  end loop;
end $$;

-- Triggers: auto-update updated_at
drop trigger if exists trg_brand_profiles_updated_at on public.brand_profiles;
create trigger trg_brand_profiles_updated_at before update on public.brand_profiles for each row execute function update_updated_at();
drop trigger if exists trg_creative_briefs_updated_at on public.creative_briefs;
create trigger trg_creative_briefs_updated_at before update on public.creative_briefs for each row execute function update_updated_at();
drop trigger if exists trg_design_templates_updated_at on public.design_templates;
create trigger trg_design_templates_updated_at before update on public.design_templates for each row execute function update_updated_at();
drop trigger if exists trg_template_slots_updated_at on public.template_slots;
create trigger trg_template_slots_updated_at before update on public.template_slots for each row execute function update_updated_at();
drop trigger if exists trg_generated_assets_updated_at on public.generated_assets;
create trigger trg_generated_assets_updated_at before update on public.generated_assets for each row execute function update_updated_at();
drop trigger if exists trg_brand_assets_updated_at on public.brand_assets;
create trigger trg_brand_assets_updated_at before update on public.brand_assets for each row execute function update_updated_at();
drop trigger if exists trg_visual_jobs_updated_at on public.visual_generation_jobs;
create trigger trg_visual_jobs_updated_at before update on public.visual_generation_jobs for each row execute function update_updated_at();

-- Storage Buckets (to be created via Supabase Dashboard or CLI)
-- These are documented here for reference; actual bucket creation requires Supabase Dashboard
-- or the storage management API.
-- 
-- Bucket: brand-assets (public: false)
--   - logos/
--   - fonts/
--   - patterns/
--   - color-swatches/
--   - icons/
--   - backgrounds/
--   - illustrations/
-- 
-- Bucket: generated-assets (public: false)
--   - generated/{year}/{month}/
--   - variants/{year}/{month}/
--   - temp/
-- 
-- Bucket: content-assets (public: false) - for uploads, reference images
--   - uploads/{user_id}/
--   - reference/{job_id}/
--   - temp/