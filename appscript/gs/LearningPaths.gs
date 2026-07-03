// ============================================================
// LearningPaths.gs — Trilhas de estudo + itens ordenados
// Mantém learning_paths existente e adiciona study_path_items.
// ============================================================

function invalidatePathsCache_() {
  cacheDeleteMany_(['repo_estudos:paths:list:v1', 'repo_estudos:library:public:v1']);
}

function _canManagePaths_(profile) {
  return !!(profile && ['admin','editor'].indexOf(profile.role) !== -1);
}

function getLearningPaths(filters) {
  filters = filters || {};
  var token = filters.accessToken || filters.sessionToken || '';
  var profile = getMyProfile(token);
  var cacheKey = 'repo_estudos:paths:list:v1';
  if (!profile && !filters.categoryId && !filters.subjectId) {
    var cached = cacheGet(cacheKey);
    if (cached) return Object.assign({ fromCache:true }, cached);
  }

  var q = 'select=*,categories(name),subjects(name),profiles(display_name)&order=created_at.desc';
  if (filters.categoryId) q += '&category_id=eq.' + encodeURIComponent(filters.categoryId);
  if (filters.subjectId)  q += '&subject_id=eq.'  + encodeURIComponent(filters.subjectId);
  if (profile && profile.role !== 'admin') q += '&or=(visibility.eq.public,created_by.eq.' + encodeURIComponent(profile.id) + ')';
  if (!profile) q += '&visibility=eq.public';

  var rows = supabaseQuery_('learning_paths', q, token) || [];
  var out = { ok: true, paths: rows };
  if (!profile && !filters.categoryId && !filters.subjectId) cacheSet(cacheKey, out, 300);
  return out;
}

function createLearningPath(data) {
  data = data || {};
  var token = data.accessToken || data.sessionToken || '';
  var profile = getMyProfile(token);
  if (!_canManagePaths_(profile)) return { ok: false, error: 'Sem permissão. Apenas editor/admin pode criar trilhas.' };
  if (!String(data.title || '').trim()) return { ok:false, error:'Título obrigatório.' };
  var ins = supabaseInsert_('learning_paths', {
    title: String(data.title || '').trim(),
    description: data.description || null,
    category_id: data.categoryId || null,
    subject_id: data.subjectId || null,
    visibility: data.visibility || 'public',
    created_by: profile.id
  }, true, token);
  if (ins.error) return { ok: false, error: ins.error };
  invalidatePathsCache_();
  return { ok: true, path: Array.isArray(ins) ? ins[0] : ins };
}

function getPathDetail(pathId, accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!profile) return { ok: false, error: 'Não autenticado' };
    var paths = supabaseQuery_('learning_paths', 'select=*&id=eq.' + encodeURIComponent(pathId) + '&limit=1', accessToken);
    if (!paths || !paths[0]) return { ok: false, error: 'Trilha não encontrada' };
    var path = paths[0];

    var items = getPathItems_(pathId, profile.id, accessToken);
    var fileIds = items.map(function(it){ return it.material_id; }).filter(Boolean);

    var deps = _itemsToSyntheticDeps_(items);
    var oldDeps = [];
    if (items.length === 0) {
      oldDeps = supabaseQuery_('file_dependencies',
        'select=*,' +
        'study_files!source_file_id(id,final_name,suggested_name,original_name,file_type,status),' +
        'study_files!target_file_id(id,final_name,suggested_name,original_name,file_type,status)' +
        '&learning_path_id=eq.' + encodeURIComponent(pathId), accessToken) || [];
      deps = oldDeps;
      fileIds = _extractFileIds_(oldDeps);
    }

    var progress = [];
    if (fileIds.length > 0) {
      progress = supabaseQuery_('user_file_progress',
        'select=file_id,status&user_id=eq.' + encodeURIComponent(profile.id) + '&file_id=in.(' + fileIds.join(',') + ')', accessToken) || [];
    }
    var itemProgress = [];
    if (items.length > 0) {
      var itemIds = items.map(function(it){ return it.id; }).join(',');
      itemProgress = supabaseQuery_('user_progress',
        'select=path_item_id,status,completed_at,current_page,total_pages,progress_percent,last_position_seconds&user_id=eq.' + encodeURIComponent(profile.id) + '&path_item_id=in.(' + itemIds + ')', accessToken) || [];
    }

    return {
      ok: true,
      path: path,
      items: items,
      deps: deps || [],
      oldDeps: oldDeps,
      rootNodes: _computeRoots_(deps || []),
      progress: progress,
      itemProgress: itemProgress,
      fileIds: fileIds,
      canManage: _canManagePaths_(profile)
    };
  } catch (err) {
    Logger.log('[getPathDetail] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err), stack: simplifyStack_(err && err.stack || err) };
  }
}

