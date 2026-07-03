// ============================================================
// Code.gs — Entry point principal robusto
// Repositório de Estudos
// ============================================================

const CONFIG = {
  SUPABASE_URL:      PropertiesService.getScriptProperties().getProperty('SUPABASE_URL'),
  SUPABASE_KEY:      PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY'),
  SUPABASE_ANON_KEY: PropertiesService.getScriptProperties().getProperty('SUPABASE_ANON_KEY'),
  DRIVE_FOLDER_ID:   PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'),
  UPSTASH_REDIS_REST_URL:   PropertiesService.getScriptProperties().getProperty('UPSTASH_REDIS_REST_URL'),
  UPSTASH_REDIS_REST_TOKEN: PropertiesService.getScriptProperties().getProperty('UPSTASH_REDIS_REST_TOKEN'),
  YOUTUBE_API_KEY: PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY'),
  APP_NAME:          'Repositório de Estudos',
};

function getWebAppUrl_() {
  try { return ScriptApp.getService().getUrl() || ''; }
  catch (e) { Logger.log('[getWebAppUrl_] ' + e); return ''; }
}

const ROUTES = {
  login:       'views/login',
  dashboard:   'views/dashboard',
  biblioteca:  'views/biblioteca',
  upload:      'views/upload',
  'cadastrar-link': 'views/cadastrar-link',
  leitor:      'views/leitor',
  revisao:     'views/revisao',
  trilhas:     'views/trilhas',
  categorias:  'views/categorias',
  historico:   'views/historico',
  perfil:      'views/perfil',
  configuracoes:'views/configuracoes',
  detalhe:     'views/detalhe',
  'editar-material': 'views/detalhe',
  'trilha-detalhe':  'views/trilhas',
  grafo:       'views/grafo',
  relacoes:    'views/relacoes',
  resenhas:    'views/resenhas',
  'resenha-detalhe': 'views/resenhas',
  gerencia:    'views/gerencia',
  'admin-usuarios': 'views/gerencia'
};

var __TEMPLATE_CONTEXT__ = {
  page: 'login',
  session: null,
  params: {},
  config: { appName: CONFIG.APP_NAME, appUrl: getWebAppUrl_() }
};

function doGet(e) {
  var requested = 'login';
  try {
    requested = String(e && e.parameter && e.parameter.page || 'login').trim().toLowerCase();
    var session = getSession_();
    var page = ROUTES[requested] ? requested : (session ? 'dashboard' : 'login');
    if (!ROUTES[requested]) Logger.log('[doGet] Rota inexistente: ' + requested + '. Caindo seguro em ' + page + '.');
    return buildPage_(page, e && e.parameter ? e.parameter : {});
  } catch (err) {
    console.error && console.error(err);
    Logger.log('[doGet] ERRO page=' + requested + ' | ' + (err && err.stack || err));
    return renderFatalError_('Erro ao abrir página', requested, err);
  }
}

function buildPage_(page, params) {
  page = ROUTES[page] ? page : (getSession_() ? 'dashboard' : 'login');
  var data = {
    page: page,
    session: getSession_(),
    params: params || {},
    config: {
      appName: CONFIG.APP_NAME,
      supabaseConfigured: !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY),
      driveConfigured: !!CONFIG.DRIVE_FOLDER_ID,
      cacheConfigured: !!(CONFIG.UPSTASH_REDIS_REST_URL && CONFIG.UPSTASH_REDIS_REST_TOKEN),
      appUrl: getWebAppUrl_()
    }
  };

  __TEMPLATE_CONTEXT__ = data;

  try {
    var template = HtmlService.createTemplateFromFile(ROUTES[page]);
    Object.keys(data).forEach(function(k) { template[k] = data[k]; });
    var out = template.evaluate().getContent();
    if (!out || !String(out).trim()) throw new Error('A view retornou HTML vazio: ' + ROUTES[page]);
    out = ensureAppWrapper_(out);
    return HtmlService.createHtmlOutput(out)
      .setTitle(CONFIG.APP_NAME + ' — ' + page)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    console.error && console.error(err);
    Logger.log('[buildPage_] ERRO page=' + page + ' view=' + ROUTES[page] + ' | ' + (err && err.stack || err));
    return renderFatalError_('Erro ao renderizar view', page, err);
  }
}

