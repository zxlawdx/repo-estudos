# Arquitetura Híbrida — Repositório de Estudos

## Visão geral

```
Angular  ──HTTP──▶  Spring Boot  ──HTTP + secret──▶  Apps Script API  ──▶  Google Drive / Supabase / Upstash
```

- **Angular** é o único frontend novo. Ele nunca fala diretamente com o Apps Script.
- **Spring Boot** (`backend/system`) é o backend principal do frontend Angular. Ele expõe rotas REST (`/api/**`) que funcionam como *proxy/orquestrador* para o Apps Script.
- **Apps Script** (`appscript/gs`) continua sendo a única camada que fala com Google Drive, Supabase e Upstash. Toda a regra de negócio já validada em produção foi mantida como está — nada foi reescrito.

## Por que o Apps Script foi mantido

- `DriveApp` já funciona e está testado em produção.
- As regras de arquivos, categorias, trilhas, grafo e leitor já existem e funcionam.
- O prazo de entrega é curto — reescrever tudo em Java aumentaria muito o risco.
- Reaproveitar reduz a superfície de bugs novos.

## Autenticação

1. Angular chama `POST /api/appscript-auth/login` no Spring.
2. Spring chama a action `loginUser` no Apps Script.
3. Apps Script autentica no Supabase Auth.
4. Apps Script retorna `accessToken` (e `profile`).
5. Angular guarda o `accessToken` em `sessionStorage`.
6. Toda chamada subsequente do Angular envia `Authorization: Bearer <accessToken>`.
7. O interceptor HTTP do Angular anexa esse header automaticamente.
8. No Spring, `BearerTokenUtils.extract(request)` lê o header e repassa o token como `accessToken` dentro do payload enviado ao Apps Script.
9. O Apps Script usa esse `accessToken` nas funções que já esperavam esse parâmetro (ex.: `getMyProfile(accessToken)`).

## Segredo entre Spring e Apps Script

- `APPS_SCRIPT_API_SECRET` é conferido em toda chamada `doPost` no Apps Script (`apiRequireSecret_`).
- O Spring é o único client autorizado a chamar a Web App do Apps Script — o segredo nunca é enviado ao navegador.
- `SUPABASE_SERVICE_KEY` e `UPSTASH_REDIS_REST_TOKEN` continuam existindo apenas nas Script Properties do Apps Script; o Spring e o Angular nunca têm acesso a eles.

## Fluxo de uma requisição típica (upload de arquivo)

1. Angular monta um `FormData` com o arquivo + metadados e envia `POST /api/files/upload` (multipart) para o Spring, com o header `Authorization: Bearer <accessToken>`.
2. Spring (`FileProxyController`) valida tamanho (até 50 MB), converte o arquivo para Base64 e monta o payload esperado por `uploadFile(params)`.
3. Spring chama `AppsScriptClient.callForData("uploadFile", payload)`.
4. Apps Script reaproveita `uploadFile(params)` (mesma função de sempre, sem alterações), que valida, envia para o Drive e grava metadados no Supabase.
5. A resposta (`{ ok:true, file:..., fileId:... }`) volta pelo mesmo caminho até o Angular.

## Por que essa arquitetura reduz risco

- Nenhum endpoint do Apps Script foi removido ou renomeado.
- `doGet(e)` e o roteador HTML antigo continuam intactos — a aplicação HTML Service antiga do Apps Script continua funcionando normalmente, caso ainda seja usada.
- O novo `Api.gs` é aditivo: só adiciona `doPost`, sem tocar em nenhuma função existente.
- No backend Spring, nenhuma classe existente (`AuthController`, `AuthService`, `UserController`, `UserService`, `User`) foi alterada ou removida. Apenas o `SecurityConfig` recebeu o mínimo necessário para liberar as novas rotas `/api/**`.
