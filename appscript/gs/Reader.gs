// ============================================================
// Reader.gs — leitor horizontal leve + progresso
// ============================================================

function getMaterialReaderData(materialId, accessToken) {
  try {
    var data = getFileDetail(materialId, accessToken);
    if (!data || !data.ok) return data || { ok:false, error:'Material não encontrado.' };
    var f = data.file || {};
    var canRead = ['document','book','article','notes','slide','summary'].indexOf(String(f.file_type || '').toLowerCase()) !== -1 || !!f.google_drive_preview_url;
    if (!canRead) return { ok:false, error:'Este material não parece ser de leitura. Abra pelo detalhe.' };
    var profile = getMyProfile(accessToken);
    if (profile) _logHistory_(materialId, profile.id, 'reader_opened', null, { file_type:f.file_type }, accessToken);
    return {
      ok:true,
      file:f,
      progress:data.progress || null,
      reader:{
        mode:'drive_embed_horizontal_shell',
        previewUrl:f.google_drive_preview_url || null,
        driveUrl:f.google_drive_web_url || null,
        downloadUrl:f.google_drive_download_url || null,
        title:f.final_name || f.suggested_name || f.original_name || 'Material'
      }
    };
  } catch (err) {
    Logger.log('[getMaterialReaderData] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function saveReadingProgress(payload, accessToken) {
  try {
    payload = payload || {};
    var token = accessToken || payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    if (!payload.materialId && !payload.fileId) return { ok:false, error:'Material obrigatório.' };
    var fileId = payload.materialId || payload.fileId;
    var existing = supabaseQuery_('user_file_progress', 'select=id&user_id=eq.' + encodeURIComponent(profile.id) + '&file_id=eq.' + encodeURIComponent(fileId) + '&limit=1', token) || [];
    var current = Math.max(1, parseInt(payload.currentPage || 1, 10));
    var total = Math.max(current, parseInt(payload.totalPages || current, 10));
    var percent = payload.progressPercent !== undefined ? Number(payload.progressPercent) : Math.min(100, Math.round((current / total) * 100));
    var status = payload.status || (percent >= 100 ? 'completed' : 'reading');
    var rec = {
      user_id: profile.id,
      file_id: fileId,
      status: status,
      current_page: current,
      total_pages: total,
      progress_percent: percent,
      notes: payload.notes || null,
      last_opened_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (status === 'completed') rec.completed_at = new Date().toISOString();
    if (existing[0]) supabaseUpdate_('user_file_progress', 'id=eq.' + encodeURIComponent(existing[0].id), rec, token);
    else supabaseInsert_('user_file_progress', rec, false, token);
    _logHistory_(fileId, profile.id, 'reading_progress_saved', null, { current_page:current, total_pages:total, progress_percent:percent, status:status }, token);
    return { ok:true, progress:rec };
  } catch (err) {
    Logger.log('[saveReadingProgress] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function saveVideoProgress(payload, accessToken) {
  try {
    payload = payload || {};
    var token = accessToken || payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var fileId = payload.materialId || payload.fileId;
    if (!fileId) return { ok:false, error:'Material obrigatório.' };
    var existing = supabaseQuery_('user_file_progress', 'select=id&user_id=eq.' + encodeURIComponent(profile.id) + '&file_id=eq.' + encodeURIComponent(fileId) + '&limit=1', token) || [];
    var status = payload.status || 'watching';
    var rec = {
      user_id: profile.id,
      file_id: fileId,
      status: status,
      last_position_seconds: Math.max(0, parseInt(payload.lastPositionSeconds || 0, 10)),
      progress_percent: payload.progressPercent !== undefined ? Number(payload.progressPercent) : null,
      notes: payload.notes || null,
      last_opened_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (status === 'completed') rec.completed_at = new Date().toISOString();
    if (existing[0]) supabaseUpdate_('user_file_progress', 'id=eq.' + encodeURIComponent(existing[0].id), rec, token);
    else supabaseInsert_('user_file_progress', rec, false, token);
    _logHistory_(fileId, profile.id, status === 'completed' ? 'video_completed' : 'video_progress_saved', null, rec, token);
    return { ok:true, progress:rec };
  } catch (err) {
    Logger.log('[saveVideoProgress] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}
