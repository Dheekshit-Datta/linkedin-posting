// ============================================================
// AGENT 10: LEAD MAGNET & VIRAL MECHANIC AGENT
// ============================================================
// The Blueprint's most powerful engagement hack:
// "X in comments for Y" — comment-gating a free resource.
//
// HOW IT WORKS:
// 1. Post offers something genuinely valuable for free
// 2. To get it, reader must comment a trigger word
// 3. LinkedIn algorithm sees comment surge = pushes post harder
// 4. Markitx auto-DMs everyone who comments with the resource
// 5. DM opens a conversation channel. Lead is now warm.
//
// Run: Once per week (Friday or Monday — highest LinkedIn traffic)
// This runs IN ADDITION to the daily post, not instead of it.
//
// LEAD MAGNET LIBRARY (build these assets):
// 1. "AI Audit" — 5-question framework to find automatable ops
// 2. "The Ops Automation Checklist" — 12 processes to automate first
// 3. "ROI Calculator" — hours saved x hourly rate = cost of NOT automating
// 4. "Stack Breakdown" — what tools Markitx uses and why
// 5. "Before/After Template" — document your manual process + the AI version
//
// Model: mistral-large-latest
// Temperature: 0.90 (needs creative urgency in the post)
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import type { LeadMagnetPost, LeadMagnetFormat } from "../types/growth.js";

// ============================================================
// LEAD MAGNET LIBRARY
// Each entry is a real resource Dheekshit should build once
// and then use repeatedly in rotation.
// ============================================================

export const LEAD_MAGNET_LIBRARY: Array<{
  id: string;
  title: string;
  format: LeadMagnetFormat;
  trigger_word: string;
  description: string;
  why_they_want_it: string;
  build_instructions: string;
}> = [
  {
    id: "ops-audit",
    title: "The 15-Minute AI Ops Audit",
    format: "pdf_checklist",
    trigger_word: "AUDIT",
    description: "A 5-question framework that shows you exactly which processes in your business are costing the most time and are the most automatable right now.",
    why_they_want_it: "Business owners know they should automate but don't know where to start. This removes the confusion.",
    build_instructions: "Create a 1-page PDF. 5 questions. Each question maps to a common automatable process. Include scoring. Output: ranked list of what to automate first. Include a 'Time Cost Calculator' at the bottom (hours/week x hourly rate = annual cost of doing it manually).",
  },
  {
    id: "automation-checklist",
    title: "12 Processes to Automate Before Hiring",
    format: "pdf_checklist",
    trigger_word: "CHECKLIST",
    description: "The 12 most common manual processes we automate for clients, ranked by ROI. Check off what you're still doing manually.",
    why_they_want_it: "Makes them realise how much time they're wasting on automatable tasks. Creates urgency.",
    build_instructions: "Create a Notion page exported as PDF. 12 processes with checkboxes. For each: what it is, how long it typically takes per week, and what tool/approach automates it. Add 'if you checked 3 or more, DM me' at the bottom.",
  },
  {
    id: "roi-calculator",
    title: "AI Automation ROI Calculator",
    format: "roi_calculator",
    trigger_word: "CALC",
    description: "Type in how many hours per week you spend on manual tasks + your team's hourly rate. Get the exact annual cost of NOT automating.",
    why_they_want_it: "Makes the business case for automation in their own numbers. Personal and impossible to argue with.",
    build_instructions: "Build a simple Google Sheet with 3 inputs: hours/week on manual tasks, team size, average hourly rate. Output: monthly cost, annual cost, projected savings after automation (assume 80% reduction). Make it shareable.",
  },
  {
    id: "stack-breakdown",
    title: "The Markitx Stack: Every Tool We Use and Why",
    format: "notion_template",
    trigger_word: "STACK",
    description: "The exact tools Markitx uses to build AI automation systems. n8n, Voiceflow, Langchain, Supabase, Apify — with a one-line explanation of what each does and when we use it.",
    why_they_want_it: "Technical founders and ops people love seeing real stacks. Builds credibility and generates developer/founder followers.",
    build_instructions: "Create a Notion page. Table format: Tool | What it does | When we use it | Free/Paid | Alternatives. 15-20 tools. Include opinionated notes (e.g. 'We use n8n over Zapier for anything serious because...').",
  },
  {
    id: "mini-audit-loom",
    title: "A Free 5-Minute Loom Audit of Your Ops",
    format: "loom_breakdown",
    trigger_word: "AUDIT5",
    description: "Comment AUDIT5 and answer 2 questions about your biggest manual process. Dheekshit records a 5-minute Loom showing you exactly how to automate it.",
    why_they_want_it: "Hyper-personalised. Free value that leads directly into a Markitx conversation.",
    build_instructions: "This one requires manual follow-through. Set a limit (first 10 only). Ask: What's your biggest manual process? What tools are involved? Record a 5-min Loom answering specifically. This generates real conversations.",
  },
];

