// ============================================================
// AGENT 9: COLD OUTREACH SEQUENCE AGENT
// ============================================================
// This is the direct lead generation engine. While the posts
// attract inbound, this agent goes outbound — targeting
// founders, ops heads, marketing directors, and decision
// makers at the exact companies Markitx wants as clients.
//
// THE 4-STEP SEQUENCE:
// Step 1 (Day 0):  Connection request with a non-pitchy note
// Step 2 (Day 3):  Value drop — solve a problem for free
// Step 3 (Day 8):  Soft pitch — offer, not ask
// Step 4 (Day 15): Breakup message — creates urgency
//
// Monthly nurture: For warm prospects who didn't convert
//
// TARGET INDUSTRIES:
// SaaS, Marketing Agencies, Law Firms, Financial Services,
// Consulting Firms, E-commerce, Real Estate, Healthcare Admin,
// Recruitment Agencies, B2B Services
//
// Model: mistral-large-latest
// Temperature: 0.78 (precise and personalized, not creative)
// Run: Daily at 10:00 AM IST to send queued messages
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import type {
  Prospect,
  OutreachMessage,
  OutreachStage,
  ProspectIndustry,
} from "../types/growth.js";

// ============================================================
// INDUSTRY PAIN POINT MAP
// Used to personalize every message to their specific context
// ============================================================

export const INDUSTRY_PAIN_MAP: Record<ProspectIndustry, {
  primary_pain: string;
  secondary_pain: string;
  typical_manual_process: string;
  outcome_they_want: string;
  trigger_words: string[];
}> = {
  saas: {
    primary_pain: "Support and onboarding takes too much founder/team time",
    secondary_pain: "Manual reporting and data entry between tools is killing velocity",
    typical_manual_process: "Manually triaging support tickets, pulling usage data, updating CRM",
    outcome_they_want: "Scale without hiring. Reduce churn by improving support speed.",
    trigger_words: ["onboarding", "churn", "support", "automation", "scaling"],
  },
  marketing_agency: {
    primary_pain: "Weekly client reports take 3-4 hours per client, per week",
    secondary_pain: "Lead qualification and follow-up is inconsistent across the team",
    typical_manual_process: "Manual reporting from GA4, Meta Ads, Google Ads into slides",
    outcome_they_want: "Same output quality with half the team hours. Happier clients.",
    trigger_words: ["reporting", "clients", "campaigns", "team", "efficiency"],
  },
  law_firm: {
    primary_pain: "Document review, intake, and contract drafting is eating billable hours",
    secondary_pain: "Client communication and follow-up is manual and inconsistent",
    typical_manual_process: "Manually reviewing and summarising documents, chasing clients for info",
    outcome_they_want: "More billable hours. Less admin. Faster client intake.",
    trigger_words: ["documents", "intake", "billing", "contracts", "client"],
  },
  financial_services: {
    primary_pain: "Compliance reporting and data aggregation across platforms is manual",
    secondary_pain: "Client portfolio updates and reporting go out inconsistently",
    typical_manual_process: "Manually pulling data from multiple platforms and building reports",
    outcome_they_want: "Accurate, on-time reporting with zero manual data entry.",
    trigger_words: ["compliance", "reporting", "portfolio", "data", "clients"],
  },
  consulting: {
    primary_pain: "Research, proposal creation, and client deliverable production is slow",
    secondary_pain: "Knowledge management across projects is non-existent",
    typical_manual_process: "Manual research aggregation, slide building, document formatting",
    outcome_they_want: "Faster delivery. Higher margin. Same quality output.",
    trigger_words: ["proposals", "research", "deliverables", "projects", "clients"],
  },
  ecommerce: {
    primary_pain: "Inventory, supplier communication, and order ops are manual nightmares",
    secondary_pain: "Customer support volume is overwhelming a small team",
    typical_manual_process: "Manual PO creation, supplier emails, order tracking updates",
    outcome_they_want: "Ops that run without the founder touching them daily.",
    trigger_words: ["inventory", "orders", "suppliers", "customers", "fulfilment"],
  },
  real_estate: {
    primary_pain: "Lead follow-up is inconsistent and slow — deals fall through",
    secondary_pain: "Market reporting and client communication is fully manual",
    typical_manual_process: "Manual CRM entry, email follow-ups, weekly market report building",
    outcome_they_want: "Never miss a lead. Reports that go out automatically.",
    trigger_words: ["leads", "follow-up", "listings", "clients", "reports"],
  },
  healthcare_admin: {
    primary_pain: "Patient intake, scheduling, and documentation is still mostly manual",
    secondary_pain: "Staff spend hours on admin instead of patient care",
    typical_manual_process: "Manual appointment scheduling, document collection, insurance follow-ups",
    outcome_they_want: "Reduce admin burden. Improve patient experience. Protect staff time.",
    trigger_words: ["intake", "scheduling", "documentation", "admin", "patients"],
  },
  recruitment: {
    primary_pain: "Candidate sourcing and CRM entry is eating recruiter time",
    secondary_pain: "Follow-up sequences are inconsistent across the team",
    typical_manual_process: "Manual LinkedIn scraping, CRM entry, email follow-up sequences",
    outcome_they_want: "Place more candidates with same team size.",
    trigger_words: ["candidates", "sourcing", "CRM", "placements", "pipeline"],
  },
  b2b_services: {
    primary_pain: "Lead qualification, follow-up, and proposal generation is inconsistent",
    secondary_pain: "Client onboarding is manual and creates a poor first impression",
    typical_manual_process: "Manual lead scoring, proposal writing, onboarding document sending",
    outcome_they_want: "Predictable pipeline. Faster close. Consistent client experience.",
    trigger_words: ["leads", "proposals", "onboarding", "pipeline", "clients"],
  },
};

