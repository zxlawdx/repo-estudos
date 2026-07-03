# Como rodar o projeto

## 1. Apps Script (backend legado)

1. Abra o projeto Apps Script já existente (código em `appscript/gs`, `appscript/views`, etc. — copiado aqui apenas para versionamento; o projeto real vive no editor do Google Apps Script).
2. Configure `APPS_SCRIPT_API_SECRET` nas Script Properties (veja `docs/APPS_SCRIPT_API.md`).
3. Implante como Web App e copie a URL `/exec`.

## 2. Backend Spring Boot

```bash
cd backend/system
cp ../../.env.example .env   # preencha os valores
export $(cat .env | xargs)   # ou configure as variáveis do seu jeito
./gradlew bootRun
```

O backend sobe em `http://localhost:8081`.

Variáveis obrigatórias:
- `APPS_SCRIPT_API_URL`
- `APPS_SCRIPT_API_SECRET`

## 3. Frontend Angular

```bash
cd frontend
npm install
npm start
```

O frontend sobe em `http://localhost:4200` e chama o backend em `http://localhost:8081/api` (configurado em `src/environments/environment.ts`).

## 4. Com Docker Compose

```bash
cp .env.example .env   # preencha os valores
docker compose up --build
```

- Backend: `http://localhost:8081`
- Frontend: `http://localhost:8080`

## 5. Como testar

```bash
curl http://localhost:8081/api/drive/health

curl -X POST http://localhost:8081/api/appscript-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"voce@exemplo.com","password":"sua-senha"}'

curl http://localhost:8081/api/files

curl -X POST http://localhost:8081/api/files/upload \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -F "file=@/caminho/arquivo.pdf" \
  -F "finalName=arquivo.pdf" \
  -F "visibility=public" \
  -F "status=pending"

curl -X POST http://localhost:8081/api/files/link \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtube.com/watch?v=..."}'

curl -X POST http://localhost:8081/api/profile/photo \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -F "file=@/caminho/foto.jpg"

curl http://localhost:8081/api/graph

curl -X POST http://localhost:8081/api/graph/positions \
  -H "Content-Type: application/json" \
  -d '{"positions":[{"nodeKey":"material:123","x":100,"y":200}]}'
```
