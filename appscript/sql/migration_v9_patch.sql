-- ============================================================
-- Migration v9-patch — Repositório de Estudos
-- Segura: apenas ADD IF NOT EXISTS, sem DROP de tabelas com dados
-- ============================================================

-- 1. Garantir check constraint de direction em graph_edges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'graph_edges_direction_check'
  ) THEN
    ALTER TABLE public.graph_edges
      ADD CONSTRAINT graph_edges_direction_check
      CHECK (direction IN ('directed','undirected'));
  END IF;
END $$;

-- 2. Garantir que dados inválidos de direction sejam normalizados
UPDATE public.graph_edges
SET direction = 'directed'
WHERE direction IS NULL OR direction NOT IN ('directed','undirected');

-- 3. Garantir índice de direction para queries de filtro do grafo
CREATE INDEX IF NOT EXISTS idx_graph_edges_direction ON public.graph_edges(direction);

-- 4. study_path_items — vincular materiais da biblioteca a trilhas
CREATE TABLE IF NOT EXISTS public.study_path_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id     UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.study_files(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  item_type   TEXT NOT NULL DEFAULT 'required'
              CHECK (item_type IN ('required','complementary','optional')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (path_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_spi_path     ON public.study_path_items(path_id);
CREATE INDEX IF NOT EXISTS idx_spi_material ON public.study_path_items(material_id);
CREATE INDEX IF NOT EXISTS idx_spi_position ON public.study_path_items(path_id, position);

-- RLS para study_path_items
ALTER TABLE public.study_path_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spi_select ON public.study_path_items;
DROP POLICY IF EXISTS spi_insert ON public.study_path_items;
DROP POLICY IF EXISTS spi_update ON public.study_path_items;
DROP POLICY IF EXISTS spi_delete ON public.study_path_items;

CREATE POLICY spi_select ON public.study_path_items FOR SELECT USING (true);
CREATE POLICY spi_insert ON public.study_path_items FOR INSERT
  WITH CHECK (is_editor_or_admin());
CREATE POLICY spi_update ON public.study_path_items FOR UPDATE
  USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());
CREATE POLICY spi_delete ON public.study_path_items FOR DELETE
  USING (is_editor_or_admin());

-- 5. Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
