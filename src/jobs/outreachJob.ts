// ============================================================
// JOB: COLD OUTREACH SEQUENCE MANAGER
// ============================================================
// Runs daily at 10:30 AM IST. Manages the full 4-step outreach
// sequence for all active prospects.
//
// Daily actions:
// 1. Check which prospects need their next sequence message
// 2. Generate the personalized message for each
// 3. Queue for sending (review + send via LinkedIn DM API
//    or manually via the Trigger.dev dashboard output)
// 4. Track replies and update prospect stage
//
// Weekly actions (Monday only):
// 5. Run prospect qualification on new leads from post DMs
// 6. Add qualified prospects to the active sequence
//
// Target volume: 5-10 new connection requests per day
// (LinkedIn's safe limit for personal accounts)
// ============================================================

import { schedules, logger, task } from "@trigger.dev/sdk/v3";
import {
  runOutreachSequenceAgent,
  qualifyProspect,
  INDUSTRY_PAIN_MAP,
} from "../agents/coldOutreach.js";
import { getEnvConfig } from "../lib/config.js";
import { CLIENT_STORY_BANK } from "../lib/config.js";
import type { Prospect, OutreachStage, ProspectIndustry } from "../types/growth.js";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// PROSPECT DATABASE
// In production: store in Supabase, Airtable, or Upstash Redis
// For now: static list that Dheekshit updates manually
// The system reads from here, generates messages, queues them
// ============================================================

// HOW TO ADD PROSPECTS:
// 1. Search LinkedIn for: "[title] [industry] [company size]"
//    Examples:
//    - "Head of Operations marketing agency 10-50 employees"
//    - "COO law firm"
//    - "Founder SaaS startup"
//    - "Director of Operations consulting firm"
// 2. Look at their profile and recent posts for pain signals
// 3. Add them to this array with the pain signals you found
// 4. The system handles the rest

export const ACTIVE_PROSPECTS: Prospect[] = [
  // ---- EXAMPLE PROSPECTS (replace with real ones) ----
  {
    id: "prospect-001",
    name: "Sarah Chen",
    title: "Head of Operations",
    company: "GrowthForge Agency",
    industry: "marketing_agency",
    company_size: "18 people",
    pain_signals: [
      "Posted about spending 'another Sunday on client reports'",
      "Commented on a post about manual reporting being 'the bane of my existence'",
      "Profile says 'scaling operations' in the about section",
    ],
    linkedin_url: "https://linkedin.com/in/example-1",
    stage: "connection_request",
    replied: false,
    converted_to_lead: false,
    notes: "Active on LinkedIn, posts 2-3x/week about agency ops. Decision maker.",
  },
  {
    id: "prospect-002",
    name: "James Okonkwo",
    title: "Founder",
    company: "Lexara Legal",
    industry: "law_firm",
    company_size: "22 people",
    pain_signals: [
      "LinkedIn post: 'Every time we bring on a new client the intake process takes 3 days. There has to be a better way.'",
      "Recent activity: liked 3 posts about legal tech automation",
      "Bio mentions 'modernising legal services'",
    ],
    linkedin_url: "https://linkedin.com/in/example-2",
    stage: "connection_request",
    replied: false,
    converted_to_lead: false,
    notes: "Active founder. Clear pain around intake. High-value prospect.",
  },
  {
    id: "prospect-003",
    name: "Priya Nair",
    title: "COO",
    company: "Meridian Financial",
    industry: "financial_services",
    company_size: "35 people",
    pain_signals: [
      "Posted about 'reporting taking up 40% of the team's week'",
      "Looking for 'operations automation solutions' in a comment",
      "Recently promoted to COO — likely wants to prove impact quickly",
    ],
    linkedin_url: "https://linkedin.com/in/example-3",
    stage: "connection_request",
    replied: false,
    converted_to_lead: false,
    notes: "Decision maker at the right level. Clear reporting pain. Priority prospect.",
  },
];

// ============================================================
// DAILY OUTREACH JOB — 10:30 AM IST (5:00 AM UTC)
// ============================================================

