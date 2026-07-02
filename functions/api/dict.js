/**
 * Cloudflare Pages Function — 有道词典 CORS 代理
 * 部署后通过 /api/dict?word=xxx 访问
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const word = url.searchParams.get('word');

  if (!word || !/^[a-zA-Z]+$/.test(word)) {
    return new Response(JSON.stringify(null), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const dicts = encodeURIComponent(JSON.stringify({
    count: 99,
    dicts: [['ec', 'blng_sents_part']],
  }));

  const apiUrl = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&le=eng&dicts=${dicts}`;
  const resp = await fetch(apiUrl);
  const data = await resp.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
