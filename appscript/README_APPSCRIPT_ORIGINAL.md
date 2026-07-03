# Repositório de Estudos — v8 graph/admin patch

Projeto Google Apps Script + HTML Service, JavaScript puro, Supabase Auth, Supabase PostgreSQL/RLS, Google Drive como storage físico e Upstash Redis REST opcional.

Esta versão preserva a stack da v7-fast corrigida e adiciona uma camada de visualização/gerência sem reescrever o app do zero.

## O que foi implementado

- Alternância de visualização na tela de detalhe da trilha:
  - **Lista**: materiais ordenados, tipo do material, tipo na trilha, progresso e ações.
  - **Grafo**: visualização SVG com nós, arestas, zoom, pan, reset, clique em nó e painel de detalhes.
  - **Relações**: criação/listagem/remoção de relações entre materiais da trilha.
- Novas rotas:
  - `grafo`
  - `relacoes`
  - `gerencia`
  - `admin-usuarios` como alias de `gerencia`
- Nova tela **Grafo de Estudos** para visualizar materiais, trilhas, categorias, assuntos, tags e tópicos/conceitos.
- Nova tela **Gerenciar Relações** para interligar origem/destino, definir tipo de relação, direção, peso e nota.
- Nova tela **Gerência**, acessível apenas por usuários `admin` no backend.
- Responsividade reforçada para desktop, tablet e celulares de 360/390px.
- Bottom nav mobile com botão **Mais**, garantindo acesso às telas extras no celular.
- Sidebar desktop com Grafo, Relações e Gerência.
- SQL seguro em `schema.sql`, sem `DROP TABLE`, com migração incremental.
- Schema antigo destrutivo preservado em `schema_legacy_reset_full.sql` apenas como referência.
- Auditoria opcional em `audit_logs` para ações administrativas e relações do grafo.

## Stack mantida

- Google Apps Script
- HTML Service
- JavaScript puro
- HTML/CSS modularizado com `include()`
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Google Drive como storage físico
- Upstash Redis REST opcional

Não usa React, Next.js, Vue, Angular nem Supabase Storage.

## Arquivos principais alterados/adicionados

### Backend Apps Script

- `gs/Code.gs`
  - novas rotas: `grafo`, `relacoes`, `gerencia`, `admin-usuarios`.
  - atualização de `last_seen_at` e `email` do perfil no login.
- `gs/Graph.gs`
  - grafo genérico em `graph_edges`.
  - busca de entidades do grafo.
  - criação de tópicos/conceitos.
  - CRUD seguro de relações.
  - compatibilidade com funções antigas de `file_dependencies`.
- `gs/Users.gs`
  - gerência/admin de usuários.
  - alteração segura de `role` e `status`.
  - proteção contra remoção/desativação do último admin ativo.
  - detalhes de usuário: materiais, trilhas, histórico e auditoria.
- `gs/Audit.gs`
  - escrita segura e opcional de auditoria.

### Frontend / Views

- `views/trilhas.html`
  - abas Lista/Grafo/Relações.
  - ações mobile em menu “Mais opções”.
  - grafo por trilha.
  - relações por trilha.
- `views/grafo.html`
  - visualização geral do grafo.
  - filtros por tipo de nó, relação e direção.
- `views/relacoes.html`
  - gerenciamento completo de relações.
  - busca de entidades.
  - criação de tópicos/conceitos.
- `views/gerencia.html`
  - administração de usuários.
  - permissão negada visível para não-admin.

### Includes / estilos

- `partials/sidebar.html`
  - novas abas desktop.
- `partials/bottomnav.html`
  - botão mobile **Mais** com todas as telas obrigatórias.
- `partials/head.html`
  - inclusão de `styles/graph`.
- `scripts/app.html`
  - menu mobile Mais.
  - ocultação visual de itens admin para não-admin.
- `scripts/graph.html`
  - renderer SVG puro com zoom, pan, drag de nós e painel por callback.
