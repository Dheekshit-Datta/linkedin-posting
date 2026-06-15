// ============================================================
// JOB: WORLD BUILDING — runs immediately after each post
// JOB: WEEKLY ANALYTICS — runs every Sunday night
// JOB: WEEKLY LEAD MAGNET — runs every Friday
// ============================================================

import { schedules, logger, task } from "@trigger.dev/sdk/v3";
import { runWorldBuildingAgent, runCommentReplyAgent } from "../agents/worldBuilding.js";
import { runGrowthAnalyticsAgent, fetchLinkedInPostStats, fetchFollowerCount } from "../agents/growthAnalytics.js";
import { runLeadMagnetAgent, LEAD_MAGNET_LIBRARY } from "../agents/leadMagnet.js";
import { getEnvConfig } from "../lib/config.js";
import { loadPostHistory } from "../lib/postHistory.js";
import { publishTextPost } from "../lib/linkedin.js";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// JOB: WORLD BUILDING — triggered via task.trigger()
// from the dailyPost job immediately after publishing
// ============================================================

export const worldBuildingJob = task({
  id: "world-building-comments",
  maxDuration: 180,

  run: async (payload: {
    post_id: string;
    post_format: string;
    post_hook: string;
    post_body_preview: string;
    post_cta: string;
    post_category: string;
    linkedin_post_id: string;
    client_story_context?: string;
  }) => {
    const env = getEnvConfig();
    const { linkedin_post_id, post_hook, post_body_preview } = payload;

    logger.info("Generating world-building comments", { linkedin_post_id });

    // Generate the 3 comments
    const worldBuilding = await runWorldBuildingAgent({
      post: {
        id: payload.post_id,
        created_at: new Date().toISOString(),
        category: payload.post_category as "client_magnet" | "credibility",
        format: payload.post_format as any,
        hook: post_hook,
        body: post_body_preview,
        cta: payload.post_cta,
        full_text: `${post_hook}\n\n${post_body_preview}\n\n${payload.post_cta}`,
        char_count: 0,
        image_prompt: "",
        hashtags: [],
        estimated_reach_tier: "standard",
        quality_score: 0,
        quality_notes: "",
        approved: true,
      },
      client_story_context: payload.client_story_context,
    });

    logger.info("World-building comments generated", {
      comment_1_preview: worldBuilding.comment_1_bts.slice(0, 60),
      comment_2_preview: worldBuilding.comment_2_tip.slice(0, 60),
      comment_3_preview: worldBuilding.comment_3_question.slice(0, 60),
    });

    // Post Comment 1 immediately (0 min delay)
    // Comments are posted to the post via LinkedIn API
    // Note: LinkedIn's API for posting comments on own posts:
    // POST /v2/socialActions/{postUrn}/comments
    // For now: log them for manual execution or wire to Taplio

    const comments = [
      { text: worldBuilding.comment_1_bts, delay_minutes: 0, label: "BTS" },
      { text: worldBuilding.comment_2_tip, delay_minutes: 15, label: "Bonus Tip" },
      { text: worldBuilding.comment_3_question, delay_minutes: 30, label: "Question" },
    ];

    logger.info("World-building schedule", {
      post_id: linkedin_post_id,
      comments: comments.map((c) => ({
        label: c.label,
        delay: `${c.delay_minutes} min`,
        preview: c.text.slice(0, 80) + "...",
      })),
    });

    // In production with LinkedIn API access for comments:
    // for (const comment of comments) {
    //   await new Promise(r => setTimeout(r, comment.delay_minutes * 60 * 1000));
    //   await postCommentOnLinkedIn({ postId: linkedin_post_id, text: comment.text, accessToken: env.LINKEDIN_ACCESS_TOKEN });
    // }

    return {
      post_id: linkedin_post_id,
      comments_scheduled: comments.length,
      bts_comment: worldBuilding.comment_1_bts,
      tip_comment: worldBuilding.comment_2_tip,
      question_comment: worldBuilding.comment_3_question,
    };
  },
});

// ============================================================
// JOB: COMMENT REPLY MONITOR
// Polls for new comments every 30 min for 6 hours after post
// ============================================================

export const commentReplyMonitor = task({
  id: "comment-reply-monitor",
  maxDuration: 60,

  run: async (payload: {
    linkedin_post_id: string;
    post_context: string;
    new_comments: Array<{ id: string; author_name: string; text: string }>;
  }) => {
    const { linkedin_post_id, post_context, new_comments } = payload;

    if (new_comments.length === 0) {
      return { replies_generated: 0 };
    }

    logger.info("Generating replies for new comments", {
      post_id: linkedin_post_id,
      new_comments: new_comments.length,
    });

    const replies = [];

    for (const comment of new_comments) {
      const reply = await runCommentReplyAgent({
        commenter_name: comment.author_name,
        original_comment: comment.text,
        post_context,
      });

      replies.push({
        comment_id: comment.id,
        author: comment.author_name,
        original: comment.text,
        reply: reply.reply_text,
        char_count: reply.char_count,
      });

      logger.info("Reply generated", {
        author: comment.author_name,
        reply_preview: reply.reply_text.slice(0, 60),
      });
    }

    return {
      post_id: linkedin_post_id,
      replies_generated: replies.length,
      replies,
    };
  },
});

