/**
 * 诊断用：测试边缘函数是否生效
 * GET /api/ping
 */
export default function onRequest(context) {
  return new Response(JSON.stringify({ ok: true, time: Date.now(), runtime: 'edge' }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
