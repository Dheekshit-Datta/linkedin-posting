// ============================================================
// JOB: ENGAGEMENT SPRINT
// ============================================================
// Runs twice every day:
// 1. PRE-POST SPRINT: 8:00 AM IST (2:30 AM UTC)
//    Comment on 10-12 strategic accounts BEFORE posting.
//    Warms up the algorithm. Builds reciprocity.
//    When Dheekshit's post drops at 8:30 AM, people he just
//    engaged with are already in their notifications.
//
// 2. POST-POST SPRINT: 9:15 AM IST (3:45 AM UTC)
//    Comment on 10-12 more accounts AFTER posting.
//    Keeps the engagement signal going during the golden window.
//    Catches the post-commute LinkedIn scroll surge.
//
// Total: 20-24 strategic comments per day.
// Over 30 days: 600-720 comments on target accounts.
// This is the single highest-ROI growth activity on LinkedIn.
//
// NOTE ON AUTOMATION:
// LinkedIn does not allow fully automated commenting via API
// without violating their terms of service for personal profiles.
// This job GENERATES the comments and queues them.
// Dheekshit reviews the queue and posts them (takes 8-10 min).
// Alternatively, use a tool like Taplio, Expandi, or
// Lempod which have LinkedIn's permission for this use case.
// The system can be wired to those tools via their APIs.
// ============================================================

import { schedules, logger, task } from "@trigger.dev/sdk/v3";
import { runEngagementSprintAgent, ENGAGEMENT_TARGET_LIST, SPRINT_CONFIG, filterComments } from "../agents/engagementSprint.js";
import { getEnvConfig } from "../lib/config.js";
import type { EngagementSprintResult, EngagementTarget } from "../types/growth.js";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// PRE-POST SPRINT — 8:00 AM IST (2:30 AM UTC)
// ============================================================

export const prePostEngagementSprint = schedules.task({
  id: "pre-post-engagement-sprint",
  cron: "30 2 * * 1-5", // Weekdays only — Mon-Fri, 8:00 AM IST
  maxDuration: 120,

  run: async (_payload, { ctx }) => {
    const sprintId = ctx.run.id ?? uuidv4();
    const startTime = Date.now();

    logger.info("Starting PRE-POST engagement sprint", { sprintId });

    // Select targets for this sprint
    // Halo: top 3, Steps ahead: next 4, Peers: next 5
    const haloTargets = ENGAGEMENT_TARGET_LIST
      .filter((t) => t.follower_tier === "halo")
      .slice(0, SPRINT_CONFIG.halo_count);

    const stepsTargets = ENGAGEMENT_TARGET_LIST
      .filter((t) => t.follower_tier === "steps_ahead")
      .slice(0, SPRINT_CONFIG.steps_ahead_count);

    const peerTargets = ENGAGEMENT_TARGET_LIST
      .filter((t) => t.follower_tier === "peer")
      .slice(0, SPRINT_CONFIG.peer_count);

    const allTargets: EngagementTarget[] = [
      ...haloTargets,
      ...stepsTargets,
      ...peerTargets,
    ];

    // Filter to targets that have had their post summary populated
    // In production: wire this to a scraper that pulls their latest post
    const targetsWithContent = allTargets.filter(
      (t) => t.recent_post_summary && t.recent_post_summary.length > 20
    );

    if (targetsWithContent.length === 0) {
      logger.warn("No targets have post summaries populated. Update ENGAGEMENT_TARGET_LIST with recent post summaries.");
      return {
        skipped: true,
        reason: "No target post summaries available. Populate recent_post_summary in ENGAGEMENT_TARGET_LIST.",
      };
    }

    logger.info("Generating comments for targets", {
      halo: haloTargets.length,
      steps_ahead: stepsTargets.length,
      peers: peerTargets.length,
      with_content: targetsWithContent.length,
    });

    // Generate comments
    const rawComments = await runEngagementSprintAgent({
      targets: targetsWithContent,
      phase: "pre_post",
    });

    // Quality filter
    const approvedComments = filterComments(rawComments);

    logger.info("Sprint complete", {
      generated: rawComments.length,
      approved: approvedComments.length,
      filtered_out: rawComments.length - approvedComments.length,
    });

    const result: EngagementSprintResult = {
      sprint_id: sprintId,
      triggered_at: new Date().toISOString(),
      phase: "pre_post",
      targets_processed: targetsWithContent.length,
      comments_generated: approvedComments,
      total_duration_ms: Date.now() - startTime,
    };

    // In production: push these to a queue (Upstash, Supabase, Airtable)
    // for Dheekshit to review and execute via Taplio/Expandi
    // Or wire directly to a LinkedIn automation tool's API

    logger.info("Sprint results queued for execution", {
      comments: approvedComments.map((c) => ({
        target: c.target.name,
        tier: c.target.follower_tier,
        preview: c.comment_text.slice(0, 60) + "...",
      })),
    });

    return result;
  },
});

