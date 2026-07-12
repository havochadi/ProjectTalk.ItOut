import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIClassification,
  aiClassificationSchema,
  ASSISTANT_SYSTEM_PROMPT,
  CLASSIFIER_SYSTEM_PROMPT,
  CRISIS_MESSAGE,
  pseudonymizeText,
  RISK_TAGS,
  RISK_SEVERITY,
} from '@talkitout/lib';
import { Message } from '../../models/Message';

// Validate API key on initialization
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('ERROR: GEMINI_API_KEY is not set in environment variables');
  }
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

const AI_MODEL = process.env.AI_MODEL || 'gemini-3.5-flash';
const MODEL_FALLBACKS = Array.from(new Set([AI_MODEL, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro']));
const ALLOW_EXTERNAL_PII = process.env.ALLOW_EXTERNAL_PII === 'true';
const RESPONSE_STYLE_GUIDELINE =
  "Keep each reply warm and concise (about 2-4 sentences). Start by acknowledging how the student might be feeling, then offer a gentle and optional next step if useful. Prioritize listening over fixing. End with one caring open-ended question.";

type ConversationContext = {
  mood?: number;
  recentMessages?: number;
  userName?: string;
  latestSentiment?: 'pos' | 'neu' | 'neg';
  latestSeverity?: number;
  latestRiskTags?: string[];
};

if (process.env.NODE_ENV !== 'test') {
  console.log('AI Configuration:', { primaryModel: AI_MODEL, fallbacks: MODEL_FALLBACKS, allowPII: ALLOW_EXTERNAL_PII });
}

function normalizeRiskTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];

  const normalized = rawTags
    .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase().replace(/[\s_]+/g, '-') : ''))
    .map((tag) => {
      if (!tag) return '';
      if (tag === 'self-harm' || tag === 'suicide' || tag === 'suicidal' || tag === 'selfharm') {
        return RISK_TAGS.SELF_HARM;
      }
      if (tag === 'severe-stress' || tag === 'stress' || tag === 'anxiety' || tag === 'panic') {
        return RISK_TAGS.SEVERE_STRESS;
      }
      if (tag === 'harm-to-others' || tag === 'violence' || tag === 'harm-others') {
        return RISK_TAGS.HARM_TO_OTHERS;
      }
      if (tag === 'overreliance' || tag === 'dependency' || tag === 'dependence') {
        return RISK_TAGS.OVERRELIANCE;
      }
      return '';
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function normalizeSentiment(rawSentiment: unknown): 'pos' | 'neu' | 'neg' {
  if (typeof rawSentiment !== 'string') return 'neu';
  const val = rawSentiment.trim().toLowerCase();
  if (val === 'pos' || val === 'positive') return 'pos';
  if (val === 'neg' || val === 'negative') return 'neg';
  return 'neu';
}

function parseClassification(content: string): AIClassification {
  const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: any;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    const objectMatch = stripped.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error('No JSON object found in AI response');
    }
    parsed = JSON.parse(objectMatch[0]);
  }

  const normalized = {
    sentiment: normalizeSentiment(parsed.sentiment),
    riskTags: normalizeRiskTags(parsed.riskTags),
    severity: Number(parsed.severity) || 1,
  };

  return aiClassificationSchema.parse(normalized);
}

export function classifyRiskLocally(text: string): AIClassification {
  const normalizedText = text.toLowerCase();

  const selfHarmPatterns = [
    /kill myself/,
    /want to die/,
    /end my life/,
    /hurt myself/,
    /suicid/,
    /no reason to live/,
    /can't go on/,
    /want to disappear/,
  ];

  const harmOthersPatterns = [
    /hurt someone/,
    /kill (him|her|them|someone)/,
    /harm (him|her|them|someone)/,
    /violent/,
  ];

  const severeStressPatterns = [
    /can't handle/i,
    /overwhelmed/,
    /breaking down/,
    /hopeless/,
    /worthless/,
    /panic attack/,
    /i give up/,
    /so stressed/,
  ];

  const positivePatterns = [
    /feel(?:ing)? good/,
    /i am good/,
    /happy/,
    /great/,
    /better/,
    /relieved/,
    /excited/,
    /proud/,
    /grateful/,
    /calm/,
    /doing okay/,
  ];

  const tags: string[] = [];
  const hasSelfHarm = selfHarmPatterns.some((pattern) => pattern.test(normalizedText));
  const hasHarmOthers = harmOthersPatterns.some((pattern) => pattern.test(normalizedText));
  const hasSevereStress = severeStressPatterns.some((pattern) => pattern.test(normalizedText));
  const hasPositive = positivePatterns.some((pattern) => pattern.test(normalizedText));

  if (hasSelfHarm) tags.push(RISK_TAGS.SELF_HARM);
  if (hasHarmOthers) tags.push(RISK_TAGS.HARM_TO_OTHERS);
  if (hasSevereStress) tags.push(RISK_TAGS.SEVERE_STRESS);

  let severity = 1;
  if (hasSelfHarm || hasHarmOthers) severity = 3;
  else if (hasSevereStress) severity = 2;

  let sentiment: 'pos' | 'neu' | 'neg' = 'neu';
  if (severity >= 2) {
    sentiment = 'neg';
  } else if (hasPositive) {
    sentiment = 'pos';
  }

  return {
    sentiment,
    riskTags: Array.from(new Set(tags)),
    severity,
  };
}

