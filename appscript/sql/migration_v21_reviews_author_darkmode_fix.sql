-- =========================================================
-- Repositório de Estudos — v21 Hotfix Resenhas/Autores
-- Corrige fallback "Usuário" em resenhas de outros usuários.
-- Execute no SQL Editor do Supabase. Não apaga dados existentes.
-- =========================================================

begin;

-- 1) Snapshots públicos do autor para posts e comentários.
alter table public.review_posts
  add column if not exists author_name_snapshot text,
  add column if not exists author_avatar_snapshot text;

alter table public.review_comments
  add column if not exists author_name_snapshot text,
  add column if not exists author_avatar_snapshot text;

-- 2) Backfill dos snapshots a partir de profiles, quando possível.
update public.review_posts rp
set
  author_name_snapshot = coalesce(rp.author_name_snapshot, p.display_name, p.email, 'Usuário'),
  author_avatar_snapshot = coalesce(rp.author_avatar_snapshot, p.avatar_url)
from public.profiles p
where (rp.author_user_id = p.user_id or rp.author_profile_id = p.id)
  and (rp.author_name_snapshot is null or rp.author_avatar_snapshot is null);

update public.review_comments rc
set
  author_name_snapshot = coalesce(rc.author_name_snapshot, p.display_name, p.email, 'Usuário'),
  author_avatar_snapshot = coalesce(rc.author_avatar_snapshot, p.avatar_url)
from public.profiles p
where (rc.author_user_id = p.user_id or rc.author_profile_id = p.id)
  and (rc.author_name_snapshot is null or rc.author_avatar_snapshot is null);

-- 3) RPC segura para o Apps Script hidratar autores de resenhas sem abrir todos os perfis via RLS.
create or replace function public.get_public_profiles_for_review(ids uuid[])
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  avatar_drive_file_id text,
  role text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.user_id,
    p.email,
    coalesce(p.display_name, p.email, 'Usuário') as display_name,
    p.avatar_url,
    p.avatar_drive_file_id,
    p.role::text,
    coalesce(p.status::text, 'active') as status
  from public.profiles p
  where (p.id = any(ids) or p.user_id = any(ids))
    and coalesce(p.status::text, 'active') <> 'inactive';
$$;

revoke all on function public.get_public_profiles_for_review(uuid[]) from public;
grant execute on function public.get_public_profiles_for_review(uuid[]) to authenticated;

notify pgrst, 'reload schema';

commit;
