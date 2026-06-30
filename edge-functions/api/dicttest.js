/**
 * 诊断用：尝试不同的有道 API 获取词典数据
 * GET /api/dicttest?word=hello
 */
export default async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const word = url.searchParams.get('word') || 'hello';

  // 方案1: 网页词典 JSON 接口
  const resp1 = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&le=eng&dicts=%7B%22count%22%3A99%2C%22dicts%22%3A%5B%5B%22ec%22%2C%22ce%22%5D%5D%7D`).then(r => r.text()).catch(() => 'FAIL');

  // 方案2: mobile dict HTML
  const resp2 = await fetch(`http://mobile.youdao.com/dict?le=eng&q=${encodeURIComponent(word)}`).then(r => r.status).catch(() => 'FAIL');

  return new Response(JSON.stringify({
    word,
    jsonapi: resp1.length < 3000 ? resp1 : resp1.substring(0, 500) + '...(truncated)',
    mobileStatus: resp2,
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