// ============================================================
// JOB: WEEKLY LEAD MAGNET POST — Every Friday 9:00 AM IST
// Rotates through the lead magnet library weekly
// ============================================================

export const weeklyLeadMagnetPost = schedules.task({
  id: "weekly-lead-magnet-post",
  cron: "30 3 * * 5", // Friday 9:00 AM IST (3:30 AM UTC)
  maxDuration: 120,

  run: async (_payload, { ctx }) => {
    const env = getEnvConfig();

    // Rotate through magnets — week number mod library length
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const magnetIndex = weekNum % LEAD_MAGNET_LIBRARY.length;
    const magnet = LEAD_MAGNET_LIBRARY[magnetIndex];

    logger.info("Generating lead magnet post", {
      magnet_id: magnet.id,
      magnet_title: magnet.title,
      trigger_word: magnet.trigger_word,
    });

    const magnetPost = await runLeadMagnetAgent({ magnet_id: magnet.id });

    logger.info("Lead magnet post generated", {
      trigger: magnetPost.trigger_phrase,
      post_preview: magnetPost.post_body.slice(0, 100),
      expected_comment_rate: magnetPost.expected_comment_rate,
    });

    // Publish to LinkedIn
    const linkedInPostId = await publishTextPost({
      text: magnetPost.post_body,
      accessToken: env.LINKEDIN_ACCESS_TOKEN,
      personUrn: env.LINKEDIN_PERSON_URN,
    });

    logger.info("Lead magnet post published", { linkedInPostId });

    return {
      magnet_id: magnet.id,
      magnet_title: magnet.title,
      trigger_word: magnet.trigger_word,
      linkedin_post_id: linkedInPostId,
      follow_up_dm: magnetPost.follow_up_dm,
      expected_comment_rate: magnetPost.expected_comment_rate,
      post_preview: magnetPost.post_body.slice(0, 200),
    };
  },
});

// ============================================================
// JOB: WEEKLY ANALYTICS — Every Sunday 8:00 PM IST
// Pulls LinkedIn stats, analyses performance, sends brief
// ============================================================

export const weeklyAnalyticsJob = schedules.task({
  id: "weekly-growth-analytics",
  cron: "30 14 * * 0", // Sunday 8:00 PM IST (2:30 PM UTC)
  maxDuration: 180,

  run: async (_payload, { ctx }) => {
    const env = getEnvConfig();

    logger.info("Starting weekly analytics run");

    // Load this week's posts from history
    const allHistory = await loadPostHistory();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const thisWeekPosts = allHistory.filter((p) =>
      new Date(p.created_at) >= sevenDaysAgo
    );

    logger.info("Posts this week", { count: thisWeekPosts.length });

    // Fetch stats for each post
    const postsWithStats = await Promise.all(
      thisWeekPosts.map(async (p) => {
        // In production: use p.linkedin_post_id to fetch real stats
        // For now: placeholder until LinkedIn analytics integration is live
        const stats = await fetchLinkedInPostStats({
          accessToken: env.LINKEDIN_ACCESS_TOKEN,
          postId: p.id,
        }).catch(() => ({
          impressions: 0,
          clicks: 0,
          reactions: 0,
          comments: 0,
          shares: 0,
          engagement_rate: 0,
        }));

        return {
          post_id: p.id,
          format: p.format,
          category: p.category,
          hook: p.hook,
          ...stats,
          follower_delta: 0, // Would come from daily follower tracking
        };
      })
    );

    // Get current follower count
    const followersEnd = await fetchFollowerCount({
      accessToken: env.LINKEDIN_ACCESS_TOKEN,
      personUrn: env.LINKEDIN_PERSON_URN,
    }).catch(() => 0);

    // Run analytics
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

    const analytics = await runGrowthAnalyticsAgent({
      week_number: weekNumber,
      posts_this_week: postsWithStats,
      followers_start: 0, // Load from previous week's log in production
      followers_end: followersEnd,
      outreach_reply_rate: 0, // Load from outreach tracking
      inbound_dms: 0,         // Load from DM tracking
    });

    logger.info("Analytics complete", {
      performance_summary: analytics.performance_summary,
      net_new_followers: analytics.net_new_followers,
      top_post: analytics.top_performing_post_format,
      recommendations_count: analytics.recommended_adjustments.length,
    });

    // In production: post this to Slack via WEBHOOK_NOTIFY_URL
    const env2 = getEnvConfig();
    if (env2.WEBHOOK_NOTIFY_URL) {
      const { default: axios } = await import("axios");
      await axios.post(env2.WEBHOOK_NOTIFY_URL, {
        text: "Weekly LinkedIn growth report",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `Week ${weekNumber} LinkedIn Performance Brief` },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: analytics.performance_summary },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Next week adjustments:*\n${analytics.recommended_adjustments.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*High confidence prediction for next week:*\n${analytics.high_confidence_prediction}`,
            },
          },
          ...(analytics.warning_flags?.length
            ? [{
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Warning flags:*\n${analytics.warning_flags.map((f) => `- ${f}`).join("\n")}`,
                },
              }]
            : []),
        ],
      }).catch((err) => logger.warn("Analytics Slack notification failed", { error: String(err) }));
    }

    return analytics;
  },
});
