/**
 * Node Functions — 有道词典代理
 * 使用 Node.js 原生 crypto 模块（比纯 JS MD5 更可靠）
 * 路由: GET /api/dict?word=hello
 */
import crypto from 'crypto';

const APP_KEY = '70482e871943661b';
const SECRET_KEY = 'pIg07SdxiYOJfledN87CUotlLzoe1zYu';

export default function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const word = url.searchParams.get('word');

  if (!word || !/^[a-zA-Z]+$/.test(word)) {
    return new Response(JSON.stringify({ errorCode: '1', _debug: 'invalid word' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const salt = String(Date.now()) + String(Math.random()).substring(2, 6);
  const sign = crypto.createHash('md5').update(APP_KEY + word + salt + SECRET_KEY).digest('hex');

  const params = new URLSearchParams({
    q: word,
    from: 'en',
    to: 'zh-CHS',
    appKey: APP_KEY,
    salt: salt,
    sign: sign,
  });

  return fetch('https://openapi.youdao.com/api?' + params.toString())
    .then((resp) => resp.text())
    .then((text) => {
      return new Response(text, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    })
    .catch((err) => {
      return new Response(JSON.stringify({ errorCode: '1', _debug: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });
}