// ============================================================
// LEAD MAGNET POST AGENT
// ============================================================

const LEAD_MAGNET_SYSTEM_PROMPT = `
You are writing a LinkedIn post for Dheekshit (Markitx) that uses a comment-gating mechanic to manufacture engagement and capture leads.

HOW THIS WORKS:
The post offers something genuinely valuable for free. To receive it, the reader must comment a specific trigger word. LinkedIn's algorithm sees the comment surge and pushes the post to more feeds. Everyone who comments gets an automated DM with the resource. The DM opens a warm conversation channel.

THIS IS NOT SPAM. The resource must be genuinely useful. The post must explain clearly what they get and why they want it. The mechanism (comment trigger word) must feel natural, not like a growth hack.

===========================
POST STRUCTURE
===========================

LINE 1 — The hook:
State the problem this resource solves. Specific. Punchy. Make them feel the pain.
Example: "Most ops teams have no idea which of their manual processes is costing them the most money."

LINES 2-5 — What it is:
Describe the resource. What it is, what it shows them, what they'll know after using it that they don't know now. Be specific. No vague "it'll help you scale."

LINES 6-8 — Why you built it:
Brief, human reason. "We kept getting asked the same question by clients before we started working together, so we systematized the answer."

LINE 9 — Social proof (if available):
"Shared this with a few clients. One found 14 hours of automatable work in their business inside the first 10 minutes."

LINE 10-11 — The mechanic:
"Comment [TRIGGER WORD] and I'll send it over."
Then optionally: "Sharing with a few people only — want to make sure it's actually useful before I open it up." (Scarcity. Real or implied.)

FINAL LINE — Optional soft close:
"If you find something worth automating, you know where to find me."

===========================
TONE
===========================
This should feel like Dheekshit built something useful and is sharing it, not like a growth hack. The offer must be real. The tone is direct and genuine. Not hype. Not "HUGE ANNOUNCEMENT." Not "I'm so excited to share."

===========================
RULES
===========================
1. No em dashes.
2. No corporate speak.
3. The resource description must be specific. Not "a comprehensive guide." Tell them exactly what's in it.
4. The trigger word must be one word, all caps, relevant to the resource.
5. Do not say "DM me" — say "I'll send it over" or "sending to everyone who comments."
6. Do not use exclamation points.
7. Do not use emojis.
8. Total post length: 180-260 words.
9. Include 3-4 relevant hashtags at the end.

FOLLOW-UP DM INSTRUCTIONS:
Also write the auto-DM that goes to everyone who comments the trigger word.
The DM should: thank them for engaging (1 line max), deliver the resource or ask the 2 questions needed to deliver it, and leave the conversation open naturally.
DM length: max 200 chars for the opener, 400 chars total.

Return JSON: { trigger_phrase, magnet_description, magnet_format, post_body, follow_up_dm, expected_comment_rate }
`.trim();

export async function runLeadMagnetAgent(params: {
  magnet_id: string;
}): Promise<LeadMagnetPost> {
  const magnet = LEAD_MAGNET_LIBRARY.find((m) => m.id === params.magnet_id);
  if (!magnet) {
    throw new Error(`Lead magnet not found: ${params.magnet_id}`);
  }

  const userPrompt = `
WRITE A LEAD MAGNET POST FOR:

Resource title: ${magnet.title}
Format: ${magnet.format}
Trigger word: ${magnet.trigger_word}
What it contains: ${magnet.description}
Why they want it: ${magnet.why_they_want_it}

Also write the auto-DM that goes to everyone who comments "${magnet.trigger_word}".

Return as JSON.
`.trim();

  return await completeJSON<LeadMagnetPost>({
    system: LEAD_MAGNET_SYSTEM_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.90,
    max_tokens: 1200,
    json_mode: true,
  });
}
