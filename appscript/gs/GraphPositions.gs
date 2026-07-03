// ============================================================
// GraphPositions.gs — Persistência de layout dos grafos no Supabase
// Salva posições por usuário, escopo e nó para funcionar entre sessões/PCs.
// ============================================================

function normalizeGraphPositionScope_(scope) {
  scope = String(scope || 'general').trim().toLowerCase();
  return scope === 'learning_path' ? 'learning_path' : 'general';
}

function getGraphPositionUserId_(accessToken) {
  var uid = accessToken ? getUserIdFromJwt_(accessToken) : null;
  if (uid) return uid;
  var session = (typeof getSession_ === 'function') ? getSession_() : null;
  if (session && session.user_id) return session.user_id;
  var profile = getMyProfile(accessToken);
  return profile && (profile.user_id || profile.id) || null;
}

function graphPositionRowFromPayload_(p, uid, scope, scopeId) {
  p = p || {};
  var nodeType = normalizeGraphNodeType_(p.nodeType || p.node_type || p.type || '');
  var nodeId = String(p.nodeId || p.node_id || p.id || '').trim();
  var x = Number(p.x);
  var y = Number(p.y);
  if (!nodeType || !nodeId || !isFinite(x) || !isFinite(y)) return null;
  return {
    user_id: uid,
    graph_scope: scope,
    scope_id: scope === 'learning_path' ? String(scopeId || '') : null,
    node_type: nodeType,
    node_id: nodeId,
    x: x,
    y: y,
    updated_at: new Date().toISOString()
  };
}

function getGraphNodePositions(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var uid = getGraphPositionUserId_(token);
    if (!uid) return { ok:false, error:'Não autenticado.' };

    var scope = normalizeGraphPositionScope_(params.graphScope || params.graph_scope || params.scope);
    var scopeId = String(params.scopeId || params.scope_id || '').trim();
    var query = 'select=node_type,node_id,x,y,updated_at' +
      '&user_id=eq.' + encodeURIComponent(uid) +
      '&graph_scope=eq.' + encodeURIComponent(scope) +
      (scope === 'learning_path'
        ? '&scope_id=eq.' + encodeURIComponent(scopeId)
        : '&scope_id=is.null') +
      '&limit=2000';

    var rows = supabaseQuery_('graph_node_positions', query, token) || [];
    var positions = rows.map(function(r) {
      return {
        nodeType: r.node_type,
        nodeId: r.node_id,
        key: graphNodeKey_(r.node_type, r.node_id),
        x: Number(r.x),
        y: Number(r.y),
        updated_at: r.updated_at || null
      };
    }).filter(function(p){ return isFinite(p.x) && isFinite(p.y); });

    return { ok:true, graphScope:scope, scopeId:scopeId || null, positions:positions };
  } catch (err) {
    Logger.log('[getGraphNodePositions] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function saveGraphNodePositions(payload) {
  try {
    payload = payload || {};
    var token = payload.accessToken || payload.sessionToken || '';
    var uid = getGraphPositionUserId_(token);
    if (!uid) return { ok:false, error:'Não autenticado.' };

    var scope = normalizeGraphPositionScope_(payload.graphScope || payload.graph_scope || payload.scope);
    var scopeId = String(payload.scopeId || payload.scope_id || '').trim();
    if (scope === 'learning_path' && !scopeId) return { ok:false, error:'scopeId da trilha é obrigatório.' };

    var list = payload.positions || [];
    if (!Array.isArray(list)) list = [];
    if (list.length > 1000) list = list.slice(0, 1000);

    var rows = list.map(function(p){ return graphPositionRowFromPayload_(p, uid, scope, scopeId); }).filter(Boolean);
    if (!rows.length) return { ok:true, saved:0 };

    var url = _cleanSupabaseUrl_(CONFIG.SUPABASE_URL) +
      '/rest/v1/graph_node_positions?on_conflict=user_id,graph_scope,scope_id_key,node_type,node_id';

    var res = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      headers: Object.assign(_supabaseHeaders_(token), {
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      payload: JSON.stringify(rows),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    if (code < 200 || code >= 300) {
      Logger.log('[saveGraphNodePositions] ' + code + ': ' + res.getContentText());
      return { ok:false, error:res.getContentText() || ('HTTP ' + code) };
    }

    return { ok:true, saved:rows.length };
  } catch (err) {
    Logger.log('[saveGraphNodePositions] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function saveGraphNodePosition(payload) {
  payload = payload || {};
  var p = payload.position || {
    nodeType: payload.nodeType || payload.node_type,
    nodeId: payload.nodeId || payload.node_id,
    x: payload.x,
    y: payload.y
  };
  payload.positions = [p];
  return saveGraphNodePositions(payload);
}

function clearGraphNodePositions(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var uid = getGraphPositionUserId_(token);
    if (!uid) return { ok:false, error:'Não autenticado.' };

    var scope = normalizeGraphPositionScope_(params.graphScope || params.graph_scope || params.scope);
    var scopeId = String(params.scopeId || params.scope_id || '').trim();
    var filter = 'user_id=eq.' + encodeURIComponent(uid) +
      '&graph_scope=eq.' + encodeURIComponent(scope) +
      (scope === 'learning_path'
        ? '&scope_id=eq.' + encodeURIComponent(scopeId)
        : '&scope_id=is.null');

    var res = supabaseDelete_('graph_node_positions', filter, token);
    if (res && res.error) return { ok:false, error:res.error };
    return { ok:true };
  } catch (err) {
    Logger.log('[clearGraphNodePositions] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}
