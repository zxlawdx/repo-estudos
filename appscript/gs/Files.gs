// ============================================================
// Files.gs — CRUD de materiais de estudo
// ============================================================

var ALLOWED_UPLOAD_MIME = {
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-powerpoint': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
  'application/epub+zip': true,
  'image/jpeg': true,
  'image/png': true,
  'image/webp': true
};
var MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function _ext_(fileName) {
  var m = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function _validateUpload_(fileName, mimeType, sizeBytes) {
  var ext = _ext_(fileName);
  var allowedExt = { pdf:1, doc:1, docx:1, epub:1, ppt:1, pptx:1, jpg:1, jpeg:1, png:1, webp:1 };
  var mimeOk = !!ALLOWED_UPLOAD_MIME[String(mimeType || '').toLowerCase()];
  var extOk = !!allowedExt[ext];
  var size = Number(sizeBytes || 0);
  if (!fileName) return 'Nome do arquivo ausente.';
  if (!mimeOk && !extOk) return 'Tipo de arquivo não permitido. Envie PDF, DOC/DOCX, EPUB, PPT/PPTX, JPG, PNG ou WEBP.';
  if (size && size > MAX_UPLOAD_BYTES) return 'Arquivo muito grande. Máximo permitido: 50 MB.';
  return '';
}

function invalidateFilesCache_(profileId) {
  cacheDeleteMany_([
    'repo_estudos:library:public:v1',
    'repo_estudos:dashboard:' + (profileId || 'anon') + ':v1',
    'repo_estudos:paths:list:v1'
  ]);
}

function uploadFile(params) {
  var t0 = new Date().getTime();
  try {
    params = params || {};
    var accessToken = params.accessToken || params.sessionToken || null;
    if (!accessToken) return { ok: false, error: 'Sessão expirada: faça login novamente. Token ausente no upload.' };

    var profile = getMyProfile(accessToken);
    if (!profile) return { ok: false, error: 'Não autenticado no Supabase. Faça logout e entre novamente.' };
    if (!params.base64) return { ok: false, error: 'Arquivo vazio: base64 não chegou ao Apps Script.' };
    if (!CONFIG.DRIVE_FOLDER_ID) return { ok: false, error: 'DRIVE_FOLDER_ID não configurado nas Propriedades do Script.' };

    var validation = _validateUpload_(params.fileName, params.mimeType, params.size);
    if (validation) return { ok:false, error: validation };

    var suggestion = normalizeName(params.finalName || params.fileName);
    var classif = classifyFile(params.fileName, params.mimeType);
    var fileType = params.fileType || classif.fileType || 'other';
    var folderInfo = getDriveFolderForMaterial_(fileType, params.mimeType, params.fileName);

    Logger.log('[uploadFile] start file=' + params.fileName + ' type=' + fileType + ' folder=' + folderInfo.folderPath);
    var drive = uploadToDrive(params.base64, params.fileName, params.mimeType, folderInfo.folderPath, (params.visibility || 'private') === 'public');
    if (!drive.ok) return { ok: false, error: 'Erro no Drive: ' + drive.error };

    var title = String(params.finalName || params.title || suggestion.name || params.fileName || '').trim();
    var fileRecord = {
      owner_id: profile.id,
      google_drive_file_id: drive.fileId,
      google_drive_folder_id: drive.folderId,
      google_drive_web_url: drive.webUrl,
      google_drive_preview_url: drive.previewUrl,
      google_drive_download_url: drive.downloadUrl,
      original_name: params.fileName,
      suggested_name: suggestion.name,
      final_name: title || suggestion.name || params.fileName,
      file_type: fileType,
      category_id: params.categoryId || classif.categoryId || null,
      subject_id: params.subjectId || null,
      cycle_id: params.cycleId || null,
      author: params.author || null,
      year: params.year ? parseInt(params.year, 10) : null,
      mime_type: params.mimeType || 'application/octet-stream',
      file_size: drive.size || params.size || 0,
      status: params.status || 'pending',
      visibility: params.visibility || 'private'
    };

    var inserted = supabaseInsert_('study_files', fileRecord, true, accessToken);
    if (inserted.error) return { ok: false, error: inserted.error };
    var file = Array.isArray(inserted) ? inserted[0] : inserted;
    var fileId = file && file.id;

    if (suggestion.name && suggestion.name !== params.fileName) {
      supabaseInsert_('rename_suggestions', {
        file_id: fileId,
        original_name: params.fileName,
        suggested_name: suggestion.name,
        reason: suggestion.reason,
        confidence: suggestion.confidence,
        status: 'pending'
      }, false, accessToken);
    }

    _logHistory_(fileId, profile.id, 'file_uploaded', null, {
      original_name: params.fileName,
      drive_id: drive.fileId,
      folder_path: drive.folderPath || folderInfo.folderPath,
      note: params.note || null
    }, accessToken);

    invalidateFilesCache_(profile.id);
    Logger.log('[uploadFile] done ms=' + (new Date().getTime() - t0));
    return { ok: true, fileId: fileId, file: file, suggestion: suggestion, classif: classif, driveFolder: drive.folderPath || folderInfo.folderPath };
  } catch (err) {
    Logger.log('[uploadFile] ' + (err && err.stack || err));
    return { ok: false, error: err && err.message || String(err), stack: simplifyStack_(err && err.stack || err) };
  }
}

function getFiles(filters) {
  filters = filters || {};
  var accessToken = filters.accessToken || filters.sessionToken || '';
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok: false, error: 'Não autenticado' };

  var page  = Math.max(1, parseInt(filters.page || 1, 10));
  var limit = Math.min(50, Math.max(1, parseInt(filters.limit || 12, 10)));
  var from  = (page - 1) * limit;
  var queryLimit = limit + 1; // busca um item a mais para saber se existe próxima página

  var q = 'select=id,owner_id,original_name,suggested_name,final_name,file_type,status,visibility,' +
          'author,year,file_size,mime_type,google_drive_preview_url,google_drive_web_url,created_at,' +
          'source_type,external_url,external_provider,youtube_video_id,youtube_playlist_id,embed_url,thumbnail_url,duration_seconds,channel_title,' +
          'category_id,subject_id,cycle_id,categories(name),subjects(name)' +
          '&order=created_at.desc' +
          '&offset=' + from + '&limit=' + queryLimit;

  if (profile.role === 'viewer') q += '&or=(owner_id.eq.' + profile.id + ',and(visibility.eq.public,status.eq.approved))';
  else if (filters.onlyMine) q += '&owner_id=eq.' + profile.id;

  if (filters.fileType)   q += '&file_type=eq.'   + encodeURIComponent(filters.fileType);
  if (filters.categoryId) q += '&category_id=eq.' + encodeURIComponent(filters.categoryId);
  if (filters.subjectId)  q += '&subject_id=eq.'  + encodeURIComponent(filters.subjectId);
  if (filters.status)     q += '&status=eq.'      + encodeURIComponent(filters.status);
  if (filters.visibility) q += '&visibility=eq.'  + encodeURIComponent(filters.visibility);

  if (filters.search) {
    var s = encodeURIComponent('%' + filters.search + '%');
    q += '&or=(original_name.ilike.' + s + ',suggested_name.ilike.' + s + ',final_name.ilike.' + s + ',author.ilike.' + s + ',external_url.ilike.' + s + ',channel_title.ilike.' + s + ')';
  }

  var rows = supabaseQuery_('study_files', q, accessToken) || [];
  var hasNext = rows.length > limit;
  if (hasNext) rows = rows.slice(0, limit);
  return { ok: true, files: rows, page: page, limit: limit, hasNext: hasNext, hasPrev: page > 1 };
}

