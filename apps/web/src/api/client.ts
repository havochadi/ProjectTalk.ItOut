import { supabase, requireSupabaseConfig } from '../lib/supabase';

type ApiResponse<T = any> = Promise<{ data: T }>;

function fail(error: any): never {
  const message = error?.message || error?.error || 'Supabase request failed';
  const wrapped: any = new Error(message);
  wrapped.response = { data: { error: message, message } };
  throw wrapped;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    age: row.age,
    school: row.school,
    guardianConsent: row.guardian_consent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfile(row: any) {
  if (!row) return null;
  return {
    _id: row.id,
    userId: row.id,
    preferences: row.preferences,
    goals: row.goals || [],
    streaks: row.streaks || [],
    badges: row.badges || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTask(row: any) {
  return {
    _id: row.id,
    userId: row.user_id,
    title: row.title,
    subject: row.subject,
    dueAt: row.due_at,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCheckIn(row: any) {
  return {
    _id: row.id,
    userId: row.user_id,
    mood: row.mood,
    note: row.note,
    sentiment: row.sentiment,
    createdAt: row.created_at,
  };
}

function mapSession(row: any) {
  return {
    _id: row.id,
    userId: row.user_id,
    type: row.type,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    cyclesCompleted: row.cycles_completed,
    createdAt: row.created_at,
  };
}

function mapChatMessage(row: any) {
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    role: row.role,
    text: row.text,
    sentiment: row.sentiment,
    riskTags: row.risk_tags || [],
    severity: row.severity,
    createdAt: row.created_at,
  };
}

function mapRiskFlag(row: any) {
  const user = mapUser(unwrap(row.user));
  const message = unwrap(row.message) as any;
  const reviewer = mapUser(unwrap(row.reviewer));
  return {
    _id: row.id,
    userId: user || row.user_id,
    messageId: message
      ? { _id: message.id, text: message.text, createdAt: message.created_at }
      : {
          _id: row.message_id || row.id,
          text: row.message_text,
          createdAt: row.created_at,
        },
    tags: row.tags || [],
    severity: row.severity,
    status: row.status,
    reviewedBy: reviewer,
    notes: row.notes,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCounselorMessage(row: any) {
  const from = mapUser(unwrap(row.from_user));
  const to = mapUser(unwrap(row.to_user));
  return {
    _id: row.id,
    fromUserId: from || row.from_user_id,
    toUserId: to || row.to_user_id,
    text: row.text,
    read: row.read,
    threadId: row.thread_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function currentUserId() {
  requireSupabaseConfig();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) fail(error || new Error('You must be signed in'));
  return data.user.id;
}

async function invokeAssistant(body: Record<string, unknown>) {
  requireSupabaseConfig();
  const { data, error } = await supabase.functions.invoke('assistant', { body });
  if (error) fail(error);
  if (data?.error) fail(new Error(data.error));
  return data;
}

export const authAPI = {
  async register(input: any): ApiResponse {
    requireSupabaseConfig();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
          age: input.age,
          school: input.school || null,
          guardianConsent: Boolean(input.guardianConsent),
        },
      },
    });
    if (error) fail(error);
    if (!data.session) {
      fail(new Error('Check your email to confirm the account, then sign in.'));
    }
    const profile = await userAPI.getMe();
    return {
      data: {
        user: profile.data.user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    };
  },

  async login(input: any): ApiResponse {
    requireSupabaseConfig();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) fail(error);
    const profile = await userAPI.getMe();
    return {
      data: {
        user: profile.data.user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    };
  },

  async logout(): ApiResponse {
    const { error } = await supabase.auth.signOut();
    if (error) fail(error);
    return { data: { message: 'Logged out' } };
  },
};

export const userAPI = {
  async getMe(): ApiResponse {
    const id = await currentUserId();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) fail(error);
    return { data: { user: mapUser(data), profile: mapProfile(data) } };
  },

  async updateProfile(input: any): ApiResponse {
    const id = await currentUserId();
    const updates: any = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.school !== undefined) updates.school = input.school;
    if (input.preferences) {
      const { data: existing, error: readError } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', id)
        .single();
      if (readError) fail(readError);
      updates.preferences = {
        ...(existing.preferences || {}),
        ...input.preferences,
        pomodoro: {
          ...(existing.preferences?.pomodoro || {}),
          ...(input.preferences.pomodoro || {}),
        },
      };
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) fail(error);
    return { data: { user: mapUser(data), profile: mapProfile(data) } };
  },

  async addGoal(goal: any): ApiResponse {
    const id = await currentUserId();
    const { data: profile, error: readError } = await supabase
      .from('profiles')
      .select('goals')
      .eq('id', id)
      .single();
    if (readError) fail(readError);
    const saved = { ...goal, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const { error } = await supabase
      .from('profiles')
      .update({ goals: [...(profile.goals || []), saved] })
      .eq('id', id);
    if (error) fail(error);
    return { data: saved };
  },

  async getUsers(params: any = {}): ApiResponse {
    let query: any = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (params.role) query = query.eq('role', params.role);
    const { data, error } = await query;
    if (error) fail(error);
    let users = (data || []).map(mapUser);
    if (params.search) {
      const search = String(params.search).toLowerCase();
      users = users.filter(
        (user: any) =>
          user.name?.toLowerCase().includes(search) || user.email?.toLowerCase().includes(search)
      );
    }
    return { data: { users } };
  },
};

export const taskAPI = {
  async create(input: any): ApiResponse {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: input.title,
        subject: input.subject || null,
        due_at: input.dueAt || null,
        priority: input.priority || 'med',
        status: input.status || 'todo',
      })
      .select()
      .single();
    if (error) fail(error);
    return { data: mapTask(data) };
  },

  async getAll(params: any = {}): ApiResponse {
    const userId = await currentUserId();
    let query: any = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (params.status) query = query.eq('status', params.status);
    if (params.priority) query = query.eq('priority', params.priority);
    if (params.subject) query = query.eq('subject', params.subject);
    const { data, error } = await query;
    if (error) fail(error);
    return { data: { tasks: (data || []).map(mapTask) } };
  },

  async get(id: string): ApiResponse {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (error) fail(error);
    return { data: mapTask(data) };
  },

  async update(id: string, input: any): ApiResponse {
    const updates: any = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.subject !== undefined) updates.subject = input.subject;
    if (input.dueAt !== undefined) updates.due_at = input.dueAt;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.status !== undefined) updates.status = input.status;
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) fail(error);
    return { data: mapTask(data) };
  },

  async delete(id: string): ApiResponse {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) fail(error);
    return { data: { message: 'Task deleted' } };
  },

  updateStatus(id: string, status: string) {
    return this.update(id, { status });
  },

  async getStudySuggestions(id: string): ApiResponse {
    const task = await this.get(id);
    const data = await invokeAssistant({ action: 'task_suggestions', task: task.data });
    return { data };
  },

  async getSummary(): ApiResponse {
    const tasks = (await this.getAll()).data.tasks;
    try {
      const data = await invokeAssistant({ action: 'task_summary', tasks });
      return { data };
    } catch {
      const done = tasks.filter((task: any) => task.status === 'done').length;
      return {
        data: {
          overview: 'Your current task progress',
          totalTasks: tasks.length,
          completionRate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
          suggestions: ['Choose one small next step', 'Work in a focused 25-minute block'],
          motivationalMessage: 'Small, consistent progress counts.',
        },
      };
    }
  },
};