- `styles/graph.html`
  - estilo do grafo, relações e gerência.
- `styles/responsive.html`
  - ajustes mobile para bottom sheet, grades e formulários.

## Banco de dados / migração

Execute `schema.sql` no SQL Editor do Supabase.

O arquivo é **não destrutivo**:

- usa `CREATE TABLE IF NOT EXISTS`;
- usa `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`;
- usa `DROP POLICY IF EXISTS` antes de recriar policies;
- remove apenas a **view** antiga `graph_edges`, se ela existir;
- não remove tabelas nem dados.

Tabelas/colunas novas ou revisadas:

- `profiles.email`
- `profiles.status`
- `profiles.bio`
- `profiles.avatar_url`
- `profiles.avatar_drive_file_id`
- `profiles.avatar_drive_folder_id`
- `profiles.last_seen_at`
- `graph_nodes`
- `graph_edges`
- `audit_logs`
- `user_progress`, quando ainda não existir

## Relações do grafo

`graph_edges` usa relações genéricas:

- `source_type`
- `source_id`
- `target_type`
- `target_id`
- `relation_type`
- `direction`
- `weight`
- `note`
- `path_id`, opcional

Tipos de nó aceitos:

- `material`
- `path`
- `category`
- `subject`
- `tag`
- `topic`

Tipos de relação aceitos:

- `prerequisite`
- `recommended_after`
- `related`
- `same_author`
- `same_category`
- `same_subject`
- `criticizes`
- `explains`
- `depends_on`
- `part_of`
- `custom`
- `required`
- `recommended`
- `complementary`

Direção:

- `directed`
- `undirected`

## Script Properties necessárias

Configure em **Project Settings > Script Properties**:

```txt
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=sua_anon_publishable_key
SUPABASE_SERVICE_KEY=sua_service_role_key_opcional_backend
DRIVE_FOLDER_ID=id_da_pasta_raiz_do_drive
UPSTASH_REDIS_REST_URL=opcional
UPSTASH_REDIS_REST_TOKEN=opcional
```

Observações:

- `SUPABASE_ANON_KEY` é usada no backend Apps Script para Auth/REST com RLS.
- `SUPABASE_SERVICE_KEY` fica apenas nas Script Properties e não deve aparecer no HTML.
- Upstash é opcional. Se falhar, o app continua usando fallback.

## Deploy

1. Abra o projeto no Google Apps Script.
2. Substitua/adicione os arquivos do ZIP mantendo os mesmos nomes.
3. Rode `schema.sql` no Supabase.
4. Confirme as Script Properties.
5. Implante como Web App:
   - Execute as: `Me` / proprietário do script.
   - Who has access: conforme sua necessidade.
