// Configurações básicas
const ADMIN_EMAILS = ["admin@exemplo.com", "conhecendoabibliacab@gmail.com"];

// Utilitários
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// Utilitário: base de funções Netlify
function fnUrl(path) {
  try {
    const host = location.hostname || '';
    const isLocal = host === 'localhost' || host.startsWith('127.');
    const base = isLocal ? 'https://conhecendoabibliacab.netlify.app' : '';
    return `${base}${path}`;
  } catch { return path; }
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW register falhou', err));
  });
}

// Protótipo simples de sessão
function currentUser() {
  try { return JSON.parse(localStorage.getItem('session')) || null; } catch { return null; }
}

// Proteção de páginas de conteúdo (exemplo)
function guardContentPage() {
  const user = currentUser();
  const protected = qsa('[data-protected="true"]');
  if (!protected.length) return;
  if (!user) {
    protected.forEach(el => { el.innerHTML = '<div class="error">Faça login para ver este conteúdo.</div>'; });
  }
}

// Utilitário: hash de senha SHA-256 -> hex
async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Página de registro com senha
function initRegister() {
  const form = qs('#register-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = qs('#register-email')?.value?.trim();
    const pass = qs('#register-password')?.value || '';
    const pass2 = qs('#register-confirm')?.value || '';
    if (!email) { alert('Informe seu e-mail'); return; }
    if (!pass || pass.length < 6) { alert('Informe uma senha com pelo menos 6 caracteres'); return; }
    if (pass !== pass2) { alert('Senhas não conferem'); return; }
    let users = [];
    try { users = JSON.parse(localStorage.getItem('users')) || []; } catch {}
    if (users.find(u => u.email === email)) { alert('E-mail já cadastrado'); return; }
    const passwordHash = await hashPassword(pass);
    users.push({ email, passwordHash });
    localStorage.setItem('users', JSON.stringify(users));
    // Opcional: chamar função Netlify para e-mail de boas-vindas
    try {
      await fetch('/.netlify/functions/send-registration-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
    } catch {}
    alert('Cadastro realizado! Você pode fazer login agora.');
    location.href = '/login.html';
  });
}

// Página de login com verificação de senha
function initLogin() {
  const form = qs('#login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = qs('#login-email')?.value?.trim();
    const pass = qs('#login-password')?.value || '';
    if (!email || !pass) { alert('Informe e-mail e senha'); return; }
    let users = [];
    try { users = JSON.parse(localStorage.getItem('users')) || []; } catch {}
    const user = users.find(u => u.email === email);
    if (!user) { alert('Usuário não encontrado. Faça o cadastro.'); return; }
    const passHash = await hashPassword(pass);
    if (user.passwordHash !== passHash) { alert('Senha incorreta'); return; }
    localStorage.setItem('session', JSON.stringify({ email }));
    alert('Login realizado!');
    location.href = '/';
  });
}

// Proteção da página admin
function guardAdminPage() {
  const user = currentUser();
  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    const content = qs('#admin-content');
    if (content) content.innerHTML = '<div class="error">Acesso restrito. Faça login como administrador.</div>';
  }
}

// Configuração de uso de IA no admin (exemplo)
function setupAdminAI() {
  const form = qs('#admin-ai-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = qs('#admin-ai-prompt')?.value?.trim();
    const key = qs('#admin-key')?.value?.trim();
    if (!prompt || !key) { alert('Informe prompt e chave admin'); return; }
    try {
      // Função antiga removida: em vez disso, usamos generate-content com tipos predefinidos.
      const res = await fetch('/.netlify/functions/generate-content?kind=devotional');
      const data = await res.json();
      qs('#admin-ai-output').textContent = data.text || JSON.stringify(data);
    } catch (err) {
      qs('#admin-ai-output').textContent = 'Erro: ' + err.message;
    }
  });
}