export const chatAPI = {
  async sendMessage(text: string): ApiResponse {
    const data = await invokeAssistant({ action: 'chat', text });
    return { data };
  },

  async getHistory(params: any = {}): ApiResponse {
    const userId = await currentUserId();
    const limit = Number(params.limit) || 50;
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(params.skip) || 0, (Number(params.skip) || 0) + limit - 1);
    if (error) fail(error);
    return { data: { messages: (data || []).reverse().map(mapChatMessage) } };
  },

  async clearHistory(): ApiResponse {
    const userId = await currentUserId();
    const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId);
    if (error) fail(error);
    return { data: { message: 'Chat history cleared' } };
  },
};

export const checkInAPI = {
  async create(input: any): ApiResponse {
    const userId = await currentUserId();
    const sentiment = input.note
      ? input.mood <= 2
        ? 'neg'
        : input.mood >= 4
          ? 'pos'
          : 'neu'
      : null;
    const { data, error } = await supabase
      .from('check_ins')
      .insert({ user_id: userId, mood: input.mood, note: input.note || null, sentiment })
      .select()
      .single();
    if (error) fail(error);
    return { data: mapCheckIn(data) };
  },

  async getMine(params: any = {}): ApiResponse {
    const userId = await currentUserId();
    let query: any = supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(params.limit) || 100);
    if (params.days) {
      const since = new Date();
      since.setDate(since.getDate() - Number(params.days));
      query = query.gte('created_at', since.toISOString());
    }
    if (params.startDate) query = query.gte('created_at', params.startDate);
    const { data, error } = await query;
    if (error) fail(error);
    return { data: { checkIns: (data || []).map(mapCheckIn) } };
  },

  async getStats(): ApiResponse {
    const userId = await currentUserId();
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const [{ data: recent, error }, { count }, { data: profile }] = await Promise.all([
      supabase
        .from('check_ins')
        .select('mood')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString()),
      supabase.from('check_ins').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('profiles').select('streaks').eq('id', userId).single(),
    ]);
    if (error) fail(error);
    const moods = recent || [];
    const average = moods.length
      ? Math.round(
          (moods.reduce((sum: number, item: any) => sum + item.mood, 0) / moods.length) * 10
        ) / 10
      : 0;
    const streak = (profile?.streaks || []).find((item: any) => item.type === 'checkin');
    return {
      data: {
        totalCheckIns: count || 0,
        recentCheckIns: moods.length,
        averageMood: average,
        currentStreak: streak?.count || 0,
      },
    };
  },
};

