// ============================================================
// Categories.gs — CRUD de Categorias, Assuntos e Ciclos
// ============================================================

// ---- CATEGORIAS ------------------------------------------
function invalidateCategoriesCache_() {
  cacheDel_('repo_estudos:categories:list:v1');
  cacheDel_('repo_estudos:categories:tree:v1');
}

function listCategories() {
  var cacheKey = 'repo_estudos:categories:list:v1';
  var cached = cacheGet_(cacheKey);
  if (cached) return Object.assign({ fromCache: true }, cached);

  const rows = supabaseQuery_(
    'categories',
    'select=id,name,description,color,icon,created_at&order=name.asc'
  );
  var out = { ok: true, categories: rows || [] };
  cacheSet_(cacheKey, out, 300);
  return out;
}

function createCategory(data) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  if (!data.name || !data.name.trim()) return { ok: false, error: 'Nome obrigatório' };

  const ins = supabaseInsert_('categories', {
    name:        data.name.trim(),
    description: data.description || null,
    color:       data.color || '#004ac6',
    icon:        data.icon  || 'category',
  }, true);

  if (ins.error) return { ok: false, error: ins.error };
  invalidateCategoriesCache_();
  return { ok: true, category: Array.isArray(ins) ? ins[0] : ins };
}

function updateCategory(id, data) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };

  const res = supabaseUpdate_('categories', 'id=eq.' + id, {
    name:        data.name,
    description: data.description,
    color:       data.color,
    icon:        data.icon,
  });
  if (res.error) return { ok: false, error: res.error };
  invalidateCategoriesCache_();
  return { ok: true };
}

function deleteCategory(id) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  supabaseDelete_('categories', 'id=eq.' + id);
  invalidateCategoriesCache_();
  return { ok: true };
}

// ---- ASSUNTOS --------------------------------------------

function listSubjects(categoryId) {
  let q = 'select=id,name,description,category_id,categories(name)&order=name.asc';
  if (categoryId) q += '&category_id=eq.' + categoryId;
  const rows = supabaseQuery_('subjects', q);
  return { ok: true, subjects: rows || [] };
}

function createSubject(data) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  if (!data.name || !data.name.trim()) return { ok: false, error: 'Nome obrigatório' };

  const ins = supabaseInsert_('subjects', {
    name:        data.name.trim(),
    description: data.description  || null,
    category_id: data.category_id  || null,
  }, true);
  if (ins.error) return { ok: false, error: ins.error };
  return { ok: true, subject: Array.isArray(ins) ? ins[0] : ins };
}

function updateSubject(id, data) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  const res = supabaseUpdate_('subjects', 'id=eq.' + id, {
    name:        data.name,
    description: data.description,
    category_id: data.category_id || null,
  });
  if (res.error) return { ok: false, error: res.error };
  return { ok: true };
}

function deleteSubject(id) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  supabaseDelete_('subjects', 'id=eq.' + id);
  return { ok: true };
}

// ---- CICLOS ----------------------------------------------

function listCycles(subjectId) {
  let q = 'select=id,name,description,order_index,subject_id,subjects(name)&order=order_index.asc';
  if (subjectId) q += '&subject_id=eq.' + subjectId;
  const rows = supabaseQuery_('cycles', q);
  return { ok: true, cycles: rows || [] };
}

function createCycle(data) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };

  const ins = supabaseInsert_('cycles', {
    name:        data.name.trim(),
    description: data.description  || null,
    subject_id:  data.subject_id   || null,
    order_index: parseInt(data.order_index) || 0,
  }, true);
  if (ins.error) return { ok: false, error: ins.error };
  return { ok: true, cycle: Array.isArray(ins) ? ins[0] : ins };
}

function updateCycle(id, data) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  const res = supabaseUpdate_('cycles', 'id=eq.' + id, {
    name:        data.name,
    description: data.description,
    subject_id:  data.subject_id || null,
    order_index: parseInt(data.order_index) || 0,
  });
  if (res.error) return { ok: false, error: res.error };
  return { ok: true };
}

function deleteCycle(id) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  supabaseDelete_('cycles', 'id=eq.' + id);
  return { ok: true };
}

// ---- FULL TREE (Categoria → Assuntos → Ciclos) -----------

function getCategoryTree() {
  const cats   = supabaseQuery_('categories', 'select=*&order=name.asc') || [];
  const subs   = supabaseQuery_('subjects',   'select=*&order=name.asc') || [];
  const cycles = supabaseQuery_('cycles',     'select=*&order=order_index.asc') || [];

  const tree = cats.map(function(c) {
    const catSubs = subs.filter(s => s.category_id === c.id).map(function(s) {
      return Object.assign({}, s, {
        cycles: cycles.filter(cy => cy.subject_id === s.id),
      });
    });
    return Object.assign({}, c, { subjects: catSubs });
  });

  // Contagem de arquivos por categoria
  const fileCounts = {};
  const fileCats   = supabaseQuery_('study_files', 'select=category_id&status=neq.rejected') || [];
  fileCats.forEach(f => {
    if (f.category_id) fileCounts[f.category_id] = (fileCounts[f.category_id] || 0) + 1;
  });

  return { ok: true, tree, fileCounts };
}

// ---- DICIONÁRIO ------------------------------------------

function listDictionaryTerms() {
  const terms = supabaseQuery_(
    'dictionary_terms',
    'select=*&order=weight.desc,raw_term.asc'
  );
  return { ok: true, terms: terms || [] };
}

function saveDictionaryTermFull(data) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };

  const payload = {
    raw_term:        data.raw_term,
    normalized_term: data.normalized_term,
    category_hint:   data.category_hint   || null,
    subject_hint:    data.subject_hint    || null,
    cycle_hint:      data.cycle_hint      || null,
    file_type_hint:  data.file_type_hint  || null,
    weight:          parseInt(data.weight) || 1,
    active:          data.active !== false,
  };

  if (data.id) {
    supabaseUpdate_('dictionary_terms', 'id=eq.' + data.id, payload);
  } else {
    supabaseInsert_('dictionary_terms', payload, false);
  }
  return { ok: true };
}

function deleteDictionaryTerm(id) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  supabaseDelete_('dictionary_terms', 'id=eq.' + id);
  return { ok: true };
}

// ---- TAGS ------------------------------------------------

function listTags() {
  const rows = supabaseQuery_('tags', 'select=id,name&order=name.asc');
  return { ok: true, tags: rows || [] };
}

function deleteTag(id) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  supabaseDelete_('tags', 'id=eq.' + id);
  return { ok: true };
}

/** Compatibilidade com telas antigas: retorna categorias com assuntos e ciclos. */
function getCategories() {
  var cacheKey = 'repo_estudos:categories:tree:v1';
  var cached = cacheGet_(cacheKey);
  if (cached) return Object.assign({ fromCache: true }, cached);

  const cats = supabaseQuery_('categories', 'select=*,subjects(id,name,cycles(id,name,order_index))&order=name.asc');
  var out = { ok: true, categories: cats || [] };
  cacheSet_(cacheKey, out, 300);
  return out;
}

// Aliases públicos de compatibilidade para views antigas/modularizadas.
function getSubjects(categoryId) { return listSubjects(categoryId); }
function getCycles(subjectId) { return listCycles(subjectId); }
function getTags() { return listTags(); }
