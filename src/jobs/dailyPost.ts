// ============================================================
// JOB: DAILY LINKEDIN POST
// ============================================================
// This is the main Trigger.dev scheduled job. It runs every day
// at 8:30 AM IST (3:00 AM UTC) and orchestrates the full
// pipeline: strategy → hooks → writing → QA → image → publish.
//
// Schedule: 0 3 * * * (daily 3:00 AM UTC = 8:30 AM IST)
// Max duration: 300 seconds
// Retry: 3 attempts on failure
// ============================================================

import { schedules, logger, task, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { format, getDay } from "date-fns";
import { v4 as uuidv4 } from "uuid";

// Agents
import { runContentStrategistAgent } from "../agents/contentStrategist.js";
import { runHookEngineerAgent } from "../agents/hookEngineer.js";
import { runVoiceWriterAgent } from "../agents/voiceWriter.js";
import { runQAAgent } from "../agents/qaAgent.js";
import { runImagePromptAgent } from "../agents/imagePromptAgent.js";
import { generateGeminiImage, mapImagePromptToGeminiOptions } from "../lib/geminiImage.js";
import {
  sendSuccessNotification,
  sendFailureNotification,
  sendQAFailureNotification,
} from "../agents/notificationAgent.js";

// Lib
import { getEnvConfig, WEEKLY_SCHEDULE } from "../lib/config.js";
import { publishTextPost, publishImagePost, validateLinkedInToken } from "../lib/linkedin.js";
import { withRetry } from "../lib/mistral.js";
import { getRecentPostSummaries, savePostToHistory } from "../lib/postHistory.js";

// Types
import type { GeneratedPost, AutomationRunLog, WeekDay } from "../types/index.js";

const DAY_MAP: Record<number, WeekDay> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const MAX_QA_RETRIES = 2;

// ============================================================
// MAIN SCHEDULED JOB
// ============================================================

export const dailyLinkedInPost = schedules.task({
  id: "daily-linkedin-post",
  // 8:30 AM IST every day
  cron: "30 3 * * *",
  maxDuration: 300,

  run: async (_payload, { ctx }) => {
    const runId = ctx.run.id ?? uuidv4();
    const startTime = Date.now();
    const now = new Date();

    logger.info("Starting Markitx LinkedIn post pipeline", {
      runId,
      timestamp: now.toISOString(),
    });

    let env: ReturnType<typeof getEnvConfig>;
    try {
      env = getEnvConfig();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Environment config failed", { error: msg });
      throw new AbortTaskRunError(`Environment config failed: ${msg}`);
    }

    // Determine today's schedule slot
    const dayIndex = getDay(now); // 0 = Sunday
    const dayOfWeek = DAY_MAP[dayIndex];
    const slot = WEEKLY_SCHEDULE.find((s) => s.day === dayOfWeek);

    if (!slot) {
      logger.warn("No schedule slot found for today — skipping", { dayOfWeek });
      return { skipped: true, reason: "No schedule slot for " + dayOfWeek };
    }

    logger.info("Schedule slot determined", { dayOfWeek, format: slot.format, category: slot.category });

    // Build the run log
    const runLog: AutomationRunLog = {
      run_id: runId,
      triggered_at: now.toISOString(),
      schedule_slot: slot,
      post_generated: null,
      linkedin_post_id: null,
      image_uploaded: false,
      error: null,
      retries: 0,
      total_duration_ms: 0,
    };

    try {
      // --------------------------------------------------------
      // STEP 1: Validate LinkedIn token
      // --------------------------------------------------------
      logger.info("Validating LinkedIn token...");
      const tokenValid = await validateLinkedInToken(env.LINKEDIN_ACCESS_TOKEN);
      if (!tokenValid) {
        throw new Error(
          "LinkedIn access token is expired or invalid. Go to LinkedIn Developer Console and refresh your token."
        );
      }
      logger.info("LinkedIn token is valid");

      // --------------------------------------------------------
      // STEP 2: Load post history to avoid repetition
      // --------------------------------------------------------
      const recentSummaries = await getRecentPostSummaries(7);
      logger.info("Loaded post history", { count: recentSummaries.length });

      // --------------------------------------------------------
      // STEP 3: Content Strategist — build the creative brief
      // --------------------------------------------------------
      logger.info("Running content strategist agent...");
      const brief = await withRetry(() =>
        runContentStrategistAgent({
          slot,
          recentPostSummaries: recentSummaries,
          dayOfWeek,
        })
      );
      logger.info("Creative brief generated", { format: brief.post_format, angle: brief.core_angle });

      // --------------------------------------------------------
      // STEP 4: Image Prompt Agent (runs in parallel with hooks)
      // --------------------------------------------------------
      logger.info("Starting image prompt generation...");
      const imagePromptPromise = withRetry(() => runImagePromptAgent(brief));

      // --------------------------------------------------------
      // STEP 5: Hook Engineer — generate hook variants
      // --------------------------------------------------------
      logger.info("Running hook engineer agent...");
      const hookVariants = await withRetry(() => runHookEngineerAgent(brief));
      logger.info("Hook variants generated", {
        count: hookVariants.hooks.length,
        recommended: hookVariants.hooks[hookVariants.recommended_index]?.text?.slice(0, 60),
      });

      // --------------------------------------------------------
      // STEP 6: QA Loop — write post, score it, retry if needed
      // --------------------------------------------------------
      let finalPost: GeneratedPost | null = null;
      let lastQAScore = 0;
      let lastQAIssues: string[] = [];

      for (let attempt = 1; attempt <= MAX_QA_RETRIES + 1; attempt++) {
        logger.info(`Voice writer attempt ${attempt}...`);
        runLog.retries = attempt - 1;

        const writtenPost = await withRetry(() =>
          runVoiceWriterAgent({ brief, hookVariants })
        );

        logger.info("Post written", {
          wordCount: writtenPost.full_text.split(" ").length,
          charCount: writtenPost.char_count,
          hookPreview: writtenPost.hook.slice(0, 80),
        });

        // Run QA
        logger.info("Running QA agent...");
        const qaResult = await withRetry(() =>
          runQAAgent({ post: writtenPost, brief })
        );

        lastQAScore = qaResult.score;
        lastQAIssues = qaResult.issues;

        logger.info("QA result", {
          approved: qaResult.approved,
          score: qaResult.score,
          voiceMatch: qaResult.voice_match,
          hookStrength: qaResult.hook_strength,
          specificity: qaResult.specificity,
          issues: qaResult.issues,
        });

        if (qaResult.approved) {
          const postId = uuidv4();
          finalPost = {
            id: postId,
            created_at: now.toISOString(),
            category: slot.category,
            format: slot.format,
            hook: writtenPost.hook,
            body: writtenPost.body,
            cta: writtenPost.cta,
            full_text: writtenPost.full_text,
            char_count: writtenPost.char_count,
            image_prompt: "",
            hashtags: writtenPost.hashtags,
            estimated_reach_tier: qaResult.score >= 85 ? "viral_potential" : qaResult.score >= 72 ? "high" : "standard",
            quality_score: qaResult.score,
            quality_notes: qaResult.issues.join("; "),
            approved: true,
          };
          break;
        }

        if (attempt <= MAX_QA_RETRIES) {
          logger.warn(`QA failed on attempt ${attempt}, retrying...`, {
            issues: qaResult.issues,
          });
        }
      }

      if (!finalPost) {
        // QA failed all attempts
        const imagePromptResult = await imagePromptPromise.catch(() => null);
        if (env.WEBHOOK_NOTIFY_URL) {
          await sendQAFailureNotification({
            postPreview: "QA failed all attempts",
            qaIssues: lastQAIssues,
            qaScore: lastQAScore,
            webhookUrl: env.WEBHOOK_NOTIFY_URL,
            retryCount: MAX_QA_RETRIES + 1,
          });
        }
        throw new Error(`Post failed QA after ${MAX_QA_RETRIES + 1} attempts. Last score: ${lastQAScore}. Issues: ${lastQAIssues.join(", ")}`);
      }

      runLog.post_generated = finalPost;
      logger.info("Post approved by QA", { postId: finalPost.id, score: finalPost.quality_score });

      // --------------------------------------------------------
      // STEP 7: Image generation (resolve the parallel promise)
      // --------------------------------------------------------
      let linkedInPostId: string;

      const imagePromptResult = await imagePromptPromise.catch((err) => {
        logger.warn("Image prompt generation failed — will post text only", { error: String(err) });
        return null;
      });

      if (imagePromptResult && env.GOOGLE_API_KEY) {
        // Generate image using Gemini 2.5 Flash Image (Nano Banana)
        logger.info("Generating image with Gemini 2.5 Flash Image...");
        try {
          const geminiOptions = mapImagePromptToGeminiOptions(imagePromptResult);
          const imageBuffer = await generateGeminiImage(geminiOptions);
          finalPost.image_prompt = imagePromptResult.stable_diffusion_prompt;

          linkedInPostId = await publishImagePost({
            text: finalPost.full_text,
            imageBuffer,
            imageTitle: `Markitx — ${format(now, "MMMM d, yyyy")}`,
            accessToken: env.LINKEDIN_ACCESS_TOKEN,
            personUrn: env.LINKEDIN_PERSON_URN,
          });

          runLog.image_uploaded = true;
          logger.info("Published with Gemini-generated image", { linkedInPostId });
        } catch (imgErr) {
          logger.warn("Gemini image generation failed — falling back to text post", { error: String(imgErr) });
          linkedInPostId = await publishTextPost({
            text: finalPost.full_text,
            accessToken: env.LINKEDIN_ACCESS_TOKEN,
            personUrn: env.LINKEDIN_PERSON_URN,
          });
        }
      } else {
        // Text-only post
        logger.info("Publishing text-only post...");
        linkedInPostId = await publishTextPost({
          text: finalPost.full_text,
          accessToken: env.LINKEDIN_ACCESS_TOKEN,
          personUrn: env.LINKEDIN_PERSON_URN,
        });
      }

      runLog.linkedin_post_id = linkedInPostId;
      runLog.total_duration_ms = Date.now() - startTime;

      logger.info("Post published successfully", {
        linkedInPostId,
        durationMs: runLog.total_duration_ms,
      });

      // --------------------------------------------------------
      // STEP 8: Save to post history
      // --------------------------------------------------------
      await savePostToHistory(finalPost, brief.core_angle).catch((err) =>
        logger.warn("Failed to save post history", { error: String(err) })
      );

      // --------------------------------------------------------
      // STEP 9: Send success notification
      // --------------------------------------------------------
      if (env.WEBHOOK_NOTIFY_URL) {
        await sendSuccessNotification({
          post: finalPost,
          linkedInPostId,
          webhookUrl: env.WEBHOOK_NOTIFY_URL,
          runLog,
        }).catch((err) =>
          logger.warn("Success notification failed", { error: String(err) })
        );
      }

      return {
        success: true,
        postId: finalPost.id,
        linkedInPostId,
        qualityScore: finalPost.quality_score,
        category: finalPost.category,
        format: finalPost.format,
        durationMs: runLog.total_duration_ms,
        imageUploaded: runLog.image_uploaded,
        hookPreview: finalPost.hook.slice(0, 100),
      };

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      runLog.error = error;
      runLog.total_duration_ms = Date.now() - startTime;

      logger.error("Pipeline failed", { error, runId });

      if (env.WEBHOOK_NOTIFY_URL) {
        await sendFailureNotification({
          error,
          runLog,
          webhookUrl: env.WEBHOOK_NOTIFY_URL,
        }).catch(() => {});
      }

      throw err;
    }
  },
});

// ============================================================
// MANUAL TRIGGER TASK — run on-demand from Trigger.dev dashboard
// Useful for testing or manually posting on off-schedule days
// ============================================================

export const manualLinkedInPost = task({
  id: "manual-linkedin-post",
  maxDuration: 300,

  run: async (payload: {
    override_format?: string;
    override_topic?: string;
    dry_run?: boolean; // If true: generates the post but does NOT publish
  }) => {
    logger.info("Manual post triggered", payload);

    // Re-use the same pipeline by temporarily overriding the schedule slot
    const now = new Date();
    const dayIndex = getDay(now);
    const dayOfWeek = DAY_MAP[dayIndex];
    const slot = WEEKLY_SCHEDULE.find((s) => s.day === dayOfWeek) ?? WEEKLY_SCHEDULE[0];

    if (payload.override_format) {
      (slot as typeof slot).format = payload.override_format as typeof slot.format;
    }
    if (payload.override_topic) {
      slot.topic_hint = payload.override_topic;
    }

    logger.info("Using slot", { slot, dry_run: payload.dry_run ?? false });

    // Run the full pipeline with the modified slot
    // If dry_run, return the post without publishing
    // (Implement by calling individual agents directly)
    // See each agent file for direct usage examples.

    return {
      message: "Use dry_run: false to publish, or trigger daily-linkedin-post for the scheduled run.",
      slot,
    };
  },
});
