# TalkItOut Architecture (legacy Express/MongoDB reference)

> The GitHub Pages deployment now uses Supabase Auth, PostgreSQL, Realtime,
> Row Level Security, and Edge Functions. See [supabase-setup.md](supabase-setup.md)
> and the `supabase/` directory for the active deployment architecture. The
> document below describes the retained legacy backend.

## System Overview

TalkItOut is a full-stack web application designed to provide AI-powered support for Singapore students aged 10-19. The system prioritizes safety, privacy, and accessibility.

## Architecture Diagram

```
┌─────────────────┐
│   React Web     │  ←  User Interface (Vite + TypeScript + Tailwind)
│    Frontend     │
└────────┬────────┘
         │ HTTPS/REST
         │ WebSocket (Socket.IO)
         ↓
┌─────────────────┐
│   Express API   │  ←  Node.js + TypeScript Backend
│     Server      │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    │         │          │         │
    ↓         ↓          ↓         ↓
┌────────┐ ┌──────┐ ┌──────────┐ ┌──────┐
│MongoDB │ │Socket│ │  Gemini  │ │ JWT  │
│Database│ │  IO  │ │    API   │ │ Auth │
└────────┘ └──────┘ └──────────┘ └──────┘
```

## Core Components

### Frontend Layer

**Technology:** React 18 + Vite + TypeScript + Tailwind CSS

**Key Features:**
- Responsive design with mobile-first approach
- Dark mode by default for reduced eye strain
- Framer Motion for smooth animations
- Socket.IO client for realtime updates

**Pages:**
- `/login` - Authentication
- `/app/dashboard` - Student dashboard with mood trends and quick actions
- `/app/chat` - AI chat interface with sentiment badges
- `/app/focus` - Pomodoro timer with breathing animations
- `/app/tasks` - Kanban task management
- `/app/checkins` - Mood logging and history
- `/counselor` - Counselor dashboard with risk flags

### Backend Layer

**Technology:** Node.js + Express + TypeScript

**Middleware Stack:**
1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **Rate Limiting** - DDoS protection and abuse prevention
4. **Authentication** - JWT validation
5. **Validation** - Zod schema validation
6. **Error Handler** - Centralized error handling

**Key Services:**
- **AI Service** - Gemini-powered text analysis and response generation
- **Socket Service** - Realtime event handling
- **Auth Service** - Token generation and validation

### Database Layer

**Technology:** MongoDB + Mongoose

**Collections:**
- `users` - User accounts and auth
- `profiles` - User preferences and streaks
- `tasks` - Task management
- `sessions` - Pomodoro sessions
- `checkins` - Mood check-ins
- `messages` - Chat history
- `riskflags` - Risk detection flags
- `audits` - Audit trail

**Indexes:**
- `users.email` - Fast user lookup
- `messages.userId + createdAt` - Chat history
- `riskflags.severity + status` - Priority flagging
- `tasks.userId + status` - Task filtering

### AI Integration

**Provider:** Google Gemini (configured with `AI_MODEL`)

**Functions:**
1. **analyzeText()** - Sentiment analysis and risk detection
   - Input: User message
   - Output: {sentiment, riskTags, severity}
   - Prompt: Few-shot classification

2. **generateResponse()** - Chat response generation
   - Input: Conversation history + user message
   - Output: AI response text
   - System Prompt: Youth-friendly, non-clinical companion

3. **detectOverreliance()** - Pattern detection
   - Input: User activity history
   - Output: Boolean overreliance flag
   - Heuristics: Message volume, mood patterns

**Privacy Protection:**
- PII pseudonymization before external API calls
- Email/phone/NRIC regex replacement
- `ALLOW_EXTERNAL_PII` flag (default: false)

### Realtime Features

**Technology:** Socket.IO

**Events:**
- `pomodoro:start` - Session started
- `pomodoro:tick` - Timer update
- `pomodoro:stop` - Session ended
- `task:update` - Task modified
- `chat:typing` - User typing indicator

**Authentication:**
- JWT token passed in handshake
- User-specific rooms: `user:{userId}`

