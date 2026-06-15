// ============================================================
// MARKITX LINKEDIN AUTOMATION — ENV CONFIG
// ============================================================
// Set these in your Trigger.dev project environment variables
// Dashboard → Project → Environment Variables

import { z } from "zod";

const EnvSchema = z.object({
  MISTRAL_API_KEY: z.string().min(1, "Mistral API key is required"),
  LINKEDIN_ACCESS_TOKEN: z.string().min(1, "LinkedIn access token is required"),
  LINKEDIN_PERSON_URN: z
    .string()
    .min(1, "LinkedIn person URN is required")
    .regex(/^urn:li:person:/, "Must be a valid LinkedIn URN e.g. urn:li:person:XXXXXX"),
  GOOGLE_API_KEY: z.string().optional(),
  WEBHOOK_NOTIFY_URL: z.string().url().optional(),
});

export function getEnvConfig() {
  const result = EnvSchema.safeParse({
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_PERSON_URN: process.env.LINKEDIN_PERSON_URN,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    WEBHOOK_NOTIFY_URL: process.env.WEBHOOK_NOTIFY_URL,
  });

  if (!result.success) {
    const missing = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }

  return result.data;
}

// ============================================================
// POST SCHEDULE — 7 days, 1 post per day
// 70% client magnet, 30% credibility
// Monday–Friday posts are primary lead-gen days
// Weekend posts are credibility / softer content
// ============================================================
import type { PostScheduleSlot } from "../types/index.js";

export const WEEKLY_SCHEDULE: PostScheduleSlot[] = [
  {
    day: "monday",
    category: "client_magnet",
    format: "case_study",
    topic_hint: "Pick the most dramatic transformation from the client story bank",
  },
  {
    day: "tuesday",
    category: "credibility",
    format: "concept_explainer",
    topic_hint: "Explain one AI concept that business owners hear but don't understand",
  },
  {
    day: "wednesday",
    category: "client_magnet",
    format: "numbers_post",
    topic_hint: "Lead with a specific number — hours saved, tasks replaced, revenue impact",
  },
  {
    day: "thursday",
    category: "client_magnet",
    format: "problem_story",
    topic_hint: "Open with a business owner's pain point, then show Markitx solved it",
  },
  {
    day: "friday",
    category: "client_magnet",
    format: "what_we_built",
    topic_hint: "Show something you shipped this week — real tech, real outcome",
  },
  {
    day: "saturday",
    category: "credibility",
    format: "tool_breakdown",
    topic_hint: "Pick one tool from the stack: n8n, Langchain, Voiceflow, Supabase, Make",
  },
  {
    day: "sunday",
    category: "credibility",
    format: "hot_take",
    topic_hint: "One contrarian opinion about AI automation that most people get wrong",
  },
];

// ============================================================
// CLIENT STORY BANK
// Rotate through these when generating case study posts
// Add more as Markitx takes on new clients
// ============================================================
import type { ClientStory } from "../types/index.js";

