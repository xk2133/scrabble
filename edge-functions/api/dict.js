/**
 * EdgeOne 边缘函数 — 有道词典代理 (jsonapi)
 * 路由: GET /api/dict?word=hello
 * 数据: ec(英中释义) + blng_sents_part(例句)
 */
export default async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const word = url.searchParams.get('word');

  if (!word || !/^[a-zA-Z]+$/.test(word)) {
    return new Response(JSON.stringify({ errorCode: '1' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const dictsParam = encodeURIComponent(JSON.stringify({
      count: 99,
      dicts: [['ec', 'blng_sents_part']],
    }));

    const resp = await fetch(
      `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&le=eng&dicts=${dictsParam}`
    );

    if (!resp.ok) {
      return new Response(JSON.stringify({ errorCode: '1' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const raw = await resp.json();

    // --- 解析音标 ---
    const simpleWord = raw.simple?.word?.[0];
    const usPhonetic = simpleWord?.usphone || '';
    const ukPhonetic = simpleWord?.ukphone || '';
    const phonetic = usPhonetic || ukPhonetic || '';

    // --- 解析词性+释义 (ec) ---
    const ecWord = raw.ec?.word?.[0];
    const trs = ecWord?.trs || [];
    const meanings = [];

    for (const trGroup of trs) {
      const trList = trGroup.tr || [];
      for (const tr of trList) {
        const items = tr.l?.i || [];
        for (const item of items) {
          // 格式: "adj. 美丽的，漂亮的；令人愉悦的；..."
          const posMatch = item.match(/^([a-z]+\.|adj\.|adv\.|n\.|v\.|prep\.|conj\.|pron\.|int\.|art\.|num\.|det\.|aux\.)\s*(.+)/i);
          if (posMatch) {
            const pos = posMatch[1];
            // 用 ；分拆成多条释义
            const defTexts = posMatch[2].split(/；|;/).map((s) => s.trim()).filter(Boolean);
            meanings.push({
              partOfSpeech: pos,
              definitions: defTexts.map((d) => ({ definition: d })),
            });
          } else if (item.trim()) {
            // 没有词性前缀，归入"释义"
            const existing = meanings.find((m) => m.partOfSpeech === '');
            if (existing) {
              existing.definitions.push({ definition: item.trim() });
            } else {
              meanings.push({
                partOfSpeech: '',
                definitions: [{ definition: item.trim() }],
              });
            }
          }
        }
      }
    }

    // 合并相同词性的释义
    const posMap = new Map();
    const posOrder = [];
    for (const m of meanings) {
      const key = m.partOfSpeech;
      if (!posMap.has(key)) {
        posMap.set(key, []);
        posOrder.push(key);
      }
      posMap.get(key).push(...m.definitions);
    }
    const mergedMeanings = posOrder.map((pos) => ({
      partOfSpeech: pos,
      definitions: posMap.get(pos),
    }));

    // --- 解析例句 (blng_sents_part) ---
    const sentsPart = raw.blng_sents_part;
    const sentencePairs = sentsPart?.['sentence-pair'] || [];
    const examples = sentencePairs.map((sp) => ({
      english: stripTags(sp['sentence-eng'] || sp.sentence || ''),
      chinese: sp['sentence-translation'] || '',
    }));

    // --- 考试等级 ---
    const examTypes = ecWord?.exam_type || [];

    return new Response(JSON.stringify({
      errorCode: '0',
      word: raw.input || word,
      phonetic,
      ukPhonetic,
      usPhonetic,
      meanings: mergedMeanings,
      examples,
      examTypes,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ errorCode: '1', _debug: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, '');
}
