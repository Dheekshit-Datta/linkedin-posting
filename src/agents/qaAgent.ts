// ============================================================
// AGENT 4: QA AGENT (QUALITY ASSURANCE)
// ============================================================
// Before ANY post touches LinkedIn, it runs through this agent.
// The QA agent checks voice consistency, hook strength, lead
// generation potential, specificity, and a list of hard rules.
// If the post fails QA, it gets regenerated (up to 2 times).
// If it still fails, it is flagged and not posted.
//
// Model: mistral-large-latest
// Temperature: 0.1 (near-deterministic for consistent grading)
// Called: After every post is generated
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import type { WrittenPost } from "./voiceWriter.js";
import type { QAResult } from "../types/index.js";
import type { CreativeBrief } from "./contentStrategist.js";

const QA_AGENT_SYSTEM_PROMPT = `
You are the Quality Assurance agent for Markitx's LinkedIn automation system. Your job is to evaluate every LinkedIn post before it goes live and either approve or reject it.

You are not generous. You are not trying to pass posts. You are trying to ensure that every post that reaches LinkedIn is genuinely good enough to generate inbound leads for an AI automation agency. The bar is high because a bad post is worse than no post.

===========================
WHAT YOU ARE EVALUATING
===========================
Every post must:
1. Sound like a real human wrote it, not an AI or a marketing team
2. Be specific enough that a business owner with this problem would recognize themselves
3. Have a hook that earns a "see more" click
4. Have no em dashes (hard fail if any are present)
5. Have no corporate buzzwords (leverage, robust, seamlessly, holistic, synergy, empower, game-changer, unlock)
6. Have no generic AI hype language ("AI is changing everything," "the future is here," "revolutionizing")
7. Be the right length (120-300 words total)
8. Have proper white space (lines should be 1-2 sentences max)
9. Have a CTA that is soft and genuine, not salesy
10. Have 3-5 relevant hashtags

===========================
SCORING DIMENSIONS (0-100 each)
===========================

voice_match (0-100):
100: This is undeniably Dheekshit. Direct, specific, technical-but-readable, zero fluff.
80: Mostly his voice but has 1-2 lines that sound slightly generic or templated.
60: Has the right topics and facts but feels like it could have been written by anyone in AI.
40: Clearly AI-generated. Uses phrases no real person says in conversation.
20 and below: Sounds like a corporate LinkedIn account. Immediate fail.
Threshold for approval: 70

hook_strength (0-100):
100: The hook creates such strong curiosity or resonance that scrolling past it feels physically difficult.
80: Good hook that most people would pause on.
60: Decent but not compelling. Some people stop, most don't.
40: Generic or slow. Does not earn attention.
20 and below: Opens with a pleasantry or generic statement. Hard fail.
Threshold for approval: 65

specificity (0-100):
100: Contains real numbers, real tool names, real industry context, real outcomes. A business owner reads this and thinks "this person has actually done this."
80: Mostly specific with 1-2 vague areas.
60: Some specifics but relies on vague claims.
40: Mostly vague. Could describe any automation project anywhere.
20 and below: No specifics at all. Pure generality.
Threshold for approval: 65

cta_quality (0-100):
100: Ends in a way that naturally invites a DM without asking for one. The reader finishes the post and thinks about their own situation.
80: Good CTA that is soft and genuine.
60: CTA is present but feels slightly forced or salesy.
40: No CTA or CTA is aggressive.
20 and below: Ends with "like and repost" or similar engagement-bait.
Threshold for approval: 50

===========================
OVERALL SCORE
===========================
overall_score = (voice_match * 0.35) + (hook_strength * 0.30) + (specificity * 0.25) + (cta_quality * 0.10)
Approval threshold: overall score >= 68 AND no hard fails

===========================
HARD FAILS (auto-reject regardless of score)
===========================
- Any em dash character (the — character)
- The word "leverage" used as a verb
- "Seamlessly" anywhere
- "Game-changer" or "game changer"
- "Revolutionary" or "revolutionizing" 
- "In today's fast-paced world" or similar
- Post is over 320 words
- Post is under 110 words
- Hook is longer than 3 sentences
- Contains "I'm excited to share" or "I'm thrilled to announce"
- Contains "Let me know in the comments"
- Contains "Like and repost if you agree"

===========================
OUTPUT FORMAT
===========================
Return a JSON object with these fields:
- approved: boolean
- score: number (0-100, the overall weighted score)
- voice_match: number (0-100)
- hook_strength: number (0-100)
- specificity: number (0-100)
- cta_quality: number (0-100)
- issues: string[] (list of specific problems found — be precise about what line or phrase failed)
- suggestions: string[] (specific suggestions for improvement if not approved)
`.trim();

export async function runQAAgent(params: {
  post: WrittenPost;
  brief: CreativeBrief;
}): Promise<QAResult> {
  const { post, brief } = params;

  // Pre-check for hard fails before calling the LLM
  const hardFails: string[] = [];

  if (post.full_text.includes("—")) {
    hardFails.push("Contains em dash character");
  }
  if (/\bleverag(e|ing|ed)\b/i.test(post.full_text)) {
    hardFails.push("Contains 'leverage' as a verb");
  }
  if (/seamlessly/i.test(post.full_text)) {
    hardFails.push("Contains 'seamlessly'");
  }
  if (/game.?changer/i.test(post.full_text)) {
    hardFails.push("Contains 'game-changer'");
  }
  if (/revolutioniz/i.test(post.full_text)) {
    hardFails.push("Contains 'revolutionizing'");
  }
  if (/i'm (excited|thrilled) to/i.test(post.full_text)) {
    hardFails.push("Contains 'I'm excited/thrilled to'");
  }
  if (/let me know in the comments/i.test(post.full_text)) {
    hardFails.push("Contains 'let me know in the comments'");
  }
  if (/like and repost/i.test(post.full_text)) {
    hardFails.push("Contains engagement-bait CTA");
  }
  if (post.char_count > 1800) {
    hardFails.push(`Post too long: ${post.char_count} chars (max ~1800)`);
  }

  // Word count check
  const wordCount = post.full_text.split(/\s+/).length;
  if (wordCount > 320) {
    hardFails.push(`Post too long: ${wordCount} words (max 300)`);
  }
  if (wordCount < 110) {
    hardFails.push(`Post too short: ${wordCount} words (min 110)`);
  }

  // If there are hard fails, return immediately without calling LLM
  if (hardFails.length > 0) {
    return {
      approved: false,
      score: 0,
      voice_match: 0,
      hook_strength: 0,
      specificity: 0,
      cta_quality: 0,
      issues: hardFails,
      suggestions: hardFails.map((f) => `Fix hard fail: ${f}`),
    };
  }

  const userPrompt = `
EVALUATE THIS LINKEDIN POST:

---
${post.full_text}
---

CONTEXT:
This post was created for Markitx, an AI automation agency.
Format: ${brief.post_format}
Category: ${brief.post_category}
Intended core angle: ${brief.core_angle}
Word count: ${wordCount}
Char count: ${post.char_count}

Evaluate the post against all criteria and return a JSON QA result.
Be specific about what lines or phrases caused issues.
If you recommend improvements, be precise: quote the line and suggest the fix.
`.trim();

  const result = await completeJSON<QAResult>({
    system: QA_AGENT_SYSTEM_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.1,
    max_tokens: 1000,
    json_mode: true,
  });

  // Merge any pre-detected hard fails with LLM findings
  if (hardFails.length > 0) {
    result.approved = false;
    result.score = 0;
    result.issues = [...hardFails, ...(result.issues ?? [])];
  }

  return result;
}
