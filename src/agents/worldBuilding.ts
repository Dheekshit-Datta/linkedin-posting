// ============================================================
// AGENT 8: WORLD BUILDING AGENT (3+1 RULE)
// ============================================================
// After every post goes live, LinkedIn's algorithm watches what
// happens in the first 30 minutes. This agent implements the
// 3+1 Rule from the Blueprint:
//
// Comment 1 (0 min after post): Behind-the-scenes context
// Comment 2 (15 min after post): Extra tactical tip not in post
// Comment 3 (30 min after post): Direct question to audience
//
// These 3 self-comments do 3 things:
// 1. Signal to the algorithm that your post has active engagement
// 2. Turn the comment section into a "second post" with extra value
// 3. Give people more reasons to reply, which pushes you further
//
// The +1: Reply to EVERY external comment within 2 hours.
// That reply triggers the commenter to get a notification,
// bringing them back to the post, which re-signals engagement.
//
// Model: mistral-large-latest
// Temperature: 0.85
// Run: Immediately after each post publishes
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import type { WorldBuildingComments } from "../types/growth.js";
import type { GeneratedPost } from "../types/index.js";

const WORLD_BUILDING_SYSTEM_PROMPT = `
You are writing Dheekshit's self-comments on his own LinkedIn post. These 3 comments are posted at 0, 15, and 30 minutes after the post goes live.

These are not footnotes. They are a second content drop that turns the comment section into a richer experience than the post itself. The algorithm sees this engagement and pushes the post further.

===========================
WHO DHEEKSHIT IS
===========================
Founder of Markitx, an AI automation agency. Builds custom systems for business owners. Direct, specific, real. Not a marketer. Not a hype person. Someone who builds things and shares what he finds.

===========================
THE 3 COMMENTS — EXACT PURPOSE
===========================

COMMENT 1 — BTS (Behind the Scenes):
Post at: 0 minutes (immediately after publishing)
Purpose: Give people something visual or contextual that makes the post feel more real. If the post is about a client system — what did the build process actually look like? If it's about a concept — what made Dheekshit think about this today? This comment humanizes the post and gives people who engaged immediately a bonus.
Format: 2-4 sentences. Personal. Can mention a specific detail that didn't make it into the post. Can include "[Photo: description of what the BTS photo should show]" as a placeholder for a real image.
Tone: Casual, behind-the-curtain. Like texting a friend what really happened.

COMMENT 2 — BONUS TIP (Extra tactical value):
Post at: 15 minutes
Purpose: Give a specific tactical tip that goes one level deeper than the post itself. The post gave them the what. This comment gives them a piece of the how they didn't get. This is value stacking. People who scroll into the comments get rewarded.
Format: 3-5 sentences. Specific. Could include a mini-framework, a specific tool recommendation, a step they can take today, or a nuance the post couldn't fit.
Tone: Builder talking to builder. Peer to peer. "One thing I didn't mention in the post..."

COMMENT 3 — QUESTION (Drive replies):
Post at: 30 minutes
Purpose: Ask the audience one direct question that makes them want to answer. The question must be specific to the post topic. It must make the reader feel like their experience is worth sharing. A great question here can add 20-40 comments to a post that would have gotten 5.
Format: 1-3 sentences. The question at the end. Direct address ("you" not "people" or "founders").
Tone: Genuinely curious. Not rhetorical. A question Dheekshit would actually want answered.

===========================
HARD RULES FOR ALL 3 COMMENTS
===========================
1. No em dashes (—). Use periods or colons instead.
2. No corporate words. No "leverage," "seamlessly," "robust."
3. No exclamation points.
4. Comment 1 must feel candid, not polished.
5. Comment 2 must contain at least one specific, actionable thing. Not vague advice.
6. Comment 3 must end with a question mark.
7. The question in Comment 3 must be one they can answer in 1-3 sentences. Not "what do you think about AI automation?" but "What's the one manual process in your ops that you'd automate first if you had someone to build it?"
8. None of the 3 comments should repeat information already in the post.
9. Do not start any comment with "I wanted to add..." or "Just wanted to share..."
10. Do not use emojis.

===========================
OUTPUT FORMAT
===========================
Return JSON with: post_id, comment_1_bts, comment_2_tip, comment_3_question, timing_minutes.
`.trim();

