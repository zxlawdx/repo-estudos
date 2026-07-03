-- =========================================================
-- Repositório de Estudos — v22 Hotfix Resenhas/Autores
-- Corrige posts de outros usuários aparecendo como "Usuário".
-- Execute no SQL Editor do Supabase. Não apaga dados existentes.
-- =========================================================

begin;

-- 1) Garantir colunas de snapshot público nos posts e comentários.
alter table public.review_posts
  add column if not exists author_name_snapshot text,
  add column if not exists author_avatar_snapshot text;

alter table public.review_comments
  add column if not exists author_name_snapshot text,
  add column if not exists author_avatar_snapshot text;

-- 2) Backfill robusto: considera auth.users.id e profiles.id em qualquer uma das colunas antigas.
update public.review_posts rp
set
  author_name_snapshot = coalesce(nullif(rp.author_name_snapshot, ''), p.display_name, p.email, 'Usuário'),
  author_avatar_snapshot = coalesce(nullif(rp.author_avatar_snapshot, ''), p.avatar_url)
from public.profiles p
where (
    rp.author_user_id::text = p.user_id::text
    or rp.author_user_id::text = p.id::text
    or rp.author_profile_id::text = p.id::text
    or rp.author_profile_id::text = p.user_id::text
  )
  and (
    rp.author_name_snapshot is null
    or rp.author_name_snapshot = ''
    or lower(rp.author_name_snapshot) in ('usuário','usuario')
    or rp.author_avatar_snapshot is null
    or rp.author_avatar_snapshot = ''
  );

update public.review_comments rc
set
  author_name_snapshot = coalesce(nullif(rc.author_name_snapshot, ''), p.display_name, p.email, 'Usuário'),
  author_avatar_snapshot = coalesce(nullif(rc.author_avatar_snapshot, ''), p.avatar_url)
from public.profiles p
where (
    rc.author_user_id::text = p.user_id::text
    or rc.author_user_id::text = p.id::text
    or rc.author_profile_id::text = p.id::text
    or rc.author_profile_id::text = p.user_id::text
  )
  and (
    rc.author_name_snapshot is null
    or rc.author_name_snapshot = ''
    or lower(rc.author_name_snapshot) in ('usuário','usuario')
    or rc.author_avatar_snapshot is null
    or rc.author_avatar_snapshot = ''
  );

-- 3) RPC v2: retorna dados públicos de perfil sem depender da RLS direta de profiles.
-- Usa text[] para aceitar tanto profiles.id quanto auth.users.id sem erro de cast no PostgREST.
create or replace function public.get_public_profiles_for_review_v2(ids text[])
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
    coalesce(nullif(p.display_name, ''), p.email, 'Usuário') as display_name,
    p.avatar_url,
    p.avatar_drive_file_id,
    p.role::text,
    coalesce(p.status::text, 'active') as status
  from public.profiles p
  where (p.id::text = any(ids) or p.user_id::text = any(ids))
    and coalesce(p.status::text, 'active') <> 'inactive';
$$;

revoke all on function public.get_public_profiles_for_review_v2(text[]) from public;
grant execute on function public.get_public_profiles_for_review_v2(text[]) to authenticated;

-- 4) Trigger para novas resenhas/comentários já nascerem com snapshot público do autor.
create or replace function public.sync_review_author_snapshots_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p_name text;
  p_avatar text;
  p_profile_id uuid;
begin
  -- author_user_id deve representar auth.uid() quando possível.
  if new.author_user_id is null and auth.uid() is not null then
    new.author_user_id := auth.uid();
  end if;

  -- author_profile_id deve representar profiles.id quando possível.
  if new.author_profile_id is null and auth.uid() is not null then
    select p.id into p_profile_id
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1;

    if p_profile_id is not null then
      new.author_profile_id := p_profile_id;
    end if;
  end if;

  select
    coalesce(nullif(p.display_name, ''), p.email, 'Usuário'),
    p.avatar_url
  into p_name, p_avatar
  from public.profiles p
  where (
    p.user_id::text = coalesce(new.author_user_id::text, '')
    or p.id::text = coalesce(new.author_user_id::text, '')
    or p.id::text = coalesce(new.author_profile_id::text, '')
    or p.user_id::text = coalesce(new.author_profile_id::text, '')
  )
  limit 1;

  if (new.author_name_snapshot is null or new.author_name_snapshot = '' or lower(new.author_name_snapshot) in ('usuário','usuario')) and p_name is not null then
    new.author_name_snapshot := p_name;
  end if;

  if (new.author_avatar_snapshot is null or new.author_avatar_snapshot = '') and p_avatar is not null then
    new.author_avatar_snapshot := p_avatar;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_review_posts_author_snapshots_v2 on public.review_posts;
create trigger trg_review_posts_author_snapshots_v2
before insert or update on public.review_posts
for each row
execute function public.sync_review_author_snapshots_v2();

drop trigger if exists trg_review_comments_author_snapshots_v2 on public.review_comments;
create trigger trg_review_comments_author_snapshots_v2
before insert or update on public.review_comments
for each row
execute function public.sync_review_author_snapshots_v2();

notify pgrst, 'reload schema';

commit;
