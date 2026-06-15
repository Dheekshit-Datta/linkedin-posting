// ============================================================
// AGENT 6: NOTIFICATION AGENT
// ============================================================
// Sends a Slack or Discord webhook notification after each run.
// Success: includes post preview + LinkedIn URL
// Failure: includes error details + what failed
// Configured via WEBHOOK_NOTIFY_URL env var.
// ============================================================

import axios from "axios";
import type { GeneratedPost, AutomationRunLog } from "../types/index.js";

export async function sendSuccessNotification(params: {
  post: GeneratedPost;
  linkedInPostId: string;
  webhookUrl: string;
  runLog: AutomationRunLog;
}): Promise<void> {
  const { post, linkedInPostId, webhookUrl, runLog } = params;

  const preview = post.full_text.slice(0, 280) + (post.full_text.length > 280 ? "..." : "");
  const duration = (runLog.total_duration_ms / 1000).toFixed(1);

  const slackPayload = {
    text: "LinkedIn post published",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Markitx LinkedIn post published",
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Category:* ${post.category}` },
          { type: "mrkdwn", text: `*Format:* ${post.format}` },
          { type: "mrkdwn", text: `*QA Score:* ${post.quality_score}/100` },
          { type: "mrkdwn", text: `*Duration:* ${duration}s` },
          { type: "mrkdwn", text: `*Char count:* ${post.char_count}` },
          { type: "mrkdwn", text: `*Image:* ${runLog.image_uploaded ? "Yes" : "No"}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Post preview:*\n\`\`\`${preview}\`\`\``,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View on LinkedIn" },
            url: `https://www.linkedin.com/feed/update/${linkedInPostId}/`,
          },
        ],
      },
    ],
  };

  await axios.post(webhookUrl, slackPayload);
}

export async function sendFailureNotification(params: {
  error: string;
  runLog: AutomationRunLog;
  webhookUrl: string;
}): Promise<void> {
  const { error, runLog, webhookUrl } = params;

  const slackPayload = {
    text: "LinkedIn post FAILED",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Markitx LinkedIn post FAILED",
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Run ID:* ${runLog.run_id}` },
          { type: "mrkdwn", text: `*Triggered at:* ${runLog.triggered_at}` },
          { type: "mrkdwn", text: `*Retries:* ${runLog.retries}` },
          {
            type: "mrkdwn",
            text: `*Format intended:* ${runLog.schedule_slot.format}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Error:*\n\`\`\`${error.slice(0, 500)}\`\`\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Fix the error and re-trigger manually via the Trigger.dev dashboard.",
        },
      },
    ],
  };

  await axios.post(webhookUrl, slackPayload);
}

export async function sendQAFailureNotification(params: {
  postPreview: string;
  qaIssues: string[];
  qaScore: number;
  webhookUrl: string;
  retryCount: number;
}): Promise<void> {
  const { postPreview, qaIssues, qaScore, webhookUrl, retryCount } = params;

  const slackPayload = {
    text: `QA failed after ${retryCount} attempts — post not published`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `QA failed (${retryCount} attempts) — post held`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*QA Score:* ${qaScore}/100` },
          { type: "mrkdwn", text: `*Issues found:* ${qaIssues.length}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*QA Issues:*\n${qaIssues.map((i) => `• ${i}`).join("\n")}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Last post attempt preview:*\n\`\`\`${postPreview.slice(0, 300)}...\`\`\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Action: Review the agent prompts or manually write today's post.",
        },
      },
    ],
  };

  await axios.post(webhookUrl, slackPayload);
}