function getFileDetail(fileId, accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!profile) return { ok: false, error: 'Não autenticado' };
    if (!fileId) return { ok:false, error:'ID do material ausente.' };

    var rows = supabaseQuery_('study_files',
      'select=*,categories(name,color),subjects(name),cycles(name)' +
      '&id=eq.' + encodeURIComponent(fileId) + '&limit=1', accessToken);

    if (!rows || rows.length === 0) return { ok: false, error: 'Arquivo não encontrado' };
    var file = rows[0];

    if (file.owner_id !== profile.id && file.visibility !== 'public' && profile.role === 'viewer') {
      return { ok: false, error: 'Sem permissão para ver este material.' };
    }

    var tags = supabaseQuery_('file_tags', 'select=tags(id,name)&file_id=eq.' + encodeURIComponent(fileId), accessToken);
    var history = supabaseQuery_('file_history',
      'select=*,profiles(display_name)&file_id=eq.' + encodeURIComponent(fileId) + '&order=created_at.desc&limit=20', accessToken);
    var suggestions = supabaseQuery_('rename_suggestions',
      'select=*&file_id=eq.' + encodeURIComponent(fileId) + '&order=created_at.desc', accessToken);
    var progress = supabaseQuery_('user_file_progress',
      'select=*&user_id=eq.' + encodeURIComponent(profile.id) + '&file_id=eq.' + encodeURIComponent(fileId) + '&limit=1', accessToken);
    var pathLinks = getMaterialPathLinks(fileId, accessToken);

    return {
      ok: true,
      file: file,
      tags: (tags || []).map(function(t){ return t.tags; }).filter(Boolean),
      history: history || [],
      suggestions: suggestions || [],
      progress: progress && progress[0] ? progress[0] : null,
      pathLinks: pathLinks && pathLinks.ok ? pathLinks.paths : [],
      canManage: ['admin','editor'].indexOf(profile.role) !== -1 || file.owner_id === profile.id,
      canApprove: ['admin','editor'].indexOf(profile.role) !== -1
    };
  } catch (err) {
    Logger.log('[getFileDetail] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err), stack: simplifyStack_(err && err.stack || err) };
  }
}

