// ============================================================
// AGENT 5: IMAGE PROMPT GENERATOR
// ============================================================
// Generates a Stable Diffusion / SDXL prompt for the post image.
// Also generates a text-overlay card (for cases where SD is not
// set up — a clean text card can be generated in Node and posted).
//
// Model: mistral-small-latest (fast + cheap — image prompts don't
// need the big model)
// Temperature: 0.8
// Called: In parallel with the voice writer, after the brief
// ============================================================

import { completeJSON } from "../lib/mistral.js";
import type { CreativeBrief } from "./contentStrategist.js";
import type { PostFormat } from "../types/index.js";

export interface ImagePromptResult {
  stable_diffusion_prompt: string;
  negative_prompt: string;
  style_preset: "minimal_dark" | "clean_white" | "data_visual" | "text_dominant";
  suggested_text_overlay: string;
  fallback_card_config: TextCardConfig;
}

export interface TextCardConfig {
  background_color: "#0a0a0a" | "#ffffff" | "#0f172a" | "#1e293b";
  text_color: "#ffffff" | "#0a0a0a" | "#94a3b8";
  accent_color: "#6366f1" | "#10b981" | "#f59e0b" | "#3b82f6";
  headline: string;
  subline: string;
  stat_highlight?: string;
  brand_tag: "markitx.ai";
  font_style: "mono" | "sans";
}

const IMAGE_PROMPT_SYSTEM = `
You are an art director creating image prompts for LinkedIn posts by an AI automation agency called Markitx.

The visual style of Markitx is: minimal, technical, dark backgrounds, clean typography, data-visualization aesthetics. Think Figma meets command-line. Not corporate stock photos. Not generic AI imagery (no robot hands typing, no glowing brains). Real-world technical aesthetics.

For each post, you generate:
1. A Stable Diffusion prompt that creates a visual matching the post content
2. A negative prompt to avoid bad outputs
3. A text card config as a fallback (used if SD is not set up)

STYLE PRESETS:
- minimal_dark: Dark background (#0a0a0a), minimal design, single focused element. For case studies and outcome posts.
- clean_white: White background, clean lines, infographic-style. For concept explainers and tool breakdowns.
- data_visual: Dark background with glowing data visualization elements, charts, flow diagrams. For numbers posts and tech breakdowns.
- text_dominant: Almost entirely typographic. A powerful line from the post, displayed large. For hot takes and bold statements.

SD PROMPT RULES:
- Never include people unless specifically needed. Focus on systems, interfaces, screens, data.
- Always include: "professional, clean, minimalist, LinkedIn post image, high resolution, 1200x627"
- Never include: "robot," "AI brain," "futuristic," "neon," "cyberpunk," "sci-fi," "3D rendered humanoid"
- Do include: "terminal interface," "workflow diagram," "clean data dashboard," "minimal flat design," "technical schematic"

TEXT CARD RULES:
- headline: The single most powerful line from the post (max 8 words)
- subline: The supporting context line (max 12 words)
- stat_highlight: If the post has a key number, pull it out here (e.g., "14 hrs/week saved")
- brand_tag: Always "markitx.ai"
- font_style: "mono" for technical posts, "sans" for concept posts

Return JSON.
`.trim();

export async function runImagePromptAgent(brief: CreativeBrief): Promise<ImagePromptResult> {
  const formatStyleMap: Record<PostFormat, ImagePromptResult["style_preset"]> = {
    case_study: "minimal_dark",
    before_after: "minimal_dark",
    tech_breakdown: "data_visual",
    what_we_built: "data_visual",
    problem_story: "minimal_dark",
    numbers_post: "data_visual",
    concept_explainer: "clean_white",
    tool_breakdown: "clean_white",
    myth_busting: "text_dominant",
    hot_take: "text_dominant",
  };

  const style = formatStyleMap[brief.post_format as PostFormat] ?? "minimal_dark";

  const userPrompt = `
CREATE IMAGE ASSETS FOR THIS POST:

Post format: ${brief.post_format}
Core angle: ${brief.core_angle}
Key specifics: ${brief.key_specifics.join(", ")}
Emotional arc: ${brief.emotional_arc}
Suggested style: ${style}

${brief.context.client_story ? `
Client industry: ${brief.context.client_story.industry}
Key outcome: ${brief.context.client_story.outcome_metric}
Hours saved: ${brief.context.client_story.hours_saved_per_week}/week
Tech stack: ${brief.context.client_story.tech_stack.join(", ")}
` : ""}
${brief.context.numbers ? `Numbers to highlight: ${JSON.stringify(brief.context.numbers)}` : ""}
${brief.context.tool_name ? `Tool focus: ${brief.context.tool_name}` : ""}
${brief.context.hot_take_angle ? `Hot take: ${brief.context.hot_take_angle}` : ""}

Generate the image prompt result as JSON.
`.trim();

  return await completeJSON<ImagePromptResult>({
    system: IMAGE_PROMPT_SYSTEM,
    user: userPrompt,
    model: "mistral-small-latest",
    temperature: 0.8,
    max_tokens: 800,
    json_mode: true,
  });
}

// ============================================================
// TEXT CARD GENERATOR
// ============================================================
// Generates a PNG Buffer of a clean text card using pure Node.js
// canvas (via the 'canvas' npm package). This is the fallback
// when Stable Diffusion is not configured.
// The canvas package must be installed: npm install canvas
// ============================================================

export async function generateTextCardBuffer(
  config: TextCardConfig
): Promise<Buffer> {
  // Dynamic import so the package is optional
  const { createCanvas } = await import("canvas").catch(() => {
    throw new Error(
      "The 'canvas' package is required for text card generation. Run: npm install canvas"
    );
  });

  const WIDTH = 1200;
  const HEIGHT = 627;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = config.background_color;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Accent bar (left edge)
  ctx.fillStyle = config.accent_color;
  ctx.fillRect(0, 0, 6, HEIGHT);

  const isLight = config.background_color === "#ffffff";

  // Stat highlight (if present) — large number center top
  if (config.stat_highlight) {
    ctx.font = config.font_style === "mono"
      ? "bold 96px 'Courier New'"
      : "bold 96px 'Arial'";
    ctx.fillStyle = config.accent_color;
    ctx.textAlign = "left";
    ctx.fillText(config.stat_highlight, 80, 220);
  }

  // Headline
  ctx.font = config.font_style === "mono"
    ? "bold 52px 'Courier New'"
    : "bold 52px 'Arial'";
  ctx.fillStyle = config.text_color;
  ctx.textAlign = "left";

  // Wrap headline text
  const headlineY = config.stat_highlight ? 310 : 240;
  wrapText(ctx, config.headline, 80, headlineY, WIDTH - 160, 64);

  // Subline
  ctx.font = config.font_style === "mono"
    ? "24px 'Courier New'"
    : "24px 'Arial'";
  ctx.fillStyle = isLight ? "#64748b" : "#94a3b8";
  wrapText(ctx, config.subline, 80, headlineY + 150, WIDTH - 160, 34);

  // Brand tag (bottom right)
  ctx.font = config.font_style === "mono"
    ? "20px 'Courier New'"
    : "20px 'Arial'";
  ctx.fillStyle = config.accent_color;
  ctx.textAlign = "right";
  ctx.fillText(config.brand_tag, WIDTH - 60, HEIGHT - 40);

  return canvas.toBuffer("image/png");
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, y);
      line = word + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}
