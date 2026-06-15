// ============================================================
// AGENT 7: ENGAGEMENT SPRINT AGENT
// ============================================================
// This is the single biggest driver of follower growth on
// LinkedIn. It runs twice per day — 30 min BEFORE posting
// and 30 min AFTER posting. It writes hyper-specific comments
// on strategic accounts across all 3 follower tiers.
//
// The 3-tier strategy (from the Blueprint):
// TIER 1 — Peers (0-5K): High reciprocity. They follow back.
// TIER 2 — Steps Ahead (5K-20K): They reply, exposing you to
//           their engaged audience.
// TIER 3 — Halo (20K+): One great comment here = thousands
//           of new eyeballs via "Borrowed Status."
//
// Model: mistral-large-latest
// Temperature: 0.88 (natural, varied human voice)
// Run: Twice daily — pre-post and post-post sprints
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import type {
  EngagementTarget,
  GeneratedComment,
  FollowerTier,
  CommentIntent,
} from "../types/growth.js";

// ============================================================
// STATIC TARGET LIST
// Replace these with real accounts Dheekshit wants to engage.
// Update weekly. Add new targets as you discover them.
// Sources: Search "AI automation" "operations" "founder" on LinkedIn
// ============================================================

export const ENGAGEMENT_TARGET_LIST: EngagementTarget[] = [
  // TIER 3 — HALO (20K+ followers) — max 3 per sprint
  {
    profile_url: "https://linkedin.com/in/target-halo-1",
    name: "Halo Creator 1",
    follower_tier: "halo",
    niche: "AI tools for founders",
    recent_post_url: "",
    recent_post_summary: "", // Populated at runtime via scraping or manual entry
    comment_intent: "mic_drop",
  },
  {
    profile_url: "https://linkedin.com/in/target-halo-2",
    name: "Halo Creator 2",
    follower_tier: "halo",
    niche: "SaaS growth and operations",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "insight_add",
  },
  {
    profile_url: "https://linkedin.com/in/target-halo-3",
    name: "Halo Creator 3",
    follower_tier: "halo",
    niche: "B2B founder marketing",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "contrarian_agree",
  },

  // TIER 2 — STEPS AHEAD (5K-20K) — 3-4 per sprint
  {
    profile_url: "https://linkedin.com/in/target-mid-1",
    name: "Mid Creator 1",
    follower_tier: "steps_ahead",
    niche: "No-code automation",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "experience_share",
  },
  {
    profile_url: "https://linkedin.com/in/target-mid-2",
    name: "Mid Creator 2",
    follower_tier: "steps_ahead",
    niche: "AI for operations teams",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "question_ask",
  },
  {
    profile_url: "https://linkedin.com/in/target-mid-3",
    name: "Mid Creator 3",
    follower_tier: "steps_ahead",
    niche: "Startup operations",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "insight_add",
  },
  {
    profile_url: "https://linkedin.com/in/target-mid-4",
    name: "Mid Creator 4",
    follower_tier: "steps_ahead",
    niche: "B2B sales automation",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "validation_plus",
  },

  // TIER 1 — PEERS (0-5K) — 3-5 per sprint
  {
    profile_url: "https://linkedin.com/in/target-peer-1",
    name: "Peer Creator 1",
    follower_tier: "peer",
    niche: "AI tools builder",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "validation_plus",
  },
  {
    profile_url: "https://linkedin.com/in/target-peer-2",
    name: "Peer Creator 2",
    follower_tier: "peer",
    niche: "Founder sharing build journey",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "experience_share",
  },
  {
    profile_url: "https://linkedin.com/in/target-peer-3",
    name: "Peer Creator 3",
    follower_tier: "peer",
    niche: "Agency owner building in public",
    recent_post_url: "",
    recent_post_summary: "",
    comment_intent: "question_ask",
  },
];

// ============================================================
// SPRINT CONFIG
// ============================================================

export const SPRINT_CONFIG = {
  // Number of accounts to engage per tier per sprint
  halo_count: 3,
  steps_ahead_count: 4,
  peer_count: 5,

  // Minimum comment length (LinkedIn algorithm rewards longer comments)
  min_comment_chars: 120,
  max_comment_chars: 380,

  // Spread comments across the sprint window (minutes)
  // This avoids LinkedIn flagging automated behaviour
  spread_over_minutes: 25,
};

// ============================================================
// MAIN AGENT PROMPT
// ============================================================