// Admin: status das configurações sem expor segredos
function setupAdminConfigStatus() {
  const aiEl = qs('#status-ai');
  const bBaseEl = qs('#status-bible-base');
  const bTransEl = qs('#status-bible-translation');
  const bKeyEl = qs('#status-bible-key');
  const bHeadEl = qs('#status-bible-header');
  if (!aiEl || !bBaseEl || !bTransEl || !bKeyEl || !bHeadEl) return;
  fetch(fnUrl('/.netlify/functions/config-status'))
    .then(r => r.json())
    .then(cfg => {
      aiEl.textContent = cfg.ai?.hasKey ? `Chave configurada (${cfg.ai.maskedKey})` : 'Sem chave configurada';
      bBaseEl.textContent = `Base: ${cfg.bible?.baseUrl || '-'}`;
      bTransEl.textContent = `Tradução: ${cfg.bible?.translation || '-'}`;
      bKeyEl.textContent = cfg.bible?.hasKey ? `Chave configurada (${cfg.bible.maskedKey})` : 'Sem chave configurada';
      bHeadEl.textContent = `Header: ${cfg.bible?.headerName || '-'}`;
    })
    .catch(() => { aiEl.textContent = 'Falha ao carregar status'; });
}

// Admin: teste da Bíblia
function setupAdminBibleTest() {
  const form = qs('#admin-bible-form');
  const input = qs('#admin-bible-query');
  const out = qs('#admin-bible-output');
  if (!form || !input || !out) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ref = input.value.trim();
    if (!ref) return;
    out.textContent = 'Carregando...';
    try {
      const res = await fetch(fnUrl(`/.netlify/functions/bible?ref=${encodeURIComponent(ref)}`));
      if (!res.ok) { throw new Error(`HTTP ${res.status}: ${await res.text()}`); }
      const data = await res.json();
      out.textContent = data.text || JSON.stringify(data);
    } catch (err) {
      out.textContent = 'Erro ao buscar passagem: ' + err.message;
    }
  });
}

// Admin: gerar conteúdo diário
function setupAdminGenerateContent() {
  const form = qs('#admin-gen-form');
  const kindSel = qs('#admin-gen-kind');
  const out = qs('#admin-gen-output');
  const modelEl = qs('#admin-gen-model');
  const sectionSel = qs('#admin-gen-section');
  const sectionCustom = qs('#admin-gen-section-custom');
  if (!form || !kindSel || !out) return;

  // Mostrar campo de seção personalizada quando apropriado
  if (sectionSel && sectionCustom) {
    const updateSectionVisibility = () => {
      const isDevotional = (kindSel.value || 'devotional') === 'devotional';
      const isCustom = sectionSel.value === 'custom';
      sectionSel.style.display = isDevotional ? '' : 'none';
      sectionCustom.style.display = isDevotional && isCustom ? '' : 'none';
    };
    kindSel.addEventListener('change', updateSectionVisibility);
    sectionSel.addEventListener('change', updateSectionVisibility);
    updateSectionVisibility();
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kind = kindSel.value || 'devotional';
    const section = (kind === 'devotional')
      ? (sectionSel?.value === 'custom' ? (sectionCustom?.value.trim() || '') : (sectionSel?.value || ''))
      : '';
    out.textContent = 'Gerando...';
    try {
      const res = await fetch(fnUrl(`/.netlify/functions/generate-content?kind=${encodeURIComponent(kind)}`));
      if (!res.ok) { throw new Error(`HTTP ${res.status}: ${await res.text()}`); }
      const data = await res.json();
      out.textContent = data.text || JSON.stringify(data);
      if (modelEl) { modelEl.textContent = `Modelo: ${data.model || '—'}`; }
      // Guarda último conteúdo gerado para publicação manual
      window._lastGeneratedContent = { kind, text: data.text || '', model: data.model || '', section };
    } catch (err) {
      out.textContent = 'Erro ao gerar conteúdo: ' + err.message;
    }
  });
}

