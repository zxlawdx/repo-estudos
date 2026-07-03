begin;

create table if not exists public.graph_node_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  graph_scope text not null default 'general',
  scope_id text,
  node_type text not null,
  node_id text not null,
  x numeric not null,
  y numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint graph_node_positions_scope_check
    check (graph_scope in ('general', 'learning_path'))
);

alter table public.graph_node_positions
  add column if not exists scope_id_key text generated always as (coalesce(scope_id, '')) stored;

create unique index if not exists ux_graph_node_positions_user_scope_node
on public.graph_node_positions (
  user_id,
  graph_scope,
  scope_id_key,
  node_type,
  node_id
);

create index if not exists idx_graph_node_positions_scope
on public.graph_node_positions (user_id, graph_scope, scope_id);

create index if not exists idx_graph_node_positions_node
on public.graph_node_positions (node_type, node_id);

alter table public.graph_node_positions enable row level security;

drop policy if exists "graph_node_positions_select_own" on public.graph_node_positions;
create policy "graph_node_positions_select_own"
on public.graph_node_positions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "graph_node_positions_insert_own" on public.graph_node_positions;
create policy "graph_node_positions_insert_own"
on public.graph_node_positions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "graph_node_positions_update_own" on public.graph_node_positions;
create policy "graph_node_positions_update_own"
on public.graph_node_positions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "graph_node_positions_delete_own" on public.graph_node_positions;
create policy "graph_node_positions_delete_own"
on public.graph_node_positions
for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';

commit;
