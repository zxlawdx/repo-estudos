// ============================================================
// Api.gs — API privada do Apps Script para o novo backend Spring
// Repositório de Estudos
//
// NÃO altera doGet(e) nem o roteador HTML existente (Code.gs).
// Todas as ações abaixo apenas chamam funções já existentes no
// projeto (Files.gs, Drive.gs, Users.gs, Categories.gs,
// LearningPaths.gs, Graph.gs, GraphPositions.gs, Reader.gs,
// ExternalLinks.gs, Code.gs, Utils.gs).
//
// Contrato:
//   Request  -> { "secret": "...", "action": "...", "payload": {...} }
//   Response -> { "ok": true, "data": {...} }
//            -> { "ok": false, "error": "mensagem" }
// ============================================================

function apiJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiRequireSecret_(body) {
  var expected = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_API_SECRET');
  var provided = body && body.secret;
  if (!expected) throw new Error('APPS_SCRIPT_API_SECRET não configurado nas Script Properties.');
  if (!provided || String(provided) !== String(expected)) throw new Error('Secret inválido ou ausente.');
  return true;
}

/**
 * Normaliza o retorno das funções de negócio para o envelope padrão.
 * Se a função já retornar { ok: ... }, preserva o retorno original
 * (incluindo campos extras como file, fileId, accessToken etc).
 */
function apiWrap_(result) {
  if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'ok')) {
    return result;
  }
  return { ok: true, data: result };
}