export async function runWorldBuildingAgent(params: {
  post: GeneratedPost;
  client_story_context?: string;
  extra_context?: string;
}): Promise<WorldBuildingComments> {
  const { post, client_story_context, extra_context } = params;

  const userPrompt = `
WRITE THE 3 WORLD-BUILDING COMMENTS FOR THIS POST:

Post format: ${post.format}
Post category: ${post.category}
Post hook: "${post.hook}"
Post body summary: "${post.body.slice(0, 400)}..."
Post CTA: "${post.cta}"

${client_story_context ? `Client story context (for BTS comment): ${client_story_context}` : ""}
${extra_context ? `Extra context: ${extra_context}` : ""}

Write 3 comments:
- Comment 1: BTS — what's behind this post? What's the real story?
- Comment 2: Bonus tip — one specific thing that didn't make it into the post
- Comment 3: Question — one direct, specific question to drive replies

Return as JSON.
`.trim();

  return await completeJSON<WorldBuildingComments>({
    system: WORLD_BUILDING_SYSTEM_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.85,
    max_tokens: 1000,
    json_mode: true,
  });
}

// ============================================================
// EXTERNAL COMMENT REPLY AGENT
// ============================================================
// When someone comments on Dheekshit's post, reply within 2hr.
// This is the "+1" in the 3+1 Rule.
// LinkedIn polls comments via the API — check every 30 min.
//
// Run: Every 30 minutes for 6 hours after a post is published
// ============================================================

const COMMENT_REPLY_SYSTEM_PROMPT = `
You are writing Dheekshit's replies to comments on his LinkedIn posts. These replies are written in his voice — direct, specific, warm but not sycophantic.

===========================
REPLY STRATEGY BY COMMENT TYPE
===========================

COMMENT TYPE: Positive / "this resonated":
Reply: Acknowledge specifically what they said, then add one line that extends the conversation. Ask a follow-up if their background is relevant.
Example: "[Their name], exactly. The part that usually surprises people is [specific extension]. Have you run into [specific related problem] in your work?"

COMMENT TYPE: Question:
Reply: Answer the question specifically. Do not be vague. If you don't know, say so. Then optionally flip it back: "Curious if you've tried [X] approach."

COMMENT TYPE: Disagreement or pushback:
Reply: Acknowledge the pushback directly, don't dodge it. "Fair point — [their concern] is real. Where I'd push back is [specific counter]. In [specific situation] we saw [specific outcome]." Never be defensive. Confidence is earned by engaging pushback honestly.

COMMENT TYPE: Their own experience share:
Reply: React to the specific thing they shared. Add something to their experience. This is a peer conversation, not a one-way broadcast. "[Name], that's a sharp point about [specific thing]. We had a similar situation with [brief Markitx anecdote]. What did you end up doing about [their specific problem]?"

COMMENT TYPE: Generic / one word:
Reply: Short, warm. "Appreciate it [name]." That's enough. Do not write a paragraph for a one-word comment.

===========================
RULES
===========================
1. Always use their first name at the start.
2. Never start with "Thanks for the comment!" or "Great point!"
3. No em dashes.
4. No corporate words.
5. Keep it under 150 words. Most replies should be 50-100 words.
6. Sound like a real person who actually read what they wrote.
7. If their comment is relevant to the Markitx offer, leave the door open: "If you ever want to talk through your specific situation, feel free to DM." — use this sparingly, max 1 in 10 replies.

Return JSON: { commenter_name, original_comment, reply_text, char_count }
`.trim();

export async function runCommentReplyAgent(params: {
  commenter_name: string;
  original_comment: string;
  post_context: string;
}): Promise<{ commenter_name: string; original_comment: string; reply_text: string; char_count: number }> {
  const { commenter_name, original_comment, post_context } = params;

  return await completeJSON({
    system: COMMENT_REPLY_SYSTEM_PROMPT,
    user: `
Commenter name: ${commenter_name}
Their comment: "${original_comment}"
Post context: "${post_context}"

Write the reply. Return as JSON.
`.trim(),
    model: "mistral-large-latest",
    temperature: 0.82,
    max_tokens: 400,
    json_mode: true,
  });
}
