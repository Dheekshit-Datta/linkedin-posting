// ============================================================
// LINKEDIN ALGORITHM MASTERY SYSTEM
// ============================================================
// This is not a job file. This is the documented playbook of
// every LinkedIn algorithm signal that the system is designed
// around. Read this to understand WHY everything is timed and
// structured the way it is.
//
// Source: The Blueprint document + empirical LinkedIn data
// ============================================================

import type { AlgorithmSignal } from "../types/growth.js";

// ============================================================
// THE COMPLETE LINKEDIN ALGORITHM SIGNAL MAP
// ============================================================

export const ALGORITHM_SIGNALS: AlgorithmSignal[] = [
  {
    signal_type: "golden_window_comment",
    active: true,
    description: `
THE GOLDEN WINDOW (First 30 minutes after posting):
LinkedIn shows your post to a small test batch of your connections first.
If that test batch engages (reacts, comments, clicks "see more"), LinkedIn
infers the content is valuable and pushes it to a larger audience.
If the test batch scrolls past, LinkedIn buries the post.

HOW THE SYSTEM EXPLOITS THIS:
1. Pre-post engagement sprint (8:00 AM) warms up connections before post drops
2. Post publishes at 8:30 AM IST — peak LinkedIn morning traffic
3. World-building comments (0, 15, 30 min) inject engagement signals immediately
4. Post-post sprint (9:15 AM) continues engagement signal into the second wave

The algorithm reads: "This post got X comments in the first 30 min.
Push it to Y more people."
    `.trim(),
    expected_reach_multiplier: 3.5,
  },

  {
    signal_type: "dwell_time_hook",
    active: true,
    description: `
DWELL TIME (How long people read your post):
LinkedIn tracks how long someone's screen stays on your post.
A post that gets read to the end scores higher than one that's scrolled past.

HOW THE SYSTEM EXPLOITS THIS:
1. Hook engineer generates hooks that create pattern interrupts
2. F-shaped pattern structure (short lines, white space) makes posts
   physically easier to read than walls of text
3. Content formats (case study, before/after) have natural tension arcs
   that make people read to the end to find out the outcome
4. The "see more" cutoff is engineered: hook + first 2-3 lines must
   earn the click. If they click "see more," dwell time skyrockets.

LinkedIn reads: "People spent avg 45+ seconds on this post.
It must be valuable. Push it further."
    `.trim(),
    expected_reach_multiplier: 2.0,
  },

  {
    signal_type: "reciprocity_loop",
    active: true,
    description: `
RECIPROCITY LOOP (Engagement begets engagement):
When you leave a genuine comment on someone's post, they:
1. Get a notification
2. Click through to your profile (profile visit signal)
3. Often visit your most recent post
4. Often engage with it

This is why the engagement sprint runs BEFORE posting.
The people you engaged with at 8:00 AM are warmed up by 8:30 AM.
They're more likely to be the first commenters on your post.
First commenters are the ones who trigger the golden window.

COMPOUND EFFECT:
Day 1: 10 targeted comments. 2-3 people visit your profile.
Day 30: 300 targeted comments. You're on 50+ people's radar.
Day 90: 900 targeted comments. You're a fixture in their feed.
    `.trim(),
    expected_reach_multiplier: 2.5,
  },

  {
    signal_type: "follower_velocity",
    active: true,
    description: `
FOLLOWER VELOCITY (New follows in a short window):
When a post causes a spike in follows, LinkedIn interprets this as:
"This creator just got more valuable. Push their content more."

HOW TO MANUFACTURE FOLLOWER VELOCITY:
1. Case study and before/after posts consistently drive the most follows
   (people follow because they want to see more of this type of content)
2. Lead magnet posts (comment-gating) drive comments → algorithm push →
   new people see it → follow if it resonates
3. Halo-tier comments expose you to 20K+ accounts; even 0.5% following
   is 100 new followers from one comment on the right post

TARGET VELOCITY: 50+ new followers in 24 hours after a post
This triggers LinkedIn's "trending creator" signal.
    `.trim(),
    expected_reach_multiplier: 4.0,
  },

  {
    signal_type: "external_link_avoid",
    active: true,
    description: `
EXTERNAL LINK PENALTY (URLs kill reach):
LinkedIn penalises posts with external URLs in the body.
LinkedIn wants users to stay on LinkedIn, not click away.

HOW THE SYSTEM HANDLES THIS:
1. Voice writer is instructed: ZERO external links in post body
2. If a resource needs sharing, it goes in the FIRST COMMENT, not the post
3. Lead magnets: never put the link in the post. "DM me" or "comment X"
   to receive the resource forces engagement first, no link needed
4. CTA "you know where to find me" keeps people on LinkedIn profile

A post with a URL in the body can lose 50-70% of its reach.
This is non-negotiable.
    `.trim(),
    expected_reach_multiplier: 1.5, // Multiplier of avoiding the penalty
  },

  {
    signal_type: "hashtag_optimization",
    active: true,
    description: `
HASHTAG OPTIMIZATION (3-5 niche hashtags win):
LinkedIn hashtags work differently from Instagram or Twitter.

WHAT WORKS:
- 3-5 hashtags that match the content precisely
- Mix of niche (#AIAutomation, #OperationsManagement) and broad (#Founders)
- Always at the bottom — never in the post body

WHAT KILLS REACH:
- More than 8 hashtags (LinkedIn penalises hashtag stuffing)
- Generic hashtags (#Business, #LinkedIn, #Content)
- Hashtags that don't match the content (algorithm detects mismatch)

THE 8 HASHTAGS LINKEDIN LOVES (from the Blueprint):
#AI, #Productivity, #RemoteWork, #Mindset, #Leadership,
#Entrepreneurship, #Sales, #LinkedIn

FOR MARKITX specifically:
#AIAutomation, #OperationsManagement, #Founders, #BuildersOfLinkedIn,
#NoCode, #Automation, #StartupLife, #AIAgents, #SaaS, #B2BSales
    `.trim(),
    expected_reach_multiplier: 1.3,
  },

  {
    signal_type: "comment_depth",
    active: true,
    description: `
COMMENT DEPTH SIGNAL (Nested replies > top-level comments):
LinkedIn's algorithm assigns more weight to threaded conversations
than to standalone comments.

A post with 5 comments that generated 20 replies
scores higher than a post with 20 standalone comments.

HOW THE SYSTEM EXPLOITS THIS:
1. World-building Comment 3 (the question) is engineered to provoke replies
2. Replying to every external comment within 2 hours creates threads
3. Each reply notification brings the commenter back → they often
   reply again → the thread deepens → algorithm sees sustained activity

GOAL: Average 3+ replies per comment thread within 24 hours of posting.
This signals high-quality, genuine discussion — LinkedIn's holy grail.
    `.trim(),
    expected_reach_multiplier: 2.2,
  },

  {
    signal_type: "carousel_boost",
    active: false, // Not yet implemented — future feature
    description: `
CAROUSEL / DOCUMENT POST BOOST:
Multi-image posts (uploaded as PDFs on LinkedIn = "carousels") get
3-5x more reach than text posts on average.

WHY:
- Multiple swipes = high dwell time signal
- Each swipe is tracked as individual engagement
- They stand out visually in a text-heavy feed

HOW TO ADD THIS:
1. Convert 1 post per week into a carousel (5-10 slides)
2. Formats that work best as carousels:
   - "12 Processes to Automate" → 1 slide per process
   - Case study → problem slide, solution slide, outcome slide
   - Tech breakdown → 1 tool per slide
3. Build slides in Figma, Canva, or generate via code
4. Export as PDF and upload to LinkedIn

TO ACTIVATE: Set active: true and add carousel generation to the pipeline
    `.trim(),
    expected_reach_multiplier: 4.0,
  },

  {
    signal_type: "poll_reach",
    active: false, // Optional — use monthly
    description: `
POLL POSTS (Easy engagement, algorithmic boost):
LinkedIn polls are pushed by the algorithm because they require
active engagement (clicking an option) rather than passive scrolling.

USE CASE FOR MARKITX:
Monthly poll post like:
"What's the biggest operational bottleneck in your business right now?"
[ ] Manual reporting
[ ] Lead follow-up
[ ] Document processing
[ ] Internal data entry

WHY: Every vote is an engagement signal. Every voter is a potential lead.
Vote results also give Dheekshit real data on what to write about.

FREQUENCY: Monthly maximum. Do not overuse — polls feel low-effort if
every third post is a poll.
    `.trim(),
    expected_reach_multiplier: 2.8,
  },
];

