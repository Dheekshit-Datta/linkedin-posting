// ============================================================
// MARKITX LINKEDIN AUTOMATION — GEMINI IMAGE GENERATION
// ============================================================
// Uses Google Gemini 2.5 Flash Image (Nano Banana) via the
// Gemini API. Requires GOOGLE_API_KEY from Google AI Studio.
// Free tier: 500 requests/day, 1024x1024, 10+ aspect ratios.
// ============================================================

import { GoogleGenAI } from "@google/genai";
import type { ImagePromptResult } from "../agents/imagePromptAgent.js";

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_API_KEY not set in environment variables");
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export interface GeminiImageOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3" | "21:9" | "5:4" | "4:5";
  stylePreset?: "minimal_dark" | "clean_white" | "data_visual" | "text_dominant";
}

const STYLE_MODIFIERS: Record<string, string> = {
  minimal_dark: "minimalist, dark background #0a0a0a, clean technical aesthetic, high contrast, professional LinkedIn post image",
  clean_white: "clean white background, infographic style, minimal flat design, professional, high resolution",
  data_visual: "dark background with glowing data visualization elements, charts, flow diagrams, technical schematic, professional",
  text_dominant: "typographic design, large bold text, minimal visual elements, high impact statement, professional LinkedIn post",
};

const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1376, height: 768 },
  "9:16": { width: 768, height: 1376 },
  "4:3": { width: 1200, height: 896 },
  "3:4": { width: 896, height: 1200 },
  "3:2": { width: 1264, height: 848 },
  "2:3": { width: 848, height: 1264 },
  "21:9": { width: 1584, height: 672 },
  "5:4": { width: 1152, height: 928 },
  "4:5": { width: 928, height: 1152 },
};

const DEFAULT_NEGATIVE = "people, humans, faces, hands, text, watermark, signature, logo, blurry, low quality, distorted, ugly, amateur, cartoon, illustration, 3d render, neon, cyberpunk, sci-fi, robot, ai brain, glowing brain";

export async function generateGeminiImage(options: GeminiImageOptions): Promise<Buffer> {
  const client = getGeminiClient();

  const styleMod = STYLE_MODIFIERS[options.stylePreset ?? "minimal_dark"] ?? "";
  const negativePrompt = options.negativePrompt ?? DEFAULT_NEGATIVE;
  const aspect = options.aspectRatio ?? "16:9";
  const { width, height } = ASPECT_RATIO_MAP[aspect] ?? ASPECT_RATIO_MAP["16:9"];

  // Build the full prompt with style and negative guidance
  const fullPrompt = `${options.prompt}. ${styleMod}. Professional quality, 1200x627 LinkedIn post format. No text, no watermarks, no people.`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: [{ text: fullPrompt }],
    config: {
      responseModalities: ["IMAGE"],
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    },
  });

  // Extract image from response
  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      // Convert base64 to Buffer
      const base64Data = part.inlineData.data;
      const buffer = Buffer.from(base64Data, "base64");
      return buffer;
    }
  }

  throw new Error("No image data returned from Gemini API");
}

// Helper to map imagePromptAgent result to Gemini options
export function mapImagePromptToGeminiOptions(result: ImagePromptResult): GeminiImageOptions {
  const aspectRatioMap: Record<string, GeminiImageOptions["aspectRatio"]> = {
    minimal_dark: "16:9",
    clean_white: "16:9",
    data_visual: "16:9",
    text_dominant: "16:9",
  };

  return {
    prompt: result.stable_diffusion_prompt,
    negativePrompt: result.negative_prompt,
    aspectRatio: aspectRatioMap[result.style_preset] ?? "16:9",
    stylePreset: result.style_preset,
  };
}