function getPathItems_(pathId, profileId, accessToken) {
  var rows = supabaseQuery_('study_path_items',
    'select=*,study_files(id,owner_id,final_name,suggested_name,original_name,file_type,status,visibility,google_drive_preview_url,google_drive_web_url,source_type,external_url,external_provider,youtube_video_id,youtube_playlist_id,embed_url,thumbnail_url,duration_seconds,channel_title)' +
    '&path_id=eq.' + encodeURIComponent(pathId) + '&order=position.asc', accessToken);
  if (!rows) return [];
  return rows.map(function(r){
    r.material = r.study_files || r.material || null;
    return r;
  });
}

function _itemsToSyntheticDeps_(items) {
  var deps = [];
  for (var i = 0; i < items.length - 1; i++) {
    var a = items[i], b = items[i+1];
    if (!a.material_id || !b.material_id) continue;
    deps.push({
      id: 'item_' + a.id + '_' + b.id,
      learning_path_id: a.path_id,
      source_file_id: a.material_id,
      target_file_id: b.material_id,
      relation_type: b.item_type === 'required' ? 'required' : (b.item_type === 'complementary' ? 'complementary' : 'recommended'),
      'study_files!source_file_id': a.material,
      'study_files!target_file_id': b.material
    });
  }
  return deps;
}

function getMaterialPathLinks(materialId, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok:false, error:'Não autenticado' };
  var pathsRes = getLearningPaths({ accessToken: accessToken });
  var paths = pathsRes.paths || [];
  var links = supabaseQuery_('study_path_items', 'select=*&material_id=eq.' + encodeURIComponent(materialId), accessToken) || [];
  var byPath = {};
  links.forEach(function(l){ byPath[l.path_id] = l; });
  return { ok:true, paths: paths.map(function(p){
    return {
      id: p.id,
      title: p.title,
      visibility: p.visibility,
      linked: !!byPath[p.id],
      item: byPath[p.id] || null,
      item_type: byPath[p.id] ? byPath[p.id].item_type : 'required',
      is_required: byPath[p.id] ? byPath[p.id].is_required : true,
      position: byPath[p.id] ? byPath[p.id].position : null
    };
  }) };
}

function updateMaterialPathLinks(materialId, links, accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!_canManagePaths_(profile)) return { ok:false, error:'Sem permissão para vincular material a trilhas.' };
    links = links || [];
    var current = supabaseQuery_('study_path_items', 'select=*&material_id=eq.' + encodeURIComponent(materialId), accessToken) || [];
    var currentByPath = {};
    var affectedPaths = {};
    current.forEach(function(c){ currentByPath[c.path_id] = c; affectedPaths[c.path_id] = true; });
    var desired = {};

    links.forEach(function(l){
      if (!l || !l.pathId || !l.linked) return;
      desired[l.pathId] = true; affectedPaths[l.pathId] = true;
      if (currentByPath[l.pathId]) {
        supabaseUpdate_('study_path_items', 'id=eq.' + encodeURIComponent(currentByPath[l.pathId].id), {
          item_type: l.itemType || l.item_type || 'required',
          is_required: l.isRequired !== false
        }, accessToken);
      } else {
        addMaterialToPath({ pathId: l.pathId, materialId: materialId, itemType: l.itemType || l.item_type || 'required', isRequired: l.isRequired !== false, accessToken: accessToken });
      }
    });

    current.forEach(function(c){
      if (!desired[c.path_id]) {
        supabaseDelete_('study_path_items', 'id=eq.' + encodeURIComponent(c.id), accessToken);
        affectedPaths[c.path_id] = true;
      }
    });
    Object.keys(affectedPaths).forEach(function(pid){ reorderPathItems_(pid, accessToken); });
    invalidatePathsCache_();
    return { ok:true };
  } catch (err) {
    Logger.log('[updateMaterialPathLinks] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err) };
  }
}

