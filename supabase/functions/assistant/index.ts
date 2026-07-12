import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const crisisResources =
  'If you may act on thoughts of harming yourself or someone else, call Singapore emergency services at 999 now. You can also contact Samaritans of Singapore at 1767 or CareText at 9151 1767. Please tell a trusted adult who can stay with you.';

function analyzeRisk(text: string) {
  const normalized = text.toLowerCase();
  const highPatterns = [
    /\b(kill|hurt) myself\b/,
    /\b(suicid|self[- ]?harm|end my life|want to die|better off dead)\b/,
    /\b(kill|hurt) (him|her|them|someone)\b/,
  ];
  const mediumPatterns = [
    /\b(hopeless|worthless|can(?:not|'t) go on|giving up)\b/,
    /\b(panic|overwhelmed|severe stress|abuse|bullied)\b/,
  ];

  if (highPatterns.some((pattern) => pattern.test(normalized))) {
    return { severity: 3, sentiment: 'neg', riskTags: ['self_harm_or_immediate_danger'] };
  }
  if (mediumPatterns.some((pattern) => pattern.test(normalized))) {
    return { severity: 2, sentiment: 'neg', riskTags: ['severe_stress'] };
  }
  const negative = /\b(sad|stressed|anxious|upset|angry|tired|bad)\b/.test(normalized);
  const positive = /\b(happy|good|great|excited|proud|better)\b/.test(normalized);
  return {
    severity: 1,
    sentiment: negative ? 'neg' : positive ? 'pos' : 'neu',
    riskTags: [],
  };
}

async function generateGemini(prompt: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in Supabase secrets');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 900 },
      }),
    }
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Gemini request failed');
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

function extractJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing authorization token' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Invalid session' }, 401);
    const userId = authData.user.id;
    const body = await request.json();
    const action = body.action || 'chat';

    if (action === 'task_suggestions') {
      const task = body.task || {};
      const raw = await generateGemini(
        `Return only valid JSON: an array of exactly 3 objects with keys method, description, and timeEstimate. ` +
          `Give practical, age-appropriate study methods for this task: ${JSON.stringify(task)}.`
      );
      return json({ suggestions: extractJson(raw) });
    }

    if (action === 'task_summary') {
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];
      const done = tasks.filter((task: { status?: string }) => task.status === 'done').length;
      const raw = await generateGemini(
        `Return only valid JSON with keys overview (string), suggestions (array of 2 short strings), and motivationalMessage (string). ` +
          `Be concise and supportive. These are the student's tasks: ${JSON.stringify(tasks)}`
      );
      const generated = extractJson(raw);
      return json({
        ...generated,
        totalTasks: tasks.length,
        completionRate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      });
    }

    if (action !== 'chat' || typeof body.text !== 'string' || !body.text.trim()) {
      return json({ error: 'A non-empty chat message is required' }, 400);
    }

    const text = body.text.trim().slice(0, 20000);
    const analysis = analyzeRisk(text);
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('name,role')
      .eq('id', userId)
      .single();
    if (profileError) throw profileError;

    const { data: userMessage, error: messageError } = await admin
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'user',
        text,
        sentiment: analysis.sentiment,
        risk_tags: analysis.riskTags,
        severity: analysis.severity,
      })
      .select()
      .single();
    if (messageError) throw messageError;

    if (profile.role === 'student' && analysis.severity >= 2) {
      const { error: flagError } = await admin.from('risk_flags').insert({
        user_id: userId,
        message_id: userMessage.id,
        message_text: userMessage.text,
        tags: analysis.riskTags.length ? analysis.riskTags : ['severe_stress'],
        severity: analysis.severity,
      });
      if (flagError) throw flagError;
    }

    const { data: history } = await admin
      .from('chat_messages')
      .select('role,text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    const context = (history || [])
      .reverse()
      .map((item) => `${item.role}: ${item.text}`)
      .join('\n');
    let responseText: string;
    try {
      responseText = await generateGemini(
        `You are Talk.ItOut, a supportive, non-clinical study and wellbeing companion for Singapore students aged 10-19. ` +
          `Use warm, concise language. Never diagnose, claim to be a therapist, or replace professional help. ` +
          `Offer one or two practical next steps and encourage a trusted adult when distress is significant. ` +
          `The student's name is ${profile.name}. Risk severity is ${analysis.severity}/3.\n\nConversation:\n${context}\nassistant:`
      );
    } catch (aiError) {
      console.error('Gemini response failed; using safe fallback.', aiError);
      responseText = analysis.severity >= 2
        ? `I'm glad you reached out, ${profile.name}. That sounds like a lot to carry. Please pause, take a slow breath, and consider telling a trusted adult or school counselor how you're feeling. You don't have to handle this alone.`
        : `Thanks for sharing that with me, ${profile.name}. I'm having trouble generating a full response right now, but your message has been saved. Try taking one small next step—pause for a breath, write down what feels most important, or talk with someone you trust.`;
    }
    const safeResponse =
      analysis.severity >= 3 ? `${crisisResources}\n\n${responseText}` : responseText;

    const { data: aiMessage, error: aiError } = await admin
      .from('chat_messages')
      .insert({ user_id: userId, role: 'assistant', text: safeResponse })
      .select()
      .single();
    if (aiError) throw aiError;

    return json({
      userMessage: {
        id: userMessage.id,
        text: userMessage.text,
        sentiment: userMessage.sentiment,
        severity: userMessage.severity,
        createdAt: userMessage.created_at,
      },
      aiMessage: { id: aiMessage.id, text: aiMessage.text, createdAt: aiMessage.created_at },
    });
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : 'Assistant request failed' },
      500
    );
  }
});
