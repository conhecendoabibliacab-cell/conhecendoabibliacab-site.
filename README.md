# 3CAB — Configuração de API Keys

Este projeto suporta geração diária de conteúdo (devocional/estudo) e busca de versículos diretamente nas páginas, usando funções serverless e automações gratuitas.

## Onde adicionar as API keys

- Netlify (produção):
  - Adicione variáveis no Site → Site configuration → Environment variables:
    - `GOOGLE_API_KEY` — chave do Gemini (Google Generative Language API). Usada em `netlify/functions/generate-content.js` e `scripts/generate_daily.js`.
    - `BIBLE_API_BASE_URL` (opcional) — URL do provedor da Bíblia. Padrão: `https://bible-api.com`.
    - `BIBLE_TRANSLATION` (opcional) — tradução a usar. Padrão: `almeida`.
    - `BIBLE_API_KEY` (opcional) — chave para provedor da Bíblia, se exigir.
    - `BIBLE_API_HOST_HEADER` (opcional) — nome do header para enviar a chave (ex.: `API-KEY`, `X-API-Key`). Se vazio, será usado `Authorization: Bearer <key>`.

- GitHub Actions (automação diária):
  - Em Settings → Secrets and variables → Actions → New repository secret:
    - `GOOGLE_API_KEY` — mesma chave do Gemini para gerar conteúdo no workflow `.github/workflows/daily-content.yml`.

- Desenvolvimento local:
  - Copie `.env.example` para `.env` e preencha as variáveis conforme necessário.
  - Se usar Netlify CLI, ele lerá `.env` e injetará nas funções durante `netlify dev`.

## Locais corretos no código

- Versículos na aba de "Versículo":
  - As páginas de conteúdo possuem um formulário de pesquisa que dispara `setupAIAndBible(...)` (em `scripts.js`).
  - Este script chama `/.netlify/functions/bible?ref=<consulta>`. A função da Bíblia foi atualizada para ler:
    - `BIBLE_API_BASE_URL`, `BIBLE_TRANSLATION`, `BIBLE_API_KEY`, `BIBLE_API_HOST_HEADER`.
  - O retorno é formatado como lista de versículos e exibido no elemento `<pre id="bible-output-...">` da aba.

- Geração de conteúdo (IA):
  - `netlify/functions/generate-content.js` usa `GOOGLE_API_KEY` para chamar o Gemini.
  - `.github/workflows/daily-content.yml` injeta `GOOGLE_API_KEY` para executar `scripts/generate_daily.js` diariamente e salvar arquivos em `content/YYYY-MM-DD.json`.

## Observações

- Provedor padrão de Bíblia é `bible-api.com` (sem custo e sem chave). Se você usar um provedor alternativo que exija chave, configure as variáveis citadas acima e mantenha o endpoint no formato `${BASE}/${ref}?translation=${TRANSLATION}` (se o seu provedor usar formato diferente, adapte o `netlify/functions/bible.js`).
- As chaves NÃO devem ser expostas no front-end; mantenha-as como variáveis de ambiente no Netlify e GitHub.