6. Abra a URL `/exec` do Web App.
7. Faça login com uma conta que tenha perfil em `profiles`.
8. Defina pelo SQL ao menos um admin inicial, se necessário:

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'seu-email@exemplo.com';
```

## Segurança

- A gerência é validada no backend por `getMyProfile(accessToken)`.
- Role enviada pelo navegador não é confiável.
- Usuário comum não consegue se promover.
- Editor não consegue virar admin sozinho.
- Último admin ativo não pode ser removido/desativado pelo app.
- Tokens, service key, refresh token, Upstash token e JSON bruto não são exibidos nas telas.
- A tela de erro continua visível para evitar tela branca.
- O Drive continua sendo apenas storage físico; relações apontam para IDs no banco.

## Teste manual recomendado

1. Login com viewer:
   - acessar dashboard, biblioteca, trilhas e grafo público;
   - confirmar que `Gerência` não aparece e que `/gerencia` mostra permissão negada.
2. Login com editor:
   - adicionar material à trilha;
   - alternar Lista/Grafo/Relações;
   - criar relação entre materiais da trilha;
   - criar tópico em Relações.
3. Login com admin:
   - abrir Gerência;
   - buscar usuário;
   - alterar viewer/editor/admin;
   - ativar/desativar usuário;
   - tentar remover o último admin ativo e confirmar bloqueio.
4. Mobile 360px e 390px:
   - abrir bottom nav;
   - usar botão Mais;
   - confirmar acesso a revisão, grafo, relações, categorias, histórico, perfil, configurações e gerência quando admin.
5. Trilhas:
   - abrir detalhe;
   - testar botões de progresso;
   - abrir menu Mais opções no celular;
   - mudar tipo obrigatório/complementar/opcional;
   - subir/descer material.
6. Grafo:
   - zoom in/out;
   - arrastar tela;
   - arrastar nós;
   - clicar em nó;
   - resetar visão;
   - filtrar tipos e relações.
7. Segurança visual:
   - abrir Configurações e Gerência;
   - confirmar que não aparecem tokens, secrets, JSON bruto ou stack com secrets.

## Patch v9 — YouTube, links externos e leitor horizontal

Este patch mantém Google Apps Script + HTML Service + JavaScript puro + includes, Supabase Auth/PostgreSQL/RLS e Google Drive como storage físico. Não usa React, Next, Vue, Angular nem Supabase Storage.

### Novidades

- Nova rota `cadastrar-link` para cadastrar materiais por URL.
- Suporte a:
  - vídeo do YouTube;
  - playlist do YouTube;
  - link externo educacional;
  - artigo externo/site/referência.
- YouTube é salvo como metadado em `study_files`, sem duplicar arquivo físico no Drive.
- Vídeos/playlists podem entrar em trilhas via `study_path_items.position`, como qualquer outro material.
- Detalhe do material mostra embed seguro do YouTube quando possível, com fallback “Abrir fora”.
- Nova rota `leitor` com shell horizontal leve para PDF/livro/apostila/artigo/slide.
- Progresso de leitura/vídeo salvo em `user_file_progress`.
- Mobile reforçado com botões grandes, bottom nav, safe-area, `100dvh` e cards empilhados.

### Rotas novas/revisadas

- `cadastrar-link`
- `leitor`
- `detalhe`
- `trilhas`
- `trilha-detalhe`
- `biblioteca`
- `upload`

### Script Properties

Obrigatórias já existentes:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
DRIVE_FOLDER_ID
```

Opcionais:

```txt
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
YOUTUBE_API_KEY
```

`YOUTUBE_API_KEY` é opcional. Sem ela, o app detecta o link, cria embed e usa thumbnail padrão de vídeo (`img.youtube.com`) quando houver `videoId`. Com ela, o backend tenta buscar título, canal, duração e thumbnail pela YouTube Data API. A chave nunca é enviada ao HTML.

### Ordem recomendada de deploy

1. Execute o `schema.sql` no SQL Editor do Supabase.
2. Confirme que a migração v9 retorna `migration_v9_youtube_reader_ok`.
3. Atualize os arquivos `.gs`, `views`, `styles`, `partials` e `scripts` no Apps Script.
4. Configure/valide as Script Properties.
5. Faça novo deploy do Web App.
6. Limpe cache do navegador se a versão antiga ficar presa.

### Testes manuais do patch v9

- Abrir `Cadastrar link` no desktop e no celular.
- Cadastrar `https://www.youtube.com/watch?v=VIDEO_ID`.
- Cadastrar `https://youtu.be/VIDEO_ID`.
- Cadastrar `https://www.youtube.com/playlist?list=PLAYLIST_ID`.
- Cadastrar um link externo genérico.
- Ver os cards na Biblioteca com badges corretos.
- Abrir detalhe de vídeo e conferir embed/fallback.
- Abrir detalhe de playlist e conferir embed/fallback.
- Adicionar vídeo e playlist a uma trilha.
- Reordenar itens da trilha.
- Marcar assistindo/concluído/revisar depois.
- Abrir PDF/livro no `Leitor`.
- Usar próxima/anterior página, zoom, ajustar largura/altura e tela cheia.
- Retomar progresso salvo.
- Testar larguras 360px, 390px, 768px e desktop.
- Conferir que não aparece JSON bruto, access token, refresh token, service key, anon key completa, Upstash token ou YouTube API key no HTML.

