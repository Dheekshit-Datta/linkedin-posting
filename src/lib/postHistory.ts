// ============================================================
// POST HISTORY TRACKER
// ============================================================
// Keeps a record of recent posts so the strategist agent can
// avoid repeating the same angles, topics, or formats.
// Uses a simple JSON file on disk in local dev.
// In production on Trigger.dev, use an external store like
// Upstash Redis or Supabase for persistence.
// ============================================================

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { GeneratedPost } from "../types/index.js";

const HISTORY_DIR = join(process.cwd(), ".markitx-data");
const HISTORY_FILE = join(HISTORY_DIR, "post-history.json");
const MAX_HISTORY = 30; // Keep last 30 posts

interface PostHistoryEntry {
  id: string;
  created_at: string;
  format: string;
  category: string;
  hook: string;
  core_angle_summary: string;
}

async function ensureHistoryDir(): Promise<void> {
  if (!existsSync(HISTORY_DIR)) {
    await mkdir(HISTORY_DIR, { recursive: true });
  }
}

export async function loadPostHistory(): Promise<PostHistoryEntry[]> {
  await ensureHistoryDir();

  try {
    const raw = await readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as PostHistoryEntry[];
  } catch {
    // File doesn't exist yet — return empty history
    return [];
  }
}

export async function savePostToHistory(
  post: GeneratedPost,
  coreAngle: string
): Promise<void> {
  await ensureHistoryDir();

  const history = await loadPostHistory();

  const entry: PostHistoryEntry = {
    id: post.id,
    created_at: post.created_at,
    format: post.format,
    category: post.category,
    hook: post.hook,
    core_angle_summary: coreAngle,
  };

  const updated = [entry, ...history].slice(0, MAX_HISTORY);
  await writeFile(HISTORY_FILE, JSON.stringify(updated, null, 2), "utf-8");
}

export async function getRecentPostSummaries(limit = 7): Promise<string[]> {
  const history = await loadPostHistory();
  return history.slice(0, limit).map(
    (h) =>
      `[${h.created_at.slice(0, 10)}] Format: ${h.format} | Hook: "${h.hook.slice(0, 60)}..." | Angle: ${h.core_angle_summary}`
  );
}

// ============================================================
// UPSTASH REDIS ADAPTER
// ============================================================
// Use this instead of the file-based adapter in Trigger.dev
// production. Trigger.dev's serverless environment does not
// have persistent local file system between runs.
//
// Setup:
// 1. Create a free Upstash Redis database at upstash.com
// 2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
//    in your Trigger.dev environment variables
// 3. npm install @upstash/redis
// 4. Replace the functions above with these:
//
// import { Redis } from "@upstash/redis";
//
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// });
//
// const HISTORY_KEY = "markitx:post-history";
//
// export async function loadPostHistory(): Promise<PostHistoryEntry[]> {
//   const data = await redis.get<PostHistoryEntry[]>(HISTORY_KEY);
//   return data ?? [];
// }
//
// export async function savePostToHistory(post, coreAngle) {
//   const history = await loadPostHistory();
//   const entry = { ...buildEntry(post, coreAngle) };
//   const updated = [entry, ...history].slice(0, MAX_HISTORY);
//   await redis.set(HISTORY_KEY, updated);
// }
//
// export async function getRecentPostSummaries(limit = 7) {
//   const history = await loadPostHistory();
//   return history.slice(0, limit).map(formatSummary);
// }
// ============================================================
