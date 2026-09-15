// Cloudflare Pages Function — مجاني بالكامل، ما في سيرفر تحتاج تدفع تشغيله
// هاد الملف بيتحوّل تلقائياً لمسار /api/analyze حسب مكانه (functions/api/analyze.js)
// بيستخدم Gemini API المجاني من Google بدل Anthropic المدفوع

const PROMPT = [
  "You are reading a photographed page of a school exam. The page mixes Arabic instructions/headers with French exam content (or is fully Arabic).",
  "Extract the page content as a JSON array of blocks describing the page top to bottom, in original reading order. Output ONLY the raw JSON array — no explanation, no markdown code fences, no extra text before or after.",
  "Use these block shapes (short keys), and ONLY these:",
  '{"t":"heading","x":"<full boxed page title text, without the circled number>"}',
  '{"t":"section","x":"<a bold section header line, e.g. \\"I- Compréhension écrite :\\" or \\"A. Répondez par...\\" or a page label like \\"الصفحة الثانية\\">"}',
  '{"t":"subhead","x":"<a secondary bold instruction line>"}',
  '{"t":"paragraph","x":"<a body paragraph, verbatim>"}',
  '{"t":"source","x":"<a short line like a website/source or a note such as \\"يتبع في الصفحة الثانية\\">"}',
  '{"t":"question","n":"<number as string>","x":"<question text; use ……… for blanks>","p":"<points exactly as written, e.g. \\"(10 Pts.)\\", or \\"\\" if none>"}',
  '{"t":"options","o":["a. ...","b. ...","c. ...","d. ..."]}',
  '{"t":"table","r":[["a","..."],["b","..."]]}',
  '{"t":"blank","x":"<a line of numbered blanks for ordering answers, e.g. \\"1-…… 2-…… 3-……\\">"}',
  '{"t":"closing","x":"<a final centered line if present, e.g. \\"انتهت الأسئلة\\">"}',
  "Rules: copy every piece of text EXACTLY as written (same language, punctuation, quotes «»), no translation, no summarizing, no adding anything not visible on the page. Keep JSON compact (minimal whitespace)."
].join("\n");

const MODEL = "gemini-2.5-flash"; // مجاني على Google AI Studio ويدعم الصور

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (env.APP_SECRET && request.headers.get("X-App-Secret") !== env.APP_SECRET) {
      return json({ error: "غير مصرّح." }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const { image, mediaType } = body;
    if (!image) {
      return json({ error: "لم يتم إرسال صورة." }, 400);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "مفتاح Gemini API غير مضبوط على Cloudflare (GEMINI_API_KEY)." }, 500);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mediaType || "image/jpeg", data: image } },
              { text: PROMPT }
            ]
          }
        ]
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const message = (data && data.error && data.error.message) || ("HTTP " + geminiRes.status);
      return json({ error: message }, geminiRes.status);
    }

    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text).filter(Boolean).join("\n");

    // نرجّعها بنفس شكل رد Anthropic (content: [{type:'text', text}])
    // حتى كود الواجهة (public/index.html) يشتغل من غير أي تعديل إضافي
    return json({ content: [{ type: "text", text }] }, 200);

  } catch (err) {
    return json({ error: err.message || "خطأ غير متوقع." }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}
