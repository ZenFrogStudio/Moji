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

// Rate limit config per endpoint
const RATE_LIMITS = {
  activate:              { limit: 10, windowMinutes: 15 },
  deactivate:            { limit: 10, windowMinutes: 60 },
  "lookup-by-transaction": { limit: 10, windowMinutes: 15 },
};

// ─── Route handler ───────────────────────────────────────────────
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://lucidiancreative.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const endpoint = url.pathname.split("/").pop() as keyof typeof RATE_LIMITS;
  const body = await req.json();

  try {
    // Rate limit check — keyed by IP for activate/lookup, by license_key for deactivate
    const rl = RATE_LIMITS[endpoint];
    if (rl) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
      const rlKey = endpoint === "deactivate" ? (body.license_key ?? ip) : ip;

      const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
        p_key: rlKey,
        p_endpoint: endpoint,
        p_limit: rl.limit,
        p_window_minutes: rl.windowMinutes,
      });

      if (rlError) {
        console.error("Rate limit check error:", rlError);
        // Fail open — don't block legitimate users if the check itself errors
      } else if (!allowed) {
        return json({ error: "Too many requests. Please wait before trying again." }, 429);
      }
    }

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
async function activate(body: { license_key?: string; device_fingerprint?: string }) {
  const { license_key, device_fingerprint } = body;

  if (!license_key || !device_fingerprint) {
    return json({ error: "license_key and device_fingerprint are required" }, 400);
  }

  // 1. Look up the license
  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("id, is_active, max_active_devices")
    .eq("license_key", license_key)
    .single();

  if (licenseError || !license) {
    return json({ valid: false, error: "Invalid license key" }, 404);
  }

  if (!license.is_active) {
    return json({ valid: false, error: "License has been revoked" }, 403);
  }

  // 2. Check if this device is already active on this license
  const { data: existing } = await supabase
    .from("activations")
    .select("id")
    .eq("license_id", license.id)
    .eq("device_fingerprint", device_fingerprint)
    .is("deactivated_at", null)
    .single();

  if (existing) {
    return json({ valid: true, message: "Device already activated" });
  }

  // 3. Count current active devices
  const { count } = await supabase
    .from("activations")
    .select("id", { count: "exact", head: true })
    .eq("license_id", license.id)
    .is("deactivated_at", null);

  const maxDevices = license.max_active_devices ?? MAX_ACTIVE_DEVICES;

  if ((count ?? 0) >= maxDevices) {
    return json({
      valid: false,
      error: `Device limit reached (${maxDevices}). Deactivate a device to free a slot.`,
      active_devices: count,
      max_devices: maxDevices,
    }, 403);
  }

  // 4. Activate this device
  const { error: insertError } = await supabase
    .from("activations")
    .insert({
      license_id: license.id,
      device_fingerprint: device_fingerprint,
    });

  if (insertError) {
    console.error("Activation insert error:", insertError);
    return json({ error: "Failed to activate device" }, 500);
  }

  return json({
    valid: true,
    message: "Device activated",
    active_devices: (count ?? 0) + 1,
    max_devices: maxDevices,
  });
}

// ─── Lookup by Session ────────────────────────────────────────────
// Called by the post-purchase success page
// Returns the license key for a given Stripe checkout session ID
// Expects: { session_id: string }
async function lookupByTransaction(body: { session_id?: string }) {
  const { session_id } = body;

  if (!session_id) {
    return json({ error: "session_id is required" }, 400);
  }

  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("license_key")
    .eq("stripe_checkout_session_id", session_id)
    .single();

  if (licenseError || !license) {
    return json({ error: "No license found for this session. Please allow a moment for your purchase to process and try again." }, 404);
  }

  return json({ license_key: license.license_key });
}

// ─── Deactivate ──────────────────────────────────────────────────
// Called when user wants to free up a device slot
// Expects: { license_key: string, device_fingerprint: string }
async function deactivate(body: { license_key?: string; device_fingerprint?: string }) {
  const { license_key, device_fingerprint } = body;

  if (!license_key || !device_fingerprint) {
    return json({ error: "license_key and device_fingerprint are required" }, 400);
  }

  // 1. Look up the license
  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("id")
    .eq("license_key", license_key)
    .single();

  if (licenseError || !license) {
    return json({ error: "Invalid license key" }, 404);
  }

  // 2. Find and deactivate
  const { data: updated, error: updateError } = await supabase
    .from("activations")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("license_id", license.id)
    .eq("device_fingerprint", device_fingerprint)
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

// ─── Helper ──────────────────────────────────────────────────────
function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://lucidiancreative.com",
    },
  });
}