### Segurança

- O backend valida protocolo e bloqueia `javascript:`, `data:`, `file:` e `blob:`.
- Embeds são limitados a domínios seguros: YouTube/YouTube nocookie/Drive.
- Links externos ficam apenas como metadados no Supabase.
- Service key, Upstash token e YouTube API key permanecem somente em `PropertiesService`.

## Patch v11 — Grafo de trilhas recolhidas e sessão persistente

Este patch corrige o erro de frontend `escAttr is not defined` e muda o comportamento do grafo geral:

- o grafo geral inicia mostrando somente nós de trilhas;
- materiais, PDFs, livros, vídeos e playlists só aparecem quando uma trilha é expandida;
- clicar em uma trilha abre o painel com ações para abrir, expandir/recolher e ver somente aquela trilha;
- o grafo de detalhe da trilha continua mostrando os materiais, agora ordenados pela posição da trilha;
- o drag de nós foi ajustado para não re-renderizar o SVG inteiro durante o movimento;
- posições continuam salvas em `localStorage` por escopo;
- a tela de login agora grava sessão também em `localStorage`, permitindo restaurar após F5 quando houver token válido;
- `loginUser` passa a devolver `refreshToken` e `expiresAt` quando o Supabase retornar esses campos.

### Deploy do patch v11

1. Substitua os arquivos alterados no projeto Apps Script.
2. Faça novo deploy como Web App.
3. Não há migration obrigatória neste patch.
4. Limpe o cache do navegador apenas se o grafo insistir em usar HTML antigo.
5. Teste login, F5, grafo geral, expansão/recolhimento de trilhas e grafo da trilha.

### Testes manuais recomendados

- Abrir `?page=grafo` e confirmar que só trilhas aparecem inicialmente.
- Clicar numa trilha e usar “Expandir trilha”.
- Confirmar que os materiais aparecem em sequência.
- Recolher a trilha e confirmar que os materiais somem.
- Usar “Ver somente esta trilha”.
- Arrastar nós várias vezes seguidas sem travar.
- Clicar em node de trilha e confirmar que não aparece `escAttr is not defined`.
- Fazer login, apertar F5 e confirmar que o app não perde a sessão imediatamente.
- Fazer logout e confirmar que a sessão local é limpa.

---

## Patch v12 — Resenhas públicas e expansão real de trilhas no grafo

### Novidades

- Nova rota `resenhas` para comentários, notas de leitura, perguntas e resenhas críticas públicas ligadas aos materiais da biblioteca.
- Menu lateral e menu mobile receberam o item **Resenhas**.
- Tela de detalhe do material recebeu bloco **Resenhas e debate**, com botões para ver resenhas do material ou escrever uma nova.
- Migration `migration_v12_reviews.sql` cria as tabelas:
  - `review_posts`
  - `review_comments`
  - `review_reactions`
  - `review_saves`
  - `review_links`
- Backend novo em `gs/Reviews.gs` com funções para listar, criar, comentar, curtir e salvar resenhas.
- O grafo geral continua iniciando apenas com trilhas, mas agora um clique no node de trilha expande os materiais imediatamente.
- O filtro de busca do grafo não esconde materiais internos quando uma trilha filtrada é expandida.

### Deploy do banco

Execute no Supabase SQL Editor:

```sql
-- arquivo: migration_v12_reviews.sql
```

Depois aguarde alguns segundos para o PostgREST recarregar o schema.

### Teste manual v12

1. Execute `migration_v12_reviews.sql`.
2. Publique o Apps Script com os arquivos atualizados.
3. Entre no app e abra `?page=resenhas`.
4. Clique em **Nova resenha**.
5. Selecione um material aprovado.
6. Publique uma resenha pública.
7. Abra o detalhe do material e confira o bloco **Resenhas e debate**.
8. Clique em **Ver resenhas** e confirme o filtro por material.
9. Abra o grafo geral.
10. Confirme que aparecem apenas trilhas inicialmente.
11. Clique em uma trilha e confirme que os materiais aparecem como nodes azuis.
12. Recolha/expanda a trilha pelo painel.

