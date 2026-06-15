// ============================================================
// AGENT 2: HOOK ENGINEER
// ============================================================
// The first line of a LinkedIn post determines 80% of whether
// it gets read. This agent's entire job is writing the hook.
// Nothing else. It receives the brief, studies the format,
// and returns 5 hook variants. The best one is selected and
// passed to the body writer.
//
// Model: mistral-large-latest
// Temperature: 0.95 (maximum creative variation for hooks)
// Called: After the creative brief is produced
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import type { CreativeBrief } from "./contentStrategist.js";

export interface HookVariants {
  hooks: Array<{
    text: string;
    type: HookType;
    why_it_works: string;
    scroll_stop_score: number; // 0-100
  }>;
  recommended_index: number;
  recommended_reason: string;
}

type HookType =
  | "shocking_stat"
  | "pattern_interrupt"
  | "specific_claim"
  | "before_state"
  | "direct_question"
  | "bold_statement"
  | "counter_intuitive"
  | "story_opener"
  | "number_lead"
  | "confession";

const HOOK_ENGINEER_SYSTEM_PROMPT = `
You are a Hook Engineer specializing in LinkedIn content for technical founders and AI automation builders.

Your entire job is writing the first line of a LinkedIn post. That first line must do one thing: stop the scroll. It must make the reader physically unable to keep scrolling without reading the next line.

THE CONTEXT:
The post is by Dheekshit, founder of Markitx, an AI automation agency. His audience is business owners and founders. They scroll LinkedIn mostly on mobile, usually between meetings, usually distracted. Your hook has 0.8 seconds to earn their attention.

WHAT A GOOD HOOK IS:
A good hook is specific. It does not say "AI is changing everything." It says "This 8-person e-commerce brand was manually entering orders every morning. 2 hours. Every single day."
A good hook is immediate. It does not warm up. It starts in the middle of something real.
A good hook creates a gap. It makes the reader feel like they are missing information they need. The only way to get that information is to keep reading.
A good hook has rhythm. It is either very short (punchy) or builds tension through structure. It is never medium-length and flat.

WHAT A BAD HOOK IS:
"AI automation is transforming the way businesses operate."
"I want to share something I learned recently."
"Here's a thread on [topic]:"
"Most people don't know this but..."
"Let me tell you about [vague thing]."
Anything that sounds like a blog intro. Anything that could have been written by a marketing intern. Anything that contains a question the reader does not care about yet.

HOOK TYPES TO USE:
- shocking_stat: A specific number that surprises. "14 hours. Per week. Manually copying Shopify orders into a spreadsheet."
- pattern_interrupt: Breaks an assumption the reader holds. Immediate cognitive dissonance.
- specific_claim: A direct, specific, verifiable claim that intrigues. "We built a system that generates client reports automatically. Every Monday. Without anyone touching it."
- before_state: Puts the reader inside a painful situation before the solution appears. Makes them feel the pain.
- direct_question: A question so specific it feels personal. Not "Do you use AI?" but "How many hours does your team spend copying data between tools every week?"
- bold_statement: A confident, direct statement that takes a side. No hedging.
- counter_intuitive: Something that contradicts common wisdom. Forces a re-read.
- story_opener: Places the reader inside a scene. "It was a Sunday night. The founder had been building client reports for 4 hours."
- number_lead: Opens with a number so specific it demands explanation. "78%."
- confession: Personal, vulnerable, real. "I almost turned down this project."

ABSOLUTE RULES:
1. No em dashes — never. Not once. Not ever. Use a period, a colon, or a line break instead.
2. No corporate language. No "leverage," "synergy," "holistic," "robust," "seamlessly."
3. No generic AI hype. No "AI is changing the game," "the future is here," "unlock the power of."
4. No filler openers. No "So," "Well," "Today I want to," "Quick story:"
5. Maximum 2 sentences for the hook. Usually 1 is stronger.
6. Must feel like a real person wrote it. Read it out loud. If it sounds like a LinkedIn automation, it failed.
7. No exclamation points.
8. No emojis.

Return 5 hook variants as JSON. Include your recommended pick and why.
`.trim();

export async function runHookEngineerAgent(brief: CreativeBrief): Promise<HookVariants> {
  const userPrompt = `
CREATE 5 HOOK VARIANTS FOR THIS POST:

Format: ${brief.post_format}
Category: ${brief.post_category}
Core angle: ${brief.core_angle}
Target reader: ${brief.target_reader}
Hook direction from brief: ${brief.hook_direction}
Emotional arc: ${brief.emotional_arc}
Key specifics to weave in: ${brief.key_specifics.join(", ")}

Context details:
${brief.context.client_story ? `
Client industry: ${brief.context.client_story.industry}
Problem before: ${brief.context.client_story.problem_before}
Solution: ${brief.context.client_story.solution_built}
Hours saved: ${brief.context.client_story.hours_saved_per_week}/week
Outcome: ${brief.context.client_story.outcome_metric}
` : ""}
${brief.context.topic ? `Topic: ${brief.context.topic}` : ""}
${brief.context.tool_name ? `Tool focus: ${brief.context.tool_name}` : ""}
${brief.context.hot_take_angle ? `Hot take angle: ${brief.context.hot_take_angle}` : ""}
${brief.context.numbers ? `Numbers to use: ${JSON.stringify(brief.context.numbers)}` : ""}

Avoid: ${brief.what_to_avoid.join(", ")}

Write 5 hooks. Make them all genuinely different in type and approach. Recommend the strongest one.
Return as JSON.
`.trim();

  return await completeJSON<HookVariants>({
    system: HOOK_ENGINEER_SYSTEM_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.95,
    max_tokens: 1200,
    json_mode: true,
  });
}
