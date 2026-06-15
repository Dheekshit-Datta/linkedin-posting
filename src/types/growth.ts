// ============================================================
// MARKITX GROWTH SYSTEM — EXTENDED TYPE DEFINITIONS
// ============================================================
// These types cover the full growth layer:
// engagement sprints, cold outreach, comment automation,
// follower targeting, lead scoring, and algorithm mastery.
// ============================================================

// ============================================================
// ENGAGEMENT SPRINT TYPES
// ============================================================

export type FollowerTier = "peer" | "steps_ahead" | "halo";
// peer = 0-5K followers (high reciprocity, day-one supporters)
// steps_ahead = 5K-20K (where Dheekshit wants to be)
// halo = 20K+ (borrowed status, massive reach exposure)

export type CommentIntent =
  | "insight_add"       // Adds a genuine insight to their post
  | "contrarian_agree"  // Partially disagrees, adds nuance
  | "experience_share"  // Shares a related real experience
  | "question_ask"      // Asks a smart question that prompts reply
  | "mic_drop"          // Short, punchy, high-confidence take
  | "validation_plus";  // Validates + adds something new on top

export interface EngagementTarget {
  profile_url: string;
  name: string;
  follower_tier: FollowerTier;
  niche: string;
  recent_post_url: string;
  recent_post_summary: string;
  comment_intent: CommentIntent;
}

export interface GeneratedComment {
  target: EngagementTarget;
  comment_text: string;
  char_count: number;
  expected_reply_probability: "low" | "medium" | "high";
  strategic_value: string;
}

export interface EngagementSprintResult {
  sprint_id: string;
  triggered_at: string;
  phase: "pre_post" | "post_post";
  targets_processed: number;
  comments_generated: GeneratedComment[];
  total_duration_ms: number;
}

// ============================================================
// COLD OUTREACH TYPES
// ============================================================

export type ProspectIndustry =
  | "saas"
  | "marketing_agency"
  | "law_firm"
  | "financial_services"
  | "consulting"
  | "ecommerce"
  | "real_estate"
  | "healthcare_admin"
  | "recruitment"
  | "b2b_services";

export type OutreachStage =
  | "connection_request"    // Step 1: Connect with a note
  | "value_follow_up"       // Step 2: Send value (3 days after connect)
  | "soft_pitch"            // Step 3: Soft offer (5 days after value)
  | "breakup"               // Step 4: Final message (7 days after soft pitch)
  | "nurture";              // Ongoing: monthly touchpoint for warm leads

export interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: ProspectIndustry;
  company_size: string;
  pain_signals: string[];     // Signals from their posts/activity that indicate pain
  linkedin_url: string;
  connected_at?: string;
  stage: OutreachStage;
  last_message_at?: string;
  replied: boolean;
  reply_sentiment?: "positive" | "neutral" | "negative";
  converted_to_lead: boolean;
  notes: string;
}

export interface OutreachMessage {
  prospect: Prospect;
  stage: OutreachStage;
  message_text: string;
  char_count: number;
  personalization_score: number; // 0-100 — how specific is this to them
  send_at: string;               // ISO timestamp of when to send
}

export interface OutreachSequenceResult {
  prospect_id: string;
  sequence_id: string;
  stage: OutreachStage;
  message: OutreachMessage;
  generated_at: string;
}

// ============================================================
// LEAD MAGNET / VIRAL MECHANIC TYPES
// ============================================================

export type LeadMagnetFormat =
  | "pdf_checklist"
  | "notion_template"
  | "loom_breakdown"
  | "resource_list"
  | "mini_audit"
  | "roi_calculator";

export interface LeadMagnetPost {
  trigger_phrase: string;       // "Comment 'AUDIT' to get the free AI audit"
  magnet_description: string;   // What they get
  magnet_format: LeadMagnetFormat;
  post_body: string;            // The full post text
  follow_up_dm: string;         // Auto DM after they comment
  expected_comment_rate: "medium" | "high" | "very_high";
}

// ============================================================
// 3+1 WORLD BUILDING COMMENT TYPES
// ============================================================

export interface WorldBuildingComments {
  post_id: string;              // The post just published
  comment_1_bts: string;        // Behind the scenes photo caption + context
  comment_2_tip: string;        // Extra tactical tip not in the post
  comment_3_question: string;   // Direct question to audience to drive replies
  timing_minutes: [0, 15, 30]; // Drop at 0, 15, 30 min after post
}

// ============================================================
// FOLLOWER GROWTH ANALYTICS TYPES
// ============================================================

export interface GrowthMetrics {
  week_number: number;
  followers_start: number;
  followers_end: number;
  net_new_followers: number;
  impressions_total: number;
  engagement_rate: number;
  top_performing_post_id: string;
  top_performing_post_format: string;
  inbound_dms: number;
  qualified_leads: number;
  conversion_rate: number;
  best_posting_time: string;
  worst_performing_format: string;
  recommended_adjustments: string[];
}

// ============================================================
// ALGORITHM OPTIMIZATION TYPES
// ============================================================

export interface AlgorithmSignal {
  signal_type:
    | "golden_window_comment"  // Comment on your own post in first 30 min
    | "dwell_time_hook"        // Hook engineered for maximum dwell time
    | "reciprocity_loop"       // Engage others right before posting
    | "follower_velocity"      // Getting follows in short burst after post
    | "external_link_avoid"    // Never put URLs in the post body
    | "hashtag_optimization"   // 3-5 niche hashtags, not generic
    | "carousel_boost"         // Multi-image posts get 3x more reach
    | "poll_reach"             // Polls get pushed to feed algorithmically
    | "comment_depth";         // Nested replies signal high-quality content

  active: boolean;
  description: string;
  expected_reach_multiplier: number;
}

// ============================================================
// FULL GROWTH RUN LOG
// ============================================================

export interface GrowthRunLog {
  run_id: string;
  date: string;
  jobs_completed: string[];
  engagement_sprint_result?: EngagementSprintResult;
  outreach_messages_sent: number;
  world_building_comments_posted: number;
  errors: string[];
  total_duration_ms: number;
}