// Admin: publicar diário agora (gera arquivo JSON para download)
function setupAdminPublishNow() {
  const btn = qs('#admin-publish-btn');
  const kindSel = qs('#admin-gen-kind');
  const out = qs('#admin-gen-output');
  const sectionSel = qs('#admin-gen-section');
  const sectionCustom = qs('#admin-gen-section-custom');
  if (!btn || !kindSel || !out) return;
  btn.addEventListener('click', async () => {
    try {
      let payload = window._lastGeneratedContent;
      const kind = kindSel.value || 'devotional';
      const section = (kind === 'devotional')
        ? (sectionSel?.value === 'custom' ? (sectionCustom?.value.trim() || '') : (sectionSel?.value || ''))
        : '';
      if (!payload || !payload.text) {
        out.textContent = 'Gerando conteúdo antes de publicar...';
        const res = await fetch(fnUrl(`/.netlify/functions/generate-content?kind=${encodeURIComponent(kind)}`));
        if (!res.ok) { throw new Error(`HTTP ${res.status}: ${await res.text()}`); }
        const data = await res.json();
        payload = { kind, text: data.text || '', section };
        window._lastGeneratedContent = payload;
      }
      const date = new Date().toISOString().slice(0,10);
      const base = { date, kind: payload.kind, text: payload.text };
      if (payload.kind === 'devotional' && (payload.section || section)) {
        base.section = payload.section || section;
      }
      const json = JSON.stringify(base, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content_${date}_${payload.kind}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      out.textContent = `Arquivo gerado: content/${date}.json (${payload.kind}). Faça upload/commit para publicar.`;
    } catch (err) {
      out.textContent = 'Erro ao publicar: ' + err.message;
    }
  });
}

// Admin: copiar e baixar conteúdo gerado em Markdown
function setupAdminCopyAndDownload() {
  const copyBtn = qs('#admin-copy-btn');
  const downloadMdBtn = qs('#admin-download-md-btn');
  const out = qs('#admin-gen-output');
  if (!copyBtn || !downloadMdBtn || !out) return;

  copyBtn.addEventListener('click', async () => {
    try {
      const payload = window._lastGeneratedContent;
      const text = payload?.text || out.textContent || '';
      if (!text) { out.textContent = 'Nenhum conteúdo para copiar. Gere primeiro.'; return; }
      await navigator.clipboard.writeText(text);
      out.textContent = 'Conteúdo copiado para a área de transferência.';
    } catch (err) {
      out.textContent = 'Falha ao copiar: ' + err.message;
    }
  });

  downloadMdBtn.addEventListener('click', () => {
    try {
      const payload = window._lastGeneratedContent || {};
      const text = payload.text || out.textContent || '';
      const kind = payload.kind || 'devotional';
      if (!text) { out.textContent = 'Nenhum conteúdo para baixar. Gere primeiro.'; return; }
      const date = new Date().toISOString().slice(0,10);
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diario_${date}_${kind}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      out.textContent = `Arquivo Markdown baixado: diario_${date}_${kind}.md`;
    } catch (err) {
      out.textContent = 'Falha ao baixar: ' + err.message;
    }
  });
}

// Configuração da busca bíblica em páginas de conteúdo
function setupAIAndBible(suffix = '') {
  const form = qs(`#bible-form${suffix}`);
  const input = qs(`#bible-query${suffix}`);
  const out = qs(`#bible-output${suffix}`);
  if (!form || !input || !out) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    out.textContent = 'Carregando...';
    try {
      const res = await fetch(`/.netlify/functions/bible?ref=${encodeURIComponent(query)}`);
      const data = await res.json();
      out.textContent = data.text || JSON.stringify(data);
    } catch (err) {
      out.textContent = 'Erro ao buscar passagem: ' + err.message;
    }
  });
}

