# Repositório de Estudos

Plataforma acadêmica para organizar, categorizar e estudar materiais (PDFs, links, vídeos) em trilhas de aprendizado, com grafo de relações entre conteúdos.

## Arquitetura híbrida

```
Angular  ──▶  Spring Boot  ──▶  Apps Script API  ──▶  Google Drive / Supabase / Upstash
```

- **`backend/system`** — backend principal em Spring Boot (Java 21 + Gradle Kotlin DSL). Além do que já existia (`auth`, `user`), agora também expõe rotas `/api/**` que funcionam como proxy para o Apps Script.
- **`frontend/`** — novo frontend Angular, seguindo o design do modelo Stitch (Tailwind, Material Symbols, fonte Inter).
- **`appscript/`** — projeto Google Apps Script (HTML Service) já existente, com toda a regra de negócio de Drive/Supabase/Upstash. Foi adicionado apenas `appscript/gs/Api.gs`, uma API privada (`doPost`) que reaproveita as funções já existentes sem alterá-las.
- **`docs/`** — documentação da arquitetura, da API do Apps Script e de como rodar o projeto localmente ou via Docker.

Veja detalhes completos em:
- [`docs/ARQUITETURA_HIBRIDA.md`](docs/ARQUITETURA_HIBRIDA.md)
- [`docs/APPS_SCRIPT_API.md`](docs/APPS_SCRIPT_API.md)
- [`docs/COMO_RODAR.md`](docs/COMO_RODAR.md)

## Rodando rapidamente

```bash
cp .env.example .env   # preencha APPS_SCRIPT_API_URL e APPS_SCRIPT_API_SECRET
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:8081

## Estrutura do repositório

```
/
├── backend/system/         # Spring Boot (existente + novos packages de proxy)
├── frontend/                # Angular (novo)
├── appscript/                # Apps Script (existente + Api.gs novo)
├── docs/                     # Documentação
├── docker-compose.yml
└── .env.example
```
