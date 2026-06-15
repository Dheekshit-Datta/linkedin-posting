// ============================================================
// MARKITX LINKEDIN AUTOMATION — TYPE DEFINITIONS
// ============================================================

export type PostCategory = "client_magnet" | "credibility";

export type PostFormat =
  | "case_study"        // Real client problem → system built → outcome
  | "before_after"      // What life was like before vs after the agent
  | "tech_breakdown"    // How a specific system was wired together
  | "what_we_built"     // Launch post for a new agent
  | "problem_story"     // Story-first post that names a specific pain
  | "numbers_post"      // Specific hours saved, revenue impacted, tasks automated
  | "concept_explainer" // What is X and why does it matter
  | "tool_breakdown"    // Deep dive on one tool: n8n, Voiceflow, Langchain etc
  | "myth_busting"      // "Everyone says X. Here's why that's wrong."
  | "hot_take";         // Contrarian opinion post that builds authority

export type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface PostScheduleSlot {
  day: WeekDay;
  category: PostCategory;
  format: PostFormat;
  topic_hint?: string;
}

export interface GeneratedPost {
  id: string;
  created_at: string;
  category: PostCategory;
  format: PostFormat;
  hook: string;
  body: string;
  cta: string;
  full_text: string;
  char_count: number;
  image_prompt: string;
  hashtags: string[];
  estimated_reach_tier: "standard" | "high" | "viral_potential";
  quality_score: number; // 0-100 scored by the QA agent
  quality_notes: string;
  approved: boolean;
}

export interface ClientStory {
  industry: string;
  company_size: string;
  problem_before: string;
  solution_built: string;
  tech_stack: string[];
  hours_saved_per_week: number;
  what_it_replaced: string;
  outcome_metric: string;
  time_to_build: string;
}

export interface PostContext {
  client_story?: ClientStory;
  topic?: string;
  tool_name?: string;
  concept?: string;
  hot_take_angle?: string;
  numbers?: {
    hours_saved?: number;
    tasks_automated?: number;
    revenue_impact?: string;
    time_to_build?: string;
  };
}

export interface LinkedInPostPayload {
  author: string; // LinkedIn URN: urn:li:person:XXXX
  commentary: string;
  visibility: "PUBLIC" | "CONNECTIONS";
  distribution: {
    feedDistribution: "MAIN_FEED";
    targetEntities: [];
    thirdPartyDistributionChannels: [];
  };
  content?: {
    media?: {
      title: string;
      id: string; // Asset URN after image upload
    };
  };
  lifecycleState: "PUBLISHED";
  isReshareDisabledByAuthor: false;
}

export interface ImageGenerationRequest {
  post_text: string;
  post_format: PostFormat;
  image_prompt: string;
  style: "minimal_dark" | "clean_white" | "data_visual" | "text_dominant";
}

export interface QAResult {
  approved: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  voice_match: number;    // 0-100 how well it sounds like Dheekshit
  hook_strength: number;  // 0-100
  specificity: number;    // 0-100 — does it have real numbers/stack names/details
  cta_quality: number;    // 0-100
}

export interface AutomationRunLog {
  run_id: string;
  triggered_at: string;
  schedule_slot: PostScheduleSlot;
  post_generated: GeneratedPost | null;
  linkedin_post_id: string | null;
  image_uploaded: boolean;
  error: string | null;
  retries: number;
  total_duration_ms: number;
}

export interface EnvConfig {
  MISTRAL_API_KEY: string;
  LINKEDIN_ACCESS_TOKEN: string;
  LINKEDIN_PERSON_URN: string;
  GOOGLE_API_KEY?: string; // Optional — for Gemini 2.5 Flash Image generation
  WEBHOOK_NOTIFY_URL?: string; // Optional — Slack/Discord notification on post
}