const ENGAGEMENT_SPRINT_SYSTEM_PROMPT = `
You are Dheekshit's engagement agent. Your job is to write LinkedIn comments that Dheekshit will post on other people's content during his daily engagement sprint.

These comments are not generic. They are not "Great post!" or "Thanks for sharing!" They are the kind of comment that makes the post author think "who is this person?" and click through to Dheekshit's profile.

===========================
WHO DHEEKSHIT IS
===========================
Dheekshit is the founder of Markitx, an AI automation agency. He builds custom AI systems for business owners. He talks like a peer, not a consultant. He is direct, specific, and confident without being arrogant. His comments reflect the same voice as his posts.

===========================
THE STRATEGIC PURPOSE OF EACH TIER
===========================

TIER 3 — HALO (20K+ followers):
Purpose: "Borrowed Status." A great comment here gets seen by thousands. The goal is to leave a comment so insightful that other people reply to your comment, driving profile clicks. Use "mic_drop" or "insight_add" intents here. Do not try to be friendly. Be sharp.
Target: 1-3 comments per sprint.
Comment style: Confident. One big insight. May respectfully add nuance or a counterpoint. Never sycophantic.

TIER 2 — STEPS AHEAD (5K-20K):
Purpose: Relationship building + visibility. These creators will see your comment and often reply. Their audience will also see it. Use experience_share or question_ask here to start real dialogue.
Target: 3-4 comments per sprint.
Comment style: Conversational, peer-to-peer. Share a real experience. Ask a real question that shows you actually read the post.

TIER 1 — PEERS (0-5K):
Purpose: Reciprocity. They follow back, engage back. Build your day-one community. Be warm but still substantive.
Target: 4-5 comments per sprint.
Comment style: Warm, specific, encouraging. Still adds something. Never empty praise.

===========================
COMMENT INTENT GUIDE
===========================

mic_drop:
One sharp take. 2-3 sentences max. High confidence. Often starts with a direct observation or counter-intuition. Example: "The real bottleneck isn't the tool. It's that most teams haven't documented the process they're trying to automate. The AI just makes the chaos faster."

insight_add:
Extends the post with a real insight Dheekshit has from building AI systems. References specific experience. Adds something the original post didn't say. 3-5 sentences.

contrarian_agree:
Agrees with the core point but adds friction on a specific detail. Shows deeper thinking. "Agree on X, though in my experience Y is actually the harder problem." 3-5 sentences.

experience_share:
"We ran into exactly this at Markitx. [Specific thing that happened]. What we found was [specific insight]." Personal, grounded, real. 4-6 sentences.

question_ask:
Asks one smart question that proves you read the post and thought about it. Not a generic question. A question only someone with relevant experience would ask. 2-4 sentences ending in the question.

validation_plus:
Validates the person's point then adds one new layer. "This is right and I'd add one thing: [specific point]." 3-5 sentences.

===========================
HARD RULES
===========================
1. Never use em dashes (—). Use periods or colons instead.
2. Never start with "Great post" or "Love this" or "Thanks for sharing."
3. Never use "leverage," "seamlessly," "robust," "game-changer."
4. Never use exclamation points.
5. Never be generic. If the comment could be posted on any post by any person, it failed.
6. Always reference something specific from the post summary provided.
7. First person. Dheekshit is speaking.
8. Comments should feel like something a sharp builder would type in 90 seconds — not a polished essay, but not lazy either.
9. No hashtags in comments.
10. No emojis unless the original post used them heavily.
11. Do NOT mention Markitx in every comment. Mention it only when directly relevant (1 in 4 comments max). Let the profile do the selling.

===========================
OUTPUT FORMAT
===========================
Return a JSON array of GeneratedComment objects.
Each has: target (the full target object), comment_text, char_count, expected_reply_probability, strategic_value.
`.trim();

// ============================================================
// AGENT RUNNER
// ============================================================

export async function runEngagementSprintAgent(params: {
  targets: EngagementTarget[];
  phase: "pre_post" | "post_post";
  dheekshit_recent_post_summary?: string;
}): Promise<GeneratedComment[]> {
  const { targets, phase, dheekshit_recent_post_summary } = params;

  const validTargets = targets.filter((t) => t.recent_post_summary.length > 20);

  if (validTargets.length === 0) {
    return [];
  }

  const userPrompt = `
WRITE ENGAGEMENT COMMENTS FOR THESE TARGETS:

Sprint phase: ${phase}
${dheekshit_recent_post_summary ? `Dheekshit just posted about: ${dheekshit_recent_post_summary}` : ""}

TARGETS:
${validTargets
  .map(
    (t, i) => `
Target ${i + 1}:
Name: ${t.name}
Tier: ${t.follower_tier}
Niche: ${t.niche}
Their post summary: "${t.recent_post_summary}"
Comment intent: ${t.comment_intent}
`
  )
  .join("\n---\n")}

Write one comment per target. Return as JSON array.
Each comment must reference something specific from their post summary.
Make each comment genuinely different in structure and tone.
`.trim();

  const result = await completeJSON<{ comments: GeneratedComment[] }>({
    system: ENGAGEMENT_SPRINT_SYSTEM_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.88,
    max_tokens: 2500,
    json_mode: true,
  });

  return result.comments ?? [];
}

// ============================================================
// COMMENT QUALITY FILTER
// Post-process comments to enforce hard rules
// before they go to the LinkedIn API
// ============================================================

export function filterComments(comments: GeneratedComment[]): GeneratedComment[] {
  const BAD_STARTS = [
    "great post",
    "love this",
    "thanks for sharing",
    "amazing post",
    "wonderful",
    "fantastic post",
    "such an insightful",
    "so true",
  ];

  const BAD_WORDS = [
    "—",           // em dash
    "leverage",
    "seamlessly",
    "game-changer",
    "game changer",
    "robust",
    "revolutionary",
  ];

  return comments
    .filter((c) => {
      const lower = c.comment_text.toLowerCase();

      // Reject bad starts
      if (BAD_STARTS.some((b) => lower.startsWith(b))) {
        return false;
      }

      // Reject comments with banned words
      if (BAD_WORDS.some((w) => c.comment_text.includes(w))) {
        return false;
      }

      // Reject too short
      if (c.comment_text.length < 80) {
        return false;
      }

      // Reject too long
      if (c.comment_text.length > 420) {
        return false;
      }

      return true;
    })
    .map((c) => ({
      ...c,
      char_count: c.comment_text.length,
    }));
}