function include(path, data) {
  try {
    var template = HtmlService.createTemplateFromFile(path);
    var base = __TEMPLATE_CONTEXT__ || {};
    var merged = {
      page:    base.page || 'login',
      session: base.session || null,
      config:  base.config || { appName: CONFIG.APP_NAME, appUrl: getWebAppUrl_() },
      params:  base.params || {}
    };
    if (data) Object.keys(data).forEach(function(key) { merged[key] = data[key]; });
    Object.keys(merged).forEach(function(key) { template[key] = merged[key]; });
    var html = template.evaluate().getContent();
    return html || '<div style="background:#fff3cd;color:#664d03;padding:12px;border-radius:12px">Include vazio: ' + escapeHtmlServer_(path) + '</div>';
  } catch (err) {
    Logger.log('[include] ERRO path=' + path + ' | ' + (err && err.stack || err));
    return '<pre style="background:#fee;color:#900;padding:16px;border-radius:12px;white-space:pre-wrap;overflow:auto">Erro ao incluir: '
      + escapeHtmlServer_(path) + '\n' + escapeHtmlServer_(err && err.message || err) + '</pre>';
  }
}

function renderFatalError_(title, view, err) {
  var msg = err && err.message ? err.message : String(err || 'Erro desconhecido');
  var stack = simplifyStack_(err && err.stack ? err.stack : msg);
  var html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Erro - Repositório de Estudos</title></head>' +
    '<body style="font-family:Inter,Arial,sans-serif;background:#f7f9fb;color:#191c1e;margin:0;padding:24px">' +
    '<main style="max-width:920px;margin:0 auto;background:white;border:1px solid #ddd;border-radius:16px;padding:24px;box-shadow:0 12px 40px rgba(0,0,0,.08)">' +
    '<div style="display:inline-flex;gap:8px;align-items:center;background:#ffdad6;color:#93000a;border-radius:999px;padding:6px 12px;font-weight:700;font-size:12px">ERRO VISÍVEL</div>' +
    '<h1 style="margin:16px 0 6px;color:#ba1a1a;font-size:24px">' + escapeHtmlServer_(title) + '</h1>' +
    '<p><b>View tentando carregar:</b> ' + escapeHtmlServer_(view || '-') + '</p>' +
    '<p><b>Mensagem:</b> ' + escapeHtmlServer_(msg) + '</p>' +
    '<h2 style="font-size:16px;margin-top:18px">Stack simplificado</h2>' +
    '<pre style="white-space:pre-wrap;background:#111;color:#fff;padding:16px;border-radius:12px;overflow:auto;max-height:340px">' + escapeHtmlServer_(stack) + '</pre>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">' +
    '<a href="?page=biblioteca" style="background:#505f76;color:white;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Voltar para biblioteca</a>' +
    '<a href="?page=dashboard" style="background:#004ac6;color:white;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Ir para dashboard</a>' +
    '<a href="?page=' + escapeHtmlServer_(view || 'dashboard') + '" style="background:#93000a;color:white;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Tentar novamente</a>' +
    '</div></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Erro - Repositório de Estudos');
}

function ensureAppWrapper_(html) {
  if (String(html).indexOf('id="app"') >= 0 || String(html).indexOf("id='app'") >= 0) return html;
  return String(html).replace(/<body([^>]*)>/i, '<body$1><div id="app">').replace(/<\/body>/i, '</div></body>');
}