function doPost(e) {
  var action = '';
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var body = JSON.parse(raw || '{}');

    apiRequireSecret_(body);

    action = String(body.action || '').trim();
    var payload = body.payload || {};

    if (!action) return apiJson_({ ok: false, error: 'Campo "action" ausente na requisição.' });

    var handler = API_ACTIONS[action];
    if (!handler) return apiJson_({ ok: false, error: 'Ação desconhecida: ' + action });

    var result = handler(payload);
    return apiJson_(apiWrap_(result));
  } catch (err) {
    Logger.log('[doPost] action=' + action + ' | ' + (err && err.stack || err));
    return apiJson_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

// ------------------------------------------------------------
// Helpers de extração de payload
// ------------------------------------------------------------
function _tk_(p) { return (p && (p.accessToken || p.sessionToken)) || null; }

// ------------------------------------------------------------
// Tabela de ações -> funções existentes
// Cada handler recebe (payload) e retorna o resultado já pronto
// para ser embrulhado por apiWrap_.
// ------------------------------------------------------------
var API_ACTIONS = {

  // ---------------- Autenticação ----------------
  healthCheck: function (p) { return healthCheck(); },
  loginUser: function (p) { return loginUser(p.email, p.password); },
  signUpUser: function (p) { return signUpUser(p.email, p.password, p.displayName); },
  refreshSupabaseSession: function (p) { return refreshSupabaseSession(p.refreshToken); },
  getMyProfile: function (p) { return getMyProfile(_tk_(p)); },
  getDashboardData: function (p) { return getDashboardData(_tk_(p)); },

  // ---------------- Arquivos / Drive ----------------
  ensureDriveStructure: function (p) { return ensureDriveStructure(!!p.forceRefresh); },
  debugDriveStructure: function (p) { return debugDriveStructure(); },
  uploadFile: function (p) { return uploadFile(p); },
  getFiles: function (p) { return getFiles(p); },
  getFileDetail: function (p) { return getFileDetail(p.fileId, _tk_(p)); },
  updateFile: function (p) { return updateFile(p.fileId, p.updates || p); },
  approveMaterial: function (p) { return approveMaterial(p.fileId, _tk_(p)); },
  rejectMaterial: function (p) { return rejectMaterial(p.fileId, p.reason, _tk_(p)); },
  approveSuggestion: function (p) { return approveSuggestion(p.suggestionId, _tk_(p)); },
  rejectSuggestion: function (p) { return rejectSuggestion(p.suggestionId, _tk_(p)); },
  getPendingSuggestions: function (p) { return getPendingSuggestions(_tk_(p)); },
  getPendingReviewMaterials: function (p) { return getPendingReviewMaterials(_tk_(p)); },
  setFileTags: function (p) { return setFileTags(p.fileId, p.tagNames || p.tags, _tk_(p)); },
  updateProgress: function (p) { return updateProgress(p.fileId, p.status, p.notes, _tk_(p)); },
  deleteFromDrive: function (p) { return deleteFromDrive(p.fileId); },
  renameInDrive: function (p) { return renameInDrive(p.fileId, p.newName); },
  setDriveVisibility: function (p) { return setDriveVisibility(p.fileId, !!p.isPublic); },

  // ---------------- Perfil ----------------
  updateMyProfile: function (p) { return updateMyProfile(p); },
  uploadProfilePhoto: function (p) { return uploadProfilePhoto(p); },
  getMyStats: function (p) { return getMyStats(_tk_(p)); },

  // ---------------- Links externos ----------------
  getExternalMaterialMetadata: function (p) { return getExternalMaterialMetadata(p.url); },
  createMaterialFromLink: function (p) { return createMaterialFromLink(p, _tk_(p)); },

  // ---------------- Categorias ----------------
  listCategories: function (p) { return listCategories(); },
  listSubjects: function (p) { return listSubjects(p.categoryId); },
  listCycles: function (p) { return listCycles(p.subjectId); },
  listTags: function (p) { return listTags(); },
  getCategoryTree: function (p) { return getCategoryTree(); },
  createCategory: function (p) { return createCategory(p); },
  updateCategory: function (p) { return updateCategory(p.id, p.data || p); },
  deleteCategory: function (p) { return deleteCategory(p.id); },
  createSubject: function (p) { return createSubject(p); },
  updateSubject: function (p) { return updateSubject(p.id, p.data || p); },
  deleteSubject: function (p) { return deleteSubject(p.id); },
  createCycle: function (p) { return createCycle(p); },
  updateCycle: function (p) { return updateCycle(p.id, p.data || p); },
  deleteCycle: function (p) { return deleteCycle(p.id); },

  // ---------------- Trilhas ----------------
  getLearningPaths: function (p) { return getLearningPaths(p); },
  createLearningPath: function (p) { return createLearningPath(p); },
  getPathDetail: function (p) { return getPathDetail(p.pathId, _tk_(p)); },
  getMaterialPathLinks: function (p) { return getMaterialPathLinks(p.materialId, _tk_(p)); },
  updateMaterialPathLinks: function (p) { return updateMaterialPathLinks(p.materialId, p.links, _tk_(p)); },
  addMaterialToPath: function (p) { return addMaterialToPath(p); },
  removeMaterialFromPath: function (p) { return removeMaterialFromPath(p.itemId, _tk_(p)); },
  updatePathItem: function (p) { return updatePathItem(p.itemId, p.updates || p, _tk_(p)); },
  movePathItem: function (p) { return movePathItem(p.itemId, p.direction, _tk_(p)); },
  listMaterialsForPathPicker: function (p) { return listMaterialsForPathPicker(p); },
  setPathItemProgress: function (p) { return setPathItemProgress(p.itemId, p.status, p.notes, _tk_(p)); },
  addDependency: function (p) { return addDependency(p.pathId, p.sourceFileId, p.targetFileId, p.relationType, p.note, _tk_(p)); },
  removeDependency: function (p) { return removeDependency(p.depId, _tk_(p)); },

  // ---------------- Grafo ----------------
  getGraphData: function (p) { return getGraphData(p); },
  searchGraphEntities: function (p) { return searchGraphEntities(p); },
  createGraphTopic: function (p) { return createGraphTopic(p); },
  saveGraphEdge: function (p) { return saveGraphEdge(p); },
  deleteGraphEdge: function (p) { return deleteGraphEdge(p.edgeId, _tk_(p)); },
  listGraphEdges: function (p) { return listGraphEdges(p); },
  getGraphNodePositions: function (p) { return getGraphNodePositions(p); },
  saveGraphNodePositions: function (p) { return saveGraphNodePositions(p); },
  saveGraphNodePosition: function (p) { return saveGraphNodePosition(p); },
  clearGraphNodePositions: function (p) { return clearGraphNodePositions(p); },

  // ---------------- Leitor ----------------
  getMaterialReaderData: function (p) { return getMaterialReaderData(p.materialId, _tk_(p)); },
  saveReadingProgress: function (p) { return saveReadingProgress(p, _tk_(p)); },
  saveVideoProgress: function (p) { return saveVideoProgress(p, _tk_(p)); },

  // ---------------- Admin ----------------
  getAdminUsers: function (p) { return getAdminUsers(p); },
  updateManagedUser: function (p) { return updateManagedUser(p); },
  getAdminUserDetail: function (p) { return getAdminUserDetail(p); }
};
