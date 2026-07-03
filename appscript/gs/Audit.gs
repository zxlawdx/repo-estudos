// ============================================================
// Audit.gs — Auditoria segura e opcional
// ============================================================

function writeAuditLog_(actorProfile, action, targetType, targetId, metadata, accessToken) {
  try {
    if (!actorProfile || !actorProfile.id || !action) return { ok:false, skipped:true };
    var payload = {
      actor_user_id: actorProfile.id,
      action: String(action).substring(0, 120),
      target_type: targetType ? String(targetType).substring(0, 80) : null,
      target_id: targetId ? String(targetId) : null,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };
    var res = supabaseInsert_('audit_logs', payload, false, accessToken);
    if (res && res.error) return { ok:false, error:res.error };
    return { ok:true };
  } catch (err) {
    Logger.log('[writeAuditLog_] auditoria ignorada: ' + (err && err.message || err));
    return { ok:false, ignored:true };
  }
}
