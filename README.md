# TalkItOut

An AI-powered support system for Singapore students (ages 10-19) that helps with academic stress, time management, goals, and mental health reflection.

## Features

### For Students

- 💬 **AI Chat Companion** - Supportive, non-clinical study companion powered by Google Gemini
- 🎯 **Pomodoro Focus Timer** - Interactive focus sessions with breathing exercises
- ✅ **Task Management** - Kanban-style task board with priorities and due dates
- ❤️ **Daily Check-ins** - Mood tracking with sentiment analysis and trend visualization
- 📊 **Progress Dashboard** - Streaks, badges, and insights
- 🧘 **Wellness Activities** - Box breathing, grounding exercises, thought reframing

### For Counselors

- 📊 **Dashboard** - Aggregated metrics and student engagement
- ⚠️ **Risk Detection** - AI-powered sentiment analysis and risk flagging
- 👥 **Student Management** - View and monitor student progress
- 📈 **Analytics** - Mood trends, session data, and intervention tracking

### Privacy & Safety

- 🔒 **PDPA/GDPR Compliant** - Pseudonymization of PII before external API calls
- 🚨 **Crisis Detection** - Automatic flagging of high-severity messages
- 📦 **Data Export** - Full data export in JSON format
- 🗑️ **Right to Delete** - Complete account and data deletion

## Tech Stack

| Layer     | Technology                                            |
| --------- | ----------------------------------------------------- |
| Frontend  | React + Vite + TypeScript + Tailwind CSS              |
| UI/Motion | Framer Motion                                         |
| Backend   | Supabase Edge Functions (TypeScript/Deno)             |
| Database  | Supabase PostgreSQL + Row Level Security              |
| Realtime  | Supabase Realtime                                     |
| AI        | Google Gemini                                         |
| Auth      | Supabase Auth                                         |
| Security  | PostgreSQL Row Level Security + Edge Function secrets |

## Project Structure

```
talkitout/
├── apps/
│   ├── api/          # Legacy Express/MongoDB backend
│   └── web/          # React frontend
├── packages/
│   ├── ui/           # Design system components
│   └── lib/          # Shared utilities & types
├── supabase/
│   ├── migrations/   # PostgreSQL schema and RLS policies
│   └── functions/    # AI, voice, and account Edge Functions
└── docs/             # Setup, architecture, and safety documentation
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+
- A Supabase project
- Google Gemini API key

### 1. Clone and Install

```bash
git clone <repository-url>
cd TalkItOut
npm ci
```

### 2. Configure Environment

```bash
cp apps/web/.env.example apps/web/.env

# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Configure Supabase

Follow [the Supabase setup guide](docs/supabase-setup.md) to apply the SQL
migration, configure Auth, and deploy the Edge Functions.

### 4. Start Locally

```bash
npm run dev:web
```

## Demo Accounts

Create student accounts through the registration page. To create a counselor,
register normally and promote the account using the SQL statement in the
[Supabase setup guide](docs/supabase-setup.md).

## Development

```bash
# Lint the frontend
npm run lint --workspace=@talkitout/web

# Build the frontend
npm run build --workspace=@talkitout/web
```

## Key Features Demo

### AI Chat with Risk Detection

1. Login as a student
2. Navigate to Chat
3. Send message: "I'm feeling really overwhelmed"
4. AI responds with supportive, non-clinical guidance
5. Sentiment analyzed automatically
6. If severity ≥ 3, crisis message prepended and flag created

### Pomodoro Focus Session

1. Go to Focus page
2. Click "Start Focus Session"
3. See animated breathing circle and countdown timer
4. Pause/resume/stop functionality
5. Automatic break cycles
6. Session tracked and streak updated

### Counselor Dashboard

1. Login as counselor
2. View aggregated metrics
3. See open risk flags with severity badges
4. Access student details and message context

## Backend

The frontend uses the Supabase JavaScript client for Auth and RLS-protected
database operations. Secret-backed operations are in `supabase/functions`.
`docs/api.yaml` describes the legacy Express API and is retained as migration
reference only.

## Architecture

See `docs/architecture.md` for detailed architecture documentation.

**Key Design Decisions:**

- Monorepo for code sharing
- Supabase Auth with automatically refreshed sessions
- Row Level Security for per-user and counselor access
- Supabase Realtime for risk alerts
- Pseudonymization before external API calls
- Sentiment analysis on all user messages
- Automatic risk flagging with severity levels

## Safety & Ethics

See `docs/safety-playbook.md` for comprehensive safety guidelines.

**Core Principles:**

- Non-clinical language only
- Never diagnose or provide therapy
- Encourage reaching out to trusted adults
- Crisis resources always visible
- Transparent about AI limitations
- Guardian consent required for under-18

## Testing

The frontend currently uses build and lint checks. Database authorization is
defined explicitly in the SQL migration and should also be tested in a staging
Supabase project before handling real student data.

## Production Deployment

1. Apply the Supabase migration and review every RLS policy.
2. Store Gemini and ElevenLabs keys only as Supabase Edge Function secrets.
3. Configure the GitHub Pages URL in Supabase Auth.
4. Add only the publishable Supabase values to the GitHub Pages build.
5. Review logging, retention, consent, and backup requirements before using
   real student data.

### GitHub Pages + Supabase

GitHub Pages hosts the compiled React frontend. Supabase provides the hosted
database, authentication, realtime events, and server-side Edge Functions.

1. In the repository, open **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Follow [the Supabase setup guide](docs/supabase-setup.md), including running
   the SQL migration and deploying the Edge Functions.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as GitHub Actions
   repository variables.
4. Push to `main`. The **Deploy web app to GitHub Pages** workflow will publish
   `apps/web/dist` to `https://havochadi.github.io/ProjectTalk.ItOut/`.

The Pages build uses hash-based frontend routes (for example, `#/login`) so
refreshing a route does not produce another GitHub Pages 404.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

[Add your license here]

## Support

For questions or issues:

- GitHub Issues: [repository-url]/issues
- Email: support@talkitout.sg

## Acknowledgments

Built for Singapore students with care and attention to mental health best practices.

**Crisis Resources:**

- Emergency: 999
- Samaritans of Singapore: 1767
- SOS CareText: 9151 1767

---

**Note:** TalkItOut is a support tool, not a crisis service or medical provider. Always seek professional help for serious concerns.
