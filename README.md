# Markitx LinkedIn Automation System

Automated daily LinkedIn content engine for Dheekshit / Markitx.
Generates and publishes one post per day in Dheekshit's voice.
70% client magnet posts. 30% credibility posts.
Built on Trigger.dev, Mistral, and the LinkedIn UGC API.

---

## Architecture

```
[Trigger.dev Cron — 8:30 AM IST]
         |
         v
[Agent 1: Content Strategist]
 Decides today's angle, picks client story,
 produces a full creative brief
         |
         v
[Agent 2: Hook Engineer]  ←→ [Agent 5: Image Prompt] (parallel)
 Generates 5 hook variants,
 selects the strongest
         |
         v
[Agent 3: Voice Writer]
 Writes the full post in Dheekshit's voice
 using the brief + chosen hook
         |
         v
[Agent 4: QA Agent]
 Scores the post (0-100), checks hard rules,
 approves or rejects. Up to 2 retry loops.
         |
         v
[LinkedIn UGC API]
 Publishes the post (text or with image)
         |
         v
[Agent 6: Notification Agent]
 Sends Slack/Discord alert with post preview
```

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd markitx-linkedin-automation
npm install
```

### 2. Set environment variables

In Trigger.dev dashboard → Your Project → Environment Variables:

```
MISTRAL_API_KEY=your_mistral_api_key
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_PERSON_URN=urn:li:person:XXXXXXXXXX
WEBHOOK_NOTIFY_URL=https://hooks.slack.com/services/...   # optional
STABILITY_API_KEY=your_stability_key                       # optional — for AI images
UPSTASH_REDIS_REST_URL=https://...                         # optional — for persistent history
UPSTASH_REDIS_REST_TOKEN=...                               # optional
```

### 3. Deploy to Trigger.dev

```bash
npx trigger.dev@latest login
npx trigger.dev@latest deploy
```

### 4. Verify in dashboard

- Go to your Trigger.dev project
- Find the `daily-linkedin-post` scheduled task
- Check it shows cron: `30 3 * * *`
- Trigger it manually once to test

---

## Getting Your LinkedIn Credentials

### Access Token (expires every 60 days)

1. Go to https://developer.linkedin.com
2. Create an app (or use existing one)
3. Add these OAuth 2.0 scopes:
   - `w_member_social` (required — to post)
   - `r_basicprofile` (required — to validate token)
   - `openid` + `profile` (required — to get person URN)
4. Generate a 60-day access token via the OAuth 2.0 tool in the app settings
5. Set it as `LINKEDIN_ACCESS_TOKEN`

### Person URN

After setting your token, run this once:

```typescript
import { getProfileUrn } from "./src/lib/linkedin.js";
const urn = await getProfileUrn(process.env.LINKEDIN_ACCESS_TOKEN!);
console.log(urn); // urn:li:person:XXXXXXXXXX
```

Set the output as `LINKEDIN_PERSON_URN`.

### Token Refresh (every 60 days)

LinkedIn tokens expire. You have two options:

Option A (simple): Set a reminder every 55 days to manually refresh.
Option B (automated): Use LinkedIn's refresh token flow.
  - LinkedIn provides a refresh token valid for 1 year
  - Store the refresh token in Upstash Redis
  - Add a weekly job that checks expiry and refreshes if needed
  - See: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow

---

## Getting Mistral API Key

1. Go to https://console.mistral.ai
2. Create account → API Keys → Create new key
3. Set as `MISTRAL_API_KEY`

Estimated cost: ~$0.05-0.15 per day running mistral-large-latest for 4 agent calls.

---

## Post Schedule

| Day | Category | Format |
|-----|----------|--------|
| Monday | Client Magnet | Case Study |
| Tuesday | Credibility | Concept Explainer |
| Wednesday | Client Magnet | Numbers Post |
| Thursday | Client Magnet | Problem Story |
| Friday | Client Magnet | What We Built |
| Saturday | Credibility | Tool Breakdown |
| Sunday | Credibility | Hot Take |

---

## Adding New Client Stories

Edit `src/lib/config.ts` — add to `CLIENT_STORY_BANK`:

```typescript
{
  industry: "Your client's industry",
  company_size: "Team size",
  problem_before: "Exact description of the pain — be specific",
  solution_built: "What was actually built — name the tools",
  tech_stack: ["n8n", "Slack", "Google Sheets"],
  hours_saved_per_week: 12,
  what_it_replaced: "What the system replaced",
  outcome_metric: "Specific measurable outcome",
  time_to_build: "X days",
}
```

More stories in the bank = more variety in posts = better content over time.

---

## QA Score Breakdown

| Dimension | Weight | Threshold |
|-----------|--------|-----------|
| Voice Match | 35% | 70/100 |
| Hook Strength | 30% | 65/100 |
| Specificity | 25% | 65/100 |
| CTA Quality | 10% | 50/100 |
| **Overall** | **100%** | **68/100** |

If a post fails QA, it retries up to 2 times. If all 3 attempts fail, the post is held and you get a Slack notification.

---

## Hard Rules (auto-reject)

The QA agent auto-rejects any post that contains:
- Em dashes (—)
- "leverage" as a verb
- "seamlessly"
- "game-changer"
- "revolutionizing"
- "I'm excited/thrilled to share"
- "Let me know in the comments"
- "Like and repost"
- Over 320 words
- Under 110 words

---

## File Structure

```
markitx-linkedin-automation/
├── src/
│   ├── agents/
│   │   ├── contentStrategist.ts   # Agent 1 — decides what to write
│   │   ├── hookEngineer.ts        # Agent 2 — writes 5 hook variants
│   │   ├── voiceWriter.ts         # Agent 3 — writes full post body
│   │   ├── qaAgent.ts             # Agent 4 — scores and approves
│   │   ├── imagePromptAgent.ts    # Agent 5 — image + text card
│   │   └── notificationAgent.ts  # Agent 6 — Slack notifications
│   ├── jobs/
│   │   └── dailyPost.ts           # Trigger.dev scheduled job
│   ├── lib/
│   │   ├── config.ts              # Schedule, client bank, env config
│   │   ├── linkedin.ts            # LinkedIn API client
│   │   ├── mistral.ts             # Mistral API client + retry
│   │   └── postHistory.ts         # Recent post tracker
│   └── types/
│       └── index.ts               # All TypeScript types
├── trigger.config.ts              # Trigger.dev project config
├── package.json
├── tsconfig.json
└── README.md
```

---

## Monitoring

All runs are logged in the Trigger.dev dashboard with:
- Full agent output at each step
- QA scores and issues
- LinkedIn post ID on success
- Error details on failure

Each successful run also sends a Slack notification with the post preview and a link to view it on LinkedIn.

---

## Scaling Later

When Markitx is ready to scale:
- Add LinkedIn comment responses (reply to every comment within 2 hours)
- Add engagement sprint automation (like + comment on 10 posts before each publish)
- Add A/B hook testing (post same content with 2 different hooks to different segments)
- Add analytics pull (fetch post impressions/comments after 24h and log them)
- Add carousel post generation (generate a multi-image PDF and upload as document)
