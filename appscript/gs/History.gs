// ============================================================
// History.gs — Histórico de atividades e auditoria
// ============================================================

/**
 * Retorna histórico com filtros avançados
 */
function getHistoryFull(opts) {
  opts = opts || {};
  const profile = getMyProfile(opts.accessToken || opts.token);
  if (!profile) return { ok: false, error: 'Não autenticado' };

  const limit  = parseInt(opts.limit  || 50);
  const offset = parseInt(opts.offset || 0);

  let q = 'select=id,action,before_value,after_value,created_at,' +
          'study_files(id,original_name,final_name,suggested_name),' +
          'profiles(display_name)' +
          '&order=created_at.desc' +
          '&limit=' + limit + '&offset=' + offset;

  if (opts.action)     q += '&action=eq.'   + opts.action;
  if (opts.fileId)     q += '&file_id=eq.'  + opts.fileId;
  if (opts.dateFrom)   q += '&created_at=gte.' + opts.dateFrom;
  if (opts.dateTo)     q += '&created_at=lte.' + opts.dateTo;

  // Viewer só vê seus próprios arquivos
  if (profile.role === 'viewer') {
    // Filtra via join implícito — apenas arquivos do próprio usuário
    q += '&study_files.owner_id=eq.' + profile.id;
  }

  const rows = supabaseQuery_('file_history', q, opts.accessToken || opts.token);

  // Estatísticas agregadas
  const stats = _computeHistoryStats_(rows || []);

  return { ok: true, history: rows || [], stats, limit, offset };
}

/**
 * Resumo de atividades dos últimos N dias
 */
function getActivitySummary(days, accessToken) {
  const profile = getMyProfile(accessToken);
  if (!profile) return { ok: false };
  days = parseInt(days || 30);

  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString();

  const rows = supabaseQuery_(
    'file_history',
    'select=action,created_at&created_at=gte.' + fromStr + '&order=created_at.asc'
  , accessToken) || [];

  // Agrupa por dia
  const byDay = {};
  rows.forEach(r => {
    const day = r.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  // Agrupa por action
  const byAction = {};
  rows.forEach(r => { byAction[r.action] = (byAction[r.action] || 0) + 1; });

  return { ok: true, byDay, byAction, total: rows.length, days };
}

/**
 * Exporta histórico de um arquivo como array estruturado
 */
function exportFileHistory(fileId) {
  const profile = getMyProfile();
  if (!profile) return { ok: false };

  const rows = supabaseQuery_(
    'file_history',
    'select=*,profiles(display_name)&file_id=eq.' + fileId + '&order=created_at.asc'
  ) || [];

  return {
    ok: true,
    history: rows.map(r => ({
      date:    r.created_at,
      action:  r.action,
      user:    r.profiles ? r.profiles.display_name : '—',
      before:  r.before_value,
      after:   r.after_value,
    })),
  };
}

/** Limpa histórico antigo (admin only, >90 dias) */
function purgeOldHistory() {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  supabaseDelete_('file_history', 'created_at=lt.' + cutoff.toISOString());
  return { ok: true };
}

/** Helper: estatísticas do array de history */
function _computeHistoryStats_(rows) {
  const counts = {};
  rows.forEach(r => { counts[r.action] = (counts[r.action] || 0) + 1; });
  return { byAction: counts, total: rows.length };
}

function getRecentActivity(limit, accessToken) {
  return getHistoryFull({ limit: limit || 10, offset: 0, accessToken: accessToken || '' });
}
