-- =========================================================
-- v16 — Correção complementar para comentários de resenhas
-- Objetivo: manter author_user_id/author_profile_id compatíveis
-- e permitir insert/update/delete do próprio usuário via RLS.
-- Execute no SQL Editor do Supabase se comentários ainda derem RLS.
-- =========================================================

begin;

alter table public.review_comments
  add column if not exists author_user_id uuid,
  add column if not exists author_profile_id uuid;

alter table public.review_comments
  alter column author_user_id drop not null;

alter table public.review_comments
  alter column author_profile_id drop not null;

update public.review_comments
set author_profile_id = author_user_id
where author_profile_id is null
  and author_user_id is not null;

update public.review_comments
set author_user_id = author_profile_id
where author_user_id is null
  and author_profile_id is not null;

create or replace function public.sync_review_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_profile_id is null and new.author_user_id is not null then
    new.author_profile_id := new.author_user_id;
  end if;

  if new.author_user_id is null and new.author_profile_id is not null then
    new.author_user_id := new.author_profile_id;
  end if;

  if new.author_user_id is null and auth.uid() is not null then
    new.author_user_id := auth.uid();
  end if;

  if new.author_profile_id is null and auth.uid() is not null then
    new.author_profile_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_review_comment_author on public.review_comments;

create trigger trg_sync_review_comment_author
before insert or update on public.review_comments
for each row
execute function public.sync_review_comment_author();

alter table public.review_comments enable row level security;

drop policy if exists "review_comments_select_visible" on public.review_comments;
drop policy if exists "review_comments_insert_own" on public.review_comments;
drop policy if exists "review_comments_update_own" on public.review_comments;
drop policy if exists "review_comments_update_own_or_admin" on public.review_comments;
drop policy if exists "review_comments_delete_own" on public.review_comments;

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
      and (
        rp.visibility = 'public'
        or rp.author_user_id = auth.uid()
        or rp.author_profile_id = auth.uid()
      )
  )
);

create policy "review_comments_insert_own"
on public.review_comments
for insert
to authenticated
with check (
  coalesce(author_user_id, auth.uid()) = auth.uid()
  or coalesce(author_profile_id, auth.uid()) = auth.uid()
);

create policy "review_comments_update_own"
on public.review_comments
for update
to authenticated
using (
  author_user_id = auth.uid()
  or author_profile_id = auth.uid()
)
with check (
  coalesce(author_user_id, auth.uid()) = auth.uid()
  or coalesce(author_profile_id, auth.uid()) = auth.uid()
);

create policy "review_comments_delete_own"
on public.review_comments
for delete
to authenticated
using (
  author_user_id = auth.uid()
  or author_profile_id = auth.uid()
);

create index if not exists idx_review_comments_author_user
  on public.review_comments(author_user_id);

create index if not exists idx_review_comments_author_profile
  on public.review_comments(author_profile_id);

notify pgrst, 'reload schema';

commit;