function updateFile(fileId, updates) {
  try {
    updates = updates || {};
    var token = updates.accessToken || updates.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok: false, error: 'Não autenticado' };
    if (!fileId) return { ok:false, error:'ID do material ausente.' };

    var existing = supabaseQuery_('study_files', 'select=id,owner_id,google_drive_file_id,visibility&id=eq.' + encodeURIComponent(fileId) + '&limit=1', token);
    if (!existing || !existing[0]) return { ok:false, error:'Material não encontrado.' };
    if (existing[0].owner_id !== profile.id && ['admin','editor'].indexOf(profile.role) === -1) return { ok:false, error:'Sem permissão para editar este material.' };

    var allowedFields = ['suggested_name','final_name','file_type','category_id','subject_id','cycle_id','author','year','visibility','status'];
    var payload = {};
    allowedFields.forEach(function(f){ if (updates[f] !== undefined) payload[f] = updates[f] === '' ? null : updates[f]; });
    if (payload.year !== undefined && payload.year !== null) payload.year = parseInt(payload.year, 10) || null;
    if (Object.keys(payload).length === 0) return { ok: false, error: 'Nada para atualizar' };

    var res = supabaseUpdate_('study_files', 'id=eq.' + encodeURIComponent(fileId), payload, token);
    if (res.error) return { ok: false, error: res.error };

    if (payload.visibility !== undefined && existing[0].google_drive_file_id) {
      setDriveVisibility(existing[0].google_drive_file_id, payload.visibility === 'public');
    }
    _logHistory_(fileId, profile.id, 'category_changed', null, payload, token);
    invalidateFilesCache_(profile.id);
    return { ok: true, file: Array.isArray(res) ? res[0] : res };
  } catch (err) {
    Logger.log('[updateFile] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err), stack: simplifyStack_(err && err.stack || err) };
  }
}