function addMaterialToPath(data) {
  data = data || {};
  var token = data.accessToken || data.sessionToken || '';
  var profile = getMyProfile(token);
  if (!_canManagePaths_(profile)) return { ok:false, error:'Sem permissão para adicionar material à trilha.' };
  if (!data.pathId || !data.materialId) return { ok:false, error:'Trilha e material são obrigatórios.' };

  var existing = supabaseQuery_('study_path_items', 'select=id&path_id=eq.' + encodeURIComponent(data.pathId) + '&material_id=eq.' + encodeURIComponent(data.materialId) + '&limit=1', token);
  if (existing && existing[0]) return { ok:false, error:'Este material já está na trilha.' };
  var last = supabaseQuery_('study_path_items', 'select=position&path_id=eq.' + encodeURIComponent(data.pathId) + '&order=position.desc&limit=1', token) || [];
  var nextPos = last[0] && last[0].position ? Number(last[0].position) + 1 : 1;
  var itemType = data.itemType || data.item_type || 'required';
  var ins = supabaseInsert_('study_path_items', {
    path_id: data.pathId,
    material_id: data.materialId,
    position: nextPos,
    item_type: itemType,
    is_required: data.isRequired !== false,
    created_by: profile.id
  }, true, token);
  if (ins.error) return { ok:false, error:ins.error };
  _logHistory_(data.materialId, profile.id, 'path_item_added', null, { path_id:data.pathId, item_type:itemType }, token);
  invalidatePathsCache_();
  return { ok:true, item: Array.isArray(ins) ? ins[0] : ins };
}

function removeMaterialFromPath(itemId, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!_canManagePaths_(profile)) return { ok:false, error:'Sem permissão.' };
  var rows = supabaseQuery_('study_path_items', 'select=path_id,material_id&id=eq.' + encodeURIComponent(itemId) + '&limit=1', accessToken) || [];
  var item = rows[0] || null;
  var del = supabaseDelete_('study_path_items', 'id=eq.' + encodeURIComponent(itemId), accessToken);
  if (del.error) return { ok:false, error:del.error };
  if (item) reorderPathItems_(item.path_id, accessToken);
  invalidatePathsCache_();
  return { ok:true };
}

function updatePathItem(itemId, updates, accessToken) {
  var profile = getMyProfile(accessToken || (updates && updates.accessToken));
  var token = accessToken || (updates && updates.accessToken) || '';
  if (!_canManagePaths_(profile)) return { ok:false, error:'Sem permissão.' };
  updates = updates || {};
  var payload = {};
  if (updates.itemType || updates.item_type) payload.item_type = updates.itemType || updates.item_type;
  if (updates.isRequired !== undefined) payload.is_required = !!updates.isRequired;
  if (Object.keys(payload).length === 0) return { ok:false, error:'Nada para atualizar.' };
  var res = supabaseUpdate_('study_path_items', 'id=eq.' + encodeURIComponent(itemId), payload, token);
  if (res.error) return { ok:false, error:res.error };
  invalidatePathsCache_();
  return { ok:true, item:Array.isArray(res)?res[0]:res };
}

function movePathItem(itemId, direction, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!_canManagePaths_(profile)) return { ok:false, error:'Sem permissão.' };
  var rows = supabaseQuery_('study_path_items', 'select=*&id=eq.' + encodeURIComponent(itemId) + '&limit=1', accessToken) || [];
  if (!rows[0]) return { ok:false, error:'Item não encontrado.' };
  var item = rows[0];
  var op = String(direction || '').toLowerCase() === 'up' ? 'lt' : 'gt';
  var order = op === 'lt' ? 'position.desc' : 'position.asc';
  var near = supabaseQuery_('study_path_items', 'select=*&path_id=eq.' + encodeURIComponent(item.path_id) + '&position=' + op + '.' + item.position + '&order=' + order + '&limit=1', accessToken) || [];
  if (!near[0]) return { ok:true, unchanged:true };
  supabaseUpdate_('study_path_items', 'id=eq.' + encodeURIComponent(item.id), { position: near[0].position }, accessToken);
  supabaseUpdate_('study_path_items', 'id=eq.' + encodeURIComponent(near[0].id), { position: item.position }, accessToken);
  invalidatePathsCache_();
  return { ok:true };
}

function reorderPathItems_(pathId, accessToken) {
  if (!pathId) return;
  var rows = supabaseQuery_('study_path_items', 'select=id,position&path_id=eq.' + encodeURIComponent(pathId) + '&order=position.asc', accessToken) || [];
  rows.forEach(function(r, idx){
    var pos = idx + 1;
    if (Number(r.position) !== pos) supabaseUpdate_('study_path_items', 'id=eq.' + encodeURIComponent(r.id), { position: pos }, accessToken);
  });
}

