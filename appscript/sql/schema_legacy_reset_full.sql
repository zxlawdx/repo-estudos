-- ============================================================
-- REPOSITÓRIO DE ESTUDOS — Schema SQL Completo Corrigido
-- Supabase PostgreSQL + Row Level Security
-- ============================================================

-- ============================================================
-- RESET COMPLETO
-- ============================================================

DROP VIEW IF EXISTS history CASCADE;
DROP VIEW IF EXISTS material_tags CASCADE;
DROP VIEW IF EXISTS graph_edges CASCADE;
DROP VIEW IF EXISTS materials CASCADE;
DROP VIEW IF EXISTS study_paths CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS study_path_items CASCADE;
DROP TABLE IF EXISTS user_file_progress CASCADE;
DROP TABLE IF EXISTS file_dependencies CASCADE;
DROP TABLE IF EXISTS learning_paths CASCADE;
DROP TABLE IF EXISTS file_history CASCADE;
DROP TABLE IF EXISTS rename_suggestions CASCADE;
DROP TABLE IF EXISTS file_tags CASCADE;
DROP TABLE IF EXISTS study_files CASCADE;
DROP TABLE IF EXISTS dictionary_terms CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS cycles CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS has_cycle_in_path(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS prevent_dependency_cycle() CASCADE;
DROP FUNCTION IF EXISTS get_root_nodes(UUID) CASCADE;
DROP FUNCTION IF EXISTS current_profile_id() CASCADE;
DROP FUNCTION IF EXISTS current_user_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_editor_or_admin() CASCADE;

DROP TYPE IF EXISTS file_status CASCADE;
DROP TYPE IF EXISTS file_visibility CASCADE;
DROP TYPE IF EXISTS file_type CASCADE;
DROP TYPE IF EXISTS suggestion_status CASCADE;
DROP TYPE IF EXISTS relation_type CASCADE;
DROP TYPE IF EXISTS path_item_type CASCADE;
DROP TYPE IF EXISTS progress_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS history_action CASCADE;

-- ============================================================
-- EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE file_status AS ENUM ('pending', 'approved', 'rejected', 'archived');
CREATE TYPE file_visibility AS ENUM ('public', 'private');
CREATE TYPE file_type AS ENUM ('book', 'article', 'summary', 'slide', 'test', 'notes', 'document', 'dataset', 'other');
CREATE TYPE suggestion_status AS ENUM ('pending', 'approved', 'rejected', 'edited');
CREATE TYPE relation_type AS ENUM ('required', 'recommended', 'complementary');
CREATE TYPE path_item_type AS ENUM ('required', 'complementary', 'optional');
CREATE TYPE progress_status AS ENUM ('not_started', 'reading', 'completed', 'review_later');
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TYPE history_action AS ENUM (
  'file_uploaded',
  'file_renamed',
  'file_approved',
  'file_rejected',
  'category_changed',
  'tag_added',
  'tag_removed',
  'dependency_created',
  'dependency_removed',
  'path_item_added',
  'path_item_removed',
  'path_item_reordered',
  'progress_updated',
  'drive_renamed',
  'opened',
  'downloaded',
  'shared'
);

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  avatar_drive_file_id TEXT,
  avatar_drive_folder_id TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#004ac6',
  icon TEXT DEFAULT 'category',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, name)
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#737686',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dictionary_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  category_hint TEXT,
  subject_hint TEXT,
  cycle_hint TEXT,
  file_type_hint file_type,
  weight INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE study_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  google_drive_file_id TEXT,
  google_drive_folder_id TEXT,
  google_drive_web_url TEXT,
  google_drive_preview_url TEXT,
  google_drive_download_url TEXT,

  original_name TEXT NOT NULL,
  suggested_name TEXT,
  final_name TEXT,
  title_detected TEXT,

  file_type file_type DEFAULT 'other',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,

  author TEXT,
  year INT,
  language TEXT,
  isbn TEXT,
  doi TEXT,
  page_count INT,
  sha256 TEXT,

  mime_type TEXT,
  file_size BIGINT,

  status file_status NOT NULL DEFAULT 'pending',
  visibility file_visibility NOT NULL DEFAULT 'private',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE file_tags (
  file_id UUID NOT NULL REFERENCES study_files(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (file_id, tag_id)
);

CREATE TABLE rename_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES study_files(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  suggested_name TEXT NOT NULL,
  reason TEXT,
  confidence NUMERIC(4,2) DEFAULT 0.00,
  status suggestion_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE file_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES study_files(id) ON DELETE CASCADE,
  action history_action NOT NULL,
  before_value JSONB,
  after_value JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  visibility file_visibility NOT NULL DEFAULT 'public',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE study_path_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES study_files(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 1 CHECK (position > 0),
  item_type path_item_type NOT NULL DEFAULT 'required',
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (path_id, material_id)
);

CREATE TABLE file_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  source_file_id UUID NOT NULL REFERENCES study_files(id) ON DELETE CASCADE,
  target_file_id UUID NOT NULL REFERENCES study_files(id) ON DELETE CASCADE,
  relation_type relation_type NOT NULL DEFAULT 'recommended',
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  note TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_dependency CHECK (source_file_id != target_file_id),
  UNIQUE (learning_path_id, source_file_id, target_file_id)
);

CREATE TABLE user_file_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES study_files(id) ON DELETE CASCADE,
  status progress_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  last_page INT,
  reading_percentage NUMERIC(5,2) DEFAULT 0.00,
  notes TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, file_id)
);

CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  path_item_id UUID NOT NULL REFERENCES study_path_items(id) ON DELETE CASCADE,
  status progress_status NOT NULL DEFAULT 'not_started',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_item_id)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_dict_raw ON dictionary_terms(lower(raw_term));
CREATE INDEX idx_dict_active ON dictionary_terms(active);
CREATE INDEX idx_files_owner ON study_files(owner_id);
CREATE INDEX idx_files_status ON study_files(status);
CREATE INDEX idx_files_visibility ON study_files(visibility);
CREATE INDEX idx_files_category ON study_files(category_id);
CREATE INDEX idx_files_subject ON study_files(subject_id);
CREATE INDEX idx_files_type ON study_files(file_type);
CREATE INDEX idx_files_sha256 ON study_files(sha256);
CREATE INDEX idx_suggestions_file ON rename_suggestions(file_id);
CREATE INDEX idx_suggestions_status ON rename_suggestions(status);
CREATE INDEX idx_history_file ON file_history(file_id);
CREATE INDEX idx_history_created ON file_history(created_at DESC);
CREATE INDEX idx_dep_path ON file_dependencies(learning_path_id);
CREATE INDEX idx_dep_source ON file_dependencies(source_file_id);
CREATE INDEX idx_dep_target ON file_dependencies(target_file_id);
CREATE INDEX idx_progress_user ON user_file_progress(user_id);
CREATE INDEX idx_progress_file ON user_file_progress(file_id);
CREATE INDEX idx_path_items_path ON study_path_items(path_id);
CREATE INDEX idx_path_items_material ON study_path_items(material_id);
CREATE INDEX idx_path_items_position ON study_path_items(path_id, position);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_item ON user_progress(path_item_id);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM profiles WHERE user_id = auth.uid() LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION is_editor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role IN ('admin', 'editor') FROM profiles WHERE user_id = auth.uid() LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION has_cycle_in_path(
  p_path_id UUID,
  p_source_id UUID,
  p_target_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE reachable AS (
    SELECT target_file_id AS node
    FROM file_dependencies
    WHERE learning_path_id = p_path_id
      AND source_file_id = p_target_id

    UNION

    SELECT fd.target_file_id
    FROM file_dependencies fd
    INNER JOIN reachable r ON fd.source_file_id = r.node
    WHERE fd.learning_path_id = p_path_id
  )
  SELECT EXISTS (
    SELECT 1 FROM reachable WHERE node = p_source_id
  );
$$;

CREATE OR REPLACE FUNCTION prevent_dependency_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF has_cycle_in_path(NEW.learning_path_id, NEW.source_file_id, NEW.target_file_id) THEN
    RAISE EXCEPTION 'Essa relação criaria um ciclo no grafo e não pode ser salva.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_root_nodes(p_path_id UUID)
RETURNS TABLE(file_id UUID)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT source_file_id
  FROM file_dependencies
  WHERE learning_path_id = p_path_id

  EXCEPT

  SELECT DISTINCT target_file_id
  FROM file_dependencies
  WHERE learning_path_id = p_path_id;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_files_updated
BEFORE UPDATE ON study_files
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_paths_updated
BEFORE UPDATE ON learning_paths
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_progress_updated
BEFORE UPDATE ON user_file_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_progress_updated
BEFORE UPDATE ON user_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER trg_prevent_dependency_cycle
BEFORE INSERT OR UPDATE ON file_dependencies
FOR EACH ROW EXECUTE FUNCTION prevent_dependency_cycle();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictionary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rename_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_path_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_file_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = user_id OR is_editor_or_admin());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_admin_all ON profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY categories_select_all ON categories FOR SELECT USING (true);
CREATE POLICY categories_admin_insert ON categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY categories_admin_update ON categories FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY categories_admin_delete ON categories FOR DELETE USING (is_admin());