function approveSuggestion(suggestionId, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok: false, error: 'Não autenticado' };
  if (['admin','editor'].indexOf(profile.role) === -1) return { ok: false, error: 'Sem permissão' };
  var sugs = supabaseQuery_('rename_suggestions', 'select=*&id=eq.' + encodeURIComponent(suggestionId), accessToken);
  if (!sugs || !sugs[0]) return { ok: false, error: 'Sugestão não encontrada' };
  var sug = sugs[0];
  supabaseUpdate_('rename_suggestions', 'id=eq.' + encodeURIComponent(suggestionId), { status:'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }, accessToken);
  supabaseUpdate_('study_files', 'id=eq.' + encodeURIComponent(sug.file_id), { final_name: sug.suggested_name, status:'approved' }, accessToken);
  var files = supabaseQuery_('study_files', 'select=google_drive_file_id&id=eq.' + encodeURIComponent(sug.file_id), accessToken);
  if (files && files[0] && files[0].google_drive_file_id) renameInDrive(files[0].google_drive_file_id, sug.suggested_name);
  _logHistory_(sug.file_id, profile.id, 'file_renamed', { name: sug.original_name }, { name: sug.suggested_name }, accessToken);
  _logHistory_(sug.file_id, profile.id, 'file_approved', null, { reviewed_by: profile.id }, accessToken);
  invalidateFilesCache_(profile.id);
  return { ok: true };
}

function rejectSuggestion(suggestionId, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok: false, error: 'Não autenticado' };
  if (['admin','editor'].indexOf(profile.role) === -1) return { ok: false, error: 'Sem permissão' };
  var res = supabaseUpdate_('rename_suggestions', 'id=eq.' + encodeURIComponent(suggestionId), { status:'rejected', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }, accessToken);
  if (res.error) return { ok:false, error:res.error };
  return { ok: true };
}

function getPendingSuggestions(accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok: false, error: 'Não autenticado' };
  var q = profile.role === 'admin' || profile.role === 'editor'
    ? 'select=*,study_files(original_name,owner_id)&status=eq.pending&order=created_at.desc'
    : 'select=*,study_files(original_name,owner_id)&status=eq.pending&study_files.owner_id=eq.' + encodeURIComponent(profile.id) + '&order=created_at.desc';
  var rows = supabaseQuery_('rename_suggestions', q, accessToken);
  return { ok: true, suggestions: rows || [] };
}

function setFileTags(fileId, tagNames, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok: false, error: 'Não autenticado' };
  supabaseDelete_('file_tags', 'file_id=eq.' + encodeURIComponent(fileId), accessToken);
  (tagNames || []).forEach(function(name) {
    name = String(name || '').trim();
    if (!name) return;
    var tag = (supabaseQuery_('tags', 'select=id&name=eq.' + encodeURIComponent(name), accessToken) || [])[0];
    if (!tag) {
      var ins = supabaseInsert_('tags', { name: name }, true, accessToken);
      tag = Array.isArray(ins) ? ins[0] : ins;
    }
    if (tag && tag.id) supabaseInsert_('file_tags', { file_id: fileId, tag_id: tag.id }, false, accessToken);
  });
  return { ok: true };
}