// ============================================================
// OUTREACH SEQUENCE SYSTEM PROMPT
// ============================================================

const OUTREACH_SYSTEM_PROMPT = `
You are writing cold outreach messages for Dheekshit, founder of Markitx, an AI automation agency.

Markitx builds custom AI systems that eliminate manual operational processes for business owners. Not generic AI tools. Custom-built workflows and agents that solve specific problems and save real hours every week.

YOUR GOAL is to write messages that feel 100% human, 100% personal, and zero percent like a sales pitch. The best cold outreach does not sell — it demonstrates value and creates curiosity.

===========================
DHEEKSHIT'S VOICE IN OUTREACH
===========================
Direct but not aggressive. Curious about their business. Confident in what Markitx can do. Never desperate. Never pitchy. Talks like a peer who has solved their problem before and is reaching out because it's relevant — not because he needs a client.

===========================
THE 4-STEP SEQUENCE — DETAILED INSTRUCTIONS
===========================

STEP 1 — CONNECTION REQUEST NOTE (Day 0):
Character limit: 300 characters (LinkedIn hard limit)
Goal: Get accepted. Not to sell. Not to pitch. To be interesting enough that they click your profile and accept.
Formula: [Specific observation about them or their content] + [Brief relevant context about you] + [No ask].
What works: Mention something specific from their profile, recent post, or their company. Show you actually looked.
What kills it: "I'd love to connect and explore synergies." "I help businesses like yours." "Reaching out because I think we could work together."
Example structure: "Saw your post about [specific thing]. We've built [brief relevant thing] for [their industry]. Thought it worth connecting."
Hard limit: 300 chars. No pitch. No CTA.

STEP 2 — VALUE DROP (Day 3, after connecting):
Character limit: 800 characters
Goal: Give them something genuinely useful. Ask for nothing in return. This is the Trojan horse.
Formula: [Brief callback to why you connected] + [Specific value — a resource, a quick audit finding, a specific insight about their industry] + [Zero ask].
What works: "I put together a quick breakdown of the 3 manual processes that eat the most time in [their industry]. Thought it might be relevant given [what they posted / their role]. No strings — just sharing what we see building for similar teams."
What does NOT work: A PDF that's actually a sales brochure. Generic advice they've heard before. Value that requires them to do a call to understand.
Key: The value must be specific to their industry. Use the INDUSTRY_PAIN_MAP.

STEP 3 — SOFT PITCH (Day 8):
Character limit: 1000 characters
Goal: Make the offer visible. Don't close on this message. Plant the seed.
Formula: [Reference their likely situation based on industry] + [What Markitx does specifically for that situation] + [One result from a similar client] + [Low-friction CTA — not "book a call," but "worth a quick chat?"].
What works: "Most [industry] teams we talk to are spending [X hours] on [specific manual process]. We built a system for a [similar company] that cut that to zero. If that's a problem you're dealing with, happy to show you what we built."
What does NOT work: Feature lists. "We offer end-to-end AI solutions." Price discussions. Aggressive CTAs.

STEP 4 — BREAKUP MESSAGE (Day 15):
Character limit: 600 characters
Goal: One last reach. Creates urgency without being aggressive. Often gets the most replies.
Formula: [Acknowledge they're busy] + [Restate the core value offer in 1 sentence] + [Give them an easy out] + [Leave the door open].
Example structure: "I know this likely got buried. Last note on this — if manual [specific process] is ever something you want off your plate, Markitx is who to call. If not the right time, no worries. The offer stands whenever."

MONTHLY NURTURE (for warm non-converts):
Character limit: 500 characters
Goal: Stay visible without being annoying. One touch per month. Share something relevant to their world.
Formula: [One specific thing — a result, a new system, an insight] + [Loose connection to their situation] + [No ask].

===========================
PERSONALISATION RULES — NON-NEGOTIABLE
===========================
1. Every message must reference something specific about the prospect (their industry, their role, their company size, a pain signal from their posts).
2. Never use the prospect's company name in a way that sounds templated ("I noticed that [Company] could benefit from...").
3. The industry pain must match the INDUSTRY_PAIN_MAP for their vertical.
4. Client results referenced must be real (use the CLIENT_STORY_BANK from the system).
5. No em dashes. No corporate speak. No exclamation points.
6. Sound like a person writing this specific message, not a sequence.
7. Personalization score below 70 = rewrite.

===========================
OUTPUT FORMAT
===========================
Return JSON: { prospect_id, stage, message_text, char_count, personalization_score, send_at, personalization_notes }
`.trim();

