# TalkItOut Safety Playbook

## Mission Statement

TalkItOut is a **support tool**, not a crisis service or medical provider. Our mission is to provide students with a safe, supportive space for reflection and organization while ensuring proper escalation when needed.

## Core Safety Principles

### 1. Non-Clinical Language

**Always:**
- Use supportive, empathetic language
- Focus on practical coping strategies
- Normalize feelings and experiences
- Encourage reaching out to trusted adults

**Never:**
- Diagnose mental health conditions
- Prescribe treatments or medications
- Use clinical/medical terminology
- Position AI as a therapist

**Example:**
- ❌ "You might have depression. You should take medication."
- ✅ "It sounds like you're going through a tough time. Have you talked to a counselor or trusted adult?"

### 2. Crisis Detection & Response

**Severity Levels:**

**Level 1 (Low):**
- General stress or worry
- Mild frustration
- Everyday challenges
- Action: Normal supportive response

**Level 2 (Medium):**
- Persistent negative feelings
- Isolation or withdrawal
- Academic pressure building
- Action: Flag for counselor review + supportive response

**Level 3 (High):**
- Self-harm indicators
- Suicidal ideation
- Harm to others
- Immediate danger
- Action: Crisis message + immediate flag + supportive response

**Crisis Message Template:**
```
I'm here to help, but I'm not a crisis service. If you're in immediate danger,
call 999. You can also contact Samaritans of Singapore 1767 or SOS CareText 9151 1767.
```

### 3. Mandatory Disclosures

**On Every Page Footer:**
- Crisis resources (emergency numbers)
- Disclaimer: "Not a crisis service or medical provider"
- Encouragement to seek professional help

**In Chat Interface:**
- Persistent banner with crisis resources
- Clear indication that AI is not human
- Reminder that conversations may be reviewed for safety

### 4. Guardian Consent

**Under 18 Requirements:**
- Guardian consent checkbox during registration
- Clear explanation of data collection
- Parent/guardian communication option

**Ages 10-13:**
- Additional safeguards
- More frequent check-ins
- Lower threshold for counselor notification

## Risk Detection System

### Automatic Flagging

**Triggers:**
- Severity 2+ from AI classification
- Keywords: explicit self-harm, suicide, violence
- Pattern: High negative sentiment over 7+ days
- Overreliance: 30+ messages in 24 hours

**False Positive Handling:**
- Counselor review before action
- Context provided (surrounding messages)
- Easy flag dismissal with notes

### Manual Flagging

**Counselors Can:**
- Create custom flags
- Add notes and intervention plans
- Mark flags as resolved
- View full conversation context

## Content Moderation

### AI Responses

**Guardrails:**
- No medical advice
- No academic cheating assistance
- No harmful content generation
- Age-appropriate language

**Tone Guidelines:**
- Warm and friendly
- Non-judgmental
- Empowering (focus on agency)
- Culturally sensitive (Singapore context)

### User Input

**Not Monitored For:**
- Content censorship
- Thought policing
- Punishment

**Only Flagged For:**
- Safety concerns
- Wellbeing check-ins
- Support escalation

## Counselor Protocols

### Flag Review Process

1. **Triage** (Within 24 hours)
   - Review flag severity
   - Read conversation context
   - Assess immediate risk

2. **Response** (Based on risk)
   - Low: Add note, continue monitoring
   - Medium: Reach out to student
   - High: Immediate intervention + notify school

3. **Documentation**
   - Log all actions taken
   - Update flag status
   - Note outcome

### Student Outreach

**First Contact:**
- Private, non-stigmatizing
- "Checking in, noticed you might need support"
- Offer to meet/talk
- Provide resources

**Follow-up:**
- Document touchpoints
- Monitor ongoing activity
- Adjust support level

### Escalation

**When to Escalate:**
- Imminent danger
- Repeated high-severity flags
- Student unreachable
- Parent/school notification needed

**Who to Contact:**
- School counselor/psychologist
- Parents/guardians
- Local crisis services
- Medical professionals (if arranged)

## Privacy & Ethics

### Data Handling

**Student Data:**
- Minimal collection
- Purpose limitation (support only)
- Retention: Active + 1 year
- Deletion on request

**Counselor Access:**
- Role-based (need-to-know)
- Audit trail
- Professional ethics apply

### PDPA/GDPR Compliance

**User Rights:**
- Access their data (export)
- Correct inaccuracies
- Delete account
- Withdraw consent

**Our Obligations:**
- Pseudonymize PII
- Secure storage
- Breach notification
- Data processing transparency

### Third-Party APIs

**Google Gemini:**
- PII pseudonymization before sending
- External data handling must be reviewed against the active provider terms
- Fallback if API unavailable
- Regular audits

## Transparency

### To Students

**We Tell Them:**
- AI is not human
- Conversations may be reviewed for safety
- How data is used
- Crisis resources
- Limitations of the system

### To Parents/Guardians

**We Provide:**
- Clear onboarding explanation
- Consent forms
- Contact methods
- Privacy policy
- Safety protocols

### To Schools

**We Share:**
- Aggregate (anonymized) metrics
- High-risk flag notifications (with consent)
- Collaboration for student support
- Training for counselors

## Incident Response

### High-Risk Flag

**Within 1 Hour:**
1. Counselor notified (email/SMS)
2. Student profile marked
3. Context prepared

**Within 24 Hours:**
1. Counselor reviews
2. Outreach initiated if needed
3. Escalation if warranted

### System Breach

**Immediate:**
1. Isolate affected systems
2. Assess scope
3. Notify leadership

**Within 72 Hours:**
1. Notify affected users
2. File reports (if required)
3. Remediation plan

### False Flag / Misuse

**Review:**
1. Assess pattern
2. Adjust detection if needed
3. Provide feedback to AI team

## Content Guidelines

### Supportive Responses

**Do:**
- Validate feelings
- Suggest coping strategies (breathing, breaks, talking)
- Encourage healthy routines
- Normalize seeking help

**Don't:**
- Minimize experiences ("It's not that bad")
- Compare to others
- Offer medical solutions
- Make promises ("You'll be fine")

### Study Support

**Do:**
- Help with planning and organization
- Pomodoro technique
- Break tasks into steps
- Time management

**Don't:**
- Complete homework for them
- Provide test answers
- Encourage unhealthy study habits

## Training Requirements

### For Counselors

**Mandatory:**
- Platform navigation
- Risk assessment
- Crisis response
- Privacy policies
- Cultural sensitivity

**Ongoing:**
- Quarterly reviews
- Case studies
- System updates

### For Developers

**Mandatory:**
- Data privacy
- Security best practices
- AI ethics
- Safety features

## Continuous Improvement

### Metrics

**Safety:**
- Flag response time
- Escalation rate
- Resolution rate
- Student outcomes (where measurable)

**Quality:**
- AI response accuracy
- False positive rate
- User satisfaction
- Counselor feedback

### Reviews

**Monthly:**
- Flag trends
- System performance
- User feedback

**Quarterly:**
- Safety protocol updates
- AI prompt refinement
- Training materials

**Annually:**
- Full safety audit
- External review
- Policy updates

## Emergency Contacts

### Singapore Crisis Resources

**Immediate Danger:**
- Emergency Services: 999
- Police: 999
- Ambulance: 995

**Crisis Support:**
- Samaritans of Singapore: 1767 (24/7)
- SOS CareText (SMS): 9151 1767
- Institute of Mental Health: 6389 2222

**Youth-Specific:**
- Tinkle Friend (for children): 1800 2744 788
- CHAT (youth mental health): 6493 6500/6501

---

**This playbook is a living document. Last updated: 2024**