function simplifyStack_(stack) { return String(stack || '').split('\n').slice(0, 12).join('\n'); }
function escapeHtmlServer_(str) { return String(str == null ? '' : str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function getSession_() {
  try { var raw = CacheService.getUserCache().get('session'); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function setSession_(session) { CacheService.getUserCache().put('session', JSON.stringify(session || {}), 21600); }
function clearSession_() { CacheService.getUserCache().remove('session'); }

function loginUser(email, password) {
  try {
    var result = supabaseAuth_('login', { email: email, password: password });
    if (result && result.error) return { ok:false, message: result.error.message || 'Falha no login', status: result.error.status || 400, raw: JSON.stringify(result.error.details || result.error) };
    // Supabase Auth retorna access_token na raiz do JSON.
    var accessToken = result && result.access_token;
    var refreshToken = result && result.refresh_token;
    var user = result && result.user;
    if (!accessToken || !user) return { ok:false, message:'Login retornou sem access_token/user. Confirme o e-mail e revise o retorno do Supabase Auth.', status:400, raw: JSON.stringify(result || {}) };
    var session = { access_token: accessToken, refresh_token: refreshToken || '', user_id: user.id, email: user.email };
    setSession_(session);
    var profile = getMyProfile(accessToken) || ensureProfileFromUser_(user, accessToken);
    try { if (profile && profile.id) supabaseUpdate_('profiles', 'id=eq.' + encodeURIComponent(profile.id), { email:user.email || null, last_seen_at:new Date().toISOString() }, accessToken); } catch (_) {}
    return { ok:true, accessToken: accessToken, refreshToken: refreshToken || '', expiresAt: result && result.expires_at || (result && result.expires_in ? Math.floor(Date.now()/1000) + Number(result.expires_in) : 0), user: user, profile: profile || null };
  } catch (err) {
    Logger.log('[loginUser] ' + (err && err.stack || err));
    return { ok:false, message: err && err.message || String(err), status:500, raw: String(err && err.stack || err) };
  }
}

function signUpUser(email, password, displayName) {
  try {
    var result = supabaseAuth_('signup', { email: email, password: password, data: { full_name: displayName || '' } });
    if (result && result.error) {
      var m = String(result.error.message || 'Erro ao cadastrar');
      if (m.toLowerCase().indexOf('already') >= 0 || m.toLowerCase().indexOf('registered') >= 0) m = 'Este e-mail já existe. Tente entrar ou recupere a senha.';
      return { ok:false, message:m, status: result.error.status || 400, raw: JSON.stringify(result.error.details || result.error) };
    }
    return { ok:true, message:'Conta criada. Confirme seu e-mail antes de entrar.', user: result && result.user || null };
  } catch (err) { return { ok:false, message: err && err.message || String(err), status:500, raw:String(err && err.stack || err) }; }
}
function logoutUser() { clearSession_(); return { ok:true }; }

function getMyProfile(accessToken) {
  var session = getSession_();
  var token = accessToken || (session && session.access_token);
  // Quando o frontend envia token, ele é a fonte mais confiável. Evita reutilizar user_id antigo do CacheService.
  var userId = token ? getUserIdFromJwt_(token) : null;
  if (!userId && session) userId = session.user_id;
  if (!userId) return null;
  var res = supabaseQuery_('profiles', 'select=*&user_id=eq.' + encodeURIComponent(userId) + '&limit=1', token);
  return res && res.length ? res[0] : null;
}

function ensureProfileFromUser_(user, accessToken) {
  if (!user || !user.id) return null;
  var existing = getMyProfile(accessToken);
  if (existing) return existing;
  var payload = { user_id: user.id, email: user.email || null, display_name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email, role: 'viewer', status:'active', last_seen_at:new Date().toISOString() };
  var inserted = supabaseInsert_('profiles', payload, true, accessToken);
  return inserted && inserted.length ? inserted[0] : null;
}

function getUserIdFromJwt_(token) {
  try { var p = String(token).split('.')[1]; var json = Utilities.newBlob(Utilities.base64DecodeWebSafe(p)).getDataAsString(); return JSON.parse(json).sub || null; }
  catch (e) { return null; }
}

function getDashboardData(accessToken) {
  try {
    var profile = getMyProfile(accessToken);
    if (!profile) return { ok:true, profile:{ display_name:'usuário' }, stats:{ total:0, pending:0, inProgress:0 }, recents:[], paths:[], debug:'Dashboard carregado sem profile/sessão local. Faça login novamente se necessário.' };
    var owner = profile.id || profile.user_id;
    var files = supabaseQuery_('study_files', 'select=id,status&owner_id=eq.' + encodeURIComponent(owner), accessToken) || [];
    var pending = files.filter(function(f){ return f.status === 'pending'; }).length;
    var recents = supabaseQuery_('study_files','select=id,final_name,suggested_name,original_name,file_type,status,created_at&owner_id=eq.' + encodeURIComponent(owner) + '&order=created_at.desc&limit=6', accessToken) || [];
    var paths = supabaseQuery_('learning_paths', 'select=id,title&visibility=eq.public&limit=5', accessToken) || [];
    var progress = supabaseQuery_('user_file_progress', 'select=id&user_id=eq.' + encodeURIComponent(owner) + '&status=eq.reading', accessToken) || [];
    return { ok:true, stats:{ total:files.length, pending:pending, inProgress:progress.length }, recents:recents, paths:paths, profile:profile, debug:'Dashboard carregado' };
  } catch (err) {
    Logger.log('[getDashboardData] ' + (err && err.stack || err));
    return { ok:true, profile:{ display_name:'usuário' }, stats:{ total:0, pending:0, inProgress:0 }, recents:[], paths:[], debug:'Dashboard carregado com fallback: ' + (err && err.message || err) };
  }
}



// ============================================================
// Roteador rápido para navegação sem reload completo da Web App
// Retorna o HTML renderizado do <body> já com includes avaliados.
// O frontend substitui #app e executa os scripts da nova view.
// ============================================================
function getSpaPage(page, params, accessToken) {
  var requested = String(page || 'dashboard').trim().toLowerCase();
  var safePage = ROUTES[requested] ? requested : (accessToken || getSession_() ? 'dashboard' : 'login');
  try {
    var data = {
      page: safePage,
      session: getSession_(),
      params: params || {},
      config: {
        appName: CONFIG.APP_NAME,
        supabaseConfigured: !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY),
        driveConfigured: !!CONFIG.DRIVE_FOLDER_ID,
        cacheConfigured: !!(CONFIG.UPSTASH_REDIS_REST_URL && CONFIG.UPSTASH_REDIS_REST_TOKEN),
        appUrl: getWebAppUrl_()
      }
    };
    if (accessToken) {
      var userId = getUserIdFromJwt_(accessToken);
      if (userId) data.session = Object.assign({}, data.session || {}, { access_token: accessToken, user_id: userId });
    }
    __TEMPLATE_CONTEXT__ = data;

    var template = HtmlService.createTemplateFromFile(ROUTES[safePage]);
    Object.keys(data).forEach(function(k) { template[k] = data[k]; });
    var html = template.evaluate().getContent();
    if (!html || !String(html).trim()) throw new Error('A view retornou HTML vazio: ' + ROUTES[safePage]);

    html = ensureAppWrapper_(html);
    var body = extractBodyHtml_(html);
    if (!body || !String(body).trim()) throw new Error('Não foi possível extrair o body da view: ' + ROUTES[safePage]);

    return {
      ok: true,
      page: safePage,
      title: CONFIG.APP_NAME + ' — ' + safePage,
      html: body,
      debug: 'SPA page renderizada: ' + safePage + ' em ' + new Date().toISOString()
    };
  } catch (err) {
    Logger.log('[getSpaPage] ERRO page=' + requested + ' safe=' + safePage + ' | ' + (err && err.stack || err));
    return {
      ok: false,
      page: safePage,
      error: err && err.message || String(err),
      stack: simplifyStack_(err && err.stack || err)
    };
  }
}

function extractBodyHtml_(html) {
  var text = String(html || '');
  var m = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m) return m[1];
  return text;
}

function debugRenderPage(page) {
  page = page || 'dashboard';
  return { ok:true, page:page, exists:!!ROUTES[page], route:ROUTES[page] || null, htmlPreview: include(ROUTES[page] || 'views/login').substring(0, 500) };
}

function debugIncludes() {
  var paths = ['partials/head','partials/sidebar','partials/topbar','partials/bottomnav','scripts/app','scripts/graph','styles/base','styles/layout','styles/cards','styles/responsive','styles/graph','views/perfil','views/configuracoes','views/grafo','views/relacoes','views/gerencia'];
  return paths.map(function(p){ var h = include(p); return { path:p, ok:h.indexOf('Erro ao incluir:') === -1, length:h.length, preview:h.substring(0,120) }; });
}
