// Moji License Validation Edge Function
// Supabase Edge Functions run on Deno
// Deploy: supabase functions deploy moji-license

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Service role client — bypasses RLS
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MAX_ACTIVE_DEVICES = 5;
const LICENSE_KEY_FORMAT = /^MOJI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
const MAX_DEVICE_FINGERPRINT_LENGTH = 200;
const MAX_TRANSACTION_ID_LENGTH = 200;

// Rate limits per endpoint: [max requests, window in minutes]
const RATE_LIMITS: Record<string, [number, number]> = {
  "activate":              [20, 5],   // 20 attempts per 5 min (VS Code startup calls this)
  "deactivate":            [10, 5],   // 10 per 5 min
  "lookup-by-transaction": [10, 5],   // 10 per 5 min
};

// ─── Route handler ───────────────────────────────────────────────
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const endpoint = url.pathname.split("/").pop() || "";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_err) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Rate limit check
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";

  const limits = RATE_LIMITS[endpoint];
  if (limits) {
    const allowed = await checkRateLimit(ip, endpoint, limits[0], limits[1]);
    if (!allowed) {
      return json({ error: "Too many requests. Please try again later." }, 429);
    }
  }

  try {
    switch (endpoint) {
      case "activate":
        return await activate(body);
      case "deactivate":
        return await deactivate(body);
      case "lookup-by-transaction":
        return await lookupByTransaction(body);
      default:
        return json({ error: "Unknown action. Use /activate, /deactivate, or /lookup-by-transaction" }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
});

// ─── Activate ────────────────────────────────────────────────────
// Called by Moji on VS Code startup
// Expects: { license_key: string, device_fingerprint: string }
async function activate(body: { license_key?: unknown; device_fingerprint?: unknown }) {
  const { license_key, device_fingerprint } = body;

  if (
    typeof license_key !== "string" ||
    license_key.trim().length === 0 ||
    typeof device_fingerprint !== "string" ||
    device_fingerprint.trim().length === 0
  ) {
    return json({ error: "license_key and device_fingerprint are required" }, 400);
  }

  const licenseKey = license_key.trim();
  const deviceFingerprint = device_fingerprint.trim();

  if (!LICENSE_KEY_FORMAT.test(licenseKey)) {
    return json({ valid: false, error: "Invalid license key format" }, 400);
  }

  if (deviceFingerprint.length > MAX_DEVICE_FINGERPRINT_LENGTH) {
    return json({ error: "device_fingerprint is too long" }, 400);
  }

  const { data: activationResult, error: activationError } = await supabase
    .rpc("activate_license_device", {
      p_license_key: licenseKey,
      p_device_fingerprint: deviceFingerprint,
      p_default_max_devices: MAX_ACTIVE_DEVICES,
    });

  if (activationError) {
    console.error("License activation RPC error:", activationError);
    return json({ error: "Failed to activate device" }, 500);
  }

  if (!activationResult || typeof activationResult !== "object" || Array.isArray(activationResult)) {
    return json({ error: "Invalid activation response" }, 500);
  }

  const activationPayload = activationResult as Record<string, unknown>;
  const status = typeof activationPayload.status === "number" ? activationPayload.status : 200;
  const { status: _status, ...responseBody } = activationPayload;

  return json(responseBody, status);
}

// ─── Lookup by Transaction ────────────────────────────────────────
// Called by the post-purchase success page
// Returns the license key for a given Stripe Checkout Session ID
// Expects: { transaction_id: string }
async function lookupByTransaction(body: { transaction_id?: unknown }) {
  const { transaction_id } = body;

  if (typeof transaction_id !== "string" || transaction_id.trim().length === 0) {
    return json({ error: "transaction_id is required" }, 400);
  }

  const transactionId = transaction_id.trim();

  if (transactionId.length > MAX_TRANSACTION_ID_LENGTH) {
    return json({ error: "transaction_id is too long" }, 400);
  }

  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("license_key")
    .eq("stripe_checkout_session_id", transactionId)
    .single();

  if (licenseError || !license) {
    return json({ error: "No license found for this transaction. Please allow a moment for your purchase to process and try again." }, 404);
  }

  return json({ license_key: license.license_key });
}

// ─── Deactivate ──────────────────────────────────────────────────
// Called when user wants to free up a device slot
// Expects: { license_key: string, device_fingerprint: string }
async function deactivate(body: { license_key?: unknown; device_fingerprint?: unknown }) {
  const { license_key, device_fingerprint } = body;

  if (
    typeof license_key !== "string" ||
    license_key.trim().length === 0 ||
    typeof device_fingerprint !== "string" ||
    device_fingerprint.trim().length === 0
  ) {
    return json({ error: "license_key and device_fingerprint are required" }, 400);
  }

  const licenseKey = license_key.trim();
  const deviceFingerprint = device_fingerprint.trim();

  if (!LICENSE_KEY_FORMAT.test(licenseKey)) {
    return json({ error: "Invalid license key format" }, 400);
  }

  if (deviceFingerprint.length > MAX_DEVICE_FINGERPRINT_LENGTH) {
    return json({ error: "device_fingerprint is too long" }, 400);
  }

  // 1. Look up the license
  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("id")
    .eq("license_key", licenseKey)
    .single();

  if (licenseError || !license) {
    return json({ error: "Invalid license key" }, 404);
  }

  // 2. Find and deactivate
  const { data: updated, error: updateError } = await supabase
    .from("activations")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("license_id", license.id)
    .eq("device_fingerprint", deviceFingerprint)
    .is("deactivated_at", null)
    .select("id");

  if (updateError) {
    console.error("Deactivation error:", updateError);
    return json({ error: "Failed to deactivate device" }, 500);
  }

  if (!updated || updated.length === 0) {
    return json({ error: "No active activation found for this device" }, 404);
  }

  return json({ message: "Device deactivated" });
}

// ─── Rate Limiting ──────────────────────────────────────────────
async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: ip,
      p_endpoint: endpoint,
      p_limit: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      return true; // Fail open — don't block legitimate users if rate limiter breaks
    }

    return data === true;
  } catch (err) {
    console.error("Rate limit exception:", err);
    return true; // Fail open
  }
}

// ─── Helper ──────────────────────────────────────────────────────
function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
