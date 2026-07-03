// ============================================================
// Drive.gs — Integração com Google Drive + estrutura automática
// Nunca expõe credenciais ao frontend. Usa DRIVE_FOLDER_ID como raiz.
// ============================================================

var DRIVE_STRUCTURE_SPEC = {
  'materiais': ['pdfs', 'livros', 'artigos', 'apostilas', 'slides', 'imagens', 'outros'],
  'perfis': ['fotos', 'capas'],
  'thumbnails': [],
  'temporarios': [],
  'exportacoes': [],
  'logs': []
};

function _driveRoot_() {
  if (!CONFIG.DRIVE_FOLDER_ID) throw new Error('DRIVE_FOLDER_ID não configurado nas Propriedades do Script.');
  return DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
}

function _maskDriveId_(id) {
  id = String(id || '');
  if (!id) return '';
  return id.length <= 10 ? id.substring(0, 3) + '***' : id.substring(0, 6) + '...' + id.substring(id.length - 4);
}

function _getOrCreateChildFolder_(parent, name, report) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) {
    var existing = it.next();
    if (report) report.existing.push({ name: name, idMasked: _maskDriveId_(existing.getId()) });
    return existing;
  }
  var created = parent.createFolder(name);
  if (report) report.created.push({ name: name, idMasked: _maskDriveId_(created.getId()) });
  return created;
}

function ensureDriveStructure(forceRefresh) {
  var props = PropertiesService.getScriptProperties();
  if (!forceRefresh) {
    try {
      var cached = props.getProperty('DRIVE_STRUCTURE_JSON');
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.rootId === CONFIG.DRIVE_FOLDER_ID && parsed.folders) return parsed;
      }
    } catch (_) {}
  }

  var report = { ok: true, rootId: CONFIG.DRIVE_FOLDER_ID, rootIdMasked: _maskDriveId_(CONFIG.DRIVE_FOLDER_ID), rootName: '', folders: {}, created: [], existing: [], errors: [] };
  try {
    var root = _driveRoot_();
    report.rootName = root.getName();

    Object.keys(DRIVE_STRUCTURE_SPEC).forEach(function(topName) {
      var top = _getOrCreateChildFolder_(root, topName, report);
      report.folders[topName] = top.getId();
      var children = DRIVE_STRUCTURE_SPEC[topName] || [];
      children.forEach(function(childName) {
        var child = _getOrCreateChildFolder_(top, childName, report);
        report.folders[topName + '/' + childName] = child.getId();
      });
    });

    props.setProperty('DRIVE_STRUCTURE_JSON', JSON.stringify({
      ok: true,
      rootId: CONFIG.DRIVE_FOLDER_ID,
      rootIdMasked: report.rootIdMasked,
      rootName: report.rootName,
      folders: report.folders,
      cachedAt: new Date().toISOString()
    }));
    report.cachedAt = new Date().toISOString();
    return report;
  } catch (err) {
    report.ok = false;
    report.errors.push(err && err.message || String(err));
    Logger.log('[ensureDriveStructure] ' + (err && err.stack || err));
    return report;
  }
}

function debugDriveStructure() {
  var result = ensureDriveStructure(true);
  var foldersMasked = {};
  Object.keys(result.folders || {}).forEach(function(k) { foldersMasked[k] = _maskDriveId_(result.folders[k]); });
  return {
    ok: result.ok,
    root: { name: result.rootName || '', idMasked: result.rootIdMasked || _maskDriveId_(CONFIG.DRIVE_FOLDER_ID) },
    folders: foldersMasked,
    created: result.created || [],
    existing: result.existing || [],
    errors: result.errors || []
  };
}

