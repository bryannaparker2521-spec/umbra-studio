import { supabase } from "./supabase";

export const UMBRA_CLOUD_URL =
  "https://umbra-studio-cloud.bryannaparker2521-d60.workers.dev";


export interface UmbraCloudMediaUploadResponse {
  ok: true;
  key: string;
  url: string;
  size: number;
  contentType: string;
}

async function getUmbraCloudAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) {
    throw new Error("You must be signed in to use Umbra Studio Cloud.");
  }
  return session.access_token;
}

export async function uploadUmbraCloudMedia(
  file: File,
  category: string,
  ownerId?: string,
): Promise<UmbraCloudMediaUploadResponse> {
  const token = await getUmbraCloudAccessToken();
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (ownerId) form.append("ownerId", ownerId);

  const response = await fetch(`${UMBRA_CLOUD_URL}/api/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body && typeof body.error === "string"
        ? body.error
        : `Umbra Studio media upload failed (${response.status}).`,
    );
  }
  return body as UmbraCloudMediaUploadResponse;
}

export async function umbraCloudFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error("You must be signed in to use Umbra Studio Cloud.");
  }

  const response = await fetch(
    `${UMBRA_CLOUD_URL}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(init.headers ?? {}),
      },
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Umbra Studio Cloud request failed (${response.status}).`;

    throw new Error(message);
  }

  return body as T;
}

export interface UmbraCloudUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: "primary_admin" | "admin" | "editor";
}

export interface UmbraCloudMeResponse {
  ok: true;
  user: UmbraCloudUser;
}

export async function getUmbraCloudUser(): Promise<UmbraCloudUser> {
  const response =
    await umbraCloudFetch<UmbraCloudMeResponse>("/api/me");

  return response.user;
}