## Security Architecture

### Authentication Flow

```
1. User submits credentials
2. API validates and hashes password (bcrypt, rounds=12)
3. Generate access token (15 min TTL)
4. Generate refresh token (7 day TTL)
5. Store refresh token in user document
6. Return both tokens to client
7. Client stores in localStorage
8. Access token in Authorization header
9. On 401, refresh using refresh token
10. New tokens issued, old refresh token removed
```

### Authorization

**Roles:**
- `student` - Access own data, chat, tasks, check-ins
- `counselor` - View student data, risk flags, metrics
- `admin` - Full system access

**Middleware Chain:**
```javascript
authenticate() → authorize(roles) → controller()
```

### Data Protection

**At Rest:**
- Passwords: bcrypt hashed (12 rounds)
- Sensitive data: AES-256 encryption (helper available)
- MongoDB: TLS connection in production

**In Transit:**
- HTTPS/TLS for all connections
- Secure WebSocket (wss://)

**PII Handling:**
- Pseudonymization before the external AI API
- PDPA/GDPR compliance
- Data export and deletion endpoints

## Risk Detection System

### Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| 1 | Low risk | Log sentiment |
| 2 | Medium risk | Create flag for review |
| 3 | High risk | Create flag + prepend crisis message |

### Risk Tags

- `self-harm` - Self-injury indicators
- `severe-stress` - Overwhelming stress
- `harm-to-others` - Safety concerns
- `overreliance` - Excessive dependency

### Detection Flow

```
1. User sends message
2. analyzeText() classifies sentiment & risk
3. Save message with metadata
4. If severity ≥ 2, create RiskFlag
5. If severity = 3, prepend crisis resources
6. Return response to user
7. Notify counselors (future: email/SMS)
```

## Scalability Considerations

### Current Architecture (MVP)

- Single-server deployment
- MongoDB replica set ready
- Stateless API (horizontally scalable)
- Socket.IO with Redis adapter (ready)

### Future Enhancements

1. **Load Balancing**
   - Multiple API instances behind nginx
   - Sticky sessions for Socket.IO

2. **Caching**
   - Redis for session storage
   - Cache frequent queries (user profiles)

3. **CDN**
   - Static assets on CDN
   - Image optimization

4. **Monitoring**
   - Prometheus + Grafana
   - Error tracking (Sentry)
   - Log aggregation (ELK stack)

5. **Database**
   - Read replicas
   - Sharding by userId
   - Archival strategy

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load | < 2s | ~1.5s |
| API Response | < 500ms | ~200ms |
| Chat Response | < 3s | ~2s |
| WebSocket Latency | < 100ms | ~50ms |

## Deployment

### Development

```bash
docker-compose up -d
npm run dev
```

### Production

```bash
# Build
npm run build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or manual
PM2 ecosystem.config.js
```

### Environment Variables

**Required:**
- `MONGO_URI` - Database connection
- `JWT_SECRET` - Token signing key
- `GEMINI_API_KEY` - AI API access

**Optional:**
- `ALLOWED_ORIGINS` - CORS origins
- `ALLOW_EXTERNAL_PII` - PII policy
- `RATE_LIMITS` - Custom limits

## Testing Strategy

### Unit Tests
- Utility functions
- Schema validation
- Auth helpers

### Integration Tests
- API endpoints
- Database operations
- Gemini service (mocked)

### E2E Tests (Future)
- User flows
- Critical paths
- Cross-browser

### Coverage Target
- 70% minimum
- 90% for core features

## Monitoring & Observability

### Logs
- Structured JSON logs
- Log levels: error, warn, info, debug
- Sensitive data redaction

### Metrics
- Request rate, latency, errors
- Database query performance
- AI API usage and cost

### Alerts
- High error rate
- High-severity risk flags
- System health checks

## Disaster Recovery

### Backups
- MongoDB: Daily automated backups
- Retention: 30 days
- Offsite storage: S3/GCS

### Recovery
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours
- Documented restoration procedure

---

**Last Updated:** 2024