// ----- Estudos Bíblicos -----
const BIBLE_STRUCTURE = [
  { group: 'Pentateuco', books: [
    { id: 'Genesis', name: 'Gênesis', chapters: 50 },
    { id: 'Exodus', name: 'Êxodo', chapters: 40 },
    { id: 'Leviticus', name: 'Levítico', chapters: 27 },
    { id: 'Numbers', name: 'Números', chapters: 36 },
    { id: 'Deuteronomy', name: 'Deuteronômio', chapters: 34 }
  ]},
  { group: 'Históricos', books: [
    { id: 'Joshua', name: 'Josué', chapters: 24 },
    { id: 'Judges', name: 'Juízes', chapters: 21 },
    { id: 'Ruth', name: 'Rute', chapters: 4 },
    { id: '1Samuel', name: '1 Samuel', chapters: 31 },
    { id: '2Samuel', name: '2 Samuel', chapters: 24 },
    { id: '1Kings', name: '1 Reis', chapters: 22 },
    { id: '2Kings', name: '2 Reis', chapters: 25 },
    { id: '1Chronicles', name: '1 Crônicas', chapters: 29 },
    { id: '2Chronicles', name: '2 Crônicas', chapters: 36 },
    { id: 'Ezra', name: 'Esdras', chapters: 10 },
    { id: 'Nehemiah', name: 'Neemias', chapters: 13 },
    { id: 'Esther', name: 'Ester', chapters: 10 }
  ]},
  { group: 'Poéticos', books: [
    { id: 'Job', name: 'Jó', chapters: 42 },
    { id: 'Psalms', name: 'Salmos', chapters: 150 },
    { id: 'Proverbs', name: 'Provérbios', chapters: 31 },
    { id: 'Ecclesiastes', name: 'Eclesiastes', chapters: 12 },
    { id: 'SongOfSolomon', name: 'Cantares', chapters: 8 }
  ]},
  { group: 'Profetas Maiores', books: [
    { id: 'Isaiah', name: 'Isaías', chapters: 66 },
    { id: 'Jeremiah', name: 'Jeremias', chapters: 52 },
    { id: 'Lamentations', name: 'Lamentações', chapters: 5 },
    { id: 'Ezekiel', name: 'Ezequiel', chapters: 48 },
    { id: 'Daniel', name: 'Daniel', chapters: 12 }
  ]},
  { group: 'Profetas Menores', books: [
    { id: 'Hosea', name: 'Oséias', chapters: 14 },
    { id: 'Joel', name: 'Joel', chapters: 3 },
    { id: 'Amos', name: 'Amós', chapters: 9 },
    { id: 'Obadiah', name: 'Obadias', chapters: 1 },
    { id: 'Jonah', name: 'Jonas', chapters: 4 },
    { id: 'Micah', name: 'Miquéias', chapters: 7 },
    { id: 'Nahum', name: 'Naum', chapters: 3 },
    { id: 'Habakkuk', name: 'Habacuque', chapters: 3 },
    { id: 'Zephaniah', name: 'Sofonias', chapters: 3 },
    { id: 'Haggai', name: 'Ageu', chapters: 2 },
    { id: 'Zechariah', name: 'Zacarias', chapters: 14 },
    { id: 'Malachi', name: 'Malaquias', chapters: 4 }
  ]},
  { group: 'Evangelhos', books: [
    { id: 'Matthew', name: 'Mateus', chapters: 28 },
    { id: 'Mark', name: 'Marcos', chapters: 16 },
    { id: 'Luke', name: 'Lucas', chapters: 24 },
    { id: 'John', name: 'João', chapters: 21 }
  ]},
  { group: 'Histórico', books: [ { id: 'Acts', name: 'Atos', chapters: 28 } ]},
  { group: 'Cartas Paulinas', books: [
    { id: 'Romans', name: 'Romanos', chapters: 16 },
    { id: '1Corinthians', name: '1 Coríntios', chapters: 16 },
    { id: '2Corinthians', name: '2 Coríntios', chapters: 13 },
    { id: 'Galatians', name: 'Gálatas', chapters: 6 },
    { id: 'Ephesians', name: 'Efésios', chapters: 6 },
    { id: 'Philippians', name: 'Filipenses', chapters: 4 },
    { id: 'Colossians', name: 'Colossenses', chapters: 4 },
    { id: '1Thessalonians', name: '1 Tessalonicenses', chapters: 5 },
    { id: '2Thessalonians', name: '2 Tessalonicenses', chapters: 3 },
    { id: '1Timothy', name: '1 Timóteo', chapters: 6 },
    { id: '2Timothy', name: '2 Timóteo', chapters: 4 },
    { id: 'Titus', name: 'Tito', chapters: 3 },
    { id: 'Philemon', name: 'Filemom', chapters: 1 }
  ]},
  { group: 'Cartas Gerais', books: [
    { id: 'Hebrews', name: 'Hebreus', chapters: 13 },
    { id: 'James', name: 'Tiago', chapters: 5 },
    { id: '1Peter', name: '1 Pedro', chapters: 5 },
    { id: '2Peter', name: '2 Pedro', chapters: 3 },
    { id: '1John', name: '1 João', chapters: 5 },
    { id: '2John', name: '2 João', chapters: 1 },
    { id: '3John', name: '3 João', chapters: 1 },
    { id: 'Jude', name: 'Judas', chapters: 1 }
  ]},
  { group: 'Profético', books: [ { id: 'Revelation', name: 'Apocalipse', chapters: 22 } ]}
];

