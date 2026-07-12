import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const AI_MODEL = process.env.AI_MODEL || 'gemini-3.5-flash';

interface StudySuggestion {
  method: string;
  description: string;
  timeEstimate: string;
}

interface TaskSummary {
  overview: string;
  totalTasks: number;
  completionRate: number;
  suggestions: string[];
  motivationalMessage: string;
}

/**
 * Generate study method suggestions for a specific task
 */
export async function generateStudySuggestions(
  taskTitle: string,
  subject?: string
): Promise<StudySuggestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: AI_MODEL });

    const prompt = `You are a helpful study assistant for students. Given the following task, suggest 3 effective study methods.

Task: ${taskTitle}
${subject ? `Subject: ${subject}` : ''}

Provide 3 study methods in JSON format. Each method should include:
- method: Name of the study method (e.g., "Pomodoro Technique", "Mind Mapping")
- description: Brief explanation of how to use this method (2-3 sentences, supportive tone)
- timeEstimate: Estimated time needed (e.g., "25 minutes", "1-2 hours")

Be supportive, encouraging, and practical. Focus on methods that help reduce stress and improve understanding.

Return ONLY a JSON array of study methods, nothing else. Example format:
[
  {
    "method": "Pomodoro Technique",
    "description": "Break your study time into 25-minute focused sessions with 5-minute breaks. This helps maintain concentration and prevents burnout.",
    "timeEstimate": "25 minutes per session"
  }
]`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    let content = result.response.text().trim();

    // Strip markdown code blocks if present
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const suggestions = JSON.parse(content);

    // Validate structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid suggestions format');
    }

    return suggestions.slice(0, 3); // Ensure max 3 suggestions
  } catch (error) {
    console.error('Error generating study suggestions:', error);
    // Return default suggestions on error
    return [
      {
        method: 'Break It Down',
        description: 'Divide the task into smaller, manageable parts. Focus on completing one part at a time.',
        timeEstimate: '30-45 minutes',
      },
      {
        method: 'Take Regular Breaks',
        description: 'Study for 25-30 minutes, then take a 5-minute break. This helps maintain focus and reduces stress.',
        timeEstimate: '25 minutes per session',
      },
      {
        method: 'Create a Study Space',
        description: 'Find a quiet, comfortable place to study. Having a dedicated space can help you focus better.',
        timeEstimate: '10 minutes to set up',
      },
    ];
  }
}

/**
 * Generate a summary and analysis of current tasks
 */
export async function generateTaskSummary(tasks: any[]): Promise<TaskSummary> {
  try {
    const model = genAI.getGenerativeModel({ model: AI_MODEL });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'doing').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const tasksList = tasks.map(t => `- ${t.title} (${t.status}${t.subject ? `, ${t.subject}` : ''})`).join('\n');

    const prompt = `You are a supportive study coach helping a student. Analyze their to-do list and provide encouragement and practical suggestions.

Current Tasks:
${tasksList}

Statistics:
- Total tasks: ${totalTasks}
- Completed: ${completedTasks}
- In progress: ${inProgressTasks}
- To do: ${todoTasks}
- Completion rate: ${completionRate}%

Provide a JSON response with:
{
  "overview": "2-3 sentence overview of their progress (be encouraging and supportive)",
  "suggestions": ["3 specific, actionable suggestions to help them manage their tasks better"],
  "motivationalMessage": "1 sentence of genuine encouragement"
}

Be warm, understanding, and supportive. Remember they might be feeling overwhelmed. Focus on small wins and progress.

Return ONLY valid JSON, nothing else.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 800,
      },
    });

    let content = result.response.text().trim();

    // Strip markdown code blocks if present
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const aiResponse = JSON.parse(content);

    return {
      overview: aiResponse.overview || 'Keep going! Every task you complete is progress.',
      totalTasks,
      completionRate,
      suggestions: aiResponse.suggestions || [],
      motivationalMessage: aiResponse.motivationalMessage || "You're doing great! Take it one step at a time.",
    };
  } catch (error) {
    console.error('Error generating task summary:', error);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      overview: 'Keep making progress on your tasks. Every small step counts!',
      totalTasks,
      completionRate,
      suggestions: [
        'Focus on one task at a time to avoid feeling overwhelmed',
        'Celebrate small wins - each completed task is an achievement',
        'Take breaks when you need them - your wellbeing matters',
      ],
      motivationalMessage: "You're capable of amazing things. Keep going!",
    };
  }
}