CREATE POLICY subjects_select_all ON subjects FOR SELECT USING (true);
CREATE POLICY subjects_admin_insert ON subjects FOR INSERT WITH CHECK (is_admin());
CREATE POLICY subjects_admin_update ON subjects FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY subjects_admin_delete ON subjects FOR DELETE USING (is_admin());

CREATE POLICY cycles_select_all ON cycles FOR SELECT USING (true);
CREATE POLICY cycles_admin_insert ON cycles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY cycles_admin_update ON cycles FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY cycles_admin_delete ON cycles FOR DELETE USING (is_admin());

CREATE POLICY tags_select_all ON tags FOR SELECT USING (true);
CREATE POLICY tags_insert_auth ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tags_admin_delete ON tags FOR DELETE USING (is_admin());

CREATE POLICY dict_select_active ON dictionary_terms FOR SELECT USING (active = true OR is_editor_or_admin());
CREATE POLICY dict_admin_insert ON dictionary_terms FOR INSERT WITH CHECK (is_admin());
CREATE POLICY dict_admin_update ON dictionary_terms FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY dict_admin_delete ON dictionary_terms FOR DELETE USING (is_admin());

CREATE POLICY files_select_public ON study_files FOR SELECT USING (visibility = 'public' AND status = 'approved');
CREATE POLICY files_select_own ON study_files FOR SELECT USING (owner_id = current_profile_id());
CREATE POLICY files_select_editor ON study_files FOR SELECT USING (is_editor_or_admin());
CREATE POLICY files_insert_own ON study_files FOR INSERT WITH CHECK (owner_id = current_profile_id());
CREATE POLICY files_update_own ON study_files FOR UPDATE USING (owner_id = current_profile_id()) WITH CHECK (owner_id = current_profile_id());
CREATE POLICY files_editor_update ON study_files FOR UPDATE USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());
CREATE POLICY files_admin_delete ON study_files FOR DELETE USING (is_admin());

CREATE POLICY file_tags_select ON file_tags FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM study_files sf
    WHERE sf.id = file_tags.file_id
      AND (sf.visibility = 'public' OR sf.owner_id = current_profile_id() OR is_editor_or_admin())
  )
);
CREATE POLICY file_tags_insert_own ON file_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM study_files sf
    WHERE sf.id = file_tags.file_id
      AND (sf.owner_id = current_profile_id() OR is_editor_or_admin())
  )
);
CREATE POLICY file_tags_delete_own ON file_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM study_files sf
    WHERE sf.id = file_tags.file_id
      AND (sf.owner_id = current_profile_id() OR is_editor_or_admin())
  )
);

CREATE POLICY suggestions_select ON rename_suggestions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM study_files sf
    WHERE sf.id = rename_suggestions.file_id
      AND (sf.owner_id = current_profile_id() OR is_editor_or_admin())
  )
);
CREATE POLICY suggestions_insert_editor ON rename_suggestions FOR INSERT WITH CHECK (is_editor_or_admin());
CREATE POLICY suggestions_update_editor ON rename_suggestions FOR UPDATE USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());
CREATE POLICY suggestions_delete_admin ON rename_suggestions FOR DELETE USING (is_admin());

