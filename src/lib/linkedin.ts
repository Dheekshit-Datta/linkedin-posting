// ============================================================
// MARKITX LINKEDIN AUTOMATION — LINKEDIN API CLIENT
// ============================================================
// Uses LinkedIn's UGC Posts API v2 to publish posts.
// Handles text posts and image posts (with asset upload).
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api

import axios, { AxiosError } from "axios";
import type { LinkedInPostPayload } from "../types/index.js";

const LI_API_BASE = "https://api.linkedin.com/v2";

// ============================================================
// TEXT POST — posts plain text with no image
// ============================================================

export async function publishTextPost(params: {
  text: string;
  accessToken: string;
  personUrn: string;
}): Promise<string> {
  const { text, accessToken, personUrn } = params;

  const payload: LinkedInPostPayload = {
    author: personUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  try {
    const response = await axios.post(`${LI_API_BASE}/ugcPosts`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202406",
      },
    });

    // LinkedIn returns the post ID in the x-restli-id header
    const postId =
      response.headers["x-restli-id"] ||
      response.data?.id ||
      "unknown";

    return String(postId);
  } catch (err) {
    const error = err as AxiosError;
    const detail = JSON.stringify(error.response?.data ?? error.message);
    throw new Error(`LinkedIn text post failed: ${detail}`);
  }
}

// ============================================================
// IMAGE UPLOAD STEP 1 — register the image asset with LinkedIn
// Returns an asset URN and upload URL
// ============================================================

async function registerImageUpload(params: {
  accessToken: string;
  personUrn: string;
}): Promise<{ uploadUrl: string; assetUrn: string }> {
  const { accessToken, personUrn } = params;

  const payload = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: personUrn,
      serviceRelationships: [
        {
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        },
      ],
    },
  };

  const response = await axios.post(
    `${LI_API_BASE}/assets?action=registerUpload`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  const value = response.data?.value;
  const uploadUrl =
    value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
      ?.uploadUrl;
  const assetUrn = value?.asset;

  if (!uploadUrl || !assetUrn) {
    throw new Error("LinkedIn image registration failed — missing uploadUrl or assetUrn");
  }

  return { uploadUrl, assetUrn };
}

// ============================================================
// IMAGE UPLOAD STEP 2 — upload the image binary to LinkedIn's CDN
// ============================================================

async function uploadImageBinary(params: {
  uploadUrl: string;
  imageBuffer: Buffer;
  accessToken: string;
}): Promise<void> {
  const { uploadUrl, imageBuffer, accessToken } = params;

  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/png",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

// ============================================================
// IMAGE POST — uploads image then posts with it
// imageBuffer should be a PNG or JPEG Buffer
// ============================================================

export async function publishImagePost(params: {
  text: string;
  imageBuffer: Buffer;
  imageTitle: string;
  accessToken: string;
  personUrn: string;
}): Promise<string> {
  const { text, imageBuffer, imageTitle, accessToken, personUrn } = params;

  // Step 1: Register the upload
  const { uploadUrl, assetUrn } = await registerImageUpload({ accessToken, personUrn });

  // Step 2: Upload the image binary
  await uploadImageBinary({ uploadUrl, imageBuffer, accessToken });

  // Step 3: Publish the post with the asset
  const payload = {
    author: personUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        title: imageTitle,
        id: assetUrn,
      },
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  try {
    const response = await axios.post(`${LI_API_BASE}/ugcPosts`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202406",
      },
    });

    const postId =
      response.headers["x-restli-id"] ||
      response.data?.id ||
      "unknown";

    return String(postId);
  } catch (err) {
    const error = err as AxiosError;
    const detail = JSON.stringify(error.response?.data ?? error.message);
    throw new Error(`LinkedIn image post failed: ${detail}`);
  }
}

// ============================================================
// TOKEN VALIDATION — verify the access token is still valid
// Call this at the start of each job run
// ============================================================

export async function validateLinkedInToken(accessToken: string): Promise<boolean> {
  try {
    const response = await axios.get(`${LI_API_BASE}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

// ============================================================
// GET PROFILE URN — fetch your URN if you don't have it yet
// One-time utility. Run this manually if needed.
// ============================================================

export async function getProfileUrn(accessToken: string): Promise<string> {
  const response = await axios.get(`${LI_API_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const sub = response.data?.sub;
  if (!sub) throw new Error("Could not retrieve LinkedIn profile URN");
  return `urn:li:person:${sub}`;
}
