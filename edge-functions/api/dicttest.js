/**
 * 诊断用：尝试不同的有道 API 获取词典数据
 * GET /api/dicttest?word=hello
 */
export default async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const word = url.searchParams.get('word') || 'hello';

  // 方案1: jsonapi + blng_sents_part 例句词典
  const dictsParam = encodeURIComponent(JSON.stringify({"count":99,"dicts":[["ec","blng_sents_part"]]}));
  const resp1 = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&le=eng&dicts=${dictsParam}`).then(r => r.text()).catch(() => 'FAIL');

  // 方案2: 牛津/柯林斯
  const dicts2 = encodeURIComponent(JSON.stringify({"count":99,"dicts":[["oxford","collins"]]}));
  const resp2 = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&le=eng&dicts=${dicts2}`).then(r => r.text()).catch(() => 'FAIL');

  return new Response(JSON.stringify({
    word,
    ecAndSents: resp1,
    oxfordOrCollins: resp2,
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
