// ============================================================
// Supabase.gs — Integração segura com Supabase REST/Auth API
// Toda comunicação usa UrlFetchApp (backend only)
// ============================================================

/**
 * Faz parse seguro de respostas HTTP que deveriam vir em JSON.
 * Evita erro genérico: "Unexpected non-whitespace character after JSON...".
 */
function parseJsonResponse_(res, context) {
  const code = res.getResponseCode();
  const text = res.getContentText() || '';

  if (!text.trim()) {
    return code >= 200 && code < 300 ? null : { error: { message: 'Resposta vazia', status: code } };
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(
      (context || 'Resposta HTTP inválida') +
      ' | status=' + code +
      ' | body=' + text.substring(0, 800)
    );
  }
}

function _cleanSupabaseUrl_(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

function _getAnonKey_() {
  const key = String(CONFIG.SUPABASE_ANON_KEY || '').trim();
  if (!key) throw new Error('Configure SUPABASE_ANON_KEY nas Propriedades do Script. Use a publishable/anon public key, não a secret key.');
  return key;
}

function _getServiceKeyOptional_() {
  return String(CONFIG.SUPABASE_KEY || '').trim();
}

/**
 * Retorna a chave apropriada para Supabase Auth.
 * Auth/login sempre deve usar a chave pública publishable/anon.
 * Não use sb_secret/service_role aqui, pois o Supabase bloqueia em fluxo de navegador/auth.
 */
function _supabaseAuthKey_() {
  return _getAnonKey_();
}

/**
 * Autenticação via Supabase Auth REST.
 * Endpoints corretos:
 * - login: /auth/v1/token?grant_type=password
 * - cadastro: /auth/v1/signup
 */
function supabaseAuth_(action, body) {
  if (!CONFIG.SUPABASE_URL) throw new Error('Configure SUPABASE_URL nas Propriedades do Script.');

  let endpoint;
  if (action === 'signInWithPassword' || action === 'login') {
    endpoint = 'token?grant_type=password';
  } else if (action === 'signUp' || action === 'signup') {
    endpoint = 'signup';
  } else {
    endpoint = action;
  }

  const authKey = _supabaseAuthKey_();
  const url = _cleanSupabaseUrl_(CONFIG.SUPABASE_URL) + '/auth/v1/' + endpoint;
  const res = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      apikey: authKey,
      Authorization: 'Bearer ' + authKey,
      Accept: 'application/json',
    },
    payload: JSON.stringify(body || {}),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const data = parseJsonResponse_(res, 'Supabase Auth: ' + action) || {};

  if (code < 200 || code >= 300) {
    const msg = data.error_description || data.msg || data.message || data.error || ('HTTP ' + code);
    return { error: { message: msg, status: code, details: data } };
  }

  return data;
}

/**
 * Headers padrão Supabase REST.
 * Regra:
 * - apikey: sempre anon/publishable quando existir;
 * - Authorization: token do usuário logado quando existir;
 * - fallback: service key só para chamadas backend sem sessão, se configurada.
 */
