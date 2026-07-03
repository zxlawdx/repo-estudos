-- =========================================================
-- Repositório de Estudos — v19 Hotfix Resenhas/RLS
-- Corrige insert de review_posts/review_comments quando profiles.id != auth.uid().
-- Execute no SQL Editor do Supabase. Não apaga dados existentes.
-- =========================================================

begin;

-- 1) Garante colunas de autoria compatíveis.
alter table public.review_posts
  add column if not exists author_user_id uuid,
  add column if not exists author_profile_id uuid;

alter table public.review_comments
  add column if not exists author_user_id uuid,
  add column if not exists author_profile_id uuid;

alter table public.review_posts
  alter column author_user_id drop not null;

alter table public.review_posts
  alter column author_profile_id drop not null;

alter table public.review_comments
  alter column author_user_id drop not null;

alter table public.review_comments
  alter column author_profile_id drop not null;

-- 2) Função auxiliar: perfil interno do usuário autenticado.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

-- 3) Corrige registros antigos quando author_profile_id foi salvo igual ao auth.uid()
-- ou quando só author_user_id existe.
update public.review_posts rp
set author_profile_id = p.id
from public.profiles p
where rp.author_user_id = p.user_id
  and (
    rp.author_profile_id is null
    or rp.author_profile_id = rp.author_user_id
  );

update public.review_comments rc
set author_profile_id = p.id
from public.profiles p
where rc.author_user_id = p.user_id
  and (
    rc.author_profile_id is null
    or rc.author_profile_id = rc.author_user_id
  );

-- 4) Trigger único para posts e comments.
create or replace function public.sync_review_author_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select p.id into v_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  if new.author_user_id is null and auth.uid() is not null then
    new.author_user_id := auth.uid();
  end if;

  if new.author_profile_id is null and v_profile_id is not null then
    new.author_profile_id := v_profile_id;
  end if;

  -- Se algum código antigo mandou author_profile_id = auth.uid(), corrige para profiles.id.
  if new.author_profile_id = auth.uid() and v_profile_id is not null then
    new.author_profile_id := v_profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_review_posts_author on public.review_posts;
create trigger trg_sync_review_posts_author
before insert or update on public.review_posts
for each row
execute function public.sync_review_author_columns();

drop trigger if exists trg_sync_review_comments_author on public.review_comments;
create trigger trg_sync_review_comments_author
before insert or update on public.review_comments
for each row
execute function public.sync_review_author_columns();

-- 5) Índices.
create index if not exists idx_review_posts_author_user
  on public.review_posts(author_user_id);

create index if not exists idx_review_posts_author_profile
  on public.review_posts(author_profile_id);

create index if not exists idx_review_comments_author_user
  on public.review_comments(author_user_id);

create index if not exists idx_review_comments_author_profile
  on public.review_comments(author_profile_id);

-- 6) Recria RLS de posts e comentários.
alter table public.review_posts enable row level security;
alter table public.review_comments enable row level security;

drop policy if exists "review_posts_select_visible" on public.review_posts;
drop policy if exists "review_posts_insert_own" on public.review_posts;
drop policy if exists "review_posts_update_own" on public.review_posts;
drop policy if exists "review_posts_update_own_or_admin" on public.review_posts;
drop policy if exists "review_posts_delete_own" on public.review_posts;

drop policy if exists "review_comments_select_visible" on public.review_comments;
drop policy if exists "review_comments_insert_own" on public.review_comments;
drop policy if exists "review_comments_update_own" on public.review_comments;
drop policy if exists "review_comments_update_own_or_admin" on public.review_comments;
drop policy if exists "review_comments_delete_own" on public.review_comments;

create policy "review_posts_select_visible"
on public.review_posts
for select
to authenticated
using (
  deleted_at is null
  and coalesce(status, 'published') <> 'deleted'
  and (
    visibility = 'public'
    or author_user_id = auth.uid()
    or author_profile_id = public.current_profile_id()
  )
);

create policy "review_posts_insert_own"
on public.review_posts
for insert
to authenticated
with check (
  coalesce(author_user_id, auth.uid()) = auth.uid()
  and (
    author_profile_id is null
    or author_profile_id = public.current_profile_id()
    or author_profile_id = auth.uid()
  )
);

create policy "review_posts_update_own_or_admin"
on public.review_posts
for update
to authenticated
using (
  author_user_id = auth.uid()
  or author_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','editor')
      and coalesce(p.status,'active') = 'active'
  )
)
with check (
  (
    coalesce(author_user_id, auth.uid()) = auth.uid()
    and (
      author_profile_id is null
      or author_profile_id = public.current_profile_id()
      or author_profile_id = auth.uid()
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','editor')
      and coalesce(p.status,'active') = 'active'
  )
);

create policy "review_posts_delete_own"
on public.review_posts
for delete
to authenticated
using (
  author_user_id = auth.uid()
  or author_profile_id = public.current_profile_id()
);

create policy "review_comments_select_visible"
on public.review_comments
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.review_posts rp
    where rp.id = review_comments.post_id
      and rp.deleted_at is null
      and coalesce(rp.status, 'published') <> 'deleted'
      and (
        rp.visibility = 'public'
        or rp.author_user_id = auth.uid()
        or rp.author_profile_id = public.current_profile_id()
      )
  )
);

create policy "review_comments_insert_own"
on public.review_comments
for insert
to authenticated
with check (
  coalesce(author_user_id, auth.uid()) = auth.uid()
  and (
    author_profile_id is null
    or author_profile_id = public.current_profile_id()
    or author_profile_id = auth.uid()
  )
);

create policy "review_comments_update_own_or_admin"
on public.review_comments
for update
to authenticated
using (
  author_user_id = auth.uid()
  or author_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','editor')
      and coalesce(p.status,'active') = 'active'
  )
)
with check (
  (
    coalesce(author_user_id, auth.uid()) = auth.uid()
    and (
      author_profile_id is null
      or author_profile_id = public.current_profile_id()
      or author_profile_id = auth.uid()
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','editor')
      and coalesce(p.status,'active') = 'active'
  )
);

create policy "review_comments_delete_own"
on public.review_comments
for delete
to authenticated
using (
  author_user_id = auth.uid()
  or author_profile_id = public.current_profile_id()
);

notify pgrst, 'reload schema';

commit;
