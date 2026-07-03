// ============================================================
// Users.gs — Gestão de Perfis, foto no Drive, gerência e estatísticas
// ============================================================

function userCanAdmin_(profile) {
  return !!(profile && String(profile.role || '').toLowerCase() === 'admin' && String(profile.status || 'active') !== 'inactive');
}

function listUsers(accessToken, query) {
  return getAdminUsers({ accessToken:accessToken, search:query || '', limit:100 });
}

function getAdminUsers(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var actor = getMyProfile(token);
    if (!userCanAdmin_(actor)) return { ok:false, error:'Sem permissão. Apenas admin pode acessar a gerência.' };

    var limit = Math.min(Number(params.limit || 100), 200);
    var rows = supabaseQuery_('profiles', 'select=id,user_id,email,display_name,avatar_url,avatar_drive_file_id,role,status,created_at,updated_at,last_seen_at&order=created_at.desc&limit=' + limit, token);
    if (!rows) rows = supabaseQuery_('profiles', 'select=id,user_id,display_name,avatar_url,avatar_drive_file_id,role,created_at,updated_at&order=created_at.desc&limit=' + limit, token) || [];

    var q = String(params.search || '').trim().toLowerCase();
    if (q) rows = rows.filter(function(u){ return JSON.stringify({ email:u.email, display_name:u.display_name, role:u.role, status:u.status }).toLowerCase().indexOf(q) !== -1; });

    var users = rows.map(function(u){
      return {
        id:u.id,
        user_id:u.user_id,
        email:u.email || '',
        display_name:u.display_name || '',
        avatar_url:u.avatar_url || '',
        avatar_drive_file_id:u.avatar_drive_file_id ? String(u.avatar_drive_file_id).substring(0,6) + '…' : '',
        role:u.role || 'viewer',
        status:u.status || 'active',
        created_at:u.created_at || null,
        updated_at:u.updated_at || null,
        last_seen_at:u.last_seen_at || null
      };
    });
    return { ok:true, users:users, currentAdminId:actor.id };
  } catch (err) {
    Logger.log('[getAdminUsers] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function updateUserRole(profileId, newRole, accessToken) {
  return updateManagedUser({ profileId:profileId, role:newRole, accessToken:accessToken });
}

function updateManagedUser(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var actor = getMyProfile(token);
    if (!userCanAdmin_(actor)) return { ok:false, error:'Sem permissão. Apenas admin pode alterar usuários.' };

    var profileId = params.profileId || params.id;
    if (!profileId) return { ok:false, error:'Usuário alvo é obrigatório.' };
    var targetRows = supabaseQuery_('profiles', 'select=id,user_id,email,display_name,role,status&id=eq.' + encodeURIComponent(profileId) + '&limit=1', token);
    if (!targetRows) targetRows = supabaseQuery_('profiles', 'select=id,user_id,display_name,role&id=eq.' + encodeURIComponent(profileId) + '&limit=1', token) || [];
    var target = targetRows[0];
    if (!target) return { ok:false, error:'Usuário não encontrado.' };

    var payload = {};
    if (params.role !== undefined) {
      var newRole = String(params.role || '').toLowerCase();
      if (['admin','editor','viewer'].indexOf(newRole) === -1) return { ok:false, error:'Role inválida.' };
      if (target.role === 'admin' && newRole !== 'admin') {
        var guard = canRemoveAdmin_(target.id, token);
        if (!guard.ok) return guard;
      }
      payload.role = newRole;
    }
    if (params.status !== undefined) {
      var newStatus = String(params.status || '').toLowerCase();
      if (['active','inactive','disabled','suspended'].indexOf(newStatus) === -1) return { ok:false, error:'Status inválido.' };
      if (newStatus === 'disabled') newStatus = 'inactive';
      if (target.role === 'admin' && newStatus !== 'active') {
        var guard2 = canRemoveAdmin_(target.id, token);
        if (!guard2.ok) return guard2;
      }
      payload.status = newStatus;
    }
    if (Object.keys(payload).length === 0) return { ok:false, error:'Nada para atualizar.' };
    payload.updated_at = new Date().toISOString();

    var res = supabaseUpdate_('profiles', 'id=eq.' + encodeURIComponent(profileId), payload, token);
    if (res && res.error) return { ok:false, error:res.error };
    writeAuditLog_(actor, 'admin_user_updated', 'profile', profileId, { before:{ role:target.role, status:target.status || 'active' }, after:payload }, token);
    return { ok:true, profile:Array.isArray(res) ? res[0] : res };
  } catch (err) {
    Logger.log('[updateManagedUser] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function canRemoveAdmin_(targetProfileId, accessToken) {
  var admins = supabaseQuery_('profiles', 'select=id,role,status&role=eq.admin', accessToken) || [];
  var activeAdmins = admins.filter(function(a){ return String(a.status || 'active') === 'active'; });
  if (activeAdmins.length <= 1 && activeAdmins[0] && activeAdmins[0].id === targetProfileId) {
    return { ok:false, error:'Não é permitido remover/desativar o último admin ativo.' };
  }
  return { ok:true };
}

function getAdminUserDetail(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var actor = getMyProfile(token);
    if (!userCanAdmin_(actor)) return { ok:false, error:'Sem permissão.' };
    var profileId = params.profileId || params.id;
    if (!profileId) return { ok:false, error:'Usuário alvo é obrigatório.' };

    var profileRows = supabaseQuery_('profiles', 'select=id,user_id,email,display_name,role,status,created_at,last_seen_at&id=eq.' + encodeURIComponent(profileId) + '&limit=1', token);
    if (!profileRows) profileRows = supabaseQuery_('profiles', 'select=id,user_id,display_name,role,created_at&id=eq.' + encodeURIComponent(profileId) + '&limit=1', token) || [];
    var profile = profileRows[0] || null;
    if (!profile) return { ok:false, error:'Usuário não encontrado.' };

    var files = supabaseQuery_('study_files', 'select=id,final_name,suggested_name,original_name,file_type,status,created_at&owner_id=eq.' + encodeURIComponent(profileId) + '&order=created_at.desc&limit=12', token) || [];
    var paths = supabaseQuery_('learning_paths', 'select=id,title,visibility,created_at&created_by=eq.' + encodeURIComponent(profileId) + '&order=created_at.desc&limit=12', token) || [];
    var history = supabaseQuery_('file_history', 'select=action,created_at,file_id&created_by=eq.' + encodeURIComponent(profileId) + '&order=created_at.desc&limit=12', token) || [];
    var audits = supabaseQuery_('audit_logs', 'select=action,target_type,target_id,created_at,metadata&actor_user_id=eq.' + encodeURIComponent(profileId) + '&order=created_at.desc&limit=12', token) || [];

    return { ok:true, profile:{ id:profile.id, user_id:profile.user_id, email:profile.email || '', display_name:profile.display_name || '', role:profile.role || 'viewer', status:profile.status || 'active', created_at:profile.created_at, last_seen_at:profile.last_seen_at || null }, files:files, paths:paths, history:history, audits:audits };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function touchLastSeen(accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!profile) return { ok:false };
    supabaseUpdate_('profiles', 'id=eq.' + encodeURIComponent(profile.id), { last_seen_at:new Date().toISOString() }, accessToken);
    return { ok:true };
  } catch (e) { return { ok:false }; }
}

function updateMyProfile(data) {
  data = data || {};
  var token = data.accessToken || data.sessionToken || '';
  var profile = getMyProfile(token);
  if (!profile) return { ok:false, error:'Não autenticado' };
  var payload = {};
  if (data.display_name !== undefined) payload.display_name = String(data.display_name || '').trim();
  if (data.bio !== undefined) payload.bio = String(data.bio || '').trim().substring(0, 240);
  // Foto de perfil só deve ser alterada por upload no Google Drive. Não aceitar avatar_url manual vindo do frontend.
  if (Object.keys(payload).length === 0) return { ok:false, error:'Nada para atualizar.' };
  payload.updated_at = new Date().toISOString();
  var res = supabaseUpdate_('profiles', 'id=eq.' + encodeURIComponent(profile.id), payload, token);
  if (res.error) return { ok:false, error:res.error };
  return { ok:true, profile:Array.isArray(res) ? res[0] : res };
}

function uploadProfilePhoto(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    if (!params.base64) return { ok:false, error:'Imagem vazia.' };
    var mime = String(params.mimeType || '').toLowerCase();
    var okMime = { 'image/jpeg':1, 'image/png':1, 'image/webp':1 };
    if (!okMime[mime]) return { ok:false, error:'Foto inválida. Envie JPG, PNG ou WEBP.' };
    var size = Number(params.size || 0);
    if (size > 5 * 1024 * 1024) return { ok:false, error:'Foto muito grande. Máximo: 5 MB.' };

    var drive = uploadProfilePhotoToDrive_(params.base64, params.fileName || 'foto_perfil', mime);
    if (!drive.ok) return { ok:false, error:'Erro ao salvar foto no Drive: ' + drive.error };
    var avatarUrl = drive.thumbnailUrl || drive.downloadUrl || drive.webUrl;
    var res = supabaseUpdate_('profiles', 'id=eq.' + encodeURIComponent(profile.id), {
      avatar_url: avatarUrl,
      avatar_drive_file_id: drive.fileId,
      avatar_drive_folder_id: drive.folderId,
      updated_at: new Date().toISOString()
    }, token);
    if (res.error) return { ok:false, error:res.error };
    var updated = Array.isArray(res) ? res[0] : res;
    return { ok:true, profile:updated, avatarUrl:avatarUrl, driveFileIdMasked:(typeof _maskDriveId_==='function'?_maskDriveId_(drive.fileId):'') };
  } catch (err) {
    Logger.log('[uploadProfilePhoto] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function getMyStats(accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok:false, error:'Não autenticado' };
  var files = supabaseQuery_('study_files', 'select=id,status,file_type,final_name,suggested_name,original_name,created_at&owner_id=eq.' + encodeURIComponent(profile.id) + '&order=created_at.desc&limit=8', accessToken) || [];
  var allFiles = supabaseQuery_('study_files', 'select=id,status,file_type&owner_id=eq.' + encodeURIComponent(profile.id), accessToken) || [];
  var progress = supabaseQuery_('user_file_progress', 'select=status,file_id,study_files(id,final_name,suggested_name,original_name,file_type)&user_id=eq.' + encodeURIComponent(profile.id) + '&order=last_opened_at.desc&limit=8', accessToken) || [];
  var paths = supabaseQuery_('learning_paths', 'select=id,title,visibility,created_at&created_by=eq.' + encodeURIComponent(profile.id) + '&order=created_at.desc&limit=8', accessToken) || [];
  var history = supabaseQuery_('file_history', 'select=action,created_at,study_files(id,final_name,suggested_name,original_name)&created_by=eq.' + encodeURIComponent(profile.id) + '&order=created_at.desc&limit=8', accessToken) || [];

  var byType = {}, byStatus = {};
  allFiles.forEach(function(f){ byType[f.file_type] = (byType[f.file_type] || 0) + 1; byStatus[f.status] = (byStatus[f.status] || 0) + 1; });
  var progStats = { not_started:0, reading:0, completed:0, review_later:0 };
  progress.forEach(function(p){ progStats[p.status] = (progStats[p.status] || 0) + 1; });

  return {
    ok:true,
    profile:profile,
    files:{ total:allFiles.length, byType:byType, byStatus:byStatus, recent:files },
    paths:paths,
    progress:progStats,
    recentProgress:progress,
    history:history,
    actions:history.length
  };
}

// ============================================================
// refreshSupabaseSession — Renovar access token via refresh token
// Chamado pelo AuthSessionManager quando o token expira
// ============================================================
function refreshSupabaseSession(refreshToken) {
  try {
    if (!refreshToken) return { ok:false, error:'Refresh token ausente.' };
    var supaUrl = CONFIG.SUPABASE_URL;
    var anonKey = CONFIG.SUPABASE_ANON_KEY;
    if (!supaUrl || !anonKey) return { ok:false, error:'Supabase não configurado.' };

    var res = UrlFetchApp.fetch(supaUrl + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      },
      payload: JSON.stringify({ refresh_token: refreshToken }),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    var body;
    try { body = JSON.parse(res.getContentText()); } catch(_) { body = {}; }

    if (code !== 200 || !body.access_token) {
      Logger.log('[refreshSupabaseSession] Falha: ' + code);
      return { ok:false, error:'Não foi possível renovar a sessão. Faça login novamente.' };
    }

    // Buscar profile com novo token
    var newToken = body.access_token;
    var profile  = null;
    try { profile = getMyProfile(newToken); } catch(_) {}

    return {
      ok:           true,
      accessToken:  newToken,
      refreshToken: body.refresh_token || refreshToken,
      expiresAt:    body.expires_at    || 0,
      user:  body.user   || {},
      profile: profile   || {}
    };
  } catch (err) {
    Logger.log('[refreshSupabaseSession] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err) };
  }
}
