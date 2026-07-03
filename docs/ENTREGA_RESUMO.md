# Resumo da entrega

## Arquivos NOVOS criados

### Apps Script
- `appscript/gs/Api.gs` — novo endpoint `doPost` (API privada), reaproveita 100% das funções já existentes.
- `appscript/gs/*.gs` (demais) — cópia dos arquivos já existentes do projeto v23, trazidos para o repositório apenas para versionamento (nenhum foi alterado).
- `appscript/views/**`, `appscript/partials/**`, `appscript/scripts/**`, `appscript/styles/**`, `appscript/sql/*.sql`, `appscript/appsscript.json` — cópia do projeto existente, sem alterações.

### Backend Spring (novos packages, nada existente foi tocado além do SecurityConfig)
- `backend/system/src/main/java/com/resenhagram/system/appscript/AppScriptAuthController.java`
- `backend/system/src/main/java/com/resenhagram/system/appscript/AppsScriptException.java`
- `backend/system/src/main/java/com/resenhagram/system/appscript/client/AppsScriptClient.java`
- `backend/system/src/main/java/com/resenhagram/system/appscript/dto/AppsScriptRequest.java`
- `backend/system/src/main/java/com/resenhagram/system/appscript/dto/AppsScriptResponse.java`
- `backend/system/src/main/java/com/resenhagram/system/common/util/BearerTokenUtils.java`
- `backend/system/src/main/java/com/resenhagram/system/common/util/PayloadUtils.java`
- `backend/system/src/main/java/com/resenhagram/system/common/config/CorsConfig.java`
- `backend/system/src/main/java/com/resenhagram/system/dashboard/DashboardProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/files/FileProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/profile/ProfileProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/drive/DriveProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/categories/CategoryProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/paths/PathProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/graph/GraphProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/reader/ReaderProxyController.java`
- `backend/system/src/main/java/com/resenhagram/system/adminproxy/AdminProxyController.java`
- `backend/system/Dockerfile`

### Frontend Angular (projeto inteiro é novo)
- `frontend/package.json`, `frontend/angular.json`, `frontend/tsconfig*.json`, `frontend/.postcssrc.json`, `frontend/tailwind.config.js`
- `frontend/src/index.html`, `frontend/src/main.ts`, `frontend/src/styles.scss`
- `frontend/src/environments/environment.ts`, `environment.prod.ts`
- `frontend/src/app/app.component.ts`, `app.config.ts`, `app.routes.ts`
- `frontend/src/app/core/**` (api.service, auth.service, token.service, auth.interceptor, guards/auth.guard)
- `frontend/src/app/layout/**` (shell, sidebar, topbar, bottom-nav)
- `frontend/src/app/shared/components/**` (loading, empty-state, error-message, page-header, chip)
- `frontend/src/app/features/**` (auth, dashboard, library, upload, categories, paths, graph, profile, reader, admin, settings)
- `frontend/Dockerfile`, `frontend/nginx.conf`

### Infra / docs
- `docker-compose.yml`
- `.env.example`
- `.gitignore` (raiz)
- `docs/ARQUITETURA_HIBRIDA.md`
- `docs/APPS_SCRIPT_API.md`
- `docs/COMO_RODAR.md`

## Arquivos EXISTENTES alterados

- `backend/system/src/main/java/com/resenhagram/system/common/config/SecurityConfig.java` — adicionado `.cors(...)` e os novos paths `/api/**` ao `permitAll()`. Nenhuma linha existente foi removida além do bloco `requestMatchers` que foi expandido.
- `backend/system/src/main/resources/application.yml` — adicionadas as chaves `APPS_SCRIPT_API_URL`, `APPS_SCRIPT_API_SECRET`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` ao final do arquivo.
- `README.MD` — estava vazio; preenchido com visão geral da arquitetura híbrida.

## Arquivos que NÃO foram tocados

- `AuthController`, `AuthService`, `JwtService`, `AuthSession*`, `OAuth2LoginSuccessHandler`
- `UserController`, `UserService`, `User`, `UserRole`, `UserStatus`, `UserRepository`
- `PasswordConfig`
- `build.gradle.kts`, `settings.gradle.kts`, `gradlew`, `gradle/wrapper/**`
- Pacote `com.resenhagram.system` não foi renomeado; nenhum código existente foi movido.

## Plano de commits sugerido

1. `feat(appscript): adiciona Api.gs (doPost) e docs da API` — `appscript/gs/Api.gs`, `docs/APPS_SCRIPT_API.md`, demais arquivos do Apps Script trazidos para versionamento.
2. `feat(backend): adiciona AppsScriptClient, DTOs e util de token` — pacote `appscript/client`, `appscript/dto`, `common/util`.
3. `feat(backend): adiciona controllers proxy para Apps Script` — todos os `*ProxyController` + `AppScriptAuthController`.
4. `chore(backend): ajusta SecurityConfig e application.yml minimamente` — `SecurityConfig.java`, `CorsConfig.java`, `application.yml`.
5. `feat(frontend): cria base Angular com Tailwind e layout Stitch` — `angular.json`, `package.json`, `tailwind.config.js`, `styles.scss`, `core/`, `layout/`.
6. `feat(frontend): implementa telas funcionais principais` — `features/**`, `app.routes.ts`.
7. `chore(infra): adiciona Dockerfiles, docker-compose e .env.example`.
8. `docs: atualiza README e adiciona ARQUITETURA_HIBRIDA/COMO_RODAR`.

## Validação realizada

- Confirmado que todas as `actions` obrigatórias do `Api.gs` mapeiam para funções já existentes no projeto v23 (`Files.gs`, `Drive.gs`, `Users.gs`, `Categories.gs`, `LearningPaths.gs`, `Graph.gs`, `GraphPositions.gs`, `Reader.gs`, `ExternalLinks.gs`, `Code.gs`, `Utils.gs`), com as assinaturas de parâmetros corretas.
- `doGet(e)` e o roteador HTML (`Code.gs`, `views/**`) não foram alterados.
- Nenhuma classe Java existente foi removida, renomeada ou teve sua lógica interna alterada.
- `SecurityConfig` recebeu apenas a adição do bloco `requestMatchers` e `.cors(...)`.
- Frontend não contém `APPS_SCRIPT_API_SECRET` em nenhum arquivo — o segredo só existe no backend Spring e nas Script Properties do Apps Script.
- Upload multipart no Spring converte para Base64 e monta o payload exatamente no formato que `uploadFile(params)` já espera.

## Limitações desta entrega (itens não implementados por escopo/tempo)

- `path-mobile-trail.component.ts` não foi criado como componente separado — a tela `paths/:id` já cobre a visualização em lista de trilha; o "modo trilha mobile" com conectores visuais pode ser extraído desse componente depois, se necessário.
- O grafo usa um SVG simples com drag manual (sem biblioteca de layout automático), atendendo ao pedido de "versão simples funcional com SVG".
- Telas de categorias/trilhas ainda não têm formulários de criação/edição inline (o backend e as rotas já existem — `POST /api/categories`, `POST /api/paths`, etc. — falta só o formulário no Angular).
- Testes automatizados (unitários/e2e) não foram criados nesta rodada.
