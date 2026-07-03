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
