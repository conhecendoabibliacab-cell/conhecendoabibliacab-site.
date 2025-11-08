// Node script: generate_daily.js
// Runs in GitHub Actions on a daily schedule to create a content file.
// Uses Gemini via GOOGLE_API_KEY (free tier with limits).

const fs = require('fs');
const path = require('path');

async function main() {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const iso = `${yyyy}-${mm}-${dd}`;

  // Alternate between devotional and study: even days -> devotional, odd -> study
  const kind = Number(dd) % 2 === 0 ? 'devotional' : 'study';

  const apiKey = process.env.GOOGLE_API_KEY;
  let text = `Placeholder (${kind}) for ${iso}. Configure GOOGLE_API_KEY to enable real generation.`;
  if (apiKey) {
    const fetch = (await import('node-fetch')).default;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const prompt = kind === 'devotional' ? 'Escreva um devocional conforme regras:' : 'Escreva um estudo bíblico conforme regras:';
    const body = { contents: [{ parts: [{ text: `${prompt} em PT-BR, com título, referências, texto, aplicação (bullet points) e oração final.` }] }] };
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      const candidate = data.candidates && data.candidates[0];
      const parts = candidate && candidate.content && candidate.content.parts;
      text = parts && parts[0] && (parts[0].text || parts[0].inline_data && parts[0].inline_data.data) || text;
    } catch (e) {
      console.warn('Gemini generation failed:', e.message);
    }
  }

  const outDir = path.join(process.cwd(), 'content');
  const outPath = path.join(outDir, `${iso}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ date: iso, kind, text }, null, 2), 'utf8');
  console.log('Wrote', outPath);

  // Update content/index.json to point to latest file for frontend fallback
  const indexPath = path.join(outDir, 'index.json');
  let indexData = {};
  try {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {}
  indexData.latest = `${iso}.json`;
  indexData.meta = { date: iso, kind };
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log('Updated index', indexPath);
}

main().catch(err => { console.error(err); process.exit(1); });