CREATE POLICY history_select ON file_history FOR SELECT USING (
  file_id IS NULL OR EXISTS (
    SELECT 1 FROM study_files sf
    WHERE sf.id = file_history.file_id
      AND (sf.visibility = 'public' OR sf.owner_id = current_profile_id() OR is_editor_or_admin())
  )
);
CREATE POLICY history_insert_auth ON file_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY history_delete_admin ON file_history FOR DELETE USING (is_admin());

CREATE POLICY paths_select_public ON learning_paths FOR SELECT USING (visibility = 'public');
CREATE POLICY paths_select_own ON learning_paths FOR SELECT USING (created_by = current_profile_id());
CREATE POLICY paths_select_editor ON learning_paths FOR SELECT USING (is_editor_or_admin());
CREATE POLICY paths_insert_editor ON learning_paths FOR INSERT WITH CHECK (is_editor_or_admin());
CREATE POLICY paths_update_editor ON learning_paths FOR UPDATE USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());
CREATE POLICY paths_delete_admin ON learning_paths FOR DELETE USING (is_admin());


CREATE POLICY path_items_select ON study_path_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM learning_paths lp
    WHERE lp.id = study_path_items.path_id
      AND (lp.visibility = 'public' OR lp.created_by = current_profile_id() OR is_editor_or_admin())
  )
);
CREATE POLICY path_items_insert_editor ON study_path_items FOR INSERT WITH CHECK (is_editor_or_admin());
CREATE POLICY path_items_update_editor ON study_path_items FOR UPDATE USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());
CREATE POLICY path_items_delete_editor ON study_path_items FOR DELETE USING (is_editor_or_admin());

CREATE POLICY deps_select ON file_dependencies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM learning_paths lp
    WHERE lp.id = file_dependencies.learning_path_id
      AND (lp.visibility = 'public' OR lp.created_by = current_profile_id() OR is_editor_or_admin())
  )
);
CREATE POLICY deps_insert_editor ON file_dependencies FOR INSERT WITH CHECK (is_editor_or_admin());
CREATE POLICY deps_update_editor ON file_dependencies FOR UPDATE USING (is_editor_or_admin()) WITH CHECK (is_editor_or_admin());
CREATE POLICY deps_delete_editor ON file_dependencies FOR DELETE USING (is_editor_or_admin());

CREATE POLICY progress_select_own ON user_file_progress FOR SELECT USING (user_id = current_profile_id());
CREATE POLICY progress_insert_own ON user_file_progress FOR INSERT WITH CHECK (user_id = current_profile_id());
CREATE POLICY progress_update_own ON user_file_progress FOR UPDATE USING (user_id = current_profile_id()) WITH CHECK (user_id = current_profile_id());
CREATE POLICY progress_delete_own ON user_file_progress FOR DELETE USING (user_id = current_profile_id());

CREATE POLICY user_progress_select_own ON user_progress FOR SELECT USING (user_id = current_profile_id());
CREATE POLICY user_progress_insert_own ON user_progress FOR INSERT WITH CHECK (user_id = current_profile_id());
CREATE POLICY user_progress_update_own ON user_progress FOR UPDATE USING (user_id = current_profile_id()) WITH CHECK (user_id = current_profile_id());
CREATE POLICY user_progress_delete_own ON user_progress FOR DELETE USING (user_id = current_profile_id());

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

INSERT INTO categories (name, description, color, icon) VALUES
('Computação', 'Ciência da Computação, Engenharia de Software, IA', '#004ac6', 'computer'),
('Matemática', 'Cálculo, Álgebra, Estatística, Geometria', '#505f76', 'functions'),
('História', 'História Geral, História do Brasil e Arqueologia Histórica', '#943700', 'history_edu'),
('Arqueologia', 'Arqueologia, Paleoambiente, Sambaquis e Cultura Material', '#bc4800', 'archaeology'),
('Filosofia', 'Filosofia Clássica, Contemporânea e Epistemologia', '#505f76', 'psychology'),
('Direito', 'Direito Civil, Penal e Constitucional', '#004ac6', 'gavel'),
('Engenharia', 'Engenharia Elétrica, Civil e Mecânica', '#737686', 'engineering'),
('Biologia', 'Biologia Molecular, Genética e Ecologia', '#34a853', 'biotech'),
('Economia', 'Macroeconomia, Microeconomia e Finanças', '#fbbc05', 'trending_up'),
('Sociologia', 'Teoria Social, Marxismo e Sociologia Urbana', '#943700', 'groups'),
('Linguística', 'Linguística Geral, Semiótica e Análise do Discurso', '#505f76', 'translate'),
('Multidisciplinar', 'Temas que cruzam diversas áreas', '#737686', 'hub');