export const pomodoroAPI = {
  async start(): ApiResponse {
    const userId = await currentUserId();
    const { data: active } = await supabase
      .from('focus_sessions')
      .select('id')
      .eq('user_id', userId)
      .is('ended_at', null)
      .maybeSingle();
    if (active) fail(new Error('Session already in progress'));
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({ user_id: userId })
      .select()
      .single();
    if (error) fail(error);
    return { data: mapSession(data) };
  },

  async stop(cyclesCompleted: number): ApiResponse {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({ ended_at: new Date().toISOString(), cycles_completed: cyclesCompleted || 0 })
      .eq('user_id', userId)
      .is('ended_at', null)
      .select()
      .single();
    if (error) fail(error);
    return { data: mapSession(data) };
  },

  async getState(): ApiResponse {
    const userId = await currentUserId();
    const [{ data: active, error }, { data: profile }] = await Promise.all([
      supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .is('ended_at', null)
        .maybeSingle(),
      supabase.from('profiles').select('preferences').eq('id', userId).single(),
    ]);
    if (error) fail(error);
    return {
      data: {
        activeSession: active ? mapSession(active) : null,
        preferences: profile?.preferences?.pomodoro || null,
      },
    };
  },

  async getHistory(params: any = {}): ApiResponse {
    const userId = await currentUserId();
    let query: any = supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(50);
    if (params.days) {
      const since = new Date();
      since.setDate(since.getDate() - Number(params.days));
      query = query.gte('started_at', since.toISOString());
    }
    const { data, error } = await query;
    if (error) fail(error);
    return { data: { sessions: (data || []).map(mapSession) } };
  },
};

const riskSelect = `
  *,
  user:profiles!risk_flags_user_id_fkey(*),
  message:chat_messages!risk_flags_message_id_fkey(id,text,created_at),
  reviewer:profiles!risk_flags_reviewed_by_fkey(*)
`;

