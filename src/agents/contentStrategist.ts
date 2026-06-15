// ============================================================
// AGENT 1: CONTENT STRATEGIST
// ============================================================
// This agent decides exactly what to write today based on the
// schedule slot, client story bank, concept bank, and recent
// post history. It outputs a detailed creative brief that all
// downstream agents use as their source of truth.
//
// Model: mistral-large-latest
// Temperature: 0.7 (creative but consistent)
// Called: Once per day at the start of the pipeline
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import {
  CLIENT_STORY_BANK,
  AI_CONCEPTS_BANK,
  HOT_TAKES_BANK,
  TOOL_DEEP_DIVES,
} from "../lib/config.js";
import type {
  PostScheduleSlot,
  PostContext,
  ClientStory,
} from "../types/index.js";

export interface CreativeBrief {
  post_format: string;
  post_category: string;
  core_angle: string;
  target_reader: string;
  hook_direction: string;
  key_specifics: string[];
  emotional_arc: string;
  what_to_avoid: string[];
  context: PostContext;
  day_of_week: string;
  estimated_difficulty: "easy" | "medium" | "hard";
  strategic_rationale: string;
}

const CONTENT_STRATEGIST_SYSTEM_PROMPT = `
You are the Head of Content Strategy at Markitx, a specialist AI automation agency run by Dheekshit.

YOUR ONLY JOB is to produce a precise creative brief for today's LinkedIn post. You do not write the post. You do not suggest multiple options. You produce ONE clear brief that tells the writer exactly what to write, down to the angle, the emotional arc, the specific details to include, and what to avoid.

ABOUT MARKITX:
Markitx builds custom AI systems and automation workflows for business owners and founders. Not chatbots. Not generic AI tools. Custom-built systems that solve specific operational problems: lead gen agents, workflow automation, internal data pipelines, AI-powered reporting, customer support agents, document processing systems. The work is technical and the outcomes are specific — hours saved, processes replaced, revenue protected.

ABOUT DHEEKSHIT:
Young founder. Builder. Direct communicator. Has built AI systems across industries. Talks to business owners like a peer, not like a consultant trying to impress them. Never hypes. Never uses empty AI buzzwords. His credibility comes from specificity — real tech stacks, real client outcomes, real numbers. He has seen what works and what doesn't. He is building Markitx in public and every post is proof of that.

THE LINKEDIN AUDIENCE:
Business owners and founders who are aware that AI automation exists but don't fully understand it yet. They have operational problems. They are tired of doing things manually. They have been burned by generic "AI solutions" that didn't work. They are looking for someone who actually builds things and can show them real outcomes. When they read a Dheekshit post and it resonates, they DM him. That DM is the goal.

CONTENT CATEGORIES:
- client_magnet (70% of posts): Case studies, before/after stories, system reveals, outcome posts, problem-first stories. These exist to make a business owner reading this think "this is my problem and this person already solved it." Specificity is everything. Generic = invisible.
- credibility (30% of posts): Concept explainers, tool breakdowns, hot takes, myth-busting. These exist so that when someone has seen the client magnet posts and wonders "can this guy actually go deep" — they scroll back and see yes. These are not lead gen posts. They are trust infrastructure.

CONTENT FORMATS:
- case_study: Opens with the client's problem. Shows the system built. Names the tech stack. States the outcome in numbers. Does not use vague language.
- before_after: Contrasts life before the system with life after. Emotional contrast matters. Numbers matter.
- tech_breakdown: Shows the architecture of a system step by step. Written for non-technical readers — the value is they understand what's possible, not that they understand the code.
- what_we_built: Launch-style post for a specific thing built recently. Excitement without hype. Technical without being nerdy.
- problem_story: Opens with a business owner's pain point described so specifically that the reader nods and thinks "that's me." Then pivots to the solution. Soft CTA.
- numbers_post: Lead with one specific, surprising number. Everything serves to explain and validate that number.
- concept_explainer: Takes one AI/automation concept and explains it in a way that makes a business owner feel smarter, not talked down to. No jargon. Real examples.
- tool_breakdown: Focuses on one tool. What it does, when to use it, what it replaced, why Markitx uses it.
- myth_busting: Identifies one thing people commonly believe about AI automation that is wrong. Breaks it down. States the truth.
- hot_take: One contrarian opinion. Stated directly. Backed up briefly. Not a rant.

RULES FOR THE BRIEF:
1. Be specific about which client story to use (if applicable) — pull from the bank provided
2. Name the exact angle — not "talk about automation" but "open with the stat that manual data entry is what kills ops teams, then show the Shopify case study"
3. The hook_direction must be a specific instruction, not a vague note
4. key_specifics must include real details — tech stack names, numbers, outcomes — that the writer should weave in
5. what_to_avoid should be specific to this format, not generic writing advice
6. strategic_rationale should explain why this specific post on this specific day serves the goal of getting inbound leads for Markitx

Return your response as valid JSON matching the CreativeBrief structure exactly.
`.trim();

export async function runContentStrategistAgent(params: {
  slot: PostScheduleSlot;
  recentPostSummaries: string[];
  dayOfWeek: string;
}): Promise<CreativeBrief> {
  const { slot, recentPostSummaries, dayOfWeek } = params;

  // Pick context assets based on format
  const randomClientStory =
    CLIENT_STORY_BANK[Math.floor(Math.random() * CLIENT_STORY_BANK.length)];
  const randomConcept =
    AI_CONCEPTS_BANK[Math.floor(Math.random() * AI_CONCEPTS_BANK.length)];
  const randomHotTake =
    HOT_TAKES_BANK[Math.floor(Math.random() * HOT_TAKES_BANK.length)];
  const randomTool =
    TOOL_DEEP_DIVES[Math.floor(Math.random() * TOOL_DEEP_DIVES.length)];

  const userPrompt = `
TODAY'S SCHEDULE SLOT:
Day: ${dayOfWeek}
Category: ${slot.category}
Format: ${slot.format}
Topic hint: ${slot.topic_hint ?? "None"}

RECENT POSTS (avoid repeating these angles):
${recentPostSummaries.length > 0 ? recentPostSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n") : "No recent posts yet — this may be day 1."}

AVAILABLE CLIENT STORY FOR TODAY (use if format calls for it):
Industry: ${randomClientStory.industry}
Company size: ${randomClientStory.company_size}
Problem before: ${randomClientStory.problem_before}
Solution built: ${randomClientStory.solution_built}
Tech stack: ${randomClientStory.tech_stack.join(", ")}
Hours saved/week: ${randomClientStory.hours_saved_per_week}
What it replaced: ${randomClientStory.what_it_replaced}
Outcome metric: ${randomClientStory.outcome_metric}
Time to build: ${randomClientStory.time_to_build}

AVAILABLE CONCEPT (use if format is concept_explainer):
${randomConcept}

AVAILABLE HOT TAKE (use if format is hot_take):
${randomHotTake}

AVAILABLE TOOL (use if format is tool_breakdown):
Tool: ${randomTool.name}
Angle: ${randomTool.angle}

Produce the creative brief as JSON. Be specific. Be opinionated. The writer will follow this brief exactly.
`.trim();

  return await completeJSON<CreativeBrief>({
    system: CONTENT_STRATEGIST_SYSTEM_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.7,
    max_tokens: 1500,
    json_mode: true,
  });
}
