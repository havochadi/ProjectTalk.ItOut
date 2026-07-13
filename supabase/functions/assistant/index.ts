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
    const preferredStart = new Date(`${dateString}T${startTime}:00+08:00`);
    const afterSchool = new Date(`${dateString}T15:30:00+08:00`);
    const latestStart = new Date(`${dateString}T22:00:00+08:00`);
    // Weekday work begins after the default school day and all study ends
    // before the recommended 11 PM bedtime.
    const schoolAdjustedStart = day >= 1 && day <= 5 && preferredStart < afterSchool
      ? afterSchool
      : preferredStart;
    const start = schoolAdjustedStart > latestStart ? latestStart : schoolAdjustedStart;
    // Prevent overload: cap revision at 2.5 hours on school days and 3 hours on weekends.
    const dailyLimitMinutes = day === 0 || day === 6 ? 180 : 150;
    const preferredEnd = new Date(start.getTime() + dailyLimitMinutes * 60_000);
    const bedtime = new Date(`${dateString}T23:00:00+08:00`);
    return { start, end: preferredEnd < bedtime ? preferredEnd : bedtime };
  };
  type RankedItem = (typeof rankedItems)[number];
  type PlannedSession = {
    item: RankedItem;
    minutes: number;
    sequence: number;
    totalSessions: number;
  };
  type DayPlan = {
    offset: number;
    start: Date;
    end: Date;
    sessions: PlannedSession[];
    usedMinutes: number;
  };

  // Keep enough future study days available for large workloads without imposing
  // a duration cap on an individual homework or revision topic.
  const dayPlans: DayPlan[] = [];
  for (let offset = 0; offset < 366; offset++) {
    const details = dayDetails(offset);
    if (details) dayPlans.push({ offset, ...details, sessions: [], usedMinutes: 0 });
  }
  if (!dayPlans.length) throw new Error('Choose a start time for at least one day of the week.');

  const recoveryBeforeNext = (sessionCount: number) => {
    if (sessionCount === 0) return 0;
    return sessionCount % 3 === 0 ? 25 : 15;
  };
  const canFit = (day: DayPlan, minutes: number) => {
    const capacity = Math.floor((day.end.getTime() - day.start.getTime()) / 60_000);
    return day.usedMinutes + recoveryBeforeNext(day.sessions.length) + minutes <= capacity;
  };
  const addSession = (day: DayPlan, session: PlannedSession) => {
    day.usedMinutes += recoveryBeforeNext(day.sessions.length) + session.minutes;
    day.sessions.push(session);
  };

  // Revision is a habit rather than a one-off task. Split each topic across
  // several different study days, with no more than one sitting per topic daily.
  const revisionItems = rankedItems.filter((item) => item.workType === 'revision');
  for (const item of revisionItems) {
    const totalMinutes = Math.max(15, Math.round(Number(item.estimatedMinutes) || 60));
    const daysInOpeningWeek = Math.max(1, dayPlans.filter((day) => day.offset < 7).length);
    const dailyHabitTarget = Math.min(5, daysInOpeningWeek, Math.max(1, Math.floor(totalMinutes / 15)));
    const sessionsNeededForManageableLength = Math.ceil(totalMinutes / 45);
    const totalSessions = Math.min(
      dayPlans.length,
      Math.max(dailyHabitTarget, sessionsNeededForManageableLength),
      Math.max(1, Math.floor(totalMinutes / 15)),
    );
    const baseMinutes = Math.floor(totalMinutes / totalSessions);
    const extraMinutes = totalMinutes % totalSessions;

    let nextDayIndex = 0;
    for (let sequence = 1; sequence <= totalSessions; sequence++) {
      const minutes = baseMinutes + (sequence <= extraMinutes ? 1 : 0);
      const relativeDayIndex = dayPlans.slice(nextDayIndex).findIndex((candidate) => (
        !candidate.sessions.some((session) => session.item.id === item.id) && canFit(candidate, minutes)
      ));
      if (relativeDayIndex < 0) throw new Error(`There is not enough study time to schedule ${item.title}. Add another study day or choose an earlier start time.`);
      const dayIndex = nextDayIndex + relativeDayIndex;
      const day = dayPlans[dayIndex];
      addSession(day, { item, minutes, sequence, totalSessions });
      nextDayIndex = dayIndex + 1;
    }
  }

  // Homework keeps its urgency ranking, but is limited to two sittings for the
  // same task per day so long assignments do not swallow a whole evening.
  const homeworkItems = rankedItems.filter((item) => item.workType !== 'revision');
  for (const item of homeworkItems) {
    const totalMinutes = Math.max(15, Math.round(Number(item.estimatedMinutes) || 60));
    const preferredSessionMinutes = item.importance >= 4 ? 50 : 40;
    const sessionLengths: number[] = [];
    let remaining = totalMinutes;
    while (remaining > 0) {
      const nextRemainder = remaining - preferredSessionMinutes;
      const minutes = nextRemainder > 0 && nextRemainder < 15
        ? remaining
        : Math.min(preferredSessionMinutes, remaining);
      sessionLengths.push(minutes);
      remaining -= minutes;
    }

    sessionLengths.forEach((minutes, index) => {
      const preferred = dayPlans.find((candidate) => (
        candidate.sessions.filter((session) => session.item.id === item.id).length < 2 && canFit(candidate, minutes)
      ));
      const day = preferred || dayPlans.find((candidate) => canFit(candidate, minutes));
      if (!day) throw new Error(`There is not enough study time to schedule ${item.title}. Add another study day or choose an earlier start time.`);
      addSession(day, {
        item,
        minutes,
        sequence: index + 1,
        totalSessions: sessionLengths.length,
      });
    });
  }

  dayPlans.filter((day) => day.sessions.length).forEach((day) => {
    // Put deadline-based homework first, then finish the day with revision.
    day.sessions.sort((a, b) => {
      const typeOrder = Number(a.item.workType === 'revision') - Number(b.item.workType === 'revision');
      return typeOrder || a.item.rank - b.item.rank || a.sequence - b.sequence;
    });
    let cursor = new Date(day.start);
    day.sessions.forEach((session, index) => {
      const end = new Date(cursor.getTime() + session.minutes * 60_000);
      const isRevision = session.item.workType === 'revision';
      schedule.push({
        taskId: session.item.id,
        title: isRevision || session.totalSessions === 1
          ? session.item.title
          : `${session.item.title} (${session.sequence}/${session.totalSessions})`,
        subject: session.item.subject || null,
        workType: session.item.workType,
        start: cursor.toISOString(),
        end: end.toISOString(),
        priority: session.item.importance >= 4 ? 'high' : session.item.importance >= 3 ? 'med' : 'low',
        rank: session.item.rank,
        sequence: session.sequence,
        tip: isRevision
          ? 'Finish by recalling the main ideas without looking at your notes.'
          : session.sequence < session.totalSessions
          ? 'Stop here—the next part is already protected in your timetable.'
          : 'Use the final five minutes to check your work.',
      });
      const recoveryMinutes = (index + 1) % 3 === 0 ? 25 : 15;
      cursor = new Date(end.getTime() + recoveryMinutes * 60_000);
    });
  });

  return {
    rankedItems,
    schedule,
    rhythm: 'Revision is spread across regular study days. Homework stays deadline-aware, with recovery time and daily limits selected automatically.',
  };
}

class GeminiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function generateGemini(prompt: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in Supabase secrets');
  const configuredModel = Deno.env.get('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
  const models = [...new Set([configuredModel, 'gemini-3.5-flash'])];
  let lastError: unknown = new Error('Gemini request failed');

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.65, maxOutputTokens: 2048 },
          }),
          signal: AbortSignal.timeout(modelIndex === 0 ? 12_000 : 18_000),
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new GeminiRequestError(
          payload?.error?.message || `Gemini request failed (${response.status})`,
          response.status
        );
      }
      const candidate = payload?.candidates?.[0];
      if (candidate?.finishReason === 'MAX_TOKENS') {
        throw new GeminiRequestError('Gemini response was truncated', 500);
      }
      const text = candidate?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
        .trim();
      if (!text) throw new GeminiRequestError('Gemini returned an empty response', 503);
      return text;
    } catch (error) {
      lastError = error;
      const status = error instanceof GeminiRequestError ? error.status : 503;
      const canTryFallback = modelIndex < models.length - 1 &&
        (status === 404 || status === 408 || status === 429 || status >= 500);
      if (!canTryFallback) throw error;
      await wait(500);
    }
  }

  throw lastError;
}

function buildSafeFallback(text: string, severity: number) {
  const normalized = text.toLowerCase();
  if (severity >= 2) {
    return `That sounds like a lot to carry. Take one slow breath, then consider telling a trusted adult or school counselor what is happening. You don't have to handle it alone.`;
  }
  if (/\b(stomach|tummy|pain|ache|sick|nausea|vomit|fever|dizzy|constipat|bloated|gas|fart)\b/.test(normalized)) {
    return `That sounds uncomfortable. Try a gentle walk, changing position, and sipping some water. If the pain is severe, keeps worsening, or comes with vomiting or fever, tell a trusted adult and seek medical advice.`;
  }
  if (/\b(homework|assignment|revision|exam|study|deadline|schedule)\b/.test(normalized)) {
    return `Let's make it smaller: choose the most urgent school task and work on only its first step for ten minutes. You can also use the Smart Scheduler to turn the rest into a manageable plan.`;
  }
  if (/\b(stressed|overwhelmed|burnout|burnt out|exhausted|anxious|panic|can't focus|cannot focus)\b/.test(normalized)) {
    return `Pause for one slow breath and release your shoulders. Do only the smallest necessary next step, or open Focus & Breathe for a guided reset before deciding what comes next.`;
  }
  return `I'm having a temporary connection problem, so my replies may be limited right now. Your message was saved—please try again shortly, or tell me the one thing you most want help with.`;
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
      responseText = buildSafeFallback(text, analysis.severity);
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