export const riskAPI = {
  async getFlags(params: any = {}): ApiResponse {
    let query: any = supabase
      .from('risk_flags')
      .select(riskSelect)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (params.status) query = query.eq('status', params.status);
    if (params.severity) query = query.eq('severity', Number(params.severity));
    if (params.userId) query = query.eq('user_id', params.userId);
    const { data, error } = await query;
    if (error) fail(error);
    return { data: { flags: (data || []).map(mapRiskFlag) } };
  },

  async getFlag(id: string): ApiResponse {
    const { data, error } = await supabase
      .from('risk_flags')
      .select(riskSelect)
      .eq('id', id)
      .single();
    if (error) fail(error);
    const from = new Date(new Date(data.created_at).getTime() - 60 * 60 * 1000).toISOString();
    const to = new Date(new Date(data.created_at).getTime() + 60 * 60 * 1000).toISOString();
    const { data: context } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', data.user_id)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at');
    return { data: { flag: mapRiskFlag(data), context: (context || []).map(mapChatMessage) } };
  },

  async updateFlag(id: string, input: any): ApiResponse {
    const reviewer = await currentUserId();
    const updates: any = { reviewed_by: reviewer };
    if (input.status) {
      updates.status = String(input.status)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
      updates.resolved_at = updates.status === 'resolved' ? new Date().toISOString() : null;
    }
    if (input.notes !== undefined) updates.notes = input.notes;
    const { data, error } = await supabase
      .from('risk_flags')
      .update(updates)
      .eq('id', id)
      .select(riskSelect)
      .single();
    if (error) fail(error);
    return { data: mapRiskFlag(data) };
  },

  async deleteFlag(id: string): ApiResponse {
    const { data, error } = await supabase
      .from('risk_flags')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) fail(error);
    return { data: { message: 'Risk flag deleted successfully', flag: mapRiskFlag(data) } };
  },
};

export const metricsAPI = {
  async getAggregate(params: any = {}): ApiResponse {
    const since = new Date();
    since.setDate(since.getDate() - (Number(params.days) || 7));
    const sinceIso = since.toISOString();
    const [profiles, checkIns, sessions, messages, flags] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'student'),
      supabase.from('check_ins').select('user_id,mood').gte('created_at', sinceIso),
      supabase
        .from('focus_sessions')
        .select('user_id,cycles_completed')
        .gte('started_at', sinceIso)
        .not('ended_at', 'is', null),
      supabase
        .from('chat_messages')
        .select('user_id,sentiment')
        .eq('role', 'user')
        .gte('created_at', sinceIso),
      supabase.from('risk_flags').select('status,severity,created_at'),
    ]);
    const error =
      profiles.error || checkIns.error || sessions.error || messages.error || flags.error;
    if (error) fail(error);
    const active = new Set([
      ...(checkIns.data || []).map((item: any) => item.user_id),
      ...(messages.data || []).map((item: any) => item.user_id),
    ]);
    const moods = checkIns.data || [];
    const average = moods.length
      ? Math.round(
          (moods.reduce((sum: number, item: any) => sum + item.mood, 0) / moods.length) * 10
        ) / 10
      : 0;
    const openFlags = (flags.data || []).filter((flag: any) => flag.status === 'open');
    const bySeverity: Record<string, number> = {};
    openFlags.forEach((flag: any) => {
      bySeverity[flag.severity] = (bySeverity[flag.severity] || 0) + 1;
    });
    const sentiment: Record<string, number> = {};
    (messages.data || []).forEach((message: any) => {
      if (message.sentiment) sentiment[message.sentiment] = (sentiment[message.sentiment] || 0) + 1;
    });
    return {
      data: {
        users: { total: profiles.data?.length || 0, active: active.size },
        mood: { average, totalCheckIns: moods.length },
        focus: {
          sessions: sessions.data?.length || 0,
          completedCycles: (sessions.data || []).reduce(
            (sum: number, item: any) => sum + item.cycles_completed,
            0
          ),
        },
        risk: {
          openFlags: openFlags.length,
          recentFlags: (flags.data || []).filter((flag: any) => flag.created_at >= sinceIso).length,
          bySeverity,
        },
        sentiment,
      },
    };
  },

  async getUserMetrics(userId: string, params: any = {}): ApiResponse {
    const since = new Date();
    since.setDate(since.getDate() - (Number(params.days) || 30));
    const sinceIso = since.toISOString();
    const [checkIns, tasks, sessions, flags] = await Promise.all([
      supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sinceIso)
        .order('created_at'),
      supabase.from('tasks').select('*').eq('user_id', userId).gte('created_at', sinceIso),
      supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', sinceIso)
        .not('ended_at', 'is', null),
      supabase
        .from('risk_flags')
        .select(riskSelect)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);
    const error = checkIns.error || tasks.error || sessions.error || flags.error;
    if (error) fail(error);
    const moods = checkIns.data || [];
    const average = moods.length
      ? Math.round(
          (moods.reduce((sum: number, item: any) => sum + item.mood, 0) / moods.length) * 10
        ) / 10
      : 0;
    const totalMinutes = (sessions.data || []).reduce((sum: number, item: any) => {
      return (
        sum + (new Date(item.ended_at).getTime() - new Date(item.started_at).getTime()) / 60000
      );
    }, 0);
    return {
      data: {
        checkIns: {
          total: moods.length,
          averageMood: average,
          lastCheckIn: moods.length ? moods[moods.length - 1].created_at : null,
          history: moods.map(mapCheckIn),
        },
        tasks: {
          total: tasks.data?.length || 0,
          completed: (tasks.data || []).filter((task: any) => task.status === 'done').length,
        },
        focus: {
          totalSessions: sessions.data?.length || 0,
          totalMinutes: Math.round(totalMinutes),
        },
        riskFlags: (flags.data || []).map(mapRiskFlag),
      },
    };
  },
};

