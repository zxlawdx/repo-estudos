// ============================================================
// ExternalLinks.gs — cadastro seguro de links externos/YouTube
// ============================================================

var SAFE_EXTERNAL_PROTOCOLS_ = { 'http:': true, 'https:': true };
var SAFE_EMBED_HOSTS_ = {
  'youtube.com': true,
  'www.youtube.com': true,
  'm.youtube.com': true,
  'youtu.be': true,
  'www.youtu.be': true,
  'youtube-nocookie.com': true,
  'www.youtube-nocookie.com': true,
  'drive.google.com': true,
  'www.drive.google.com': true
};

function parseBasicUrl_(rawUrl) {
  var url = String(rawUrl || '').trim();
  if (!url) throw new Error('URL obrigatória.');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  if (/^(javascript|data|file|blob):/i.test(url)) throw new Error('URL bloqueada por segurança.');
  var m = url.match(/^(https?):\/\/([^\/\?#]+)([^\?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);
  if (!m) throw new Error('URL inválida.');
  var protocol = m[1].toLowerCase() + ':';
  var host = String(m[2] || '').toLowerCase();
  var path = m[3] || '/';
  var query = m[4] || '';
  if (!SAFE_EXTERNAL_PROTOCOLS_[protocol]) throw new Error('Protocolo bloqueado por segurança. Use http ou https.');
  var params = {};
  query.split('&').forEach(function(part){
    if (!part) return;
    var pieces = part.split('=');
    var k = decodeURIComponent(String(pieces.shift() || '').replace(/\+/g, ' '));
    var v = decodeURIComponent(String(pieces.join('=') || '').replace(/\+/g, ' '));
    if (k) params[k] = v;
  });
  return { url:url, protocol:protocol, hostname:host, pathname:path, params:params };
}

function normalizeExternalUrl_(rawUrl) {
  return parseBasicUrl_(rawUrl).url;
}

function isAllowedEmbedUrl_(url) {
  if (!url) return false;
  try {
    var u = parseBasicUrl_(url);
    return !!SAFE_EMBED_HOSTS_[u.hostname];
  } catch (e) { return false; }
}

function youtubeThumb_(videoId) {
  return videoId ? 'https://img.youtube.com/vi/' + encodeURIComponent(videoId) + '/hqdefault.jpg' : null;
}

function parseYouTubeUrl(url) {
  var parsedUrl = parseBasicUrl_(url);
  var normalized = parsedUrl.url;
  var host = String(parsedUrl.hostname || '').toLowerCase().replace(/^www\./, '');
  var path = String(parsedUrl.pathname || '');
  var videoId = '';
  var playlistId = '';

  if (host === 'youtu.be') {
    videoId = path.split('/').filter(Boolean)[0] || '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (path === '/watch') videoId = parsedUrl.params.v || '';
    else if (path.indexOf('/embed/') === 0) videoId = path.split('/')[2] || '';
    else if (path.indexOf('/shorts/') === 0) videoId = path.split('/')[2] || '';
    playlistId = parsedUrl.params.list || '';
    if (path === '/playlist') videoId = '';
  }

  videoId = String(videoId || '').replace(/[^A-Za-z0-9_-]/g, '').substring(0, 32);
  playlistId = String(playlistId || '').replace(/[^A-Za-z0-9_-]/g, '').substring(0, 80);

  if (!videoId && !playlistId) return { provider:'external', sourceType:'external_link', externalUrl:normalized };

  if (playlistId && !videoId) {
    return {
      provider: 'youtube',
      sourceType: 'youtube_playlist',
      videoId: '',
      playlistId: playlistId,
      embedUrl: 'https://www.youtube.com/embed/videoseries?list=' + encodeURIComponent(playlistId),
      externalUrl: normalized,
      thumbnailUrl: null
    };
  }
  return {
    provider: 'youtube',
    sourceType: 'youtube_video',
    videoId: videoId,
    playlistId: playlistId || '',
    embedUrl: 'https://www.youtube.com/embed/' + encodeURIComponent(videoId),
    externalUrl: normalized,
    thumbnailUrl: youtubeThumb_(videoId)
  };
}

function getExternalMaterialMetadata(url) {
  try {
    var parsed = parseYouTubeUrl(url);
    var out = {
      ok: true,
      provider: parsed.provider,
      sourceType: parsed.sourceType,
      externalUrl: parsed.externalUrl,
      embedUrl: parsed.embedUrl || null,
      youtubeVideoId: parsed.videoId || null,
      youtubePlaylistId: parsed.playlistId || null,
      thumbnailUrl: parsed.thumbnailUrl || null,
      title: parsed.sourceType === 'youtube_video' ? 'Vídeo do YouTube' : (parsed.sourceType === 'youtube_playlist' ? 'Playlist do YouTube' : 'Link externo'),
      channelTitle: null,
      durationSeconds: null,
      linkMetadata: {}
    };

    var key = String(CONFIG.YOUTUBE_API_KEY || '').trim();
    if (key && parsed.provider === 'youtube') {
      try {
        if (parsed.sourceType === 'youtube_video' && parsed.videoId) {
          var videoUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=' + encodeURIComponent(parsed.videoId) + '&key=' + encodeURIComponent(key);
          var res = UrlFetchApp.fetch(videoUrl, { muteHttpExceptions:true });
          var code = res.getResponseCode();
          if (code >= 200 && code < 300) {
            var json = JSON.parse(res.getContentText() || '{}');
            var item = json.items && json.items[0];
            if (item && item.snippet) {
              out.title = item.snippet.title || out.title;
              out.channelTitle = item.snippet.channelTitle || null;
              out.thumbnailUrl = (item.snippet.thumbnails && (item.snippet.thumbnails.high || item.snippet.thumbnails.medium || item.snippet.thumbnails.default) || {}).url || out.thumbnailUrl;
              out.linkMetadata = { youtube_api: true, publishedAt: item.snippet.publishedAt || null };
              out.durationSeconds = parseYouTubeDuration_(item.contentDetails && item.contentDetails.duration);
            }
          }
        } else if (parsed.sourceType === 'youtube_playlist' && parsed.playlistId) {
          var plUrl = 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=' + encodeURIComponent(parsed.playlistId) + '&key=' + encodeURIComponent(key);
          var plRes = UrlFetchApp.fetch(plUrl, { muteHttpExceptions:true });
          var plCode = plRes.getResponseCode();
          if (plCode >= 200 && plCode < 300) {
            var plJson = JSON.parse(plRes.getContentText() || '{}');
            var pl = plJson.items && plJson.items[0];
            if (pl && pl.snippet) {
              out.title = pl.snippet.title || out.title;
              out.channelTitle = pl.snippet.channelTitle || null;
              out.thumbnailUrl = (pl.snippet.thumbnails && (pl.snippet.thumbnails.high || pl.snippet.thumbnails.medium || pl.snippet.thumbnails.default) || {}).url || null;
              out.linkMetadata = { youtube_api: true, itemCount: pl.contentDetails && pl.contentDetails.itemCount || null };
            }
          }
        }
      } catch (apiErr) {
        Logger.log('[getExternalMaterialMetadata] YouTube API falhou: ' + apiErr);
        out.linkMetadata = { youtube_api_error: true };
      }
    }
    return out;
  } catch (err) {
    return { ok:false, error: err && err.message || String(err), stack: simplifyStack_(err && err.stack || err) };
  }
}

function parseYouTubeDuration_(duration) {
  if (!duration) return null;
  var m = String(duration).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2] || '0', 10) * 60) + parseInt(m[3] || '0', 10);
}

