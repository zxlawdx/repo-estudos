-- ============================================================
-- Migration v10 — Repositório de Estudos
-- Posições de nós no grafo + refreshSession
-- ============================================================

-- Tabela de posições salvas (opcional — o frontend usa localStorage por padrão)
CREATE TABLE IF NOT EXISTS public.graph_node_positions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  graph_scope TEXT NOT NULL DEFAULT 'general',
  scope_id    TEXT,
  node_type   TEXT NOT NULL,
  node_id     TEXT NOT NULL,
  x           NUMERIC NOT NULL,
  y           NUMERIC NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_graph_node_positions_user_scope_node
  ON public.graph_node_positions(user_id, graph_scope, COALESCE(scope_id,''), node_type, node_id);

CREATE INDEX IF NOT EXISTS idx_gnp_user ON public.graph_node_positions(user_id, graph_scope);

ALTER TABLE public.graph_node_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gnp_select ON public.graph_node_positions;
DROP POLICY IF EXISTS gnp_insert ON public.graph_node_positions;
DROP POLICY IF EXISTS gnp_update ON public.graph_node_positions;
DROP POLICY IF EXISTS gnp_delete ON public.graph_node_positions;

CREATE POLICY gnp_select ON public.graph_node_positions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY gnp_insert ON public.graph_node_positions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY gnp_update ON public.graph_node_positions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY gnp_delete ON public.graph_node_positions FOR DELETE USING (user_id = auth.uid());

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