export const privacyAPI = {
  async exportData(): ApiResponse {
    const userId = await currentUserId();
    const [profile, tasks, sessions, checkIns, messages, riskFlags, audits] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('focus_sessions').select('*').eq('user_id', userId),
      supabase.from('check_ins').select('*').eq('user_id', userId),
      supabase.from('chat_messages').select('*').eq('user_id', userId),
      supabase.from('risk_flags').select('*').eq('user_id', userId),
      supabase.from('audits').select('*').eq('actor_id', userId),
    ]);
    await supabase
      .from('audits')
      .insert({ actor_id: userId, action: 'data_export', entity: 'User', entity_id: userId });
    return {
      data: {
        exportedAt: new Date().toISOString(),
        user: mapUser(profile.data),
        profile: mapProfile(profile.data),
        tasks: (tasks.data || []).map(mapTask),
        sessions: (sessions.data || []).map(mapSession),
        checkIns: (checkIns.data || []).map(mapCheckIn),
        messages: (messages.data || []).map(mapChatMessage),
        riskFlags: (riskFlags.data || []).map(mapRiskFlag),
        audits: audits.data || [],
      },
    };
  },

  async deleteAccount(): ApiResponse {
    const { data, error } = await supabase.functions.invoke('account', {
      body: { confirmation: 'DELETE' },
    });
    if (error) fail(error);
    return { data };
  },
};

export const adminAPI = {
  async getHealth(): ApiResponse {
    requireSupabaseConfig();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return {
      data: { status: error ? 'error' : 'ok', database: error ? 'disconnected' : 'connected' },
    };
  },
  async getConfig(): ApiResponse {
    return {
      data: {
        environment: import.meta.env.MODE,
        apiVersion: 'supabase-1.0',
        features: { chat: true, pomodoro: true, checkIns: true, tasks: true, riskDetection: true },
        crisis: { emergency: '999', sosLine: '1767', sosText: '9151 1767' },
      },
    };
  },
  async getStats(): ApiResponse {
    const tables = ['profiles', 'tasks', 'check_ins', 'chat_messages', 'risk_flags'];
    const collections = await Promise.all(
      tables.map(async (name) => {
        const { count, error } = await supabase
          .from(name)
          .select('*', { count: 'exact', head: true });
        if (error) fail(error);
        return { name, count: count || 0 };
      })
    );
    return { data: { database: 'supabase', collections } };
  },
};

