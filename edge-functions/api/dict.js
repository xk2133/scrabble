/**
 * EdgeOne 边缘函数 — 有道词典代理
 * 路由: GET /api/dict?word=hello
 */
const APP_KEY = '70482e871943661b';
const SECRET_KEY = 'pIg07SdxiYOJfledN87CUotlLzoe1zYu';

// 纯 JS MD5（Edge Runtime 兼容）
function md5(str) {
  function r(n, c) { return (n << c) | (n >>> (32 - c)); }
  function q(n, c) { return n & c; }
  function p(n, c) { return n ^ c; }
  function s(n, c) { return ~n & c; }
  function hex(x) { for (var i = 0; i < x.length; i++) x[i] = (x[i] >>> 0).toString(16).padStart(8, '0'); return x.join(''); }
  function add(x, y) { return ((x >>> 0) + (y >>> 0)) & 0xFFFFFFFF; }
  var b = [];
  for (var i = 0; i < str.length; i++) b.push(str.charCodeAt(i));
  var len = b.length;
  b.push(0x80);
  while ((b.length % 64) !== 56) b.push(0);
  var bitLen = len * 8;
  for (var i = 0; i < 4; i++) b.push((bitLen >>> (i * 8)) & 0xFF);
  for (var i = 0; i < 4; i++) b.push(0);
  var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476;
  var T = [];
  for (var i = 1; i <= 64; i++) T[i - 1] = (Math.abs(Math.sin(i)) * 0x100000000) | 0;
  for (var i = 0; i < b.length; i += 64) {
    var X = [];
    for (var j = 0; j < 16; j++) X[j] = b[i + j * 4] | (b[i + j * 4 + 1] << 8) | (b[i + j * 4 + 2] << 16) | (b[i + j * 4 + 3] << 24);
    var A = h0, B = h1, C = h2, D = h3;
    for (var j = 0; j < 64; j++) {
      var F, g;
      if (j < 16) { F = q(B, C) | s(B, D); g = j; }
      else if (j < 32) { F = q(D, B) | s(D, C); g = (5 * j + 1) % 16; }
      else if (j < 48) { F = p(p(B, C), D); g = (3 * j + 5) % 16; }
      else { F = p(C, B | ~D); g = (7 * j) % 16; }
      F = add(add(add(A, F), add(X[g], T[j])), 0);
      A = D; D = C; C = B; B = add(B, r(F, [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21][j%4+Math.floor(j/16)*4]));
    }
    h0 = add(h0, A); h1 = add(h1, B); h2 = add(h2, C); h3 = add(h3, D);
  }
  return hex([h0, h1, h2, h3]);
}

export default function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const word = url.searchParams.get('word');

  if (!word || !/^[a-zA-Z]+$/.test(word)) {
    return new Response(JSON.stringify({ errorCode: '1' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const salt = String(Date.now()) + String(Math.random()).substring(2, 6);
  const sign = md5(APP_KEY + word + salt + SECRET_KEY).toUpperCase();

  const params = new URLSearchParams({
    q: word,
    from: 'en',
    to: 'zh-CHS',
    appKey: APP_KEY,
    salt: salt,
    sign: sign,
  });

  return fetch('https://openapi.youdao.com/api?' + params.toString())
    .then((resp) => {
      if (!resp.ok) {
        return resp.text().then((body) => {
          return new Response(JSON.stringify({ errorCode: '1', _debug: `Youdao HTTP ${resp.status}: ${body}` }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      }
      return resp.text();
    })
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
