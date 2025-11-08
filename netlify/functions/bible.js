// Netlify Function: bible
// Busca texto de passagens bíblicas. Por padrão usa bible-api.com (sem chave).
// Suporta configuração via variáveis de ambiente para provedores alternativos.

const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const ref = (event.queryStringParameters && event.queryStringParameters.ref) || 'Joao 3:16';

    // Config via env
    const BASE = process.env.BIBLE_API_BASE_URL || 'https://bible-api.com';
    const TRANSLATION = process.env.BIBLE_TRANSLATION || 'almeida';
    const API_KEY = process.env.BIBLE_API_KEY;
    const API_HOST_HEADER = process.env.BIBLE_API_HOST_HEADER;

    // Conversão de referência em português para inglês, quando possível
    function normalize(s) {
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    const ptToEn = {
      'genesis': 'Genesis',
      'exodo': 'Exodus', 'exodo.': 'Exodus', 'exodos': 'Exodus',
      'levitico': 'Leviticus',
      'numeros': 'Numbers',
      'deuteronomio': 'Deuteronomy',
      'josue': 'Joshua',
      'juizes': 'Judges',
      'rute': 'Ruth',
      '1 samuel': '1 Samuel', '2 samuel': '2 Samuel',
      '1 reis': '1 Kings', '2 reis': '2 Kings',
      '1 cronicas': '1 Chronicles', '2 cronicas': '2 Chronicles',
      'esdras': 'Ezra',
      'neemias': 'Nehemiah',
      'ester': 'Esther',
      'jo': 'Job',
      'salmos': 'Psalms', 'salmo': 'Psalms',
      'proverbios': 'Proverbs',
      'eclesiastes': 'Ecclesiastes',
      'cantares': 'Song of Songs', 'cantico dos canticos': 'Song of Songs',
      'isaias': 'Isaiah',
      'jeremias': 'Jeremiah',
      'lamentacoes': 'Lamentations',
      'ezequiel': 'Ezekiel',
      'daniel': 'Daniel',
      'oseias': 'Hosea',
      'joel': 'Joel',
      'amos': 'Amos',
      'obadias': 'Obadiah',
      'jonas': 'Jonah',
      'miqueias': 'Micah',
      'naum': 'Nahum',
      'habacuque': 'Habakkuk',
      'sofonias': 'Zephaniah',
      'ageu': 'Haggai',
      'zacarias': 'Zechariah',
      'malaquias': 'Malachi',
      'mateus': 'Matthew',
      'marcos': 'Mark',
      'lucas': 'Luke',
      'joao': 'John',
      'atos': 'Acts',
      'romanos': 'Romans',
      '1 corintios': '1 Corinthians', '2 corintios': '2 Corinthians', 'corintios': 'Corinthians',
      'galatas': 'Galatians',
      'efesios': 'Ephesians',
      'filipenses': 'Philippians',
      'colossenses': 'Colossians',
      '1 tessalonicenses': '1 Thessalonians', '2 tessalonicenses': '2 Thessalonians', 'tessalonicenses': 'Thessalonians',
      '1 timoteo': '1 Timothy', '2 timoteo': '2 Timothy', 'timoteo': 'Timothy',
      'tito': 'Titus',
      'filemom': 'Philemon', 'filemon': 'Philemon',
      'hebreus': 'Hebrews',
      'tiago': 'James',
      '1 pedro': '1 Peter', '2 pedro': '2 Peter', 'pedro': 'Peter',
      '1 joao': '1 John', '2 joao': '2 John', '3 joao': '3 John',
      'judas': 'Jude',
      'apocalipse': 'Revelation'
    };

    function convertPortugueseRefToEnglish(input) {
      try {
        const s = input.trim();
        const tokens = s.split(/\s+/);
        const numPrefix = ['1', '2', '3'].includes(tokens[0]) ? tokens.shift() : '';
        let bookTokens = [];
        for (const t of tokens) {
          if (/\d/.test(t)) break;
          bookTokens.push(t);
        }
        const remainder = s.slice(bookTokens.join(' ').length + (numPrefix ? numPrefix.length + 1 : 0)).trim();
        const bookNorm = normalize((numPrefix ? `${numPrefix} ` : '') + bookTokens.join(' '));
        const mapped = ptToEn[bookNorm];
        if (mapped) {
          return remainder ? `${mapped} ${remainder}` : mapped;
        }
        return input;
      } catch {
        return input;
      }
    }

    const refConverted = convertPortugueseRefToEnglish(ref);

    // Monta URL compatível com bible-api.com
    const url = `${BASE}/${encodeURIComponent(refConverted)}?translation=${encodeURIComponent(TRANSLATION)}`;

    // Headers de autenticação opcionais, caso um provedor alternativo exija chave
    const authHeaders = {};
    if (API_KEY && API_HOST_HEADER) {
      authHeaders[API_HOST_HEADER] = API_KEY;
    } else if (API_KEY && !API_HOST_HEADER) {
      authHeaders['Authorization'] = `Bearer ${API_KEY}`;
    }

    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: 'Bible API error', status: res.status }) };
    }
    const data = await res.json();
    // bible-api retorna { text, verses: [...] }; formata como versículos para a aba de "versículo"
    const text = data.text || (Array.isArray(data.verses) ? data.verses.map(v => `${v.verse}. ${v.text}`).join('\n') : '');
    return { statusCode: 200, headers, body: JSON.stringify({ text, source: 'bible-api.com', ref: refConverted }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};