### Segurança

- O texto das resenhas e comentários é tratado como texto puro no frontend.
- O backend não confia em `author_user_id` vindo do navegador.
- Tokens e secrets não são renderizados na tela.
- RLS usa `auth.uid()` para autor das resenhas/comentários.

## v13 — Hotfix Resenhas/RLS

Este patch corrige o erro ao publicar resenhas:

`new row violates row-level security policy for table "review_posts"`

Causa: a versão anterior enviava `author_profile_id` com `profiles.id` e `author_user_id` com o `auth.uid()`. Algumas policies tentadas usavam `coalesce(author_profile_id, author_user_id, auth.uid())`, então o PostgreSQL comparava `profiles.id` com `auth.uid()` e bloqueava o insert.

Correção:

- `gs/Reviews.gs` agora envia `author_user_id` como identificador principal do autor, compatível com `auth.uid()`.
- Criada a migration `migration_v13_reviews_rls_fix.sql`, que torna as policies compatíveis com os dois campos:
  - `author_user_id = auth.uid()`;
  - `author_profile_id = current_profile_id()`.
- Adicionado trigger para sincronizar os campos quando possível.

### Deploy do v13

1. Atualize os arquivos no Apps Script.
2. Execute `migration_v13_reviews_rls_fix.sql` no SQL Editor do Supabase.
3. Aguarde 10 a 30 segundos para o cache do PostgREST atualizar.
4. Publique uma nova versão do Web App.
5. Faça logout/login se ainda estiver com sessão antiga.
6. Teste criar uma resenha pública.


## v15 — Hotfix autores em Resenhas

Correção incremental na área **Resenhas e Comentários**:

- Resenhas e comentários agora tentam hidratar o autor por `author_user_id` e `author_profile_id`.
- O backend busca perfis por `profiles.user_id` e `profiles.id`, com fallback para o perfil logado quando a publicação é do próprio usuário.
- O feed, o detalhe da resenha e os comentários agora exibem nome e foto/avatar do autor quando disponíveis.
- O HTML da tela de detalhe passou a renderizar avatar do autor e avatar dos comentários.
- Não há migration obrigatória neste patch; ele assume as migrations v12/v13 já aplicadas para tabelas de resenhas e compatibilidade `author_profile_id`.

### Teste manual v15

1. Entrar no app.
2. Abrir **Resenhas**.
3. Criar uma nova resenha.
4. Conferir se o card mostra o nome e foto do usuário.
5. Clicar em **Ver completo** ou **Debate**.
6. Conferir se o detalhe mostra o nome e foto do autor.
7. Escrever um comentário.
8. Conferir se o comentário mostra o nome e foto do usuário.
9. Clicar em curtir e confirmar que o feed não volta a exibir apenas “Usuário”.

## Patch v16 — Resenhas: estado ativo e limpeza de script solto

Este pacote mantém as correções anteriores e adiciona:

- remoção do arquivo `_script_0.js`, que era JS de frontend salvo por engano como arquivo Apps Script e causava `URLSearchParams is not defined`;
- `views/resenhas.html` sem dependência de `URLSearchParams`, usando parser próprio de query string;
- botões de curtir e salvar com estado visual ativo em azul quando o usuário atual já curtiu/salvou;
- hidratação backend de `viewer_liked` e `viewer_saved` em `gs/Reviews.gs`;
- estado ativo também para curtidas em comentários no detalhe/debate;
- migration complementar `migration_v16_reviews_comments_rls_fix.sql` para corrigir RLS de comentários, caso ainda seja necessário.

### Deploy recomendado

