-- ============================================================
-- REPOSITÓRIO DE ESTUDOS — Migração segura v8
-- Supabase PostgreSQL + RLS · NÃO apaga dados existentes
-- ============================================================
-- Execute este arquivo no SQL Editor do Supabase após o schema base.
-- Ele usa CREATE IF NOT EXISTS / ALTER ADD COLUMN IF NOT EXISTS.
-- O arquivo antigo destrutivo foi preservado como schema_legacy_reset_full.sql.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Funções auxiliares de permissão
-- ============================================================
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), 'viewer');
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role::text = 'admin' AND COALESCE(status, 'active') = 'active' FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION is_editor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role::text IN ('admin','editor') AND COALESCE(status, 'active') = 'active' FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), false);
$$;

-- ============================================================
-- Profiles: gerência/admin, perfil seguro e último acesso
-- ============================================================
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_drive_file_id text,
  ADD COLUMN IF NOT EXISTS avatar_drive_folder_id text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_status_check') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active','inactive','suspended'));
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================
-- Nós customizados do grafo: tópicos/conceitos livres
-- ============================================================
CREATE TABLE IF NOT EXISTS public.graph_nodes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type text NOT NULL DEFAULT 'topic',
  label text NOT NULL,
  description text,
  color text DEFAULT '#004ac6',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT graph_nodes_type_check CHECK (node_type IN ('topic','concept'))
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_label ON public.graph_nodes USING gin (to_tsvector('portuguese', coalesce(label,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS idx_graph_nodes_created_by ON public.graph_nodes(created_by);

-- ============================================================
-- graph_edges real: relações genéricas entre materiais/trilhas/tópicos/tags etc.
-- Se existia uma VIEW graph_edges apontando para file_dependencies, ela é removida.
-- Nenhum dado de tabela é apagado.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'graph_edges' AND c.relkind = 'v'
  ) THEN
    DROP VIEW public.graph_edges;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.graph_edges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id uuid REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  relation_type text NOT NULL DEFAULT 'related',
  direction text NOT NULL DEFAULT 'directed',
  weight numeric(8,3) NOT NULL DEFAULT 1,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT graph_edges_no_self CHECK (NOT (source_type = target_type AND source_id = target_id)),
  CONSTRAINT graph_edges_direction_check CHECK (direction IN ('directed','undirected')),
  CONSTRAINT graph_edges_node_type_check CHECK (source_type IN ('material','path','category','subject','tag','topic') AND target_type IN ('material','path','category','subject','tag','topic')),
  CONSTRAINT graph_edges_relation_type_check CHECK (relation_type IN ('prerequisite','recommended_after','related','same_author','same_category','same_subject','criticizes','explains','depends_on','part_of','custom','required','recommended','complementary')),
  CONSTRAINT graph_edges_weight_check CHECK (weight > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_graph_edges_unique
ON public.graph_edges(coalesce(path_id, '00000000-0000-0000-0000-000000000000'::uuid), source_type, source_id, target_type, target_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_path ON public.graph_edges(path_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON public.graph_edges(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON public.graph_edges(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relation ON public.graph_edges(relation_type, direction);

-- Migra relações antigas de file_dependencies para graph_edges, se existirem.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='file_dependencies') THEN
    INSERT INTO public.graph_edges (path_id, source_type, source_id, target_type, target_id, relation_type, direction, weight, note, created_by, created_at)
    SELECT
      fd.learning_path_id,
      'material', fd.source_file_id::text,
      'material', fd.target_file_id::text,
      CASE fd.relation_type::text
        WHEN 'required' THEN 'prerequisite'
        WHEN 'recommended' THEN 'recommended_after'
        WHEN 'complementary' THEN 'related'
        ELSE 'related'
      END,
      'directed',
      1,
      fd.note,
      fd.created_by,
      fd.created_at
    FROM public.file_dependencies fd
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- study_path_items / user_progress: garantias para modo lista
-- ============================================================
ALTER TABLE IF EXISTS public.study_path_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'required',
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='study_path_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='study_path_items_item_type_check') THEN
      ALTER TABLE public.study_path_items ADD CONSTRAINT study_path_items_item_type_check CHECK (item_type IN ('required','complementary','optional'));
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  path_item_id uuid NOT NULL REFERENCES public.study_path_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  notes text,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, path_item_id),
  CONSTRAINT user_progress_status_check CHECK (status IN ('not_started','reading','completed','review_later'))
);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_item ON public.user_progress(path_item_id);

-- ============================================================
-- Auditoria para gerência e ações importantes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_safe ON public.profiles;
CREATE POLICY profiles_select_safe ON public.profiles
FOR SELECT USING (auth.uid() = user_id OR is_editor_or_admin());

DROP POLICY IF EXISTS profiles_update_own_safe ON public.profiles;
CREATE POLICY profiles_update_own_safe ON public.profiles
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_admin_all_safe ON public.profiles;
CREATE POLICY profiles_admin_all_safe ON public.profiles
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS graph_nodes_select_safe ON public.graph_nodes;
CREATE POLICY graph_nodes_select_safe ON public.graph_nodes
FOR SELECT USING (true);

DROP POLICY IF EXISTS graph_nodes_insert_editor ON public.graph_nodes;
CREATE POLICY graph_nodes_insert_editor ON public.graph_nodes
FOR INSERT WITH CHECK (is_editor_or_admin());

DROP POLICY IF EXISTS graph_nodes_update_editor ON public.graph_nodes;
CREATE POLICY graph_nodes_update_editor ON public.graph_nodes
FOR UPDATE USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());

DROP POLICY IF EXISTS graph_nodes_delete_editor ON public.graph_nodes;
CREATE POLICY graph_nodes_delete_editor ON public.graph_nodes
FOR DELETE USING (is_editor_or_admin());

DROP POLICY IF EXISTS graph_edges_select_safe ON public.graph_edges;
CREATE POLICY graph_edges_select_safe ON public.graph_edges
FOR SELECT USING (true);

DROP POLICY IF EXISTS graph_edges_insert_editor ON public.graph_edges;
CREATE POLICY graph_edges_insert_editor ON public.graph_edges
FOR INSERT WITH CHECK (is_editor_or_admin());

DROP POLICY IF EXISTS graph_edges_update_editor ON public.graph_edges;
CREATE POLICY graph_edges_update_editor ON public.graph_edges
FOR UPDATE USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());

DROP POLICY IF EXISTS graph_edges_delete_editor ON public.graph_edges;
CREATE POLICY graph_edges_delete_editor ON public.graph_edges
FOR DELETE USING (is_editor_or_admin());

DROP POLICY IF EXISTS user_progress_select_own ON public.user_progress;
CREATE POLICY user_progress_select_own ON public.user_progress
FOR SELECT USING (user_id = current_profile_id() OR is_editor_or_admin());

DROP POLICY IF EXISTS user_progress_insert_own ON public.user_progress;
CREATE POLICY user_progress_insert_own ON public.user_progress
FOR INSERT WITH CHECK (user_id = current_profile_id());

DROP POLICY IF EXISTS user_progress_update_own ON public.user_progress;
CREATE POLICY user_progress_update_own ON public.user_progress
FOR UPDATE USING (user_id = current_profile_id()) WITH CHECK (user_id = current_profile_id());

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS audit_logs_insert_editor_admin ON public.audit_logs;
CREATE POLICY audit_logs_insert_editor_admin ON public.audit_logs
FOR INSERT WITH CHECK (is_editor_or_admin());

-- ============================================================
-- Atualização automática de updated_at, se a função existir/não existir
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_graph_nodes_updated_at') THEN
    CREATE TRIGGER set_graph_nodes_updated_at BEFORE UPDATE ON public.graph_nodes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_graph_edges_updated_at') THEN
    CREATE TRIGGER set_graph_edges_updated_at BEFORE UPDATE ON public.graph_edges FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at') THEN
    CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ============================================================
-- Verificação rápida esperada
-- ============================================================
SELECT
  'migration_v8_graph_admin_ok' AS status,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='graph_edges') AS graph_edges_ok,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') AS audit_logs_ok,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='status') AS profiles_status_ok;

-- ============================================================
-- PATCH v9 — YouTube, links externos e leitor horizontal
-- Execute também após a migração v8. Não apaga dados existentes.
-- ============================================================

ALTER TABLE IF EXISTS public.study_files
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'drive_file',
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS youtube_playlist_id text,
  ADD COLUMN IF NOT EXISTS embed_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS channel_title text,
  ADD COLUMN IF NOT EXISTS link_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Remove checks antigos de file_type/status quando impedem vídeo/playlist/link.
DO $$
DECLARE c record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='study_files') THEN
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.study_files'::regclass
        AND contype = 'c'
        AND (
          pg_get_constraintdef(oid) ILIKE '%file_type%'
          OR pg_get_constraintdef(oid) ILIKE '%source_type%'
          OR pg_get_constraintdef(oid) ILIKE '%external_provider%'
        )
    LOOP
      EXECUTE format('ALTER TABLE public.study_files DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    ALTER TABLE public.study_files
      ADD CONSTRAINT study_files_file_type_check CHECK (file_type IN ('book','article','slide','summary','test','notes','dataset','document','video','playlist','external_link','other')),
      ADD CONSTRAINT study_files_source_type_check CHECK (source_type IN ('drive_file','youtube_video','youtube_playlist','external_link')),
      ADD CONSTRAINT study_files_external_provider_check CHECK (external_provider IS NULL OR external_provider IN ('youtube','external','drive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_files_source_type ON public.study_files(source_type);
CREATE INDEX IF NOT EXISTS idx_study_files_external_provider ON public.study_files(external_provider);
CREATE INDEX IF NOT EXISTS idx_study_files_youtube_video ON public.study_files(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_study_files_youtube_playlist ON public.study_files(youtube_playlist_id);
CREATE INDEX IF NOT EXISTS idx_study_files_external_url ON public.study_files(external_url);

ALTER TABLE IF EXISTS public.user_file_progress
  ADD COLUMN IF NOT EXISTS current_page integer,
  ADD COLUMN IF NOT EXISTS total_pages integer,
  ADD COLUMN IF NOT EXISTS progress_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS last_position_seconds integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS public.user_progress
  ADD COLUMN IF NOT EXISTS current_page integer,
  ADD COLUMN IF NOT EXISTS total_pages integer,
  ADD COLUMN IF NOT EXISTS progress_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS last_position_seconds integer;

DO $$
DECLARE c record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_file_progress') THEN
    FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.user_file_progress'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP EXECUTE format('ALTER TABLE public.user_file_progress DROP CONSTRAINT IF EXISTS %I', c.conname); END LOOP;
    ALTER TABLE public.user_file_progress ADD CONSTRAINT user_file_progress_status_check CHECK (status IN ('not_started','reading','watching','completed','review_later'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_progress') THEN
    FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.user_progress'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP EXECUTE format('ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS %I', c.conname); END LOOP;
    ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_status_check CHECK (status IN ('not_started','reading','watching','completed','review_later'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_file_progress_reader ON public.user_file_progress(user_id, file_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_reader ON public.user_progress(user_id, path_item_id, updated_at DESC);

-- Histórico/auditoria já existentes recebem os novos eventos via backend:
-- youtube_link_added, external_link_added, reader_opened, reading_progress_saved,
-- video_progress_saved, video_completed, material_link_created.

-- RLS base para leitura de links segue a política de study_files existente.
-- Caso a tabela ainda não tenha RLS/policies, mantenha as policies do schema base do projeto.

NOTIFY pgrst, 'reload schema';

SELECT
  'migration_v9_youtube_reader_ok' AS status,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='study_files' AND column_name='source_type') AS source_type_ok,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='study_files' AND column_name='youtube_video_id') AS youtube_video_ok,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_file_progress' AND column_name='current_page') AS reader_progress_ok;

-- Policies específicas de progresso de leitura/vídeo, se a tabela existir.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_file_progress') THEN
    ALTER TABLE public.user_file_progress ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS user_file_progress_select_own ON public.user_file_progress;
    CREATE POLICY user_file_progress_select_own ON public.user_file_progress
      FOR SELECT USING (user_id = current_profile_id() OR is_editor_or_admin());
    DROP POLICY IF EXISTS user_file_progress_insert_own ON public.user_file_progress;
    CREATE POLICY user_file_progress_insert_own ON public.user_file_progress
      FOR INSERT WITH CHECK (user_id = current_profile_id());
    DROP POLICY IF EXISTS user_file_progress_update_own ON public.user_file_progress;
    CREATE POLICY user_file_progress_update_own ON public.user_file_progress
      FOR UPDATE USING (user_id = current_profile_id()) WITH CHECK (user_id = current_profile_id());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
-- =========================================================
-- Repositório de Estudos — v12 Resenhas e Comentários
-- Execute no SQL Editor do Supabase. Não apaga dados existentes.
-- =========================================================

begin;

create table if not exists public.review_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null,
  author_profile_id uuid,
  material_id text,
  path_id text,
  post_type text not null default 'review',
  title text,
  body text not null,
  rating numeric(2,1),
  has_spoiler boolean not null default false,
  visibility text not null default 'public',
  status text not null default 'published',
  tags text[] not null default '{}',
  linked_entities jsonb not null default '{}'::jsonb,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  save_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint review_posts_post_type_check check (post_type in ('review','comment','reading_note','question')),
  constraint review_posts_visibility_check check (visibility in ('public','private','path_only')),
  constraint review_posts_status_check check (status in ('draft','published','archived','deleted')),
  constraint review_posts_rating_check check (rating is null or (rating >= 1 and rating <= 5))
);

alter table public.review_posts
  add column if not exists author_user_id uuid,
  add column if not exists author_profile_id uuid,
  add column if not exists material_id text,
  add column if not exists path_id text,
  add column if not exists post_type text default 'review',
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists rating numeric(2,1),
  add column if not exists has_spoiler boolean default false,
  add column if not exists visibility text default 'public',
  add column if not exists status text default 'published',
  add column if not exists tags text[] default '{}',
  add column if not exists linked_entities jsonb default '{}'::jsonb,
  add column if not exists like_count integer default 0,
  add column if not exists comment_count integer default 0,
  add column if not exists save_count integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz;

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.review_posts(id) on delete cascade,
  author_user_id uuid not null,
  author_profile_id uuid,
  parent_comment_id uuid references public.review_comments(id) on delete cascade,
  body text not null,
  like_count integer not null default 0,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint review_comments_status_check check (status in ('published','archived','deleted'))
);

alter table public.review_comments
  add column if not exists post_id uuid,
  add column if not exists author_user_id uuid,
  add column if not exists author_profile_id uuid,
  add column if not exists parent_comment_id uuid,
  add column if not exists body text,
  add column if not exists like_count integer default 0,
  add column if not exists status text default 'published',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz;

create table if not exists public.review_reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  user_id uuid not null,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  constraint review_reactions_target_type_check check (target_type in ('post','comment')),
  constraint review_reactions_reaction_type_check check (reaction_type in ('like','useful'))
);

alter table public.review_reactions
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists user_id uuid,
  add column if not exists reaction_type text default 'like',
  add column if not exists created_at timestamptz default now();

create table if not exists public.review_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.review_posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.review_saves
  add column if not exists post_id uuid,
  add column if not exists user_id uuid,
  add column if not exists created_at timestamptz default now();

create table if not exists public.review_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.review_posts(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  label text,
  relation_type text not null default 'about',
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint review_links_entity_type_check check (entity_type in ('material','path','category','subject','tag','topic','author','concept')),
  constraint review_links_relation_type_check check (relation_type in ('about','mentions','criticizes','explains','related','supports','questions','custom'))
);

alter table public.review_links
  add column if not exists post_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists label text,
  add column if not exists relation_type text default 'about',
  add column if not exists created_at timestamptz default now(),
  add column if not exists created_by uuid;

create index if not exists idx_review_posts_author on public.review_posts(author_user_id);
create index if not exists idx_review_posts_material on public.review_posts(material_id);
create index if not exists idx_review_posts_path on public.review_posts(path_id);
create index if not exists idx_review_posts_type_status on public.review_posts(post_type, status);
create index if not exists idx_review_posts_visibility on public.review_posts(visibility);
create index if not exists idx_review_posts_created_at on public.review_posts(created_at desc);
create index if not exists idx_review_comments_post on public.review_comments(post_id);
create index if not exists idx_review_comments_parent on public.review_comments(parent_comment_id);
create index if not exists idx_review_reactions_target on public.review_reactions(target_type, target_id);
create unique index if not exists ux_review_reactions_once on public.review_reactions(target_type, target_id, user_id, reaction_type);
create unique index if not exists ux_review_saves_once on public.review_saves(post_id, user_id);
create index if not exists idx_review_links_post on public.review_links(post_id);
create index if not exists idx_review_links_entity on public.review_links(entity_type, entity_id);

alter table public.review_posts enable row level security;
alter table public.review_comments enable row level security;
alter table public.review_reactions enable row level security;
alter table public.review_saves enable row level security;
alter table public.review_links enable row level security;

drop policy if exists "review_posts_select_visible" on public.review_posts;
create policy "review_posts_select_visible" on public.review_posts for select to authenticated using (
  deleted_at is null and status <> 'deleted' and (visibility = 'public' or author_user_id = auth.uid())
);

drop policy if exists "review_posts_insert_own" on public.review_posts;
create policy "review_posts_insert_own" on public.review_posts for insert to authenticated with check (author_user_id = auth.uid());

drop policy if exists "review_posts_update_own_or_admin" on public.review_posts;
create policy "review_posts_update_own_or_admin" on public.review_posts for update to authenticated using (
  author_user_id = auth.uid() or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin','editor') and coalesce(p.status,'active') = 'active')
) with check (
  author_user_id = auth.uid() or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin','editor') and coalesce(p.status,'active') = 'active')
);

drop policy if exists "review_comments_select_visible" on public.review_comments;
create policy "review_comments_select_visible" on public.review_comments for select to authenticated using (
  deleted_at is null and exists (select 1 from public.review_posts rp where rp.id = post_id and rp.deleted_at is null and (rp.visibility = 'public' or rp.author_user_id = auth.uid()))
);

drop policy if exists "review_comments_insert_own" on public.review_comments;
create policy "review_comments_insert_own" on public.review_comments for insert to authenticated with check (author_user_id = auth.uid());

drop policy if exists "review_comments_update_own_or_admin" on public.review_comments;
create policy "review_comments_update_own_or_admin" on public.review_comments for update to authenticated using (
  author_user_id = auth.uid() or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin','editor') and coalesce(p.status,'active') = 'active')
) with check (
  author_user_id = auth.uid() or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin','editor') and coalesce(p.status,'active') = 'active')
);

drop policy if exists "review_reactions_select" on public.review_reactions;
create policy "review_reactions_select" on public.review_reactions for select to authenticated using (true);

drop policy if exists "review_reactions_insert_own" on public.review_reactions;
create policy "review_reactions_insert_own" on public.review_reactions for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "review_reactions_delete_own" on public.review_reactions;
create policy "review_reactions_delete_own" on public.review_reactions for delete to authenticated using (user_id = auth.uid());

drop policy if exists "review_saves_select_own" on public.review_saves;
create policy "review_saves_select_own" on public.review_saves for select to authenticated using (user_id = auth.uid());

drop policy if exists "review_saves_insert_own" on public.review_saves;
create policy "review_saves_insert_own" on public.review_saves for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "review_saves_delete_own" on public.review_saves;
create policy "review_saves_delete_own" on public.review_saves for delete to authenticated using (user_id = auth.uid());

drop policy if exists "review_links_select_visible" on public.review_links;
create policy "review_links_select_visible" on public.review_links for select to authenticated using (
  exists (select 1 from public.review_posts rp where rp.id = post_id and rp.deleted_at is null and (rp.visibility = 'public' or rp.author_user_id = auth.uid()))
);

drop policy if exists "review_links_insert_own" on public.review_links;
create policy "review_links_insert_own" on public.review_links for insert to authenticated with check (
  exists (select 1 from public.review_posts rp where rp.id = post_id and rp.author_user_id = auth.uid())
);

notify pgrst, 'reload schema';
commit;
