// Netlify Function: config-status
// Retorna o status das configurações de ambiente sem expor segredos.

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const googleKey = process.env.GOOGLE_API_KEY || '';
    const bibleBase = process.env.BIBLE_API_BASE_URL || 'https://bible-api.com';
    const bibleTranslation = process.env.BIBLE_TRANSLATION || 'almeida';
    const bibleKey = process.env.BIBLE_API_KEY || '';
    const bibleHeader = process.env.BIBLE_API_HOST_HEADER || '';

    const mask = (val) => (val ? `${val.slice(0, 2)}***${val.slice(-2)}` : '');

    const payload = {
      ai: {
        hasKey: Boolean(googleKey),
        maskedKey: googleKey ? mask(googleKey) : '',
        provider: 'Gemini',
      },
      bible: {
        baseUrl: bibleBase,
        translation: bibleTranslation,
        hasKey: Boolean(bibleKey),
        maskedKey: bibleKey ? mask(bibleKey) : '',
        headerName: bibleHeader || (bibleKey ? 'Authorization (Bearer)' : ''),
      },
    };

    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};