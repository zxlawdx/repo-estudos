// ============================================================
// Utils.gs — Utilitários compartilhados do backend
// ============================================================

/**
 * Formata data ISO para pt-BR
 */
function fmtDateBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Utilities.formatDate(d, 'America/Manaus', 'dd/MM/yyyy');
}

/**
 * Formata tamanho de arquivo legível
 */
function fmtFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

/**
 * Remove acentos e caracteres especiais para busca
 */
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Sanitiza HTML básico para prevenção de XSS
 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Valida se string é UUID v4
 */
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str || '');
}

/**
 * Gera MIME type baseado na extensão
 */
function mimeFromExt(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const map = {
    pdf:  'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc:  'application/msword',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    epub: 'application/epub+zip',
    txt:  'text/plain',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    gif:  'image/gif',
    webp: 'image/webp',
    csv:  'text/csv',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Decodifica JSON seguro (sem lançar exceção)
 */
function safeJson(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

/**
 * Retorna configurações públicas do app (sem chaves sensíveis)
 */
function getPublicConfig() {
  return {
    appName:    CONFIG.APP_NAME,
    appVersion: '1.0.0',
    timezone:   'America/Manaus',
  };
}

/**
 * Health-check simples — chamado pelo frontend para verificar conexão
 */
function healthCheck() {
  const session = getSession_();
  return {
    ok:        true,
    logged_in: !!session,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retorna URL do webapp (usado em partials e redirects)
 */
function getAppUrl() {
  try {
    return getWebAppUrl_();
  } catch (e) {
    return '#';
  }
}
