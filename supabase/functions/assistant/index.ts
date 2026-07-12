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
  const focusPattern = /\b(burnout|burned out|burnt out|exhausted|drained|no energy|mentally tired|overwhelmed|stressed out|cannot focus|can't focus|struggling to focus|concentrate|distracted|need a break|need to rest)\b/;
  const planningPattern = /\b(homework|assignment|assignments|deadline|deadlines|revision|exam|exams|study plan|schedule|organize|organise|where to start|where do i start|too much work|workload|manage my time|plan my week|falling behind|too many tasks|too many things)\b/;

  // Wellbeing needs take precedence when a message also mentions schoolwork.
  if (focusPattern.test(normalized)) {
    return {
      id: 'focus',
      label: 'Try Focus & Breathe',
      path: '/app/focus',
      description: 'Use a guided focus session, breathing exercise, or grounding break.',
    };
  }
  if (planningPattern.test(normalized)) {
    return {
      id: 'tasks',
      label: 'Open Smart Scheduler',
      path: '/app/tasks?scheduler=open',
      description: 'Rank homework and revision, then build a manageable weekly timetable.',
    };
  }
  return null;
}

type SchedulerItem = {
  id: string;
  title: string;
  subject?: string;
  workType: 'homework' | 'revision';
  deadline?: string;
  estimatedMinutes: number;
  importance: number;
};

function buildSmartSchedule(items: SchedulerItem[], preferences: Record<string, unknown>) {
  const startDate = String(preferences.startDate || new Date().toISOString().slice(0, 10));
  const weeklyStartTimes = (preferences.weeklyStartTimes || {}) as Record<string, string>;
  const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const rankedItems = items
    .map((item) => {
      const deadlineMs = item.deadline ? new Date(item.deadline).getTime() : Number.POSITIVE_INFINITY;
      const hoursLeft = Number.isFinite(deadlineMs) ? Math.max(1, (deadlineMs - Date.now()) / 3_600_000) : 720;
      const urgency = Number.isFinite(deadlineMs) ? Math.max(0, 120 - hoursLeft) / 24 : 0;
      const score = item.importance * 10 + urgency + Math.min(item.estimatedMinutes / 60, 5);
      return {
        ...item,
        score,
        reason: item.workType === 'revision'
          ? `${item.importance >= 4 ? 'High-priority' : 'Planned'} revision with flexible timing.`
          : `${item.importance >= 4 ? 'High importance' : 'Moderate importance'}${item.deadline ? ` with a deadline on ${new Date(item.deadline).toLocaleDateString('en-SG')}` : ''}.`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const schedule: Array<Record<string, unknown>> = [];
  let dayOffset = 0;
  let cursor: Date | null = null;
  let blocksToday = 0;
  const dayString = (offset: number) => {
    const date = new Date(`${startDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const dayDetails = (offset: number) => {
    const dateString = dayString(offset);
    const day = new Date(`${dateString}T12:00:00Z`).getUTCDay();
    const startTime = weeklyStartTimes[weekdayKeys[day]];
    if (!startTime) return null;
    const start = new Date(`${dateString}T${startTime}:00+08:00`);
    // Prevent overload: cap revision at 2.5 hours on school days and 3 hours on weekends.
    const dailyLimitMinutes = day === 0 || day === 6 ? 180 : 150;
    return { start, end: new Date(start.getTime() + dailyLimitMinutes * 60_000) };
  };
  const moveToAvailableDay = () => {
    for (let attempts = 0; attempts < 14; attempts++) {
      const details = dayDetails(dayOffset);
      if (details) {
        cursor = details.start;
        blocksToday = 0;
        return details;
      }
      dayOffset++;
    }
    throw new Error('Choose a start time for at least one day of the week.');
  };

  for (const item of rankedItems) {
    let remaining = Math.max(15, item.estimatedMinutes);
    // Automatically vary session length based on effort and importance.
    const sessionMinutes = remaining <= 45 ? Math.max(25, remaining) : item.importance >= 4 ? 50 : 40;
    const blocks = Math.ceil(remaining / sessionMinutes);
    let block = 1;
    while (remaining > 0) {
      let details = dayDetails(dayOffset);
      if (!cursor || !details) details = moveToAvailableDay();
      const blockMinutes = Math.min(sessionMinutes, remaining);
      let end = new Date(cursor!.getTime() + blockMinutes * 60_000);
      if (end > details.end) {
        dayOffset++;
        details = moveToAvailableDay();
        end = new Date(cursor!.getTime() + blockMinutes * 60_000);
      }
      schedule.push({
        taskId: item.id,
        title: blocks > 1 ? `${item.title} (${block}/${blocks})` : item.title,
        subject: item.subject || null,
        workType: item.workType,
        start: cursor!.toISOString(),
        end: end.toISOString(),
        priority: item.importance >= 4 ? 'high' : item.importance >= 3 ? 'med' : 'low',
        rank: item.rank,
        sequence: block,
        tip: block < blocks ? 'Stop at the end of this session—the next part is already scheduled.' : 'Use the final five minutes to check your work.',
      });
      remaining -= blockMinutes;
      block++;
      blocksToday++;
      // Choose recovery automatically, including a longer reset after every third session.
      const recoveryMinutes = blocksToday % 3 === 0 ? 20 : blockMinutes >= 45 ? 10 : 5;
      cursor = new Date(end.getTime() + recoveryMinutes * 60_000);
    }
  }

  return {
    rankedItems,
    schedule,
    rhythm: 'Work sessions, recovery breaks, and daily limits were selected automatically to keep revision sustainable.',
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
          // A temporary ID keeps older frontend builds preview-compatible; the
          // persistent scheduler always supplies the canonical task UUID.
          id: String(item.id || crypto.randomUUID()),
          title: String(item.title || '').trim().slice(0, 500),
          subject: String(item.subject || '').trim().slice(0, 200),
          workType: item.workType === 'revision' ? 'revision' : 'homework',
          deadline: item.workType !== 'revision' && item.deadline ? String(item.deadline) : undefined,
          estimatedMinutes: Math.max(15, Math.round(Number(item.estimatedMinutes) || 60)),
          importance: Math.min(5, Math.max(1, Number(item.importance) || 3)),
        }))
        .filter((item: SchedulerItem) => item.title);
      if (!items.length) return json({ error: 'Add at least one item to schedule.' }, 400);
      if (items.length > 20) return json({ error: 'Schedule up to 20 items at a time.' }, 400);

      const plan = buildSmartSchedule(items, body.preferences || {});
      const hasRevision = items.some((item) => item.workType === 'revision');
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
      if (!hasRevision) {
        tips = [
          'There is no revision in this plan yet. Consider adding a short revision topic on one of your free days.',
          ...tips,
        ].slice(0, 3);
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
