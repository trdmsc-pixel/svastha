import parseReport from '../api/parse-report';
import analyseMeal from '../api/analyse-meal';

function mockRes() {
  const r: { code: number; body: any; status: (c: number) => typeof r; json: (d: unknown) => void } = {
    code: 0,
    body: null,
    status(c) { r.code = c; return r; },
    json(d) { r.body = d; },
  };
  return r;
}

const geminiReply = (obj: unknown) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });

describe('Vercel AI routes', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; delete process.env.GEMINI_API_KEY; });

  test('returns a clear not_configured error without a key', async () => {
    const res = mockRes();
    await parseReport({ method: 'POST', headers: {}, body: { pdfBase64: 'JVBERi0x' } }, res);
    expect(res.code).toBe(503);
    expect(res.body.code).toBe('not_configured');
  });

  test('PDF is sent to Gemini as inline application/pdf and key is in a header, not the URL', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const calls: Array<{ url: string; init: any }> = [];
    global.fetch = jest.fn(async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return geminiReply({ lab: { name: 'SRL' }, panels: [{ panel_name: 'LFT', tests: [{ raw_name: 'ALT', value: 80, value_text: '80', unit: 'U/L', ref_raw: '<50' }] }] }) as any;
    }) as any;
    const res = mockRes();
    await parseReport({ method: 'POST', headers: {}, body: { pdfBase64: 'JVBERi0x' } }, res);
    expect(res.code).toBe(200);
    expect(res.body.parsed.panels[0].tests[0].value).toBe(80);
    const sent = JSON.parse(calls[0].init.body);
    expect(sent.contents[0].parts.some((p: any) => p.inline_data?.mime_type === 'application/pdf')).toBe(true);
    expect(calls[0].url).not.toMatch(/key=/);
    expect(calls[0].init.headers['x-goog-api-key']).toBe('test-key');
  });

  test('empty uploads are rejected with 400', async () => {
    process.env.GEMINI_API_KEY = 'k';
    const res = mockRes();
    await parseReport({ method: 'POST', headers: {}, body: {} }, res);
    expect(res.code).toBe(400);
    const res2 = mockRes();
    await analyseMeal({ method: 'POST', headers: {}, body: {} }, res2);
    expect(res2.code).toBe(400);
  });

  test('Gemini 429 becomes a friendly 429, not a raw error dump', async () => {
    process.env.GEMINI_API_KEY = 'k';
    process.env.LLM_VISION_MODEL = 'gemini-2.5-flash';
    global.fetch = jest.fn(async () => ({ ok: false, status: 429, text: async () => 'quota' })) as any;
    const res = mockRes();
    await analyseMeal({ method: 'POST', headers: {}, body: { imageBase64: 'abc' } }, res);
    delete process.env.LLM_VISION_MODEL;
    expect(res.code).toBe(429);
    expect(res.body.error).not.toMatch(/Gemini HTTP/);
  });
});