1. Envie os arquivos do ZIP para o Apps Script.
2. Confirme que `_script_0.js` não existe mais no projeto.
3. Publique uma nova versão do Web App.
4. Se comentários ainda derem erro de RLS, execute `migration_v16_reviews_comments_rls_fix.sql` no Supabase.
5. Recarregue o app, faça login novamente e teste Resenhas.

### Testes rápidos

- Abrir `Resenhas` sem erro `URLSearchParams`.
- Curtir uma resenha e confirmar que o botão fica azul.
- Salvar uma resenha e confirmar que o botão fica azul.
- Abrir o debate e comentar.
- Curtir comentário e confirmar estado visual ativo.


## v19 — Hotfix RLS Resenhas

- Corrige erro `new row violates row-level security policy for table "review_posts"`.
- Rode `migration_v19_reviews_rls_hotfix.sql` no Supabase.
- Suba os arquivos atualizados no Apps Script e publique nova versão.


## v21 — Hotfix Dark Mode e autores das resenhas

Correções aplicadas:

- Restaurado suporte consistente ao modo noturno após aplicação dos estilos do Google Stitch.
- Adicionadas regras de compatibilidade para classes visuais tipo `bg-surface-container-lowest`, `text-on-surface`, `border-outline-variant`, etc. obedecerem aos tokens CSS do app.
- Corrigido fallback de autores nas resenhas: posts e comentários agora usam RPC segura e snapshots públicos (`author_name_snapshot`, `author_avatar_snapshot`) para evitar que publicações de outros usuários apareçam como apenas “Usuário”.
- Criada migration `migration_v21_reviews_author_darkmode_fix.sql`.

Depois de subir o ZIP, execute a migration v21 no Supabase e publique uma nova versão do Web App.

---

## v22 — Hotfix visual dos cards e autores das resenhas

Patch incremental sobre o v21.

### Correções principais

- Melhorou o visual dos cards de **Resenhas e Comentários** no modo claro e escuro.
- Melhorou o contraste dos cards/painéis do **Grafo** e **Relações** no modo noturno.
- Corrigiu a hidratação de autores de resenhas de outros usuários, evitando fallback genérico `Usuário` quando houver perfil público ou snapshot salvo.
- Adicionou RPC `get_public_profiles_for_review_v2(ids text[])` para buscar dados públicos de perfis sem depender do SELECT direto em `profiles` bloqueado por RLS.
- Adicionou trigger para novas resenhas/comentários já salvarem `author_name_snapshot` e `author_avatar_snapshot`.

### SQL necessário

Execute `migration_v22_reviews_authors_and_cards_fix.sql` no SQL Editor do Supabase para corrigir os autores antigos e habilitar a RPC v2.

### Teste rápido

1. Rodar a migration v22.
2. Publicar o Web App.
3. Abrir `Resenhas`.
4. Confirmar que posts de outros usuários mostram nome/foto quando existirem no perfil.
5. Alternar modo claro/escuro.
6. Conferir cards de Resenhas, Grafo, Relações e Trilhas.

## v23 — Persistência de posições dos grafos

Este patch adiciona persistência das posições dos nodes do grafo no Supabase.

### O que muda

- O grafo geral salva posições por usuário no escopo `general`.
- O grafo de uma trilha salva posições por usuário no escopo `learning_path` com `scope_id = id da trilha`.
- Ao arrastar um node e soltar, o app salva automaticamente o layout.
- Ao abrir em outro navegador ou outro PC com o mesmo usuário, o layout é restaurado.
- O `localStorage` continua como fallback rápido local, mas o Supabase é a fonte para sincronizar entre sessões.
- O botão de reset do grafo limpa as posições salvas do escopo atual.

### Migration necessária

Execute no Supabase o arquivo:

```txt
migration_v23_graph_node_positions.sql
```

Ele cria a tabela `graph_node_positions`, índices, coluna gerada `scope_id_key` e policies RLS para cada usuário acessar apenas suas próprias posições.

### Arquivos principais

```txt
gs/GraphPositions.gs
scripts/graph.html
views/grafo.html
views/trilhas.html
migration_v23_graph_node_positions.sql
```