// ============================================================
// OPTIMAL POSTING TIMES (IST — Hyderabad)
// ============================================================

export const OPTIMAL_POSTING_TIMES = {
  // Primary: highest LinkedIn activity for Indian + global audience
  primary: "8:30 AM IST", // cron: "30 3 * * *"

  // Secondary: afternoon peak (for content that underperformed in morning)
  secondary: "12:30 PM IST", // cron: "0 7 * * *"

  // Weekend: lower volume but less competition
  weekend: "10:00 AM IST", // cron: "30 4 * * 6,0"

  // NEVER post between: 11 PM - 6 AM IST (dead zone)
  dead_zones: ["11:00 PM - 6:00 AM IST", "1:00 PM - 3:00 PM IST (post-lunch dip)"],
};

// ============================================================
// THE 60-DAY GROWTH TRAJECTORY
// Expected outcomes if every job runs correctly
// ============================================================

export const GROWTH_TRAJECTORY = {
  days_1_to_14: {
    description: "Foundation phase. Consistency establishes the feed pattern.",
    expected_impressions_per_post: "200-800",
    expected_follower_growth: "20-50 new followers/week",
    key_actions: [
      "Every daily post must publish on time",
      "Engagement sprint must run daily",
      "World-building comments must go out within 30 min of each post",
    ],
  },
  days_15_to_30: {
    description: "Momentum phase. Algorithm starts recognizing the account.",
    expected_impressions_per_post: "800-3,000",
    expected_follower_growth: "80-150 new followers/week",
    key_actions: [
      "First lead magnet post should run by Day 21",
      "Cold outreach sequences should be active for 10+ prospects",
      "Analytics agent should identify the top-performing format — double down on it",
    ],
  },
  days_31_to_60: {
    description: "Compounding phase. Each post reaches more because of follower base.",
    expected_impressions_per_post: "3,000-15,000",
    expected_follower_growth: "200-400 new followers/week",
    key_actions: [
      "One viral post (10K+ impressions) is likely in this window — capitalize on it",
      "Inbound DMs should be coming in regularly — respond within 2 hours",
      "Consider adding carousel posts for the week's best-performing topic",
    ],
  },
  day_60_milestone: {
    description: "Target state after 60 days of the system running correctly.",
    followers: "500-1,500 new followers gained",
    impressions: "5,000-20,000 per post",
    inbound_leads: "10-25 warm leads",
    qualified_conversations: "3-8 active sales conversations",
    expected_revenue_pipeline: "$30K-$150K depending on deal size",
  },
};

// ============================================================
// CONTENT ROTATION RULE
// Prevent the algorithm from pattern-matching your content
// as repetitive (which reduces reach over time)
// ============================================================

export const CONTENT_ROTATION_RULES = {
  never_same_format_twice_in_row: true,
  case_study_max_per_week: 2,
  hot_take_max_per_week: 1,
  credibility_min_per_week: 2, // Minimum 30% credibility content
  lead_magnet_frequency: "weekly", // Every Friday
  poll_frequency: "monthly",
  carousel_frequency: "biweekly", // When implemented
};
