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

function suggestAppFeature(text: string, severity: number) {
  if (severity >= 3) return null;
  const normalized = text.toLowerCase();
  const planningPattern = /\b(homework|assignment|assignments|deadline|deadlines|revision|study plan|schedule|organize|organise|where to start|too much work|workload)\b/;
  const focusPattern = /\b(burnout|burned out|burnt out|exhausted|drained|cannot focus|can't focus|concentrate|distracted|focus session|need a break)\b/;

  if (planningPattern.test(normalized)) {
    return {
      id: 'tasks',
      label: 'Open To-Do',
      path: '/app/tasks',
      description: 'Break your workload into small, manageable tasks.',
    };
  }
  if (focusPattern.test(normalized)) {
    return {
      id: 'focus',
      label: 'Open Focus',
      path: '/app/focus',
      description: 'Use a short focus block with a proper break afterward.',
    };
  }
  return null;
}

type SchedulerItem = {
  title: string;
  subject?: string;
  deadline?: string;
  estimatedMinutes: number;
  importance: number;
};

function buildSmartSchedule(items: SchedulerItem[], preferences: Record<string, unknown>) {
  const sessionMinutes = Math.min(120, Math.max(15, Number(preferences.sessionMinutes) || 45));
  const breakMinutes = Math.min(45, Math.max(5, Number(preferences.breakMinutes) || 10));
  const dayStart = String(preferences.dayStart || '16:00');
  const dayEnd = String(preferences.dayEnd || '21:00');
  const startDate = String(preferences.startDate || new Date().toISOString().slice(0, 10));

  const rankedItems = items
    .map((item) => {
      const deadlineMs = item.deadline ? new Date(item.deadline).getTime() : Number.POSITIVE_INFINITY;
      const hoursLeft = Number.isFinite(deadlineMs) ? Math.max(1, (deadlineMs - Date.now()) / 3_600_000) : 720;
      const urgency = Number.isFinite(deadlineMs) ? Math.max(0, 120 - hoursLeft) / 24 : 0;
      const score = item.importance * 10 + urgency + Math.min(item.estimatedMinutes / 60, 5);
      return {
        ...item,
        score,
        reason: `${item.importance >= 4 ? 'High importance' : 'Moderate importance'}${item.deadline ? ` with a deadline on ${new Date(item.deadline).toLocaleDateString('en-SG')}` : ''}.`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const schedule: Array<Record<string, unknown>> = [];
  let dayOffset = 0;
  let cursor: Date | null = null;
  const dayString = (offset: number) => {
    const date = new Date(`${startDate}T00:00:00+08:00`);
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
  };
  const startOfDay = (offset: number) => new Date(`${dayString(offset)}T${dayStart}:00+08:00`);
  const endOfDay = (offset: number) => new Date(`${dayString(offset)}T${dayEnd}:00+08:00`);

  for (const item of rankedItems) {
    let remaining = Math.max(15, item.estimatedMinutes);
    const blocks = Math.ceil(remaining / sessionMinutes);
    let block = 1;
    while (remaining > 0) {
      if (!cursor) cursor = startOfDay(dayOffset);
      const blockMinutes = Math.min(sessionMinutes, remaining);
      let end = new Date(cursor.getTime() + blockMinutes * 60_000);
      if (end > endOfDay(dayOffset)) {
        dayOffset++;
        cursor = startOfDay(dayOffset);
        end = new Date(cursor.getTime() + blockMinutes * 60_000);
      }
      schedule.push({
        title: blocks > 1 ? `${item.title} (${block}/${blocks})` : item.title,
        subject: item.subject || null,
        start: cursor.toISOString(),
        end: end.toISOString(),
        priority: item.importance >= 4 ? 'high' : item.importance >= 3 ? 'med' : 'low',
        rank: item.rank,
        tip: block < blocks ? 'Stop when this block ends and continue in the next scheduled block.' : 'Use the final five minutes to check your work.',
      });
      remaining -= blockMinutes;
      block++;
      cursor = new Date(end.getTime() + breakMinutes * 60_000);
    }
  }

  return { rankedItems, schedule };
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
        generationConfig: { temperature: 0.65, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(20_000),
    }
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Gemini request failed');
  const candidate = payload?.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('Gemini response was truncated');
  }
  const text = candidate?.content?.parts
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

    if (action === 'smart_schedule') {
      const rawItems = Array.isArray(body.items) ? body.items : [];
      const items: SchedulerItem[] = rawItems
        .map((item: Record<string, unknown>) => ({
          title: String(item.title || '').trim().slice(0, 500),
          subject: String(item.subject || '').trim().slice(0, 200),
          deadline: item.deadline ? String(item.deadline) : undefined,
          estimatedMinutes: Math.min(720, Math.max(15, Number(item.estimatedMinutes) || 60)),
          importance: Math.min(5, Math.max(1, Number(item.importance) || 3)),
        }))
        .filter((item: SchedulerItem) => item.title);
      if (!items.length) return json({ error: 'Add at least one item to schedule.' }, 400);
      if (items.length > 20) return json({ error: 'Schedule up to 20 items at a time.' }, 400);

      const plan = buildSmartSchedule(items, body.preferences || {});
      let overview = `Your ${items.length} item${items.length === 1 ? '' : 's'} are ranked by importance, deadline, and estimated effort.`;
      let tips = [
        'Start with the first scheduled block, not the entire workload.',
        'Keep breaks screen-free when possible so your attention can reset.',
        'Adjust the plan if a task takes longer than expected.',
      ];
      try {
        const raw = await generateGemini(
          `Return only valid JSON with overview (one sentence) and tips (exactly 3 short practical strings). ` +
            `Give natural, student-friendly advice for this study schedule: ${JSON.stringify(plan)}`
        );
        const generated = extractJson(raw);
        if (typeof generated.overview === 'string') overview = generated.overview;
        if (Array.isArray(generated.tips) && generated.tips.length) tips = generated.tips.slice(0, 3);
      } catch (aiError) {
        console.error('Smart schedule tips failed; using local guidance.', aiError);
      }
      return json({ ...plan, overview, tips });
    }

    if (action !== 'chat' || typeof body.text !== 'string' || !body.text.trim()) {
      return json({ error: 'A non-empty chat message is required' }, 400);
    }

    const text = body.text.trim().slice(0, 20000);
    const analysis = analyzeRisk(text);
    const featureSuggestion = suggestAppFeature(text, analysis.severity);
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
          `Sound like a calm, genuine person texting—not a formal counselor or an essay. ` +
          `Reply in 25 to 60 words, using at most one short paragraph. Always finish every sentence and thought. ` +
          `Respond directly to what the student said. Do not repeat their message, over-explain, use headings, or begin with canned phrases such as "I hear you" or "Thank you for sharing." ` +
          `Do not use the student's name unless it genuinely adds warmth. Ask at most one question. ` +
          `Never diagnose, claim to be a therapist, or replace professional help. ` +
          `Offer only one practical next step. Encourage a trusted adult when distress is significant. ` +
          (featureSuggestion
            ? `Naturally recommend the app's ${featureSuggestion.label.replace('Open ', '')} feature as the practical next step. `
            : '') +
          `The student's name is ${profile.name}. Risk severity is ${analysis.severity}/3.\n\nConversation:\n${context}\nassistant:`
      );
    } catch (aiError) {
      console.error('Gemini response failed; using safe fallback.', aiError);
      responseText = analysis.severity >= 2
        ? `That sounds like a lot to carry. Take one slow breath, then consider telling a trusted adult or school counselor what is happening. You don't have to handle it alone.`
        : `I'm having trouble replying fully right now, but your message was saved. For now, pause for one slow breath and choose the smallest next step you can manage.`;
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
      aiMessage: {
        id: aiMessage.id,
        text: aiMessage.text,
        createdAt: aiMessage.created_at,
        featureSuggestion,
      },
    });
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : 'Assistant request failed' },
      500
    );
  }
});