function _supabaseHeaders_(accessToken) {
  if (!CONFIG.SUPABASE_URL) throw new Error('Configure SUPABASE_URL nas Propriedades do Script.');

  const anonKey = _getAnonKey_();
  var session = null;
  try { session = (typeof getSession_ === "function") ? getSession_() : null; } catch(e) { session = null; }
  const serviceKey = _getServiceKeyOptional_();

  let bearer = accessToken || (session && session.access_token ? session.access_token : null);
  if (!bearer && serviceKey) bearer = serviceKey;
  if (!bearer) bearer = anonKey;

  return {
    apikey: anonKey,
    Authorization: 'Bearer ' + bearer,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** SELECT genérico via PostgREST */
function supabaseQuery_(table, query, accessToken) {
  const url = _cleanSupabaseUrl_(CONFIG.SUPABASE_URL) + '/rest/v1/' + table + '?' + query;
  const res = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: _supabaseHeaders_(accessToken),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const data = parseJsonResponse_(res, 'Supabase SELECT ' + table);

  if (code < 200 || code >= 300) {
    Logger.log('supabaseQuery_ error [' + table + '] ' + code + ': ' + res.getContentText());
    return null;
  }

  return data || [];
}

/** INSERT */
function supabaseInsert_(table, payload, returning, accessToken) {
  const prefer = returning ? 'return=representation' : 'return=minimal';
  const res = UrlFetchApp.fetch(_cleanSupabaseUrl_(CONFIG.SUPABASE_URL) + '/rest/v1/' + table, {
    method: 'POST',
    contentType: 'application/json',
    headers: Object.assign(_supabaseHeaders_(accessToken), { Prefer: prefer }),
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const data = parseJsonResponse_(res, 'Supabase INSERT ' + table);

  if (code < 200 || code >= 300) {
    Logger.log('supabaseInsert_ error [' + table + '] ' + code + ': ' + res.getContentText());
    return { error: (data && (data.message || data.error)) || res.getContentText() || ('HTTP ' + code) };
  }

  return returning ? (data || []) : { ok: true };
}

/** UPDATE por filtro PostgREST */
function supabaseUpdate_(table, filter, payload, accessToken) {
  const url = _cleanSupabaseUrl_(CONFIG.SUPABASE_URL) + '/rest/v1/' + table + '?' + filter;
  const res = UrlFetchApp.fetch(url, {
    method: 'PATCH',
    contentType: 'application/json',
    headers: Object.assign(_supabaseHeaders_(accessToken), { Prefer: 'return=representation' }),
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const data = parseJsonResponse_(res, 'Supabase UPDATE ' + table);

  if (code < 200 || code >= 300) {
    Logger.log('supabaseUpdate_ error [' + table + '] ' + code + ': ' + res.getContentText());
    return { error: (data && (data.message || data.error)) || res.getContentText() || ('HTTP ' + code) };
  }

  return data || [];
}

/** DELETE por filtro PostgREST */
function supabaseDelete_(table, filter, accessToken) {
  const url = _cleanSupabaseUrl_(CONFIG.SUPABASE_URL) + '/rest/v1/' + table + '?' + filter;
  const res = UrlFetchApp.fetch(url, {
    method: 'DELETE',
    headers: _supabaseHeaders_(accessToken),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code >= 200 && code < 300) return { ok: true };

  const data = parseJsonResponse_(res, 'Supabase DELETE ' + table);
  return { error: (data && (data.message || data.error)) || res.getContentText() || ('HTTP ' + code) };
}

/** RPC — chamada de função PostgreSQL */
function supabaseRpc_(functionName, params, accessToken) {
  const url = _cleanSupabaseUrl_(CONFIG.SUPABASE_URL) + '/rest/v1/rpc/' + functionName;
  const res = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    headers: _supabaseHeaders_(accessToken),
    payload: JSON.stringify(params || {}),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const data = parseJsonResponse_(res, 'Supabase RPC ' + functionName);

  if (code < 200 || code >= 300) {
    Logger.log('supabaseRpc_ error [' + functionName + '] ' + code + ': ' + res.getContentText());
    return null;
  }

  return data;
}

// ============================================================
// Funções de debug para rodar manualmente no Apps Script
// ============================================================

function testarConexaoSupabase() {
  const endpoint = _cleanSupabaseUrl_(CONFIG.SUPABASE_URL) + '/rest/v1/categories?select=id,name&limit=1';
  const anonKey = _getAnonKey_();

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      apikey: anonKey,
      Authorization: 'Bearer ' + anonKey,
      Accept: 'application/json'
    }
  });

  Logger.log('STATUS: ' + response.getResponseCode());
  Logger.log('BODY: ' + response.getContentText());

  return {
    ok: response.getResponseCode() >= 200 && response.getResponseCode() < 300,
    status: response.getResponseCode(),
    supabaseUrlMasked: (typeof maskUrlForClient_ === 'function' ? maskUrlForClient_(CONFIG.SUPABASE_URL) : maskKey_(_cleanSupabaseUrl_(CONFIG.SUPABASE_URL))),
    anonKeyConfigured: !!anonKey,
    bodyPreview: response.getContentText().substring(0, 500)
  };
}

function testarLoginSupabase(email, password) {
  if (!email || !password) {
    throw new Error('Chame testarLoginSupabase("seu@email.com", "suaSenha")');
  }

  const result = supabaseAuth_('login', { email: email, password: password });
  Logger.log(JSON.stringify({ ok: !!(result && result.access_token), userEmail: result && result.user ? result.user.email : null, error: result && result.error ? result.error.message : null }, null, 2));

  return {
    ok: !!(result && result.access_token && result.user),
    hasAccessToken: !!(result && result.access_token),
    hasUser: !!(result && result.user),
    error: result && result.error ? result.error.message : null,
    userEmail: result && result.user ? result.user.email : null
  };
}

function maskKey_(key) { key = String(key || ''); return key ? key.substring(0, 6) + '...' + key.substring(Math.max(0, key.length - 6)) : ''; }