function normalizeText(t) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

async function loadChapter(bookId, chapter) {
  const ref = `${bookId} ${chapter}`;
  const res = await fetch(`/.netlify/functions/bible?ref=${encodeURIComponent(ref)}`);
  const data = await res.json();
  return data.text || JSON.stringify(data);
}

function renderStudies(groups, rootEl) {
  rootEl.innerHTML = '';
  groups.forEach(group => {
    const section = document.createElement('section');
    section.className = 'study-section';

    const title = document.createElement('h3');
    title.className = 'study-group-title';
    title.textContent = group.group;
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'book-list';
    group.books.forEach(book => {
      const item = document.createElement('div');
      item.className = 'book-item';

      const toggle = document.createElement('button');
      toggle.className = 'book-toggle';
      toggle.innerHTML = `<span class="chevron" aria-hidden="true"></span><span>${book.name}</span>`;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.dataset.bookId = book.id;
      item.appendChild(toggle);

      const chapters = document.createElement('div');
      chapters.className = 'chapter-list';
      chapters.style.maxHeight = '0px';
      for (let i = 1; i <= book.chapters; i++) {
        const a = document.createElement('a');
        a.className = 'chapter-button';
        a.textContent = String(i);
        a.href = `/estudo-capitulo.html?livro=${encodeURIComponent(book.id)}&cap=${i}`;
        a.setAttribute('aria-label', `Abrir estudo de ${book.name} capítulo ${i}`);
        a.dataset.bookId = book.id;
        a.dataset.chapter = String(i);
        chapters.appendChild(a);
      }
      item.appendChild(chapters);
      list.appendChild(item);

      toggle.addEventListener('click', () => {
        // Marcar como ativo e remover dos demais
        rootEl.querySelectorAll('.book-toggle.active').forEach(t => t.classList.remove('active'));
        toggle.classList.add('active');
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        toggle.classList.toggle('expanded');
        chapters.style.maxHeight = expanded ? '0px' : '200px';
      });
    });
    section.appendChild(list);
    rootEl.appendChild(section);
  });
}

function highlightActive(bookId, chapter) {
  qsa('.chapter-button').forEach(b => {
    const on = b.dataset.bookId === bookId && b.dataset.chapter === String(chapter);
    b.classList.toggle('active', on);
  });
}

function restoreLastSelection() {
  try {
    const last = JSON.parse(localStorage.getItem('study:last'));
    if (last && last.bookId && last.chapter) {
      highlightActive(last.bookId, last.chapter);
      return last;
    }
  } catch {}
  return null;
}

