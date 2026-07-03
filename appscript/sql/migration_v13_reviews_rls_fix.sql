-- =========================================================
-- Repositório de Estudos — v13 Hotfix Resenhas/RLS
-- Corrige conflito author_user_id (auth.uid) x author_profile_id (profiles.id)
-- Execute no SQL Editor do Supabase. Não apaga dados existentes.
-- =========================================================

begin;

-- Função auxiliar: id do profile interno do usuário autenticado.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.profiles p where p.user_id = auth.uid() limit 1;
$$;

alter table public.review_posts
  add column if not exists author_user_id uuid,
  add column if not exists author_profile_id uuid;

alter table public.review_comments
  add column if not exists author_user_id uuid,
  add column if not exists author_profile_id uuid;

-- Para bancos que nasceram com NOT NULL e depois receberam os dois campos.
alter table public.review_posts
  alter column author_user_id drop not null;

alter table public.review_comments
  alter column author_user_id drop not null;

-- Preenche author_profile_id quando só existe author_user_id/auth.uid.
update public.review_posts rp
set author_profile_id = p.id
from public.profiles p
where rp.author_profile_id is null
  and rp.author_user_id = p.user_id;

update public.review_comments rc
set author_profile_id = p.id
from public.profiles p
where rc.author_profile_id is null
  and rc.author_user_id = p.user_id;

-- Trigger seguro: mantém auth_user e profile interno sincronizados sem sobrescrever valor válido.
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

create index if not exists idx_review_posts_author_user
  on public.review_posts(author_user_id);

create index if not exists idx_review_posts_author_profile
  on public.review_posts(author_profile_id);

create index if not exists idx_review_comments_author_user
  on public.review_comments(author_user_id);

create index if not exists idx_review_comments_author_profile
  on public.review_comments(author_profile_id);

alter table public.review_posts enable row level security;
alter table public.review_comments enable row level security;

-- Remove policies antigas, incluindo as criadas durante as tentativas anteriores.
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

-- SELECT: pública, ou do próprio usuário.
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

-- INSERT: aceita author_user_id=auth.uid OU author_profile_id=current_profile_id.
-- Também aceita ambos nulos porque o trigger preenche antes da checagem.
create policy "review_posts_insert_own"
on public.review_posts
for insert
to authenticated
with check (
  coalesce(author_user_id, auth.uid()) = auth.uid()
  and (
    author_profile_id is null
    or author_profile_id = public.current_profile_id()
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
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','editor')
      and coalesce(p.status,'active') = 'active'
  )
)
with check (
  (
    coalesce(author_user_id, auth.uid()) = auth.uid()
    and (author_profile_id is null or author_profile_id = public.current_profile_id())
  )
  or exists (
    select 1 from public.profiles p
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
    where rp.id = post_id
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
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','editor')
      and coalesce(p.status,'active') = 'active'
  )
)
with check (
  (
    coalesce(author_user_id, auth.uid()) = auth.uid()
    and (author_profile_id is null or author_profile_id = public.current_profile_id())
  )
  or exists (
    select 1 from public.profiles p
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