function inferSentimentFromText(text: string): 'pos' | 'neu' | 'neg' {
  const normalizedText = text.toLowerCase();

  const positivePatterns = [
    /feel(?:ing)? good/,
    /happy/,
    /great/,
    /better/,
    /relieved/,
    /excited/,
    /proud/,
    /grateful/,
    /calm/,
    /doing okay/,
    /doing well/,
  ];

  const negativePatterns = [
    /sad/,
    /stressed/,
    /anxious/,
    /overwhelmed/,
    /hopeless/,
    /worthless/,
    /depressed/,
    /bad/,
    /panic/,
    /i can't handle/,
  ];

  if (negativePatterns.some((pattern) => pattern.test(normalizedText))) return 'neg';
  if (positivePatterns.some((pattern) => pattern.test(normalizedText))) return 'pos';
  return 'neu';
}

function fallbackResponsesBySentiment(sentiment: 'pos' | 'neu' | 'neg'): string[] {
  if (sentiment === 'pos') {
    return [
      'I am really glad to hear you are feeling good. You deserve to notice these better moments and be proud of them. What do you think helped today go well?',
      'That is great to hear, and thank you for sharing it. It sounds like something is going right for you today. Do you want to talk about what made this moment feel better?',
      'I love hearing this from you. Feeling good matters, and it is worth pausing to appreciate it. What would help you keep this momentum going tomorrow?',
      'That sounds really encouraging. I am happy you are feeling better right now. Is there one small thing you want to do to build on this good energy?',
    ];
  }

  if (sentiment === 'neu') {
    return [
      'Thank you for checking in with me. I am here to listen, and we can take this one step at a time. How has your day been feeling overall?',
      'I appreciate you sharing that. We can talk this through together at your pace. What part of today has been easiest, and what part has felt harder?',
      'I hear you, and I am glad you reached out. If you want, we can sort through what is on your mind gently. What feels most important to talk about right now?',
      'Thanks for telling me. I am here with you, and there is no pressure to have everything figured out right away. What has been on your mind the most today?',
    ];
  }

  return [
    'Thank you for sharing that with me. It sounds like you are carrying a lot right now, and I am here to listen. Do you want to tell me what feels heaviest at the moment?',
    'I am really glad you reached out. What you are feeling matters, and you do not have to go through it alone. Would it help to talk through what happened today?',
    'That sounds really hard, and it makes sense that you are feeling this way. We can take this one small step at a time if you want. What feels most overwhelming right now?',
    'I hear you, and I am here with you. Thank you for being honest about how things feel. Do you want to share more about what has been weighing on you lately?',
    'I am sorry this has been so heavy for you. You deserve support, and I am here to listen without judgment. What would feel most helpful right now, even a little bit?',
  ];
}

function isSimpleGreeting(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return [
    'hi',
    'hello',
    'hey',
    'hii',
    'heyy',
    'yo',
    'sup',
    'good morning',
    'good afternoon',
    'good evening',
  ].includes(normalized);
}

