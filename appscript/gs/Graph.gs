// ============================================================
// Graph.gs — Grafo genérico de estudos + compatibilidade antiga
// Google Apps Script · Supabase PostgreSQL · RLS
// ============================================================

var GRAPH_ALLOWED_NODE_TYPES_ = ['material','path','category','subject','tag','topic'];
var GRAPH_ALLOWED_RELATIONS_ = [
  'prerequisite','recommended_after','related','same_author','same_category','same_subject',
  'criticizes','explains','depends_on','part_of','path_contains','path_prerequisite','path_continuation','custom','required','recommended','complementary','optional'
];

function normalizeGraphNodeType_(type) {
  type = String(type || '').trim().toLowerCase();
  var aliases = {
    study_file:'material', file:'material', material:'material', materials:'material', livro:'material', pdf:'material', artigo:'material',
    learning_path:'path', trilha:'path', path:'path', paths:'path',
    categoria:'category', category:'category', assunto:'subject', subject:'subject', materia:'subject', matéria:'subject',
    tag:'tag', tópico:'topic', topico:'topic', topic:'topic', conceito:'topic', concept:'topic'
  };
  return aliases[type] || type;
}

function graphNodeKey_(type, id) {
  return normalizeGraphNodeType_(type) + ':' + String(id || '');
}

function graphCanManage_(profile) {
  return !!(profile && ['admin','editor'].indexOf(String(profile.role || '').toLowerCase()) !== -1 && String(profile.status || 'active') !== 'inactive');
}

function graphRelationLabel_(rel) {
  var labels = {
    prerequisite:'Pré-requisito', recommended_after:'Recomendado depois', related:'Relacionado', same_author:'Mesmo autor',
    same_category:'Mesma categoria', same_subject:'Mesmo assunto', criticizes:'Critica', explains:'Explica', depends_on:'Depende de',
    part_of:'Parte de', path_contains:'Contém na trilha', path_prerequisite:'Trilha pré-requisito', path_continuation:'Continuação', custom:'Personalizada', required:'Obrigatório', recommended:'Recomendado', complementary:'Complementar', optional:'Opcional'
  };
  return labels[rel] || rel || 'Relacionado';
}

