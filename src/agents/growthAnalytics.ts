// ============================================================
// AGENT 11: GROWTH ANALYTICS AGENT
// ============================================================
// Every Sunday night, this agent pulls the week's LinkedIn
// analytics (via LinkedIn API), analyses what worked, what
// didn't, and outputs specific recommendations for next week.
//
// It tracks:
// - Impressions per post (which formats get more reach)
// - Engagement rate per post (which hooks get more clicks)
// - Follower growth velocity (which weeks had the most growth)
// - DM conversion (which posts led to the most inbound DMs)
// - Outreach reply rates (which sequences get responses)
//
// Output: A structured weekly brief sent to Slack with next
// week's recommended adjustments.
//
// Model: mistral-large-latest
// Temperature: 0.3 (analytical, not creative)
// Run: Every Sunday at 8:00 PM IST
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import axios from "axios";
import type { GrowthMetrics } from "../types/growth.js";

// ============================================================
// LINKEDIN ANALYTICS PULLER
// Uses LinkedIn v2 Organization Share Statistics API
// For personal profiles: uses Share Statistics endpoint
// ============================================================

export async function fetchLinkedInPostStats(params: {
  accessToken: string;
  postId: string;
}): Promise<{
  impressions: number;
  clicks: number;
  reactions: number;
  comments: number;
  shares: number;
  engagement_rate: number;
}> {
  const { accessToken, postId } = params;

  try {
    const response = await axios.get(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    const data = response.data;
    const impressions = data?.totalShareStatistics?.impressionCount ?? 0;
    const clicks = data?.totalShareStatistics?.clickCount ?? 0;
    const reactions = data?.totalShareStatistics?.likeCount ?? 0;
    const comments = data?.totalShareStatistics?.commentCount ?? 0;
    const shares = data?.totalShareStatistics?.shareCount ?? 0;

    const engagement_rate =
      impressions > 0
        ? ((reactions + comments + shares + clicks) / impressions) * 100
        : 0;

    return {
      impressions,
      clicks,
      reactions,
      comments,
      shares,
      engagement_rate: Math.round(engagement_rate * 100) / 100,
    };
  } catch {
    return {
      impressions: 0,
      clicks: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      engagement_rate: 0,
    };
  }
}

// ============================================================
// FOLLOWER COUNT PULLER
// ============================================================

export async function fetchFollowerCount(params: {
  accessToken: string;
  personUrn: string;
}): Promise<number> {
  try {
    const encodedUrn = encodeURIComponent(params.personUrn);
    const response = await axios.get(
      `https://api.linkedin.com/v2/networkSizes/${encodedUrn}?edgeType=CompanyFollowedByMember`,
      {
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    return response.data?.firstDegreeSize ?? 0;
  } catch {
    return 0;
  }
}

// ============================================================
// WEEKLY ANALYTICS ANALYSER PROMPT
// ============================================================

const ANALYTICS_ANALYSER_PROMPT = `
You are the growth analytics advisor for Markitx's LinkedIn automation system. Every week you receive the performance data from the past 7 days and produce a clear, actionable brief for next week.

YOUR JOB:
1. Identify what worked (high impressions, high engagement, follower spikes)
2. Identify what failed (low impressions, low engagement, wrong audience)
3. Give specific, numbered recommendations for next week
4. Predict which format/topic will perform best next week based on the trend

===========================
WHAT YOU ANALYSE
===========================

Post performance:
- Which formats got the most impressions (reach) vs engagement (quality)
- Which hooks got the most "see more" clicks (high CTR = LinkedIn pushes it more)
- Which days performed best
- Average engagement rate vs LinkedIn benchmark (2-4% is good, 5%+ is excellent)

Follower growth:
- Net new followers this week
- Which posts drove the most follows (usually the most specific/credible ones)
- Growth velocity trend (accelerating, flat, declining)

Lead generation signals:
- Which posts generated DMs (inbound leads)
- Which formats led to profile visits (tracked via LinkedIn analytics)
- Outreach reply rates

===========================
OUTPUT FORMAT
===========================
Produce a structured weekly brief:
1. Performance summary (2-3 sentences, the headline numbers)
2. This week's winners (top 2-3 posts and why they worked)
3. This week's misses (what underperformed and why)
4. Specific adjustments for next week (5-7 numbered recommendations — specific, not vague)
5. Next week's high-confidence post prediction (which format/topic will perform best)
6. Warning flags (anything that needs attention — token expiry, dropping engagement, etc.)

Be direct. Be specific. No generic advice. "Post more consistently" is not advice.
Return as JSON: GrowthMetrics object plus analysis fields.
`.trim();

export async function runGrowthAnalyticsAgent(params: {
  week_number: number;
  posts_this_week: Array<{
    post_id: string;
    format: string;
    category: string;
    hook: string;
    impressions: number;
    reactions: number;
    comments: number;
    shares: number;
    clicks: number;
    engagement_rate: number;
    follower_delta: number;
  }>;
  followers_start: number;
  followers_end: number;
  outreach_reply_rate: number;
  inbound_dms: number;
}): Promise<GrowthMetrics & {
  performance_summary: string;
  winners: string[];
  misses: string[];
  next_week_adjustments: string[];
  high_confidence_prediction: string;
  warning_flags: string[];
}> {
  const { week_number, posts_this_week, followers_start, followers_end } = params;

  const net_new = followers_end - followers_start;
  const total_impressions = posts_this_week.reduce((s, p) => s + p.impressions, 0);
  const avg_engagement = posts_this_week.reduce((s, p) => s + p.engagement_rate, 0) / (posts_this_week.length || 1);

  const top_post = [...posts_this_week].sort((a, b) => b.impressions - a.impressions)[0];

  const userPrompt = `
ANALYSE THIS WEEK'S LINKEDIN PERFORMANCE:

Week: ${week_number}
Followers at start: ${followers_start}
Followers at end: ${followers_end}
Net new followers: ${net_new}
Total impressions: ${total_impressions}
Average engagement rate: ${avg_engagement.toFixed(2)}%
Inbound DMs this week: ${params.inbound_dms}
Outreach reply rate: ${params.outreach_reply_rate}%

POSTS THIS WEEK:
${posts_this_week
  .map(
    (p, i) => `
Post ${i + 1}:
Format: ${p.format} | Category: ${p.category}
Hook: "${p.hook.slice(0, 80)}..."
Impressions: ${p.impressions} | Reactions: ${p.reactions} | Comments: ${p.comments} | Shares: ${p.shares}
Engagement rate: ${p.engagement_rate}% | Follower delta: ${p.follower_delta > 0 ? "+" : ""}${p.follower_delta}
`
  )
  .join("\n---\n")}

Top performing post: ${top_post?.format ?? "N/A"} with ${top_post?.impressions ?? 0} impressions.

Produce the full weekly brief as JSON.
`.trim();

  return await completeJSON({
    system: ANALYTICS_ANALYSER_PROMPT,
    user: userPrompt,
    model: "mistral-large-latest",
    temperature: 0.3,
    max_tokens: 2000,
    json_mode: true,
  });
}