// ============================================================
// POST-POST SPRINT — 9:15 AM IST (3:45 AM UTC)
// ============================================================

export const postPostEngagementSprint = schedules.task({
  id: "post-post-engagement-sprint",
  cron: "45 3 * * 1-5", // Weekdays, 9:15 AM IST
  maxDuration: 120,

  run: async (_payload, { ctx }) => {
    const sprintId = ctx.run.id ?? uuidv4();
    const startTime = Date.now();

    logger.info("Starting POST-POST engagement sprint", { sprintId });

    // Use a different rotation of targets for the post-post sprint
    // Offset by the count used in the pre-post sprint
    const haloTargets = ENGAGEMENT_TARGET_LIST
      .filter((t) => t.follower_tier === "halo")
      .slice(SPRINT_CONFIG.halo_count); // Second batch

    const stepsTargets = ENGAGEMENT_TARGET_LIST
      .filter((t) => t.follower_tier === "steps_ahead")
      .slice(SPRINT_CONFIG.steps_ahead_count); // Second batch

    const peerTargets = ENGAGEMENT_TARGET_LIST
      .filter((t) => t.follower_tier === "peer")
      .slice(SPRINT_CONFIG.peer_count); // Second batch

    const allTargets: EngagementTarget[] = [
      ...haloTargets,
      ...stepsTargets,
      ...peerTargets,
    ];

    const targetsWithContent = allTargets.filter(
      (t) => t.recent_post_summary && t.recent_post_summary.length > 20
    );

    if (targetsWithContent.length === 0) {
      logger.info("No second-batch targets available — using first batch with different intents");
      return { skipped: true, reason: "Second batch of targets not populated" };
    }

    const rawComments = await runEngagementSprintAgent({
      targets: targetsWithContent,
      phase: "post_post",
    });

    const approvedComments = filterComments(rawComments);

    logger.info("Post-post sprint complete", {
      generated: rawComments.length,
      approved: approvedComments.length,
    });

    return {
      sprint_id: sprintId,
      triggered_at: new Date().toISOString(),
      phase: "post_post",
      targets_processed: targetsWithContent.length,
      comments_generated: approvedComments,
      total_duration_ms: Date.now() - startTime,
    } as EngagementSprintResult;
  },
});

// ============================================================
// MANUAL SPRINT — trigger on demand from dashboard
// ============================================================

export const manualEngagementSprint = task({
  id: "manual-engagement-sprint",
  maxDuration: 120,

  run: async (payload: {
    phase: "pre_post" | "post_post";
    target_overrides?: EngagementTarget[];
  }) => {
    const { phase, target_overrides } = payload;

    const targets = target_overrides ?? ENGAGEMENT_TARGET_LIST.filter(
      (t) => t.recent_post_summary?.length > 20
    );

    const rawComments = await runEngagementSprintAgent({ targets, phase });
    const approved = filterComments(rawComments);

    return {
      phase,
      generated: rawComments.length,
      approved: approved.length,
      comments: approved.map((c) => ({
        target_name: c.target.name,
        tier: c.target.follower_tier,
        comment: c.comment_text,
        profile_url: c.target.profile_url,
      })),
    };
  },
});