function createMaterialFromLink(payload, accessToken) {
  try {
    payload = payload || {};
    var token = accessToken || payload.accessToken || payload.sessionToken || '';
    var profile = getMyProfile(token);
    if (!profile) return { ok:false, error:'Não autenticado.' };
    if (profile.status && profile.status !== 'active') return { ok:false, error:'Usuário desativado.' };

    var meta = getExternalMaterialMetadata(payload.url || payload.externalUrl);
    if (!meta || !meta.ok) return { ok:false, error:(meta && meta.error) || 'Não consegui analisar o link.' };
    if (meta.embedUrl && !isAllowedEmbedUrl_(meta.embedUrl)) return { ok:false, error:'Embed bloqueado por segurança.' };

    var sourceType = meta.sourceType || 'external_link';
    var title = String(payload.title || meta.title || '').trim();
    if (!title) title = sourceType === 'youtube_video' ? 'Vídeo do YouTube' : (sourceType === 'youtube_playlist' ? 'Playlist do YouTube' : 'Link externo');
    var fileType = payload.fileType || (sourceType === 'youtube_video' ? 'video' : (sourceType === 'youtube_playlist' ? 'playlist' : 'external_link'));

    var rec = {
      owner_id: profile.id,
      original_name: title,
      suggested_name: title,
      final_name: title,
      file_type: fileType,
      source_type: sourceType,
      external_provider: meta.provider === 'youtube' ? 'youtube' : 'external',
      external_url: meta.externalUrl,
      embed_url: meta.embedUrl || null,
      youtube_video_id: meta.youtubeVideoId || null,
      youtube_playlist_id: meta.youtubePlaylistId || null,
      thumbnail_url: meta.thumbnailUrl || null,
      duration_seconds: meta.durationSeconds || null,
      channel_title: payload.channelTitle || meta.channelTitle || null,
      link_metadata: meta.linkMetadata || {},
      category_id: payload.categoryId || null,
      subject_id: payload.subjectId || null,
      cycle_id: payload.cycleId || null,
      author: payload.author || meta.channelTitle || null,
      year: payload.year ? parseInt(payload.year, 10) : null,
      mime_type: 'text/uri-list',
      file_size: 0,
      status: payload.status || 'pending',
      visibility: payload.visibility || 'private'
    };
    var inserted = supabaseInsert_('study_files', rec, true, token);
    if (inserted.error) return { ok:false, error: inserted.error };
    var file = Array.isArray(inserted) ? inserted[0] : inserted;
    _logHistory_(file && file.id, profile.id, sourceType.indexOf('youtube') === 0 ? 'youtube_link_added' : 'external_link_added', null, { source_type:sourceType, provider:rec.external_provider }, token);
    writeAuditLog_(profile, 'material_link_created', 'study_files', file && file.id, { source_type:sourceType, provider:rec.external_provider }, token);
    invalidateFilesCache_(profile.id);
    return { ok:true, fileId:file && file.id, file:file, metadata:meta };
  } catch (err) {
    Logger.log('[createMaterialFromLink] ' + (err && err.stack || err));
    return { ok:false, error: err && err.message || String(err), stack: simplifyStack_(err && err.stack || err) };
  }
}