// ============================================================
// AGENT RUNNER — generates a single outreach message
// ============================================================

export async function runOutreachSequenceAgent(params: {
  prospect: Prospect;
  stage: OutreachStage;
  client_result_reference?: string;
}): Promise<OutreachMessage> {
  const { prospect, stage, client_result_reference } = params;

  const industryContext = INDUSTRY_PAIN_MAP[prospect.industry];

  const userPrompt = `
WRITE AN OUTREACH MESSAGE:

Stage: ${stage}
Prospect name: ${prospect.name}
Title: ${prospect.title}
Company: ${prospect.company}
Industry: ${prospect.industry}
Company size: ${prospect.company_size}
Pain signals from their LinkedIn activity: ${prospect.pain_signals.join(", ")}
Notes on this prospect: ${prospect.notes}

INDUSTRY CONTEXT FOR ${prospect.industry.toUpperCase()}:
Primary pain: ${industryContext.primary_pain}
Secondary pain: ${industryContext.secondary_pain}
Typical manual process: ${industryContext.typical_manual_process}
What they want: ${industryContext.outcome_they_want}
Trigger words from their profile: ${industryContext.trigger_words.join(", ")}

${client_result_reference ? `Client result to reference: ${client_result_reference}` : ""}

${stage === "connection_request" ? "HARD LIMIT: 300 characters. No pitch. Just get accepted." : ""}
${stage === "value_follow_up" ? "Include a specific, free, immediately useful insight. No ask." : ""}
${stage === "soft_pitch" ? "Make the offer clear. Keep the CTA low-friction. No pressure." : ""}
${stage === "breakup" ? "Final message. Acknowledge time. Restate value. Leave door open." : ""}
${stage === "nurture" ? "Monthly touch. One thing relevant to them. No ask." : ""}

Write the message. Return as JSON.
`.trim();

  const result = await completeJSON<{
    message_text: string;
    char_count: number;
    personalization_score: number;
    personalization_notes: string;
  }>({
    system: OUTREACH_SYSTEM_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.78,
    max_tokens: 800,
    json_mode: true,
  });

  // Calculate send time based on stage
  const sendDelayDays: Record<OutreachStage, number> = {
    connection_request: 0,
    value_follow_up: 3,
    soft_pitch: 8,
    breakup: 15,
    nurture: 30,
  };

  const sendAt = new Date();
  sendAt.setDate(sendAt.getDate() + sendDelayDays[stage]);
  sendAt.setHours(10, 30, 0, 0); // 10:30 AM — optimal LinkedIn DM time

  return {
    prospect,
    stage,
    message_text: result.message_text,
    char_count: result.char_count,
    personalization_score: result.personalization_score,
    send_at: sendAt.toISOString(),
  };
}

// ============================================================
// PROSPECT QUALIFIER
// ============================================================
// Given a LinkedIn profile summary, determines if they are
// a good fit for Markitx and scores them 0-100.
// Run this before adding someone to the sequence.
// ============================================================

const PROSPECT_QUALIFIER_PROMPT = `
You qualify prospects for Markitx, an AI automation agency that builds custom AI systems for business owners.

IDEAL PROSPECT PROFILE:
- Decision maker (founder, CEO, COO, Head of Ops, Director level)
- Company with 5-100 employees (small enough to feel pain, big enough to pay)
- Industry with repetitive manual processes (marketing agency, law firm, SaaS, financial services, consulting, e-commerce, recruitment)
- Has posted about operational pain, manual work, growth challenges, or team efficiency
- Not already a tech company that builds automation themselves
- Not a solo consultant with no team

SCORE 0-100:
90-100: Perfect fit. High pain signals. Decision maker. Right company size. Must contact.
70-89: Good fit. Meets most criteria. Worth the sequence.
50-69: Possible fit. Missing 1-2 criteria. Low priority.
Below 50: Not a good fit. Skip.

Return JSON: { score, fit_reason, pain_signals_detected, stage_recommendation, should_contact }
`.trim();

export async function qualifyProspect(params: {
  name: string;
  title: string;
  company: string;
  company_size: string;
  industry: string;
  linkedin_activity_summary: string;
}): Promise<{
  score: number;
  fit_reason: string;
  pain_signals_detected: string[];
  stage_recommendation: OutreachStage;
  should_contact: boolean;
}> {
  return await completeJSON({
    system: PROSPECT_QUALIFIER_PROMPT,
    user: `
Prospect: ${params.name}
Title: ${params.title}
Company: ${params.company}
Size: ${params.company_size}
Industry: ${params.industry}
LinkedIn activity: ${params.linkedin_activity_summary}

Score them and recommend whether to contact.
`.trim(),
    model: "mistral-large-latest",
    temperature: 0.3,
    max_tokens: 600,
    json_mode: true,
  });
}