function initStudies() {
  const root = qs('#studies-root');
  const out = qs('#studies-chapter-output');
  const search = qs('#studies-search');
  if (!root || !out) return;

  renderStudies(BIBLE_STRUCTURE, root);

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('.chapter-button');
    if (!btn) return;
    // Se for link (todos os capítulos agora são links), deixa navegar e não intercepta
    if (btn.tagName === 'A') return;
    const { bookId, chapter } = btn.dataset;
    highlightActive(bookId, chapter);
    localStorage.setItem('study:last', JSON.stringify({ bookId, chapter }));
    out.textContent = 'Carregando capítulo...';
    try { out.textContent = await loadChapter(bookId, chapter); } catch (err) { out.textContent = 'Erro: ' + err.message; }
  });

  const last = restoreLastSelection();
  if (last) {
    out.textContent = 'Carregando capítulo...';
    loadChapter(last.bookId, last.chapter).then(t => out.textContent = t).catch(() => {});
  }

  if (search) {
    search.addEventListener('input', () => {
      const term = normalizeText(search.value || '');
      const filtered = BIBLE_STRUCTURE.map(g => ({
        group: g.group,
        books: g.books.filter(b => normalizeText(b.name).includes(term))
      })).filter(g => g.books.length);
      renderStudies(filtered.length ? filtered : BIBLE_STRUCTURE, root);
    });
  }

  // Breadcrumb do livro, se houver ?livro
  try {
    const params = new URLSearchParams(location.search);
    const livro = params.get('livro');
    const crumbBookEl = qs('#studies-crumb-book');
    const crumbSepEl = qs('#studies-crumb-sep');
    if (livro && crumbBookEl && crumbSepEl) {
      const allBooks = BIBLE_STRUCTURE.flatMap(g => g.books);
      const found = allBooks.find(b => b.id === livro);
      const bookName = found ? found.name : livro;
      crumbBookEl.textContent = bookName;
      crumbBookEl.hidden = false;
      crumbSepEl.hidden = false;

      // Expandir e destacar livro solicitado
      const toggle = root.querySelector(`.book-toggle[data-book-id="${livro}"]`);
      if (toggle) {
        const chapters = toggle.nextElementSibling;
        toggle.setAttribute('aria-expanded', 'true');
        toggle.classList.add('expanded');
        toggle.classList.add('active');
        if (chapters) chapters.style.maxHeight = '200px';
        toggle.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch {}
}

// Inicialização por página
document.addEventListener('DOMContentLoaded', () => {
  initRegister();
  initLogin();
  guardContentPage();
  guardAdminPage();
  setupAdminAI();
  setupAdminConfigStatus();
  setupAdminBibleTest();
  setupAdminGenerateContent();
  setupAdminPublishNow();
  initStudies();
});

// ----- Conteúdo Diário -----
function initDailyContent() {
  const metaEl = qs('#daily-meta');
  const textEl = qs('#daily-text');
  const reloadBtn = qs('#daily-reload');
  if (!metaEl || !textEl) return;

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  async function loadDaily() {
    metaEl.textContent = 'Carregando conteúdo diário...';
    textEl.textContent = '';
    const iso = todayISO();
    try {
      const data = await fetchJSON(`/content/${iso}.json`);
      const tipo = data.kind === 'devotional' ? 'Devocional' : (data.kind === 'study' ? 'Estudo bíblico' : (data.kind || '—'));
      const sectionInfo = data.section ? ` • Seção: ${data.section}` : '';
      metaEl.textContent = `Data: ${data.date} • Tipo: ${tipo}${sectionInfo}`;
      textEl.textContent = data.text || 'Sem texto.';
    } catch {
      // Fallback para index.json apontando ao mais recente
      try {
        const idx = await fetchJSON('/content/index.json');
        const latestPath = idx.latest || (idx.meta && `${idx.meta.date}.json`);
        if (!latestPath) throw new Error('Índice sem latest');
        const data = await fetchJSON(`/content/${latestPath}`);
        const tipo = data.kind === 'devotional' ? 'Devocional' : (data.kind === 'study' ? 'Estudo bíblico' : (data.kind || '—'));
        const sectionInfo = data.section ? ` • Seção: ${data.section}` : '';
        metaEl.textContent = `Data: ${data.date} • Tipo: ${tipo}${sectionInfo} (mais recente)`;
        textEl.textContent = data.text || 'Sem texto.';
      } catch (err) {
        metaEl.textContent = 'Sem conteúdo diário disponível ainda.';
        textEl.textContent = '';
      }
    }
  }

  loadDaily();
  if (reloadBtn) reloadBtn.addEventListener('click', loadDaily);
}
  // Expandir livro via query (ex.: ?livro=Genesis)
  try {
    const params = new URLSearchParams(location.search);
    const livro = params.get('livro');
    if (livro) {
      const toggle = root.querySelector(`.book-toggle[data-book-id="${livro}"]`);
      if (toggle) {
        const chapters = toggle.nextElementSibling;
        toggle.setAttribute('aria-expanded', 'true');
        toggle.classList.add('expanded');
        if (chapters) chapters.style.maxHeight = '200px';
        toggle.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch {}