// ============================================================
// Cache.gs — Cache opcional com Upstash Redis REST
// Secrets ficam apenas em PropertiesService. Nada é exposto ao frontend.
// ============================================================

function isUpstashConfigured() { return !!(CONFIG.UPSTASH_REDIS_REST_URL && CONFIG.UPSTASH_REDIS_REST_TOKEN); }
function isServerCacheConfigured_() { return isUpstashConfigured(); }

function _upstashFetch_(command) {
  if (!isUpstashConfigured()) return { ok:false, configured:false, error:'Cache Upstash não configurado' };
  try {
    var url = String(CONFIG.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
    var res = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + CONFIG.UPSTASH_REDIS_REST_TOKEN },
      payload: JSON.stringify(command || []),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var text = res.getContentText() || '';
    var data = text ? JSON.parse(text) : {};
    if (code < 200 || code >= 300) return { ok:false, configured:true, status:code, error:'Upstash HTTP ' + code };
    return { ok:true, configured:true, status:code, result:data.result };
  } catch (err) {
    Logger.log('[Upstash] ' + (err && err.stack || err));
    return { ok:false, configured:true, error: err && err.message || String(err) };
  }
}

function cacheGet(key) {
  if (!key) return null;
  var r = _upstashFetch_(['GET', key]);
  if (!r.ok || r.result == null) return null;
  try { return JSON.parse(r.result); } catch(e) { return r.result; }
}
function cacheGet_(key) { return cacheGet(key); }

function cacheSet(key, value, ttlSeconds) {
  if (!key) return { ok:false, error:'Chave ausente' };
  var payload = JSON.stringify(value == null ? null : value);
  var cmd = ttlSeconds ? ['SET', key, payload, 'EX', String(ttlSeconds)] : ['SET', key, payload];
  return _upstashFetch_(cmd);
}
function cacheSet_(key, value, ttlSeconds) { return cacheSet(key, value, ttlSeconds); }

function cacheDelete(key) {
  if (!key) return { ok:false, error:'Chave ausente' };
  return _upstashFetch_(['DEL', key]);
}
function cacheDel_(key) { return cacheDelete(key); }

function cacheDeleteMany_(keys) {
  (keys || []).forEach(function(k){ try { cacheDelete(k); } catch(_) {} });
}

function _maskUrl_(url) {
  url = String(url || '').trim();
  if (!url) return '';
  return url.replace(/^https:\/\/([^./]+)(.*)$/i, function(_, sub, rest) {
    return 'https://' + (sub ? sub.substring(0, 3) + '***' : '***') + rest.replace(/\/[^/]*$/, '/***');
  });
}

function getCacheConfigStatus_() {
  return {
    configured: isUpstashConfigured(),
    urlMasked: _maskUrl_(CONFIG.UPSTASH_REDIS_REST_URL),
    tokenConfigured: !!CONFIG.UPSTASH_REDIS_REST_TOKEN
  };
}

function debugCache() { return testarCacheUpstash(); }
function testarCacheUpstash() {
  if (!isUpstashConfigured()) return { ok:false, configured:false, message:'UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN não configurados.' };
  var key = 'repo_estudos:test:' + new Date().getTime();
  var set = cacheSet(key, { ok:true, at:new Date().toISOString() }, 60);
  var get = cacheGet(key);
  cacheDelete(key);
  return {
    ok: !!(set && set.ok && get && get.ok),
    configured:true,
    urlMasked: _maskUrl_(CONFIG.UPSTASH_REDIS_REST_URL),
    tokenConfigured: true,
    setOk: !!(set && set.ok),
    getOk: !!(get && get.ok),
    at: new Date().toISOString()
  };
}

function getSystemDiagnostics(accessToken) {
  var profile = null;
  try { profile = getMyProfile(accessToken); } catch(e) { profile = null; }

  var drive = null;
  try {
    var d = debugDriveStructure();
    drive = {
      ok: !!(d && d.ok),
      rootFound: !!(d && d.root),
      createdCount: d && d.created ? d.created.length : 0,
      existingCount: d && d.existing ? d.existing.length : 0,
      errorsCount: d && d.errors ? d.errors.length : 0
    };
  } catch(e2) {
    drive = { ok:false, error:e2 && e2.message || String(e2) };
  }

  return {
    ok: true,
    app: CONFIG.APP_NAME,
    time: new Date().toISOString(),
    profile: profile ? { display_name: profile.display_name || '', role: profile.role || 'viewer' } : null,
    config: {
      supabaseUrlMasked: maskUrlForClient_(CONFIG.SUPABASE_URL),
      supabaseUrlConfigured: !!CONFIG.SUPABASE_URL,
      anonKeyConfigured: !!CONFIG.SUPABASE_ANON_KEY,
      serviceKeyConfigured: !!CONFIG.SUPABASE_KEY,
      driveFolderConfigured: !!CONFIG.DRIVE_FOLDER_ID,
      driveFolderIdMasked: (typeof _maskDriveId_ === 'function') ? _maskDriveId_(CONFIG.DRIVE_FOLDER_ID) : '',
      appUrlConfigured: !!getWebAppUrl_()
    },
    cache: getCacheConfigStatus_(),
    drive: drive
  };
}

function maskUrlForClient_(url) {
  url = String(url || '').trim();
  if (!url) return '';
  return url.replace(/^https:\/\/([^./]+)\./i, function(_, sub){ return 'https://' + sub.substring(0, 3) + '***.'; });
}

function saveServerCacheConfig(params) {
  params = params || {};
  var profile = getMyProfile(params.accessToken || params.sessionToken || '');
  if (!profile) return { ok:false, error:'Não autenticado. Faça login novamente.' };
  if (profile.role !== 'admin') return { ok:false, error:'Apenas admin pode alterar as Propriedades do Script pelo app.' };

  var url = String(params.url || '').trim().replace(/\/+$/, '');
  var token = String(params.token || '').trim();
  if (!url || !/^https:\/\//i.test(url)) return { ok:false, error:'URL do Upstash inválida. Use https://...' };
  if (url.indexOf('upstash.io') === -1) return { ok:false, error:'A URL não parece ser do Upstash Redis REST.' };
  if (!token || token.length < 20) return { ok:false, error:'Token Upstash ausente ou muito curto.' };

  var props = PropertiesService.getScriptProperties();
  props.setProperty('UPSTASH_REDIS_REST_URL', url);
  props.setProperty('UPSTASH_REDIS_REST_TOKEN', token);
  CONFIG.UPSTASH_REDIS_REST_URL = url;
  CONFIG.UPSTASH_REDIS_REST_TOKEN = token;

  var test = testarCacheUpstash();
  return { ok:true, message:'Cache salvo.', cache:getCacheConfigStatus_(), testOk: !!(test && test.ok) };
}