export const dailyOutreachJob = schedules.task({
  id: "daily-outreach-sequence",
  cron: "0 5 * * 1-5", // Weekdays, 10:30 AM IST
  maxDuration: 180,

  run: async (_payload, { ctx }) => {
    const jobId = ctx.run.id ?? uuidv4();
    const now = new Date();

    logger.info("Starting daily outreach sequence job", { jobId });

    const messagesGenerated: Array<{
      prospect_name: string;
      stage: OutreachStage;
      message_preview: string;
      char_count: number;
      personalization_score: number;
    }> = [];

    // Pick a random client story for reference in messages
    const clientStory = CLIENT_STORY_BANK[Math.floor(Math.random() * CLIENT_STORY_BANK.length)];
    const clientResultRef = `${clientStory.industry} client: ${clientStory.outcome_metric} in ${clientStory.time_to_build}`;

    // Process prospects that need their next message today
    // In production: filter by (last_message_at + stage_delay <= now)
    // For now: process all in connection_request stage as example
    const dueProspects = ACTIVE_PROSPECTS.filter(
      (p) => !p.converted_to_lead && p.stage === "connection_request"
    ).slice(0, 10); // Max 10 per day (LinkedIn safety limit)

    logger.info("Processing prospects", { count: dueProspects.length });

    for (const prospect of dueProspects) {
      try {
        const message = await runOutreachSequenceAgent({
          prospect,
          stage: prospect.stage,
          client_result_reference: clientResultRef,
        });

        messagesGenerated.push({
          prospect_name: prospect.name,
          stage: message.stage,
          message_preview: message.message_text.slice(0, 100) + "...",
          char_count: message.char_count,
          personalization_score: message.personalization_score,
        });

        logger.info("Message generated", {
          prospect: prospect.name,
          stage: message.stage,
          personalization: message.personalization_score,
          send_at: message.send_at,
        });

        // In production: save to Supabase/Airtable queue
        // and send via LinkedIn API or Expandi/Lempod

      } catch (err) {
        logger.warn("Failed to generate message for prospect", {
          prospect: prospect.name,
          error: String(err),
        });
      }
    }

    return {
      job_id: jobId,
      date: now.toISOString(),
      prospects_processed: dueProspects.length,
      messages_generated: messagesGenerated,
    };
  },
});

// ============================================================
// PROSPECT QUALIFIER JOB — Mondays at 9:00 AM IST
// Qualifies new prospects from the previous week's DMs
// ============================================================

export const weeklyProspectQualifier = schedules.task({
  id: "weekly-prospect-qualifier",
  cron: "30 3 * * 1", // Monday 9:00 AM IST
  maxDuration: 120,

  run: async (_payload, { ctx }) => {
    logger.info("Running weekly prospect qualifier");

    // In production: pull new DMs and commenters from the week
    // and qualify each one. For now, example with static input.
    const newProspectCandidates = [
      // These would come from LinkedIn DMs or post commenters
      // who identified themselves as potential leads
    ];

    const qualifiedProspects = [];

    for (const candidate of newProspectCandidates as Array<{
      name: string;
      title: string;
      company: string;
      company_size: string;
      industry: string;
      linkedin_activity_summary: string;
    }>) {
      const qualification = await qualifyProspect(candidate);

      if (qualification.should_contact) {
        qualifiedProspects.push({
          ...candidate,
          qualification,
        });
        logger.info("Qualified new prospect", {
          name: candidate.name,
          score: qualification.score,
          reason: qualification.fit_reason,
        });
      }
    }

    logger.info("Qualification complete", {
      candidates: newProspectCandidates.length,
      qualified: qualifiedProspects.length,
    });

    return {
      candidates_reviewed: newProspectCandidates.length,
      qualified_for_outreach: qualifiedProspects.length,
      prospects: qualifiedProspects,
    };
  },
});

// ============================================================
// MANUAL OUTREACH GENERATOR — trigger from dashboard
// Use this to generate a specific message for a specific
// prospect at any stage, on demand
// ============================================================

export const manualOutreachGenerator = task({
  id: "manual-outreach-generator",
  maxDuration: 60,

  run: async (payload: {
    prospect: Prospect;
    stage: OutreachStage;
  }) => {
    const { prospect, stage } = payload;

    const clientStory = CLIENT_STORY_BANK[0];
    const clientResultRef = `${clientStory.industry} client: ${clientStory.outcome_metric}`;

    const message = await runOutreachSequenceAgent({
      prospect,
      stage,
      client_result_reference: clientResultRef,
    });

    return {
      prospect_name: prospect.name,
      stage,
      full_message: message.message_text,
      char_count: message.char_count,
      personalization_score: message.personalization_score,
      send_at: message.send_at,
      note: personalization_score_note(message.personalization_score),
    };
  },
});

function personalization_score_note(score: number): string {
  if (score >= 85) return "Excellent personalization. Send as-is.";
  if (score >= 70) return "Good personalization. Minor edits optional.";
  if (score >= 55) return "Acceptable. Consider adding 1-2 more specific details before sending.";
  return "Low personalization. Do not send. Add more prospect context and regenerate.";
}