function getGraphData(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };

    var pathId = params.pathId || params.learning_path_id || '';
    var includeGenerated = params.includeGenerated !== false;
    var nodesByKey = {};
    var edgeRows = [];
    var generatedEdges = [];
    var path = null;
    var canManage = graphCanManage_(profile);

    if (pathId) {
      var pRows = supabaseQuery_('learning_paths', 'select=*&id=eq.' + encodeURIComponent(pathId) + '&limit=1', token) || [];
      path = pRows[0] || null;
      if (path) addGraphNode_(nodesByKey, { type:'path', id:path.id, label:path.title || 'Trilha', meta:path });

      var items = supabaseQuery_('study_path_items',
        'select=*,study_files(id,final_name,suggested_name,original_name,file_type,status,visibility,category_id,subject_id,author,year,google_drive_preview_url,google_drive_web_url,source_type,thumbnail_url,external_url)' +
        '&path_id=eq.' + encodeURIComponent(pathId) + '&order=position.asc', token) || [];
      var itemIds = items.map(function(it){ return it.id; }).filter(Boolean);
      var progressRows = [];
      if (itemIds.length) {
        try {
          progressRows = supabaseQuery_('user_progress', 'select=path_item_id,status,completed_at&user_id=eq.' + encodeURIComponent(profile.id) + '&path_item_id=in.(' + itemIds.join(',') + ')', token) || [];
        } catch (_) { progressRows = []; }
      }
      var progByItem = {};
      progressRows.forEach(function(p){ progByItem[p.path_item_id] = p; });
      var prevFileId = null;
      items.forEach(function(it, idx){
        var f = it.study_files || it.material || {};
        if (!f.id) return;
        f.path_position = Number(it.position || idx + 1);
        f.item_type = it.item_type || 'required';
        f.is_required = it.is_required !== false;
        f._pathId = String(pathId);
        f._pathIds = [String(pathId)];
        f._pathItemId = it.id;
        f.progress_status = (progByItem[it.id] && progByItem[it.id].status) || 'not_started';
        addGraphNode_(nodesByKey, { type:'material', id:f.id, label:graphMaterialLabel_(f), meta:f });
        if (includeGenerated && path) {
          // Aresta inicial da trilha para o primeiro material e sequência entre materiais.
          if (idx === 0) {
            generatedEdges.push({
              id:'generated_path_start_' + path.id + '_' + f.id,
              path_id:path.id,
              source_type:'path', source_id:path.id, target_type:'material', target_id:f.id,
              relation_type:'part_of', direction:'directed', weight:1, generated:true,
              note:'Início da trilha.'
            });
          }
          if (prevFileId) {
            generatedEdges.push({
              id:'generated_path_seq_' + path.id + '_' + prevFileId + '_' + f.id,
              path_id:path.id,
              source_type:'material', source_id:prevFileId, target_type:'material', target_id:f.id,
              relation_type:'recommended_after', direction:'directed', weight:1, generated:true,
              note:'Sequência automática pela posição na trilha.'
            });
          }
        }
        prevFileId = f.id;
        if (f.category_id) addLightRelationNode_(nodesByKey, 'category', f.category_id);
        if (f.subject_id) addLightRelationNode_(nodesByKey, 'subject', f.subject_id);
      });
      if (path && nodesByKey[graphNodeKey_('path', path.id)]) nodesByKey[graphNodeKey_('path', path.id)].meta._materialCount = items.length;
    } else {
      // Grafo geral: carregar todas as trilhas como nós principais, mesmo sem relações.
      var allPaths = supabaseQuery_('learning_paths', 'select=*&order=updated_at.desc&limit=200', token) || [];
      var countsByPath = {};
      allPaths.forEach(function(p){
        addGraphNode_(nodesByKey, { type:'path', id:p.id, label:p.title || 'Trilha', meta:p });
        countsByPath[String(p.id)] = 0;
      });

      // Também hidratar materiais de cada trilha para expansão/recolhimento no frontend.
      var allItems = [];
      try {
        allItems = supabaseQuery_('study_path_items',
          'select=*,study_files(id,final_name,suggested_name,original_name,file_type,status,visibility,category_id,subject_id,author,year,google_drive_preview_url,google_drive_web_url,source_type,thumbnail_url,external_url)' +
          '&order=position.asc&limit=2000', token) || [];
      } catch (_) { allItems = []; }

      var prevByPath = {};
      allItems.forEach(function(it, idx){
        if (!it.path_id) return;
        var pid = String(it.path_id);
        countsByPath[pid] = (countsByPath[pid] || 0) + 1;
        var f = it.study_files || it.material || {};
        if (!f.id) return;
        f.path_position = Number(it.position || countsByPath[pid]);
        f.item_type = it.item_type || 'required';
        f.is_required = it.is_required !== false;
        f._pathId = pid;
        f._pathIds = [pid];
        f._pathItemId = it.id;
        addGraphNode_(nodesByKey, { type:'material', id:f.id, label:graphMaterialLabel_(f), meta:f });

        if (includeGenerated) {
          if (!prevByPath[pid]) {
            generatedEdges.push({
              id:'generated_path_start_' + pid + '_' + f.id,
              path_id:pid,
              source_type:'path', source_id:pid, target_type:'material', target_id:f.id,
              relation_type:'part_of', direction:'directed', weight:1, generated:true,
              note:'Início da trilha.'
            });
          } else {
            generatedEdges.push({
              id:'generated_path_seq_' + pid + '_' + prevByPath[pid] + '_' + f.id,
              path_id:pid,
              source_type:'material', source_id:prevByPath[pid], target_type:'material', target_id:f.id,
              relation_type:'recommended_after', direction:'directed', weight:1, generated:true,
              note:'Sequência automática pela posição na trilha.'
            });
          }
        }
        prevByPath[pid] = f.id;
      });

      Object.keys(countsByPath).forEach(function(pid){
        var key = graphNodeKey_('path', pid);
        if (nodesByKey[key]) nodesByKey[key].meta._materialCount = countsByPath[pid];
      });
    }

    var edgeQuery = 'select=*&order=created_at.desc&limit=' + encodeURIComponent(params.limit || 500);
    if (pathId) edgeQuery = 'select=*&path_id=eq.' + encodeURIComponent(pathId) + '&order=created_at.desc&limit=' + encodeURIComponent(params.limit || 500);
    edgeRows = supabaseQuery_('graph_edges', edgeQuery, token) || [];

    var allEdges = generatedEdges.concat(edgeRows || []);
    hydrateNodesFromEdges_(nodesByKey, allEdges, token);

    var edges = allEdges.map(function(e){
      var st = normalizeGraphNodeType_(e.source_type);
      var tt = normalizeGraphNodeType_(e.target_type);
      var rel = String(e.relation_type || 'related');
      var dir = String(e.direction || 'directed').toLowerCase() === 'undirected' ? 'undirected' : 'directed';
      return {
        id:e.id,
        source_type:st, source_id:e.source_id,
        target_type:tt, target_id:e.target_id,
        source_key:graphNodeKey_(st, e.source_id),
        target_key:graphNodeKey_(tt, e.target_id),
        relation_type:rel,
        relation_label:graphRelationLabel_(rel),
        direction:dir,
        weight:Number(e.weight || 1),
        note:e.note || '',
        path_id:e.path_id || pathId || null,
        generated:!!e.generated,
        created_at:e.created_at || null,
        created_by:e.created_by || null
      };
    }).filter(function(e){ return nodesByKey[e.source_key] && nodesByKey[e.target_key]; });

    return {
      ok:true,
      path:path,
      nodes:Object.keys(nodesByKey).map(function(k){ return nodesByKey[k]; }),
      edges:edges,
      canManage:canManage,
      relationTypes:GRAPH_ALLOWED_RELATIONS_,
      nodeTypes:GRAPH_ALLOWED_NODE_TYPES_
    };
  } catch (err) {
    Logger.log('[getGraphData] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function addGraphNode_(nodesByKey, node) {
  if (!node || !node.type || !node.id) return;
  var type = normalizeGraphNodeType_(node.type);
  var key = graphNodeKey_(type, node.id);
  if (!nodesByKey[key]) {
    nodesByKey[key] = {
      key:key,
      type:type,
      id:String(node.id),
      label:String(node.label || node.name || node.title || node.id),
      meta:node.meta || {},
      generated:!!node.generated
    };
  } else {
    nodesByKey[key].label = nodesByKey[key].label || node.label;
    var oldMeta = nodesByKey[key].meta || {};
    var newMeta = node.meta || {};
    var oldIds = oldMeta._pathIds || (oldMeta._pathId ? [oldMeta._pathId] : []);
    var newIds = newMeta._pathIds || (newMeta._pathId ? [newMeta._pathId] : []);
    nodesByKey[key].meta = Object.assign({}, oldMeta, newMeta);
    var mergedIds = {};
    oldIds.concat(newIds).forEach(function(pid){ if (pid) mergedIds[String(pid)] = true; });
    var ids = Object.keys(mergedIds);
    if (ids.length) {
      nodesByKey[key].meta._pathIds = ids;
      nodesByKey[key].meta._pathId = nodesByKey[key].meta._pathId || ids[0];
    }
  }
}

function addLightRelationNode_(nodesByKey, type, id) {
  if (!id) return;
  addGraphNode_(nodesByKey, { type:type, id:id, label:String(type) + ' ' + String(id).substring(0,8), generated:true });
}

function hydrateNodesFromEdges_(nodesByKey, edges, accessToken) {
  var idsByType = { material:{}, path:{}, category:{}, subject:{}, tag:{}, topic:{} };
  (edges || []).forEach(function(e){
    var st = normalizeGraphNodeType_(e.source_type), tt = normalizeGraphNodeType_(e.target_type);
    if (idsByType[st] && e.source_id) idsByType[st][String(e.source_id)] = true;
    if (idsByType[tt] && e.target_id) idsByType[tt][String(e.target_id)] = true;
  });

  hydrateGraphType_(nodesByKey, 'material', Object.keys(idsByType.material), 'study_files', 'select=id,final_name,suggested_name,original_name,file_type,status,visibility,category_id,subject_id,author,year', accessToken, graphMaterialLabel_);
  hydrateGraphType_(nodesByKey, 'path', Object.keys(idsByType.path), 'learning_paths', 'select=id,title,description,visibility', accessToken, function(r){ return r.title || 'Trilha'; });
  hydrateGraphType_(nodesByKey, 'category', Object.keys(idsByType.category), 'categories', 'select=id,name,description,color,icon', accessToken, function(r){ return r.name || 'Categoria'; });
  hydrateGraphType_(nodesByKey, 'subject', Object.keys(idsByType.subject), 'subjects', 'select=id,name,description,category_id', accessToken, function(r){ return r.name || 'Assunto'; });
  hydrateGraphType_(nodesByKey, 'tag', Object.keys(idsByType.tag), 'tags', 'select=id,name,color', accessToken, function(r){ return '#' + (r.name || 'tag'); });
  hydrateGraphType_(nodesByKey, 'topic', Object.keys(idsByType.topic), 'graph_nodes', 'select=id,node_type,label,description,color,created_at', accessToken, function(r){ return r.label || 'Tópico'; });

  // Fallback para nós ainda não hidratados.
  Object.keys(idsByType).forEach(function(type){
    Object.keys(idsByType[type]).forEach(function(id){
      var key = graphNodeKey_(type, id);
      if (!nodesByKey[key]) addGraphNode_(nodesByKey, { type:type, id:id, label:type + ' · ' + String(id).substring(0,8) });
    });
  });
}

function hydrateGraphType_(nodesByKey, type, ids, table, selectQuery, accessToken, labelFn) {
  ids = (ids || []).filter(Boolean);
  if (!ids.length) return;
  // Evita URL grande demais no Apps Script.
  for (var i = 0; i < ids.length; i += 80) {
    var chunk = ids.slice(i, i + 80);
    var rows = supabaseQuery_(table, selectQuery + '&id=in.(' + chunk.join(',') + ')', accessToken) || [];
    rows.forEach(function(r){ addGraphNode_(nodesByKey, { type:type, id:r.id, label:labelFn(r), meta:r }); });
  }
}

function graphMaterialLabel_(f) {
  return (f && (f.final_name || f.suggested_name || f.title_detected || f.original_name)) || 'Material';
}

function searchGraphEntities(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var q = String(params.q || params.search || '').trim().toLowerCase();
    var limit = Math.min(Number(params.limit || 20), 50);
    var types = params.types || GRAPH_ALLOWED_NODE_TYPES_;
    if (typeof types === 'string') types = types.split(',');
    types = types.map(normalizeGraphNodeType_);
    var out = [];

    if (types.indexOf('material') !== -1) {
      var files = supabaseQuery_('study_files', 'select=id,final_name,suggested_name,original_name,file_type,status,visibility,author,year&order=updated_at.desc&limit=120', token) || [];
      files.forEach(function(f){ pushIfMatch_(out, q, { type:'material', id:f.id, label:graphMaterialLabel_(f), meta:f }); });
    }
    if (types.indexOf('path') !== -1) {
      var paths = supabaseQuery_('learning_paths', 'select=id,title,description,visibility&order=updated_at.desc&limit=80', token) || [];
      paths.forEach(function(p){ pushIfMatch_(out, q, { type:'path', id:p.id, label:p.title || 'Trilha', meta:p }); });
    }
    if (types.indexOf('category') !== -1) {
      var cats = supabaseQuery_('categories', 'select=id,name,description,color,icon&order=name.asc&limit=100', token) || [];
      cats.forEach(function(c){ pushIfMatch_(out, q, { type:'category', id:c.id, label:c.name || 'Categoria', meta:c }); });
    }
    if (types.indexOf('subject') !== -1) {
      var subs = supabaseQuery_('subjects', 'select=id,name,description,category_id&order=name.asc&limit=100', token) || [];
      subs.forEach(function(s){ pushIfMatch_(out, q, { type:'subject', id:s.id, label:s.name || 'Assunto', meta:s }); });
    }
    if (types.indexOf('tag') !== -1) {
      var tags = supabaseQuery_('tags', 'select=id,name,color&order=name.asc&limit=100', token) || [];
      tags.forEach(function(t){ pushIfMatch_(out, q, { type:'tag', id:t.id, label:'#' + (t.name || 'tag'), meta:t }); });
    }
    if (types.indexOf('topic') !== -1) {
      var topics = supabaseQuery_('graph_nodes', 'select=id,node_type,label,description,color&order=created_at.desc&limit=100', token) || [];
      topics.forEach(function(t){ pushIfMatch_(out, q, { type:'topic', id:t.id, label:t.label || 'Tópico', meta:t }); });
    }

    out = out.slice(0, limit).map(function(e){ e.key = graphNodeKey_(e.type, e.id); return e; });
    return { ok:true, entities:out };
  } catch (err) {
    Logger.log('[searchGraphEntities] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function pushIfMatch_(out, q, entity) {
  var label = String(entity.label || '').toLowerCase();
  var meta = JSON.stringify(entity.meta || {}).toLowerCase();
  if (!q || label.indexOf(q) !== -1 || meta.indexOf(q) !== -1) out.push(entity);
}

function createGraphTopic(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!graphCanManage_(profile)) return { ok:false, error:'Sem permissão para criar tópico/conceito.' };
    var label = String(params.label || '').trim();
    if (!label) return { ok:false, error:'Informe o nome do tópico.' };
    var ins = supabaseInsert_('graph_nodes', {
      node_type:'topic',
      label:label,
      description:String(params.description || '').trim() || null,
      color:params.color || '#004ac6',
      created_by:profile.id
    }, true, token);
    if (ins && ins.error) return { ok:false, error:ins.error };
    var topic = Array.isArray(ins) ? ins[0] : ins;
    writeAuditLog_(profile, 'graph_topic_created', 'topic', topic && topic.id, { label:label }, token);
    return { ok:true, topic:topic };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function saveGraphEdge(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!graphCanManage_(profile)) return { ok:false, error:'Sem permissão para gerenciar relações.' };

    var sourceType = normalizeGraphNodeType_(params.source_type || params.sourceType);
    var targetType = normalizeGraphNodeType_(params.target_type || params.targetType);
    var sourceId = String(params.source_id || params.sourceId || '').trim();
    var targetId = String(params.target_id || params.targetId || '').trim();
    var relationType = String(params.relation_type || params.relationType || 'related').trim().toLowerCase();
    var direction = String(params.direction || 'directed').trim().toLowerCase() === 'undirected' ? 'undirected' : 'directed';
    var weight = Number(params.weight || 1);

    if (GRAPH_ALLOWED_NODE_TYPES_.indexOf(sourceType) === -1 || GRAPH_ALLOWED_NODE_TYPES_.indexOf(targetType) === -1) return { ok:false, error:'Tipo de nó inválido.' };
    if (!sourceId || !targetId) return { ok:false, error:'Origem e destino são obrigatórios.' };
    if (sourceType === targetType && sourceId === targetId) return { ok:false, error:'Origem e destino não podem ser o mesmo nó.' };
    if (GRAPH_ALLOWED_RELATIONS_.indexOf(relationType) === -1) relationType = 'custom';
    if (!isFinite(weight) || weight <= 0) weight = 1;

    var payload = {
      path_id: params.pathId || params.path_id || null,
      source_type: sourceType,
      source_id: sourceId,
      target_type: targetType,
      target_id: targetId,
      relation_type: relationType,
      direction: direction,
      weight: weight,
      note: String(params.note || '').trim() || null,
      created_by: profile.id,
      updated_at: new Date().toISOString()
    };

    var res;
    if (params.id) {
      delete payload.created_by;
      res = supabaseUpdate_('graph_edges', 'id=eq.' + encodeURIComponent(params.id), payload, token);
      if (res && res.error) return { ok:false, error:res.error };
      writeAuditLog_(profile, 'graph_edge_updated', 'graph_edge', params.id, payload, token);
    } else {
      res = supabaseInsert_('graph_edges', payload, true, token);
      if (res && res.error) return { ok:false, error:res.error };
      var inserted = Array.isArray(res) ? res[0] : res;
      writeAuditLog_(profile, 'graph_edge_created', 'graph_edge', inserted && inserted.id, payload, token);
    }
    cacheDelete('graph:data');
    return { ok:true, edge:Array.isArray(res) ? res[0] : res };
  } catch (err) {
    Logger.log('[saveGraphEdge] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function deleteGraphEdge(edgeId, accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!graphCanManage_(profile)) return { ok:false, error:'Sem permissão para remover relações.' };
    if (!edgeId) return { ok:false, error:'ID da relação é obrigatório.' };
    var del = supabaseDelete_('graph_edges', 'id=eq.' + encodeURIComponent(edgeId), accessToken);
    if (del && del.error) return { ok:false, error:del.error };
    writeAuditLog_(profile, 'graph_edge_deleted', 'graph_edge', edgeId, {}, accessToken);
    cacheDelete('graph:data');
    return { ok:true };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function listGraphEdges(params) {
  params = params || {};
  var token = params.accessToken || params.sessionToken || '';
  return getGraphData({ accessToken:token, pathId:params.pathId || params.path_id || '', includeGenerated:false, limit:params.limit || 500 });
}

// ============================================================
// Compatibilidade com funções antigas baseadas em file_dependencies
// ============================================================

function getFileNeighbors(pathId, fileId) {
  var deps = supabaseQuery_('file_dependencies',
    'select=source_file_id,target_file_id,relation_type,note' +
    '&learning_path_id=eq.' + encodeURIComponent(pathId) +
    '&or=(source_file_id.eq.' + encodeURIComponent(fileId) + ',target_file_id.eq.' + encodeURIComponent(fileId) + ')'
  ) || [];
  return {
    incoming: deps.filter(function(d){ return d.target_file_id === fileId; }).map(function(d){ return { fileId: d.source_file_id, type: d.relation_type, note: d.note }; }),
    outgoing: deps.filter(function(d){ return d.source_file_id === fileId; }).map(function(d){ return { fileId: d.target_file_id, type: d.relation_type, note: d.note }; })
  };
}

function shortestPath(pathId, fromFileId, toFileId) {
  var deps = supabaseQuery_('file_dependencies', 'select=source_file_id,target_file_id&learning_path_id=eq.' + encodeURIComponent(pathId)) || [];
  var adj = {};
  deps.forEach(function(d){ if (!adj[d.source_file_id]) adj[d.source_file_id] = []; adj[d.source_file_id].push(d.target_file_id); });
  var q = [[fromFileId]], seen = {}; seen[fromFileId] = true;
  while (q.length) {
    var path = q.shift(), last = path[path.length - 1];
    if (last === toFileId) return path;
    (adj[last] || []).forEach(function(n){ if (!seen[n]) { seen[n] = true; q.push(path.concat([n])); } });
  }
  return null;
}

function reachableFrom(pathId, startFileId) {
  var deps = supabaseQuery_('file_dependencies', 'select=source_file_id,target_file_id&learning_path_id=eq.' + encodeURIComponent(pathId)) || [];
  var adj = {}, seen = {};
  deps.forEach(function(d){ if (!adj[d.source_file_id]) adj[d.source_file_id] = []; adj[d.source_file_id].push(d.target_file_id); });
  function dfs(id){ (adj[id] || []).forEach(function(n){ if (!seen[n]) { seen[n] = true; dfs(n); } }); }
  dfs(startFileId);
  return Object.keys(seen);
}

function topologicalSort(pathId) {
  var deps = supabaseQuery_('file_dependencies', 'select=source_file_id,target_file_id&learning_path_id=eq.' + encodeURIComponent(pathId)) || [];
  var nodes = {}, indeg = {}, adj = {};
  deps.forEach(function(d){ nodes[d.source_file_id]=true; nodes[d.target_file_id]=true; if (!adj[d.source_file_id]) adj[d.source_file_id]=[]; adj[d.source_file_id].push(d.target_file_id); indeg[d.target_file_id]=(indeg[d.target_file_id]||0)+1; if (!indeg[d.source_file_id]) indeg[d.source_file_id]=0; });
  var q = Object.keys(nodes).filter(function(n){ return (indeg[n] || 0) === 0; });
  var out = [];
  while(q.length){ var n=q.shift(); out.push(n); (adj[n]||[]).forEach(function(t){ indeg[t]--; if(indeg[t]===0) q.push(t); }); }
  return out.length === Object.keys(nodes).length ? out : [];
}

function getPathStats(pathId) {
  var deps = supabaseQuery_('file_dependencies', 'select=source_file_id,target_file_id,relation_type&learning_path_id=eq.' + encodeURIComponent(pathId)) || [];
  var nodes = {}, byType = {};
  deps.forEach(function(d){ nodes[d.source_file_id]=true; nodes[d.target_file_id]=true; byType[d.relation_type]=(byType[d.relation_type]||0)+1; });
  return { nodes:Object.keys(nodes).length, edges:deps.length, byType:byType, hasCycle:topologicalSort(pathId).length === 0 && deps.length > 0 };
}
