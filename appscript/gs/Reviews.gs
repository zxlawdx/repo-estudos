// ============================================================
// Reviews.gs — Resenhas, comentários públicos e debate por material
// Google Apps Script · Supabase PostgreSQL · RLS
// ============================================================

var REVIEW_POST_TYPES_ = ['review','comment','reading_note','question'];
var REVIEW_VISIBILITIES_ = ['public','private','path_only'];
var REVIEW_STATUS_ = ['draft','published','archived','deleted'];

function reviewUserIdFromProfile_(profile, accessToken) {
  return (profile && (profile.user_id || profile.auth_user_id)) || getUserIdFromJwt_(accessToken) || (profile && profile.id) || null;
}

function reviewCanModerate_(profile) {
  return !!(profile && ['admin','editor'].indexOf(String(profile.role || '').toLowerCase()) !== -1 && String(profile.status || 'active') !== 'inactive');
}

function cleanReviewText_(value, max) {
  value = String(value == null ? '' : value).trim();
  if (max && value.length > max) value = value.substring(0, max);
  return value;
}

function cleanReviewTags_(tags) {
  if (!tags) return [];
  if (typeof tags === 'string') tags = tags.split(',');
  if (!Array.isArray(tags)) return [];
  var seen = {};
  return tags.map(function(t){ return cleanReviewText_(t, 32).replace(/^#/, ''); })
    .filter(function(t){ if (!t) return false; var k = t.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; })
    .slice(0, 12);
}

function normalizeReviewPostType_(type) {
  type = String(type || 'review').trim().toLowerCase();
  return REVIEW_POST_TYPES_.indexOf(type) >= 0 ? type : 'review';
}

function normalizeReviewVisibility_(visibility) {
  visibility = String(visibility || 'public').trim().toLowerCase();
  return REVIEW_VISIBILITIES_.indexOf(visibility) >= 0 ? visibility : 'public';
}

function reviewPostLabel_(type) {
  var labels = { review:'Resenha crítica', comment:'Comentário', reading_note:'Nota de leitura', question:'Pergunta' };
  return labels[type] || 'Resenha';
}

function listReviews(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };

    var limit = Math.min(Math.max(Number(params.limit || 20), 1), 50);
    var offset = Math.max(Number(params.offset || 0), 0);
    var q = 'select=*&status=eq.published&deleted_at=is.null&order=created_at.desc&limit=' + limit + '&offset=' + offset;

    if (params.materialId) q += '&material_id=eq.' + encodeURIComponent(params.materialId);
    if (params.pathId) q += '&path_id=eq.' + encodeURIComponent(params.pathId);
    if (params.postType && REVIEW_POST_TYPES_.indexOf(String(params.postType)) >= 0) q += '&post_type=eq.' + encodeURIComponent(params.postType);
    var myUserIdForReviews = reviewUserIdFromProfile_(profile, token);
    var myProfileIdForReviews = profile && profile.id || '';
    if (params.mine) q += '&or=(author_user_id.eq.' + encodeURIComponent(myUserIdForReviews) + ',author_profile_id.eq.' + encodeURIComponent(myProfileIdForReviews) + ')';
    else q += '&or=(visibility.eq.public,author_user_id.eq.' + encodeURIComponent(myUserIdForReviews) + ',author_profile_id.eq.' + encodeURIComponent(myProfileIdForReviews) + ')';

    var rows = supabaseQuery_('review_posts', q, token) || [];
    rows = hydrateReviewPosts_(rows, token, profile);

    var search = cleanReviewText_(params.search || '', 120).toLowerCase();
    if (search) {
      rows = rows.filter(function(r){
        var hay = [r.title, r.body, r.material_title, r.material_author, r.author_name, (r.tags || []).join(' ')].join(' ').toLowerCase();
        return hay.indexOf(search) >= 0;
      });
    }

    return { ok:true, posts:rows, limit:limit, offset:offset, canModerate:reviewCanModerate_(profile) };
  } catch (err) {
    Logger.log('[listReviews] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function getReviewDetail(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var id = String(params.id || params.postId || '').trim();
    if (!id) return { ok:false, error:'ID da publicação é obrigatório.' };
    var rows = supabaseQuery_('review_posts', 'select=*&id=eq.' + encodeURIComponent(id) + '&limit=1', token) || [];
    if (!rows.length) return { ok:false, error:'Resenha não encontrada.' };
    var post = hydrateReviewPosts_(rows, token, profile)[0];
    var comments = supabaseQuery_('review_comments', 'select=*&post_id=eq.' + encodeURIComponent(id) + '&deleted_at=is.null&status=eq.published&order=created_at.asc&limit=200', token) || [];
    comments = hydrateReviewComments_(comments, token, profile);
    return { ok:true, post:post, comments:comments, canModerate:reviewCanModerate_(profile) };
  } catch (err) {
    Logger.log('[getReviewDetail] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function createReviewPost(payload) {
  try {
    payload = payload || {};
    var token = payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    if (String(profile.status || 'active') === 'inactive') return { ok:false, error:'Usuário inativo.' };

    var materialId = cleanReviewText_(payload.materialId || payload.material_id || '', 120);
    var pathId = cleanReviewText_(payload.pathId || payload.path_id || '', 120) || null;
    var postType = normalizeReviewPostType_(payload.postType || payload.post_type);
    var title = cleanReviewText_(payload.title || '', 180);
    var body = cleanReviewText_(payload.body || payload.text || '', 12000);
    var visibility = normalizeReviewVisibility_(payload.visibility);
    var status = String(payload.status || 'published').toLowerCase() === 'draft' ? 'draft' : 'published';
    var rating = payload.rating === '' || payload.rating == null ? null : Number(payload.rating);
    if (!materialId) return { ok:false, error:'Selecione um material da biblioteca.' };
    if (postType === 'review' && !title) return { ok:false, error:'Informe um título para a resenha.' };
    if (!body || body.length < 20) return { ok:false, error:'Escreva pelo menos 20 caracteres.' };
    if (rating !== null && (!isFinite(rating) || rating < 1 || rating > 5)) return { ok:false, error:'Avaliação deve ser entre 1 e 5.' };

    var linked = payload.linked_entities || {};
    var payloadDb = {
      author_user_id: reviewUserIdFromProfile_(profile, token),
      // author_profile_id é preenchido pelo trigger/RLS no Supabase a partir de auth.uid().
      // Não envie profile.id daqui: em bancos onde profiles.id != auth.uid(), isso quebra RLS.
      author_name_snapshot: reviewProfileNameSnapshot_(profile),
      author_avatar_snapshot: reviewProfileAvatarSnapshot_(profile),
      material_id: materialId,
      path_id: pathId,
      post_type: postType,
      title: title || reviewPostLabel_(postType),
      body: body,
      rating: rating,
      has_spoiler: !!payload.hasSpoiler || !!payload.has_spoiler,
      visibility: visibility,
      status: status,
      tags: cleanReviewTags_(payload.tags),
      linked_entities: linked,
      updated_at: new Date().toISOString()
    };
    var ins = supabaseInsert_('review_posts', payloadDb, true, token);
    if (ins && ins.error) return { ok:false, error:ins.error };
    var post = Array.isArray(ins) ? ins[0] : ins;
    try { writeAuditLog_(profile, 'review_created', 'review_post', post && post.id, { material_id:materialId, post_type:postType }, token); } catch (_) {}
    try { addHistoryEvent_ && addHistoryEvent_(profile, 'review_created', 'review_post', post && post.id, { material_id:materialId }, token); } catch (_) {}
    return { ok:true, post:post };
  } catch (err) {
    Logger.log('[createReviewPost] ' + (err && err.stack || err));
    return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) };
  }
}

function updateReviewPost(payload) {
  try {
    payload = payload || {};
    var token = payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var id = String(payload.id || payload.postId || '').trim();
    if (!id) return { ok:false, error:'ID da publicação é obrigatório.' };
    var rows = supabaseQuery_('review_posts', 'select=id,author_user_id&status=neq.deleted&id=eq.' + encodeURIComponent(id) + '&limit=1', token) || [];
    if (!rows.length) return { ok:false, error:'Publicação não encontrada.' };
    var own = String(rows[0].author_user_id) === String(reviewUserIdFromProfile_(profile, token));
    if (!own && !reviewCanModerate_(profile)) return { ok:false, error:'Sem permissão.' };
    var upd = {
      title: cleanReviewText_(payload.title || '', 180) || null,
      body: cleanReviewText_(payload.body || '', 12000),
      rating: payload.rating === '' || payload.rating == null ? null : Number(payload.rating),
      has_spoiler: !!payload.hasSpoiler || !!payload.has_spoiler,
      visibility: normalizeReviewVisibility_(payload.visibility),
      tags: cleanReviewTags_(payload.tags),
      linked_entities: payload.linked_entities || {},
      updated_at: new Date().toISOString()
    };
    if (!upd.body || upd.body.length < 20) return { ok:false, error:'Texto muito curto.' };
    var res = supabaseUpdate_('review_posts', 'id=eq.' + encodeURIComponent(id), upd, token);
    if (res && res.error) return { ok:false, error:res.error };
    return { ok:true, post:Array.isArray(res) ? res[0] : res };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function deleteReviewPost(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var id = String(params.id || params.postId || '').trim();
    var rows = supabaseQuery_('review_posts', 'select=id,author_user_id&id=eq.' + encodeURIComponent(id) + '&limit=1', token) || [];
    if (!rows.length) return { ok:false, error:'Publicação não encontrada.' };
    var own = String(rows[0].author_user_id) === String(reviewUserIdFromProfile_(profile, token));
    if (!own && !reviewCanModerate_(profile)) return { ok:false, error:'Sem permissão.' };
    var res = supabaseUpdate_('review_posts', 'id=eq.' + encodeURIComponent(id), { status:'deleted', deleted_at:new Date().toISOString(), updated_at:new Date().toISOString() }, token);
    if (res && res.error) return { ok:false, error:res.error };
    return { ok:true };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function createReviewComment(payload) {
  try {
    payload = payload || {};
    var token = payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var postId = String(payload.postId || payload.post_id || '').trim();
    var body = cleanReviewText_(payload.body || payload.text || '', 6000);
    if (!postId) return { ok:false, error:'Post obrigatório.' };
    if (!body || body.length < 2) return { ok:false, error:'Comentário vazio.' };
    var rows = supabaseQuery_('review_posts', 'select=id,comment_count&status=eq.published&id=eq.' + encodeURIComponent(postId) + '&limit=1', token) || [];
    if (!rows.length) return { ok:false, error:'Publicação não encontrada.' };
    var ins = supabaseInsert_('review_comments', {
      post_id: postId,
      author_user_id: reviewUserIdFromProfile_(profile, token),
      // author_profile_id é preenchido pelo trigger/RLS no Supabase a partir de auth.uid().
      author_name_snapshot: reviewProfileNameSnapshot_(profile),
      author_avatar_snapshot: reviewProfileAvatarSnapshot_(profile),
      parent_comment_id: payload.parentCommentId || payload.parent_comment_id || null,
      body: body,
      status:'published',
      updated_at:new Date().toISOString()
    }, true, token);
    if (ins && ins.error) return { ok:false, error:ins.error };
    try { supabaseUpdate_('review_posts', 'id=eq.' + encodeURIComponent(postId), { comment_count:Number(rows[0].comment_count || 0) + 1, updated_at:new Date().toISOString() }, token); } catch (_) {}
    return { ok:true, comment:Array.isArray(ins) ? ins[0] : ins };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function updateReviewComment(payload) {
  try {
    payload = payload || {};
    var token = payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var id = String(payload.id || payload.commentId || '').trim();
    var body = cleanReviewText_(payload.body || '', 6000);
    var rows = supabaseQuery_('review_comments', 'select=id,author_user_id&id=eq.' + encodeURIComponent(id) + '&limit=1', token) || [];
    if (!rows.length) return { ok:false, error:'Comentário não encontrado.' };
    var own = String(rows[0].author_user_id) === String(reviewUserIdFromProfile_(profile, token));
    if (!own && !reviewCanModerate_(profile)) return { ok:false, error:'Sem permissão.' };
    var res = supabaseUpdate_('review_comments', 'id=eq.' + encodeURIComponent(id), { body:body, updated_at:new Date().toISOString() }, token);
    if (res && res.error) return { ok:false, error:res.error };
    return { ok:true, comment:Array.isArray(res) ? res[0] : res };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function deleteReviewComment(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var id = String(params.id || params.commentId || '').trim();
    var rows = supabaseQuery_('review_comments', 'select=id,author_user_id&id=eq.' + encodeURIComponent(id) + '&limit=1', token) || [];
    if (!rows.length) return { ok:false, error:'Comentário não encontrado.' };
    var own = String(rows[0].author_user_id) === String(reviewUserIdFromProfile_(profile, token));
    if (!own && !reviewCanModerate_(profile)) return { ok:false, error:'Sem permissão.' };
    var res = supabaseUpdate_('review_comments', 'id=eq.' + encodeURIComponent(id), { status:'deleted', deleted_at:new Date().toISOString(), updated_at:new Date().toISOString() }, token);
    if (res && res.error) return { ok:false, error:res.error };
    return { ok:true };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function toggleReviewReaction(payload) {
  try {
    payload = payload || {};
    var token = payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var targetType = String(payload.targetType || payload.target_type || 'post').toLowerCase() === 'comment' ? 'comment' : 'post';
    var targetId = String(payload.targetId || payload.target_id || '').trim();
    var reactionType = String(payload.reactionType || payload.reaction_type || 'like').toLowerCase() === 'useful' ? 'useful' : 'like';
    var userId = reviewUserIdFromProfile_(profile, token);
    if (!targetId) return { ok:false, error:'Alvo obrigatório.' };
    var existing = supabaseQuery_('review_reactions', 'select=id&target_type=eq.' + targetType + '&target_id=eq.' + encodeURIComponent(targetId) + '&user_id=eq.' + encodeURIComponent(userId) + '&reaction_type=eq.' + reactionType + '&limit=1', token) || [];
    if (existing.length) {
      var del = supabaseDelete_('review_reactions', 'id=eq.' + encodeURIComponent(existing[0].id), token);
      if (del && del.error) return { ok:false, error:del.error };
      adjustReviewCounter_(targetType, targetId, 'like_count', -1, token);
      return { ok:true, active:false };
    }
    var ins = supabaseInsert_('review_reactions', { target_type:targetType, target_id:targetId, user_id:userId, reaction_type:reactionType }, true, token);
    if (ins && ins.error) return { ok:false, error:ins.error };
    adjustReviewCounter_(targetType, targetId, 'like_count', 1, token);
    return { ok:true, active:true };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function toggleReviewSave(payload) {
  try {
    payload = payload || {};
    var token = payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    var postId = String(payload.postId || payload.post_id || '').trim();
    var userId = reviewUserIdFromProfile_(profile, token);
    if (!postId) return { ok:false, error:'Post obrigatório.' };
    var existing = supabaseQuery_('review_saves', 'select=id&post_id=eq.' + encodeURIComponent(postId) + '&user_id=eq.' + encodeURIComponent(userId) + '&limit=1', token) || [];
    if (existing.length) {
      var del = supabaseDelete_('review_saves', 'id=eq.' + encodeURIComponent(existing[0].id), token);
      if (del && del.error) return { ok:false, error:del.error };
      adjustReviewCounter_('post', postId, 'save_count', -1, token);
      return { ok:true, active:false };
    }
    var ins = supabaseInsert_('review_saves', { post_id:postId, user_id:userId }, true, token);
    if (ins && ins.error) return { ok:false, error:ins.error };
    adjustReviewCounter_('post', postId, 'save_count', 1, token);
    return { ok:true, active:true };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function adjustReviewCounter_(targetType, targetId, field, delta, token) {
  try {
    var table = targetType === 'comment' ? 'review_comments' : 'review_posts';
    var rows = supabaseQuery_(table, 'select=id,' + field + '&id=eq.' + encodeURIComponent(targetId) + '&limit=1', token) || [];
    if (!rows.length) return;
    var val = Math.max(0, Number(rows[0][field] || 0) + Number(delta || 0));
    var payload = {}; payload[field] = val; payload.updated_at = new Date().toISOString();
    supabaseUpdate_(table, 'id=eq.' + encodeURIComponent(targetId), payload, token);
  } catch (_) {}
}

function listReviewMaterials(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    var q = cleanReviewText_(params.search || '', 80).toLowerCase();
    var limit = Math.min(Number(params.limit || 50), 100);
    var rows = supabaseQuery_('study_files', 'select=id,final_name,suggested_name,original_name,file_type,source_type,external_provider,thumbnail_url,author,year,status,google_drive_preview_url,google_drive_web_url,external_url,embed_url,category_id,subject_id&status=eq.approved&order=created_at.desc&limit=' + limit, token) || [];
    if (q) rows = rows.filter(function(f){ return JSON.stringify(f).toLowerCase().indexOf(q) >= 0; });
    return { ok:true, materials:rows };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}

function listReviewFilters(params) {
  try {
    params = params || {};
    var token = params.accessToken || params.sessionToken || '';
    return {
      ok:true,
      paths: supabaseQuery_('learning_paths', 'select=id,title,visibility&order=title.asc&limit=100', token) || [],
      categories: supabaseQuery_('categories', 'select=id,name&order=name.asc&limit=100', token) || []
    };
  } catch (err) { return { ok:false, error:err && err.message || String(err), stack:simplifyStack_(err && err.stack || err) }; }
}


function reviewProfileDisplayName_(u) {
  if (!u) return '';
  return cleanReviewText_(u.display_name || u.full_name || u.name || u.username || u.email || '', 120);
}

function reviewProfileAvatarUrl_(u) {
  if (!u) return '';
  return cleanReviewText_(u.avatar_url || u.profile_photo_url || u.photo_url || u.picture || '', 500);
}

function reviewProfileNameSnapshot_(profile) {
  return cleanReviewText_(reviewProfileDisplayName_(profile), 120);
}

function reviewProfileAvatarSnapshot_(profile) {
  return cleanReviewText_(reviewProfileAvatarUrl_(profile), 500);
}


function reviewResolvedAuthorName_(profile, row) {
  var fromProfile = reviewProfileDisplayName_(profile);
  if (fromProfile) return fromProfile;
  var snap = cleanReviewText_(row && row.author_name_snapshot || '', 120);
  // Alguns posts antigos foram salvos com fallback genérico. Tente não travar nisso quando houver e-mail/username.
  if (snap && snap.toLowerCase() !== 'usuário' && snap.toLowerCase() !== 'usuario') return snap;
  return cleanReviewText_(row && (row.author_display_name || row.author_name || row.user_name) || '', 120);
}

function reviewResolvedAuthorAvatar_(profile, row) {
  var fromProfile = reviewProfileAvatarUrl_(profile);
  if (fromProfile) return fromProfile;
  return cleanReviewText_(row && (row.author_avatar_snapshot || row.author_avatar_url || row.avatar_url) || '', 500);
}

function reviewCollectAuthorIds_(rows) {
  var ids = [];
  (rows || []).forEach(function(r){
    ['author_user_id','author_profile_id','user_id','created_by'].forEach(function(k){
      if (r && r[k] != null && String(r[k]).trim()) ids.push(String(r[k]).trim());
    });
  });
  return uniqueNonEmpty_(ids);
}

function reviewLoadProfilesForAuthors_(rows, token, currentProfile) {
  var ids = reviewCollectAuthorIds_(rows);
  var users = {};
  function addProfile_(u) {
    if (!u) return;
    if (u.user_id) users[String(u.user_id)] = u;
    if (u.id) users[String(u.id)] = u;
  }
  addProfile_(currentProfile);
  if (!ids.length) return users;

  // v22: tenta primeiro RPC SECURITY DEFINER que retorna apenas campos públicos do perfil.
  // A versão v2 recebe text[] para tolerar tanto profiles.id quanto auth.users.id como string.
  // Isso evita fallback "Usuário" quando a RLS de profiles impede SELECT direto de perfis alheios.
  try {
    var rpcProfilesV2 = supabaseRpc_('get_public_profiles_for_review_v2', { ids: ids }, token) || [];
    rpcProfilesV2.forEach(addProfile_);
  } catch (_) {}

  try {
    var rpcProfiles = supabaseRpc_('get_public_profiles_for_review', { ids: ids }, token) || [];
    rpcProfiles.forEach(addProfile_);
  } catch (_) {}

  var select = 'select=id,user_id,email,display_name,avatar_url,avatar_drive_file_id,role,status';
  var idList = ids.map(encodeURIComponent).join(',');
  var tokenCandidates = [token];
  try {
    if (CONFIG && CONFIG.SUPABASE_KEY && tokenCandidates.indexOf(CONFIG.SUPABASE_KEY) === -1) tokenCandidates.push(CONFIG.SUPABASE_KEY);
  } catch (_) {}

  tokenCandidates.forEach(function(tk){
    if (!tk) return;
    try {
      var byUserId = supabaseQuery_('profiles', select + '&user_id=in.(' + idList + ')', tk) || [];
      byUserId.forEach(addProfile_);
    } catch (_) {}
    try {
      var byProfileId = supabaseQuery_('profiles', select + '&id=in.(' + idList + ')', tk) || [];
      byProfileId.forEach(addProfile_);
    } catch (_) {}
  });
  return users;
}

function reviewAuthorProfileForRow_(row, users, currentProfile, token) {
  var keys = [row && row.author_user_id, row && row.author_profile_id, row && row.user_id, row && row.created_by]
    .map(function(v){ return String(v || '').trim(); })
    .filter(function(v){ return !!v; });
  for (var i = 0; i < keys.length; i++) {
    if (users[String(keys[i])]) return users[String(keys[i])];
  }
  var myUserId = reviewUserIdFromProfile_(currentProfile, token);
  if (currentProfile) {
    for (var j = 0; j < keys.length; j++) {
      if (String(keys[j]) === String(myUserId) || String(keys[j]) === String(currentProfile.id || '')) return currentProfile;
    }
  }
  return {};
}


function reviewLoadViewerState_(postIds, token, profile, targetType) {
  var state = { liked:{}, saved:{} };
  postIds = uniqueNonEmpty_(postIds || []);
  var myUserId = reviewUserIdFromProfile_(profile, token);
  if (!postIds.length || !myUserId) return state;
  var idList = postIds.map(encodeURIComponent).join(',');
  try {
    var reactions = supabaseQuery_(
      'review_reactions',
      'select=target_id&target_type=eq.' + encodeURIComponent(targetType || 'post') +
        '&reaction_type=eq.like&user_id=eq.' + encodeURIComponent(myUserId) +
        '&target_id=in.(' + idList + ')',
      token
    ) || [];
    reactions.forEach(function(r){ if (r && r.target_id) state.liked[String(r.target_id)] = true; });
  } catch (_) {}
  if ((targetType || 'post') === 'post') {
    try {
      var saves = supabaseQuery_(
        'review_saves',
        'select=post_id&user_id=eq.' + encodeURIComponent(myUserId) +
          '&post_id=in.(' + idList + ')',
        token
      ) || [];
      saves.forEach(function(s){ if (s && s.post_id) state.saved[String(s.post_id)] = true; });
    } catch (_) {}
  }
  return state;
}

function hydrateReviewPosts_(rows, token, profile) {
  rows = rows || [];
  var materialIds = uniqueNonEmpty_(rows.map(function(r){ return r.material_id; }));
  var pathIds = uniqueNonEmpty_(rows.map(function(r){ return r.path_id; }));
  var postIds = uniqueNonEmpty_(rows.map(function(r){ return r.id; }));
  var mats = {}, paths = {};
  var users = reviewLoadProfilesForAuthors_(rows, token, profile);
  var viewerState = reviewLoadViewerState_(postIds, token, profile, 'post');
  if (materialIds.length) {
    var mrows = supabaseQuery_('study_files', 'select=id,final_name,suggested_name,original_name,file_type,source_type,external_provider,thumbnail_url,author,year,status,google_drive_preview_url,google_drive_web_url,external_url,embed_url&id=in.(' + materialIds.map(encodeURIComponent).join(',') + ')', token) || [];
    mrows.forEach(function(m){ mats[String(m.id)] = m; });
  }
  if (pathIds.length) {
    var prows = supabaseQuery_('learning_paths', 'select=id,title,description,visibility&id=in.(' + pathIds.map(encodeURIComponent).join(',') + ')', token) || [];
    prows.forEach(function(p){ paths[String(p.id)] = p; });
  }
  var myUserId = reviewUserIdFromProfile_(profile, token);
  return rows.map(function(r){
    var m = mats[String(r.material_id)] || {};
    var u = reviewAuthorProfileForRow_(r, users, profile, token);
    var path = paths[String(r.path_id)] || null;
    r.post_type_label = reviewPostLabel_(r.post_type);
    r.material = m;
    r.material_title = m.final_name || m.suggested_name || m.original_name || 'Material';
    r.material_author = m.author || '';
    r.material_type = m.file_type || m.source_type || 'material';
    r.path = path;
    r.path_title = path && path.title || '';
    r.author = u;
    r.author_name = reviewResolvedAuthorName_(u, r) || 'Usuário';
    r.author_avatar_url = reviewResolvedAuthorAvatar_(u, r);
    r.viewer_liked = !!viewerState.liked[String(r.id)];
    r.viewer_saved = !!viewerState.saved[String(r.id)];
    r.can_edit = String(r.author_user_id) === String(myUserId) || String(r.author_profile_id || '') === String(profile && profile.id || '') || reviewCanModerate_(profile);
    return r;
  });
}

function hydrateReviewComments_(rows, token, profile) {
  rows = rows || [];
  var users = reviewLoadProfilesForAuthors_(rows, token, profile);
  var commentIds = uniqueNonEmpty_(rows.map(function(c){ return c.id; }));
  var viewerState = reviewLoadViewerState_(commentIds, token, profile, 'comment');
  return rows.map(function(c){
    var u = reviewAuthorProfileForRow_(c, users, profile, token);
    c.author = u;
    c.author_name = reviewResolvedAuthorName_(u, c) || 'Usuário';
    c.author_avatar_url = reviewResolvedAuthorAvatar_(u, c);
    c.viewer_liked = !!viewerState.liked[String(c.id)];
    return c;
  });
}

function uniqueNonEmpty_(arr) {
  var seen = {}, out = [];
  (arr || []).forEach(function(v){ v = String(v || '').trim(); if (v && !seen[v]) { seen[v] = true; out.push(v); } });
  return out;
}