function updateProgress(fileId, status, notes, accessToken) {
  var profile = getMyProfile(accessToken);
  if (!profile) return { ok: false, error: 'Não autenticado' };
  var existing = supabaseQuery_('user_file_progress', 'select=id&user_id=eq.' + encodeURIComponent(profile.id) + '&file_id=eq.' + encodeURIComponent(fileId), accessToken);
  status = String(status || 'not_started');
  var payload = {
    user_id: profile.id,
    file_id: fileId,
    status: status,
    notes: notes || null,
    last_opened_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (status === 'reading' || status === 'watching') payload.started_at = new Date().toISOString();
  if (status === 'completed') payload.completed_at = new Date().toISOString();
  if (existing && existing[0]) supabaseUpdate_('user_file_progress', 'id=eq.' + encodeURIComponent(existing[0].id), payload, accessToken);
  else supabaseInsert_('user_file_progress', payload, false, accessToken);
  _logHistory_(fileId, profile.id, 'progress_updated', null, { status: status }, accessToken);
  return { ok: true };
}

function _logHistory_(fileId, profileId, action, before, after, accessToken) {
  try {
    supabaseInsert_('file_history', {
      file_id: fileId || null,
      action: action,
      before_value: before || null,
      after_value: after || null,
      created_by: profileId || null
    }, false, accessToken);
  } catch (e) { Logger.log('[_logHistory_] ' + e); }
}


// ============================================================
// Revisão/Aprovação de materiais enviados
// ============================================================
function getPendingReviewMaterials(accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!profile) return { ok:false, error:'Não autenticado' };
    var canApprove = ['admin','editor'].indexOf(profile.role) !== -1;
    var q = 'select=id,owner_id,original_name,suggested_name,final_name,file_type,status,visibility,' +
            'author,year,file_size,mime_type,source_type,external_url,external_provider,thumbnail_url,channel_title,created_at,categories(name),subjects(name)' +
            '&status=eq.pending&order=created_at.desc&limit=80';
    if (!canApprove) q += '&owner_id=eq.' + encodeURIComponent(profile.id);
    var rows = supabaseQuery_('study_files', q, accessToken) || [];
    return { ok:true, materials:rows, canApprove:canApprove, role:profile.role || 'viewer' };
  } catch (err) {
    Logger.log('[getPendingReviewMaterials] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function approveMaterial(fileId, accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!profile) return { ok:false, error:'Não autenticado' };
    if (['admin','editor'].indexOf(profile.role) === -1) return { ok:false, error:'Sem permissão para aprovar materiais.' };
    if (!fileId) return { ok:false, error:'ID do material ausente.' };

    var files = supabaseQuery_('study_files', 'select=id,google_drive_file_id,visibility,status&id=eq.' + encodeURIComponent(fileId) + '&limit=1', accessToken);
    if (!files || !files[0]) return { ok:false, error:'Material não encontrado.' };

    var res = supabaseUpdate_('study_files', 'id=eq.' + encodeURIComponent(fileId), { status:'approved' }, accessToken);
    if (res.error) return { ok:false, error:res.error };
    if (files[0].google_drive_file_id) {
      try { setDriveVisibility(files[0].google_drive_file_id, files[0].visibility === 'public'); } catch(e) { Logger.log('[approveMaterial:setDriveVisibility] ' + e); }
    }
    _logHistory_(fileId, profile.id, 'file_approved', { status:files[0].status }, { status:'approved' }, accessToken);
    invalidateFilesCache_(profile.id);
    return { ok:true, file:Array.isArray(res) ? res[0] : res };
  } catch (err) {
    Logger.log('[approveMaterial] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function rejectMaterial(fileId, reason, accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!profile) return { ok:false, error:'Não autenticado' };
    if (['admin','editor'].indexOf(profile.role) === -1) return { ok:false, error:'Sem permissão para reprovar materiais.' };
    if (!fileId) return { ok:false, error:'ID do material ausente.' };

    var files = supabaseQuery_('study_files', 'select=id,status&id=eq.' + encodeURIComponent(fileId) + '&limit=1', accessToken);
    if (!files || !files[0]) return { ok:false, error:'Material não encontrado.' };

    var res = supabaseUpdate_('study_files', 'id=eq.' + encodeURIComponent(fileId), { status:'rejected' }, accessToken);
    if (res.error) return { ok:false, error:res.error };
    _logHistory_(fileId, profile.id, 'file_rejected', { status:files[0].status }, { status:'rejected', reason:reason || null }, accessToken);
    invalidateFilesCache_(profile.id);
    return { ok:true, file:Array.isArray(res) ? res[0] : res };
  } catch (err) {
    Logger.log('[rejectMaterial] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}