function greetingResponses(): string[] {
  return [
    'Hey, I am really glad you are here. How are you feeling today?',
    'Hi, good to hear from you. What is on your mind right now?',
    'Hello, I am here to listen. How has your day been so far?',
    'Hey, thanks for checking in. Do you want to share how you are feeling today?',
    'Hi, I am here with you. How are things feeling for you right now?',
    'Hello, good to hear from you. Want to tell me how your day has been going?',
  ];
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function shortResponsesBySentiment(sentiment: 'pos' | 'neu' | 'neg'): string[] {
  if (sentiment === 'pos') {
    return [
      'I am glad to hear that. Want to share what has been going well today?',
      'That is nice to hear. What do you think helped you feel this way?',
      'Love hearing that from you. Want to talk a bit about what made today better?',
      'That is really good to hear. What has felt most positive today?',
      'I am happy you shared that. Do you want to tell me what went well?',
    ];
  }

  if (sentiment === 'neg') {
    return [
      'I hear you, and I am here with you. Want to tell me a little more about what is weighing on you?',
      'That sounds hard. We can take it one step at a time together, if you want.',
      'Thanks for sharing that. I am listening. What feels most difficult right now?',
      'I am with you. Do you want to start with what feels hardest right now?',
      'That sounds heavy. I am here to listen whenever you are ready.',
    ];
  }

  return [
    'I am here to listen. Want to share a little more so I can support you better?',
    'Thanks for checking in. What is on your mind right now?',
    'Got you. Do you want to tell me a bit more about how your day is going?',
    'I am with you. What would you like to talk about first?',
    'Thanks for reaching out. How are things going for you right now?',
  ];
}

function normalizeReply(text: string): string {
  let cleaned = text
    .replace(/^assistant:\s*/i, '')
    .replace(/^talkitout:\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Keep responses conversational and compact.
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 4) {
    cleaned = sentences.slice(0, 4).join(' ');
  }

  return cleaned;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickNonRepeatingResponse(options: string[], recentResponses: string[]): string {
  if (options.length === 0) return '';
  if (recentResponses.length === 0) {
    return options[Math.floor(Math.random() * options.length)];
  }

  const recentNormalized = new Set(recentResponses.map((r) => normalizeForComparison(r)));
  const candidates = options.filter((option) => !recentNormalized.has(normalizeForComparison(option)));
  const pool = candidates.length > 0 ? candidates : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function generateContentWithModelFallback(
  prompt: string,
  generationConfig: { temperature: number; maxOutputTokens: number }
): Promise<{ text: string; modelUsed: string }> {
  let lastError: unknown;

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const text = result.response.text().trim();
      if (!text) {
        throw new Error(`Empty response from model ${modelName}`);
      }

      return { text, modelUsed: modelName };
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Model ${modelName} failed, trying fallback...`);
    }
  }

  throw lastError || new Error('All AI models failed');
}

/**
 * Analyzes text for sentiment and risk indicators
 */
export async function analyzeText(text: string): Promise<AIClassification> {
  const localFallback = classifyRiskLocally(text);

  if (!GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY missing, using local risk classifier');
    return localFallback;
  }

  try {
    // Pseudonymize before sending to Gemini
    const sanitizedText = pseudonymizeText(text, ALLOW_EXTERNAL_PII);

    const prompt = `${CLASSIFIER_SYSTEM_PROMPT}\n\nUser message: ${sanitizedText}`;

    console.log('🔍 Analyzing message for risk...');
    const { text: content, modelUsed } = await generateContentWithModelFallback(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1000,
    });
    const validated = parseClassification(content);

    console.log('✅ Risk analysis complete:', {
      modelUsed,
      sentiment: validated.sentiment,
      severity: validated.severity,
      riskTags: validated.riskTags,
    });
    return validated;
  } catch (error) {
    console.error('❌ Error analyzing text:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }

    console.warn('⚠️ Using local risk fallback classification');
    return localFallback;
  }
}

/**
 * Generates AI response to user message
 */
export async function generateResponse(
  userId: string,
  userMessage: string,
  context?: ConversationContext
): Promise<string> {
  const historyLimit = context?.recentMessages || 6;
  const historyWindow = Math.max(historyLimit, 8);
  let recentHistory: any[] = [];

  try {
    recentHistory = await Message.find({ userId })
      .sort({ createdAt: -1 })
      .limit(historyWindow)
      .lean();
  } catch {
    recentHistory = [];
  }

  const recentAssistantResponses = recentHistory
    .filter((msg) => msg.role === 'assistant' && typeof msg.text === 'string')
    .map((msg) => msg.text)
    .slice(0, 8);

  if (isSimpleGreeting(userMessage)) {
    const greetings = greetingResponses();
    return pickNonRepeatingResponse(greetings, recentAssistantResponses);
  }

  const latestSentiment = context?.latestSentiment || inferSentimentFromText(userMessage);
  const latestSeverity = context?.latestSeverity ?? 1;
  const latestRiskTags = context?.latestRiskTags || [];
  const inputWords = wordCount(userMessage);

  if (inputWords <= 4 && latestSeverity < 2) {
    const shortReplies = shortResponsesBySentiment(latestSentiment);
    return pickNonRepeatingResponse(shortReplies, recentAssistantResponses);
  }

  if (!GEMINI_API_KEY) {
    const supportiveResponses = fallbackResponsesBySentiment(latestSentiment);
    return pickNonRepeatingResponse(supportiveResponses, recentAssistantResponses);
  }

  try {
    // Use already fetched conversation history
    const history = recentHistory.slice(0, historyLimit);

    // Build conversation context with system prompt
    let conversationText = `${ASSISTANT_SYSTEM_PROMPT}`;

    // Add user name if provided
    if (context?.userName) {
      conversationText += ` The student's name is ${context.userName}.`;
    }
    conversationText += ` ${RESPONSE_STYLE_GUIDELINE}\n\n`;
    conversationText += `Latest message emotional signal: sentiment=${latestSentiment}, severity=${latestSeverity}, riskTags=${latestRiskTags.join(',') || 'none'}.\n`;
    conversationText +=
      'Important: Align with the latest message emotion and do not contradict what the student just said. If sentiment is positive, acknowledge and reinforce positive progress. If neutral, explore gently. If negative, validate distress and offer comfort first.\n\n';
    conversationText +=
      'Respond directly to the latest user message first. Do not give unrelated advice or recap old topics unless the user asks.\n\n';

    // Add recent history (oldest to newest)
    history.reverse().forEach((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      conversationText += `${role}: ${msg.text}\n\n`;
    });

    // Add current user message
    const sanitizedMessage = pseudonymizeText(userMessage, ALLOW_EXTERNAL_PII);
    conversationText += `User: ${sanitizedMessage}\n\nAssistant:`;

    const { text: aiResponse, modelUsed } = await generateContentWithModelFallback(conversationText, {
      temperature: 0.55,
      maxOutputTokens: 260,
    });

    const normalized = normalizeReply(aiResponse);
    const normalizedRecent = new Set(recentAssistantResponses.map((r) => normalizeForComparison(r)));
    if (normalizedRecent.has(normalizeForComparison(normalized))) {
      const fallbackOptions = fallbackResponsesBySentiment(latestSentiment);
      return pickNonRepeatingResponse(fallbackOptions, recentAssistantResponses);
    }

    console.log('✅ AI Response generated successfully with model:', modelUsed);
    return normalized;
  } catch (error) {
    console.error('❌ Error generating response:', error);

    // Log detailed error info for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Return a generic supportive response instead of hardcoded fallbacks
    const supportiveResponses = fallbackResponsesBySentiment(latestSentiment);

    return pickNonRepeatingResponse(supportiveResponses, recentAssistantResponses);
  }
}

/**
 * Prepends crisis message to response if severity is high
 */
export function addCrisisMessageIfNeeded(response: string, severity: number): string {
  if (severity >= RISK_SEVERITY.HIGH) {
    return `${CRISIS_MESSAGE}\n\n${response}`;
  }
  return response;
}

/**
 * Detects potential AI overreliance based on message patterns
 */
export async function detectOverreliance(userId: string): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentMessages = await Message.countDocuments({
    userId,
    role: 'user',
    createdAt: { $gte: oneDayAgo },
  });

  // Flag if user sends more than 30 messages in 24 hours
  if (recentMessages > 30) {
    return true;
  }

  // Check for low mood patterns
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const negativeMessages = await Message.countDocuments({
    userId,
    role: 'user',
    sentiment: 'neg',
    createdAt: { $gte: sevenDaysAgo },
  });

  const totalRecentMessages = await Message.countDocuments({
    userId,
    role: 'user',
    createdAt: { $gte: sevenDaysAgo },
  });

  // Flag if >70% of messages are negative over 7 days
  if (totalRecentMessages > 10 && negativeMessages / totalRecentMessages > 0.7) {
    return true;
  }

  return false;
}