function _folderPathForMaterial_(fileType, mimeType, fileName) {
  var type = String(fileType || '').toLowerCase();
  var mime = String(mimeType || '').toLowerCase();
  var name = String(fileName || '').toLowerCase();

  if (mime.indexOf('image/') === 0 || /\.(jpe?g|png|webp)$/i.test(name)) return 'materiais/imagens';
  if (type === 'book') return 'materiais/livros';
  if (type === 'article') return 'materiais/artigos';
  if (type === 'slide' || /\.(ppt|pptx)$/i.test(name)) return 'materiais/slides';
  if (type === 'notes' || type === 'summary') return 'materiais/apostilas';
  if (type === 'document' || mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'materiais/pdfs';
  return 'materiais/outros';
}

function getDriveFolderForMaterial_(fileType, mimeType, fileName) {
  var structure = ensureDriveStructure(false);
  var folderPath = _folderPathForMaterial_(fileType, mimeType, fileName);
  var folderId = structure && structure.folders ? structure.folders[folderPath] : null;
  if (!folderId) {
    structure = ensureDriveStructure(true);
    folderId = structure && structure.folders ? structure.folders[folderPath] : null;
  }
  if (!folderId) throw new Error('Pasta Drive não encontrada/criada para: ' + folderPath);
  return { folderPath: folderPath, folderId: folderId };
}

function getDriveFolderByPath_(folderPath) {
  var structure = ensureDriveStructure(false);
  var id = structure && structure.folders ? structure.folders[folderPath] : null;
  if (!id) {
    structure = ensureDriveStructure(true);
    id = structure && structure.folders ? structure.folders[folderPath] : null;
  }
  if (!id) throw new Error('Pasta Drive não encontrada/criada: ' + folderPath);
  return DriveApp.getFolderById(id);
}

/**
 * Faz upload de um arquivo para o Google Drive.
 * subfolderKey pode ser um caminho da estrutura, ex: materiais/pdfs, perfis/fotos.
 */
function uploadToDrive(base64Data, fileName, mimeType, subfolderKey, isPublic) {
  try {
    if (!base64Data) throw new Error('Base64 ausente para upload no Drive.');
    if (!fileName) throw new Error('Nome do arquivo ausente para upload no Drive.');
    var destFolder;
    var folderPath = subfolderKey || 'materiais/outros';

    if (String(folderPath).indexOf('/') >= 0 || DRIVE_STRUCTURE_SPEC[String(folderPath || '')]) {
      destFolder = getDriveFolderByPath_(folderPath);
    } else {
      // Compatibilidade: projetos antigos passavam nome de subpasta livre.
      destFolder = _getOrCreateChildFolder_(_driveRoot_(), String(folderPath || 'outros'), null);
    }

    var bytes = Utilities.base64Decode(base64Data);
    var blob  = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
    var file = destFolder.createFile(blob);

    if (isPublic) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } else {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    }

    var fileId = file.getId();
    return {
      ok: true,
      fileId: fileId,
      folderId: destFolder.getId(),
      folderPath: folderPath,
      webUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
      previewUrl: 'https://drive.google.com/file/d/' + fileId + '/preview',
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w512',
      size: file.getSize()
    };
  } catch (err) {
    Logger.log('[uploadToDrive] ' + (err && err.stack || err));
    return { ok: false, error: err && err.message || String(err) };
  }
}

function uploadProfilePhotoToDrive_(base64Data, fileName, mimeType) {
  var safeName = 'perfil_' + new Date().getTime() + '_' + String(fileName || 'foto').replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadToDrive(base64Data, safeName, mimeType, 'perfis/fotos', true);
}

function renameInDrive(fileId, newName) {
  try {
    var file = DriveApp.getFileById(fileId);
    file.setName(newName);
    return { ok: true };
  } catch (err) {
    Logger.log('[renameInDrive] ' + (err && err.stack || err));
    return { ok: false, error: err && err.message || String(err) };
  }
}

function getPreviewUrl(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/preview';
}

function deleteFromDrive(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message || String(err) };
  }
}

function setDriveVisibility(fileId, isPublic) {
  try {
    var file = DriveApp.getFileById(fileId);
    if (isPublic) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    else file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message || String(err) };
  }
}