function listMaterialsForPathPicker(data) {
  data = data || {};
  var token = data.accessToken || data.sessionToken || '';
  var filters = { accessToken: token, limit: data.limit || 40, page: 1 };
  if (data.search) filters.search = data.search;
  var res = getFiles(filters);
  if (!res.ok) return res;
  var linked = [];
  if (data.pathId) linked = supabaseQuery_('study_path_items', 'select=material_id&path_id=eq.' + encodeURIComponent(data.pathId), token) || [];
  var linkedMap = {};
  linked.forEach(function(x){ linkedMap[x.material_id] = true; });
  res.files = (res.files || []).filter(function(f){ return !linkedMap[f.id]; });
  return res;
}

function setPathItemProgress(itemId, status, notes, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok:false, error:'Não autenticado.' };
  var items = supabaseQuery_('study_path_items', 'select=id,material_id&id=eq.' + encodeURIComponent(itemId) + '&limit=1', accessToken) || [];
  if (!items[0]) return { ok:false, error:'Item da trilha não encontrado.' };
  var existing = supabaseQuery_('user_progress', 'select=id&user_id=eq.' + encodeURIComponent(profile.id) + '&path_item_id=eq.' + encodeURIComponent(itemId), accessToken) || [];
  var payload = { user_id: profile.id, path_item_id: itemId, status: status, notes: notes || null, updated_at: new Date().toISOString() };
  if (status === 'completed') payload.completed_at = new Date().toISOString();
  if (existing[0]) supabaseUpdate_('user_progress', 'id=eq.' + encodeURIComponent(existing[0].id), payload, accessToken);
  else supabaseInsert_('user_progress', payload, false, accessToken);
  updateProgress(items[0].material_id, status, notes, accessToken);
  return { ok:true };
}

// ---- DEPENDÊNCIAS LEGADAS (grafo direcional) -----------------
function addDependency(pathId, sourceFileId, targetFileId, relationType, note, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!_canManagePaths_(profile)) return { ok:false, error:'Sem permissão' };
  var hasCycle = supabaseRpc_('has_cycle_in_path', { p_path_id:pathId, p_source_id:sourceFileId, p_target_id:targetFileId }, accessToken);
  if (hasCycle) return { ok:false, cycle:true, error:'Essa relação criaria um ciclo. A operação foi bloqueada.' };
  var ins = supabaseInsert_('file_dependencies', { learning_path_id:pathId, source_file_id:sourceFileId, target_file_id:targetFileId, relation_type:relationType || 'recommended', note:note || null, created_by:profile.id }, true, accessToken);
  if (ins.error) return { ok:false, error:ins.error };
  invalidatePathsCache_();
  return { ok:true };
}

function removeDependency(depId, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!_canManagePaths_(profile)) return { ok:false, error:'Sem permissão' };
  supabaseDelete_('file_dependencies', 'id=eq.' + encodeURIComponent(depId), accessToken);
  invalidatePathsCache_();
  return { ok:true };
}

function getRootNodes(pathId) {
  var result = supabaseRpc_('get_root_nodes', { p_path_id:pathId });
  return { ok:true, roots:result || [] };
}

function getNextRecommended(pathId, completedFileId) {
  var deps = supabaseQuery_('file_dependencies',
    'select=target_file_id,relation_type,study_files!target_file_id(id,final_name,suggested_name,original_name,file_type,status)' +
    '&learning_path_id=eq.' + encodeURIComponent(pathId) +
    '&source_file_id=eq.' + encodeURIComponent(completedFileId) +
    '&relation_type=in.(required,recommended)');
  return { ok:true, next:deps || [] };
}

function checkCycle(pathId, sourceFileId, targetFileId) {
  var deps = supabaseQuery_('file_dependencies', 'select=source_file_id,target_file_id&learning_path_id=eq.' + encodeURIComponent(pathId));
  if (!deps) return { ok:true, hasCycle:false };
  var adj = {};
  deps.forEach(function(d){ if (!adj[d.source_file_id]) adj[d.source_file_id] = []; adj[d.source_file_id].push(d.target_file_id); });
  var visited = {}, queue = [targetFileId];
  while (queue.length) {
    var node = queue.shift();
    if (node === sourceFileId) return { ok:true, hasCycle:true };
    if (visited[node]) continue;
    visited[node] = true;
    (adj[node] || []).forEach(function(n){ queue.push(n); });
  }
  return { ok:true, hasCycle:false };
}

function _computeRoots_(deps) {
  var sources = {}, targets = {};
  (deps || []).forEach(function(d){ sources[d.source_file_id] = true; targets[d.target_file_id] = true; });
  return Object.keys(sources).filter(function(id){ return !targets[id]; });
}
function _extractFileIds_(deps) {
  var ids = {};
  (deps || []).forEach(function(d){ ids[d.source_file_id] = true; ids[d.target_file_id] = true; });
  return Object.keys(ids);
}
