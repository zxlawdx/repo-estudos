# Implementação Angular - Repositório de Estudos

## Arquivos Apps Script analisados
- `partials/sidebar.html`, `partials/topbar.html`, `partials/bottomnav.html`
- `views/biblioteca.html`, `views/dashboard.html`, `views/detalhe.html`, `views/upload.html`, `views/cadastrar-link.html`
- `views/categorias.html`, `views/trilhas.html`, `views/grafo.html`, `views/relacoes.html`, `views/resenhas.html`, `views/revisao.html`, `views/historico.html`, `views/perfil.html`, `views/configuracoes.html`, `views/leitor.html`, `views/gerencia.html`
- `styles/base.html`, `styles/layout.html`, `styles/cards.html`, `styles/graph.html`, `styles/reader.html`, `styles/responsive.html`, `styles/reviews.html`
- `gs/Categories.gs`, `gs/Files.gs`, `gs/LearningPaths.gs`, `gs/Graph.gs`, `gs/GraphPositions.gs`, `gs/History.gs`, `gs/Reviews.gs`, `gs/Reader.gs`, `gs/Users.gs`, `gs/Code.gs`

## Principais mudanças
- Corrigido `environment.apiBaseUrl` para `/api` também em desenvolvimento.
- Corrigido `nginx.conf` com proxy `/api/` para `backend:8081`.
- Criado `ApiService` com normalização de resposta para objeto direto, array direto e `{ ok, data }`.
- Login ajustado para `/api/appscript-auth/login`, aceitando retorno direto `{ accessToken, refreshToken, expiresAt, user, profile }`.
- Sessão salva em `sessionStorage`, com `accessToken`, `user` e `profile` mínimos.
- Sidebar, topbar e bottom nav refeitos em português e inspirados no Apps Script.
- Criadas/ajustadas rotas: dashboard, biblioteca, detalhe, upload, cadastrar link, revisão, trilhas, detalhe de trilha, categorias, histórico, grafo, relações, resenhas, perfil, configurações, gerência/admin e leitor.
- Perfil deixou de mostrar JSON bruto e passou a usar cards, estatísticas e status seguro.
- Configurações não expõe tokens nem secrets.
- Grafo global implementado em SVG com nós, arestas, zoom, drag e salvar posições via `/api/graph/positions`.
- Todas as telas principais possuem loading, erro visível e estado vazio.

## Comandos testados
```bash
npm install --no-audit --no-fund --loglevel=error
npm run build
```

Build Angular concluído com sucesso.

## Endpoints usados pelo frontend
- `POST /api/appscript-auth/login`
- `POST /api/appscript-auth/signup`
- `GET /api/appscript-auth/me`
- `GET /api/dashboard/summary`
- `GET /api/files`
- `GET /api/files/:id`
- `POST /api/files/upload`
- `POST /api/files/link`
- `GET /api/categories/tree`
- `GET /api/paths`
- `GET /api/paths/:id`
- `GET /api/graph`
- `GET /api/graph/positions`
- `POST /api/graph/positions`
- `GET /api/relations`
- `POST /api/relations`
- `DELETE /api/relations/:id`
- `GET /api/reviews`
- `POST /api/reviews`
- `GET /api/history`
- `GET /api/profile/me`
- `GET /api/profile/stats`
- `PUT /api/profile/me`
- `POST /api/profile/photo`
- `GET /api/drive/health`
- `GET /api/admin-proxy/users`
- `GET /api/reader/materials/:id`

## Pendências reais
- Botões de aprovar/rejeitar revisão, editar metadados, vincular trilhas, marcar progresso e editar usuário estão visualmente prontos, mas dependem dos endpoints exatos do backend para ação final.
- Busca global usa fallback em `/api/files` com `q/search`; se houver endpoint unificado de busca no backend, pode ser conectado no `TopbarComponent`.
- O grafo da trilha na aba interna aponta para o grafo global; pode ser evoluído para consumir `/api/graph?pathId=...` com o mesmo componente SVG.
