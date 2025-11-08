// Netlify Function: generate-content
// Generates daily devotional/study content using a free AI API when available.
// Supports Gemini (Google Generative Language API) via GOOGLE_API_KEY.

const fetch = require('node-fetch');

function buildPrompt(kind) {
  const date = new Date().toISOString().slice(0, 10);
  const header = kind === 'devotional' ? 'Devocional diário' : 'Estudo bíblico diário';
  return `${header} (${date})\n\nRegras:\n- Idioma: Português (Brasil).\n- Tom: claro, respeitoso e bíblico.\n- Estrutura: título, referência(s) bíblica(s), texto principal em 3-5 parágrafos, aplicação prática em 2-3 pontos, oração final curta.\n- Referências: use livros e capítulos reais (ex.: João 3:16, Salmos 23).\n- Evite linguagem sensível e especulações extra-bíblicas.\n\nGere o conteúdo completo em Markdown.`;
}

function buildGeminiEndpoint(key) {
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1';
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  return `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${key}`;
}

async function generateWithGemini(kind) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    return { text: `Placeholder (${kind}): configure GOOGLE_API_KEY para geração real.` };
  }
  const endpoint = buildGeminiEndpoint(key);
  const body = {
    contents: [{ parts: [{ text: buildPrompt(kind) }] }]
  };
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const candidate = data.candidates && data.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  const text = parts && parts[0] && (parts[0].text || parts[0].inline_data && parts[0].inline_data.data) || '';
  return { text: text || 'Sem conteúdo retornado.' };
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };
  try {
    const kind = (event.queryStringParameters && event.queryStringParameters.kind) || 'devotional';
    const result = await generateWithGemini(kind);
    return { statusCode: 200, headers, body: JSON.stringify({ kind, text: result.text }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};