const counselorMessageSelect = `
  *,
  from_user:profiles!counselor_messages_from_user_id_fkey(*),
  to_user:profiles!counselor_messages_to_user_id_fkey(*)
`;

export const counselorMessagesAPI = {
  async sendMessage(toUserId: string, text: string): ApiResponse {
    const fromUserId = await currentUserId();
    const { data, error } = await supabase
      .from('counselor_messages')
      .insert({ from_user_id: fromUserId, to_user_id: toUserId, text: text.trim() })
      .select(counselorMessageSelect)
      .single();
    if (error) fail(error);
    return {
      data: { message: 'Message sent successfully', counselorMessage: mapCounselorMessage(data) },
    };
  },

  async getSentMessages(toUserId?: string): ApiResponse {
    const fromUserId = await currentUserId();
    let query: any = supabase
      .from('counselor_messages')
      .select(counselorMessageSelect)
      .eq('from_user_id', fromUserId)
      .order('created_at', { ascending: false });
    if (toUserId) query = query.eq('to_user_id', toUserId);
    const { data, error } = await query;
    if (error) fail(error);
    return { data: { messages: (data || []).map(mapCounselorMessage) } };
  },

  async getReceivedMessages(): ApiResponse {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('counselor_messages')
      .select(counselorMessageSelect)
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) fail(error);
    return { data: { messages: (data || []).map(mapCounselorMessage) } };
  },

  async markAsRead(id: string): ApiResponse {
    const { data, error } = await supabase
      .from('counselor_messages')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) fail(error);
    return {
      data: { message: 'Message marked as read', counselorMessage: mapCounselorMessage(data) },
    };
  },

  async getUnreadCount(): ApiResponse {
    const userId = await currentUserId();
    const { count, error } = await supabase
      .from('counselor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', userId)
      .eq('read', false);
    if (error) fail(error);
    return { data: { count: count || 0 } };
  },

  async replyToMessage(messageId: string, text: string): ApiResponse {
    const userId = await currentUserId();
    const { data: original, error: originalError } = await supabase
      .from('counselor_messages')
      .select('*')
      .eq('id', messageId)
      .single();
    if (originalError) fail(originalError);
    const threadId = original.thread_id || original.id;
    const { data, error } = await supabase
      .from('counselor_messages')
      .insert({
        from_user_id: userId,
        to_user_id: original.from_user_id,
        text: text.trim(),
        thread_id: threadId,
      })
      .select(counselorMessageSelect)
      .single();
    if (error) fail(error);
    return {
      data: { message: 'Reply sent successfully', counselorMessage: mapCounselorMessage(data) },
    };
  },

  async getThread(messageId: string): ApiResponse {
    const { data: message, error: messageError } = await supabase
      .from('counselor_messages')
      .select('*')
      .eq('id', messageId)
      .single();
    if (messageError) fail(messageError);
    const threadId = message.thread_id || message.id;
    const { data, error } = await supabase
      .from('counselor_messages')
      .select(counselorMessageSelect)
      .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
      .order('created_at');
    if (error) fail(error);
    return { data: { messages: (data || []).map(mapCounselorMessage) } };
  },
};

// Compatibility wrapper for the existing optional voice client. Requests are
// routed to the Supabase `voice` Edge Function instead of an Express server.
export const api = {
  async get(path: string): ApiResponse {
    if (path !== '/voice/config') fail(new Error(`Unsupported Supabase API path: ${path}`));
    const { data, error } = await supabase.functions.invoke('voice', {
      body: { action: 'config' },
      headers: { 'x-talkitout-action': 'config' },
    });
    if (error) fail(error);
    return { data };
  },

  async post(path: string, body: any, _config?: any): ApiResponse {
    const action = path === '/voice/tts' ? 'tts' : path === '/voice/stt' ? 'stt' : '';
    if (!action) fail(new Error(`Unsupported Supabase API path: ${path}`));
    const { data, error } = await supabase.functions.invoke('voice', {
      body,
      headers: { 'x-talkitout-action': action },
    });
    if (error) fail(error);
    return { data };
  },
};
