# API privada do Apps Script

Arquivo: `appscript/gs/Api.gs`

## Contrato

```
POST https://script.google.com/macros/s/SEU_DEPLOY_ID/exec

{
  "secret": "APPS_SCRIPT_API_SECRET",
  "action": "nomeDaAction",
  "payload": { ... }
}
```

Resposta de sucesso:
```json
{ "ok": true, "data": { ... } }
```
ou, quando a função legada já retorna campos extras (compatibilidade preservada):
```json
{ "ok": true, "file": { ... }, "fileId": "..." }
```

Resposta de erro:
```json
{ "ok": false, "error": "mensagem" }
```

## Configuração necessária (Script Properties)

| Propriedade | Descrição |
|---|---|
| `DRIVE_FOLDER_ID` | pasta raiz no Google Drive (já existente) |
| `SUPABASE_URL` | já existente |
| `SUPABASE_ANON_KEY` | já existente |
| `SUPABASE_SERVICE_KEY` | já existente |
| `UPSTASH_REDIS_REST_URL` | já existente |
| `UPSTASH_REDIS_REST_TOKEN` | já existente |
| `YOUTUBE_API_KEY` | opcional, se já existir |
| `APPS_SCRIPT_API_SECRET` | **novo** — segredo compartilhado apenas com o Spring |

## Actions disponíveis

Todas as actions abaixo apenas chamam funções já existentes no projeto (nenhuma regra de negócio foi reescrita).

### Autenticação
`healthCheck`, `loginUser`, `signUpUser`, `refreshSupabaseSession`, `getMyProfile`, `getDashboardData`

### Arquivos / Drive
`ensureDriveStructure`, `debugDriveStructure`, `uploadFile`, `getFiles`, `getFileDetail`, `updateFile`, `approveMaterial`, `rejectMaterial`, `approveSuggestion`, `rejectSuggestion`, `getPendingSuggestions`, `getPendingReviewMaterials`, `setFileTags`, `updateProgress`, `deleteFromDrive`, `renameInDrive`, `setDriveVisibility`

### Perfil
`updateMyProfile`, `uploadProfilePhoto`, `getMyStats`

### Links externos
`getExternalMaterialMetadata`, `createMaterialFromLink`

### Categorias
`listCategories`, `listSubjects`, `listCycles`, `listTags`, `getCategoryTree`, `createCategory`, `updateCategory`, `deleteCategory`, `createSubject`, `updateSubject`, `deleteSubject`, `createCycle`, `updateCycle`, `deleteCycle`

### Trilhas
`getLearningPaths`, `createLearningPath`, `getPathDetail`, `getMaterialPathLinks`, `updateMaterialPathLinks`, `addMaterialToPath`, `removeMaterialFromPath`, `updatePathItem`, `movePathItem`, `listMaterialsForPathPicker`, `setPathItemProgress`, `addDependency`, `removeDependency`

### Grafo
`getGraphData`, `searchGraphEntities`, `createGraphTopic`, `saveGraphEdge`, `deleteGraphEdge`, `listGraphEdges`, `getGraphNodePositions`, `saveGraphNodePositions`, `saveGraphNodePosition`, `clearGraphNodePositions`

### Leitor
`getMaterialReaderData`, `saveReadingProgress`, `saveVideoProgress`

### Admin
`getAdminUsers`, `updateManagedUser`, `getAdminUserDetail`

## Publicando a Web App

1. No editor do Apps Script, abra **Configurações do projeto** e adicione a Script Property `APPS_SCRIPT_API_SECRET` com um valor aleatório forte.
2. Confirme que `DRIVE_FOLDER_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` e as chaves do Upstash já estão configuradas (elas já existiam antes desta mudança).
3. **Implantar → Nova implantação → Aplicativo da Web**.
   - Executar como: você mesmo.
   - Quem tem acesso: qualquer pessoa (o segredo é quem protege a API).
4. Copie a URL `/exec` gerada — ela é o valor de `APPS_SCRIPT_API_URL` no Spring.
5. `doGet(e)` e o roteador HTML antigo não foram alterados; a Web App continua servindo as páginas antigas normalmente em paralelo ao `doPost`.