export const CLIENT_STORY_BANK: ClientStory[] = [
  {
    industry: "E-commerce",
    company_size: "8-person team",
    problem_before:
      "Owner was manually pulling Shopify orders, copying into Google Sheets, then emailing suppliers every morning. 2 hours every single day before 9am.",
    solution_built:
      "n8n workflow: Shopify webhook → filter low-stock SKUs → auto-generate PO in Google Sheets → email supplier with PDF attachment → Slack notification to owner. Zero manual steps.",
    tech_stack: ["n8n", "Shopify API", "Google Sheets API", "Gmail API", "Slack"],
    hours_saved_per_week: 14,
    what_it_replaced: "A morning routine the owner had been doing manually for 3 years",
    outcome_metric: "14 hours/week freed. Owner now focuses on growth instead of ops.",
    time_to_build: "4 days",
  },
  {
    industry: "Recruitment agency",
    company_size: "12-person agency",
    problem_before:
      "Recruiters were copying candidate info from LinkedIn into their ATS manually. For 40+ candidates a week. Each entry took 8 minutes. Nobody was doing it consistently.",
    solution_built:
      "Apify scraper → GPT-4o extraction → Airtable CRM auto-population → Slack alert to recruiter with enriched profile. One click from LinkedIn to fully populated record.",
    tech_stack: ["Apify", "OpenAI GPT-4o", "Airtable API", "Make.com", "Slack"],
    hours_saved_per_week: 22,
    what_it_replaced: "Manual copy-paste that was killing recruiter morale",
    outcome_metric: "22 hours/week recovered. Placement velocity increased 40%.",
    time_to_build: "6 days",
  },
  {
    industry: "SaaS startup",
    company_size: "Founder + 2",
    problem_before:
      "Founder was personally answering the same 30 support questions over email, every week. Taking 3 hours daily away from building the product.",
    solution_built:
      "Voiceflow agent trained on docs + past tickets → embedded in product → handles Tier 1 support → escalates edge cases to Notion queue → weekly digest to founder.",
    tech_stack: ["Voiceflow", "Notion API", "OpenAI", "Intercom webhook", "Zapier"],
    hours_saved_per_week: 18,
    what_it_replaced: "The founder's inbox and sanity",
    outcome_metric: "78% of tickets resolved without human. Founder got evenings back.",
    time_to_build: "5 days",
  },
  {
    industry: "Real estate agency",
    company_size: "Solo agent + VA",
    problem_before:
      "Agent was spending 4 hours every Sunday building weekly market reports for her 200-person email list. Pulling data from 5 different portals manually.",
    solution_built:
      "Scraper pipeline pulls listing data from 5 sources → n8n aggregates and compares → GPT-4o writes the report in her voice → Beehiiv sends it automatically at 8am Sunday.",
    tech_stack: ["n8n", "Apify", "GPT-4o", "Beehiiv API", "Google Sheets"],
    hours_saved_per_week: 4,
    what_it_replaced: "Her entire Sunday morning ritual",
    outcome_metric: "4 hours back every week. List open rate went up because reports got more consistent.",
    time_to_build: "3 days",
  },
  {
    industry: "Marketing agency",
    company_size: "15-person agency",
    problem_before:
      "Account managers were building weekly client reports manually. Pulling from Google Ads, Meta Ads, GA4 — then formatting in slides. 3 hours per client per week. 8 clients.",
    solution_built:
      "Automated data pipeline: all ad platform APIs → normalized in Airtable → Google Slides template auto-populated → PDF exported → emailed to client before Monday 9am.",
    tech_stack: ["Google Ads API", "Meta Marketing API", "GA4 API", "Airtable", "Google Slides API", "n8n"],
    hours_saved_per_week: 24,
    what_it_replaced: "24 hours of account manager time every single week",
    outcome_metric: "Saved $3,200/month in labor. Reports now land at 8:59am every Monday without fail.",
    time_to_build: "8 days",
  },
];

export const AI_CONCEPTS_BANK = [
  "What an AI agent actually is vs what people think it is",
  "The difference between an LLM and an AI agent",
  "Why RAG matters for business owners who have internal docs",
  "What a webhook is and why it's the backbone of every automation",
  "The difference between Make, n8n, and Zapier — when to use which",
  "Why AI automation fails and what to do about it",
  "What prompt engineering actually means in a production system",
  "How to evaluate whether a workflow should be automated",
  "What an API is — explained for business owners, not developers",
  "The difference between a chatbot and an AI agent",
  "Why most AI automation projects die in month 2",
  "How to calculate the ROI of an AI system before you build it",
];

export const HOT_TAKES_BANK = [
  "Hiring a full-time ops manager before you've automated your ops is backwards",
  "Most businesses don't need AI — they need better systems first",
  "The cheapest AI tool is almost always the right choice",
  "AI agents don't replace employees — they replace the work employees hate doing",
  "If your process isn't documented, you can't automate it. That's the real problem.",
  "The founders who will dominate in 5 years are building AI infrastructure now, not later",
  "ChatGPT is not AI automation. It's a calculator with a chat interface.",
  "Your biggest competitor is not another company — it's the founder who automated what you're still doing manually",
  "Agencies charging $50k for AI consulting are mostly wrapping n8n workflows and reselling them",
  "The best AI system is the one that runs for 6 months without you touching it",
];

export const TOOL_DEEP_DIVES = [
  { name: "n8n", angle: "Why self-hosted n8n is better than Zapier for serious automation" },
  { name: "Voiceflow", angle: "How Voiceflow replaced an entire Tier 1 support team" },
  { name: "Langchain", angle: "When to use Langchain and when it's overkill" },
  { name: "Supabase", angle: "Why Supabase is the backend of choice for fast AI builds" },
  { name: "Apify", angle: "What Apify can scrape that no other tool can touch" },
  { name: "Make.com", angle: "Make vs n8n — the honest breakdown" },
  { name: "OpenAI API", angle: "Building with raw OpenAI API vs using wrappers" },
  { name: "Airtable", angle: "Using Airtable as a lightweight CRM for AI pipelines" },
];