INSERT INTO dictionary_terms
(raw_term, normalized_term, category_hint, subject_hint, cycle_hint, file_type_hint, weight, active)
VALUES
('tcc', 'Trabalho de Conclusão de Curso', 'Multidisciplinar', NULL, NULL, 'document', 10, true),
('manifesto', 'Manifesto', 'Filosofia', 'Marxismo', NULL, 'book', 8, true),
('capital', 'O Capital', 'Economia', 'Marxismo', NULL, 'book', 9, true),
('anatomia', 'Anatomia', 'Biologia', NULL, NULL, 'book', 7, true),
('calculo', 'Cálculo', 'Matemática', NULL, NULL, 'book', 8, true),
('direito civil', 'Direito Civil', 'Direito', 'Contratos', NULL, 'document', 9, true),
('arqueobotanica', 'Arqueobotânica', 'Arqueologia', NULL, NULL, 'article', 9, true),
('arqueobotânica', 'Arqueobotânica', 'Arqueologia', NULL, NULL, 'article', 9, true),
('sambaqui', 'Sambaqui', 'Arqueologia', NULL, NULL, 'article', 8, true),
('diatomacea', 'Diatomáceas', 'Arqueologia', 'Paleoambiente', NULL, 'article', 8, true),
('diatomáceas', 'Diatomáceas', 'Arqueologia', 'Paleoambiente', NULL, 'article', 8, true),
('algoritmo', 'Algoritmos', 'Computação', NULL, NULL, 'book', 8, true),
('redes', 'Redes de Computadores', 'Computação', NULL, NULL, 'document', 7, true),
('banco de dados', 'Banco de Dados', 'Computação', NULL, NULL, 'book', 8, true),
('programacao', 'Programação', 'Computação', NULL, NULL, 'book', 7, true),
('programação', 'Programação', 'Computação', NULL, NULL, 'book', 7, true),
('historia brasil', 'História do Brasil', 'História', NULL, NULL, 'book', 9, true),
('história do brasil', 'História do Brasil', 'História', NULL, NULL, 'book', 9, true),
('colonizacao', 'Colonização', 'História', 'Brasil Colônia', NULL, 'book', 8, true),
('colonização', 'Colonização', 'História', 'Brasil Colônia', NULL, 'book', 8, true),
('republica', 'República', 'História', 'República', NULL, 'book', 7, true),
('república', 'República', 'História', 'República', NULL, 'book', 7, true),
('kant', 'Kant', 'Filosofia', 'Filosofia Moderna', NULL, 'book', 9, true),
('hegel', 'Hegel', 'Filosofia', 'Idealismo', NULL, 'book', 9, true),
('marxismo', 'Marxismo', 'Filosofia', 'Marxismo', NULL, 'book', 9, true),
('prova', 'Prova', NULL, NULL, NULL, 'test', 6, true),
('gabarito', 'Gabarito', NULL, NULL, NULL, 'test', 6, true),
('resumo', 'Resumo', NULL, NULL, NULL, 'summary', 5, true),
('apostila', 'Apostila', NULL, NULL, NULL, 'notes', 6, true),
('slide', 'Slide', NULL, NULL, NULL, 'slide', 7, true),
('slides', 'Slides', NULL, NULL, NULL, 'slide', 7, true),
('aula', 'Aula', NULL, NULL, NULL, 'slide', 5, true);


-- ============================================================
-- VIEWS DE COMPATIBILIDADE / NOMES ESPERADOS PELO APP
-- ============================================================

CREATE OR REPLACE VIEW materials AS SELECT * FROM study_files;
CREATE OR REPLACE VIEW material_tags AS SELECT * FROM file_tags;
CREATE OR REPLACE VIEW study_paths AS SELECT * FROM learning_paths;
CREATE OR REPLACE VIEW graph_edges AS SELECT * FROM file_dependencies;
CREATE OR REPLACE VIEW history AS SELECT * FROM file_history;
