// Moji Paddle Webhook Handler
// Receives transaction.completed events from Paddle
// Generates a license key and stores it in the database
// Deploy: supabase functions deploy moji-paddle-webhook

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET")!;
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const PADDLE_API_BASE = "https://api.paddle.com";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1. Get the raw body and Paddle signature header
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  if (!signature) {
    return json({ error: "Missing Paddle-Signature header" }, 401);
  }

  // 2. Verify the webhook signature
  const isValid = await verifySignature(rawBody, signature);
  if (!isValid) {
    return json({ error: "Invalid signature" }, 401);
  }

  // 3. Parse the event
  const event = JSON.parse(rawBody);

  if (event.event_type !== "transaction.completed") {
    // Acknowledge but ignore other event types
    return json({ message: "Event type ignored" });
  }

  try {
    // 4. Get customer email — fetch from Paddle API using customer_id
    const customerId = event.data?.customer_id;
    const customerEmail = await getCustomerEmail(customerId);

    const transactionId = event.data?.id || "unknown";

    // 5. Check for duplicate — don't create a second license for the same transaction
    const { data: existing } = await supabase
      .from("licenses")
      .select("id, license_key")
      .eq("paddle_transaction_id", transactionId)
      .single();

    if (existing) {
      // Already processed this transaction
      return json({ message: "Transaction already processed", license_key: existing.license_key });
    }

    // 6. Generate a unique license key
    const licenseKey = await generateLicenseKey();

    // 7. Insert into the database
    const { error: insertError } = await supabase
      .from("licenses")
      .insert({
        license_key: licenseKey,
        customer_email: customerEmail,
        paddle_transaction_id: transactionId,
      });

    if (insertError) {
      console.error("License insert error:", insertError);
      return json({ error: "Failed to create license" }, 500);
    }

    console.log(`License created: ${licenseKey} for ${customerEmail} (txn: ${transactionId})`);

    return json({ message: "License created", license_key: licenseKey });

  } catch (err) {
    console.error("Webhook processing error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

// ─── Signature Verification ──────────────────────────────────────
// Paddle signs webhooks with HMAC-SHA256
// Header format: ts=TIMESTAMP;h1=HASH
async function verifySignature(rawBody: string, signatureHeader: string): Promise<boolean> {
  try {
    // Parse ts and h1 from the header
    const parts: Record<string, string> = {};
    for (const part of signatureHeader.split(";")) {
      const [key, value] = part.split("=");
      parts[key] = value;
    }

    const ts = parts["ts"];
    const h1 = parts["h1"];

    if (!ts || !h1) return false;

    // Build the signed payload: timestamp:rawBody
    const signedPayload = `${ts}:${rawBody}`;

    // Compute HMAC-SHA256
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PADDLE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload)
    );

    const computed = new TextDecoder().decode(hexEncode(new Uint8Array(mac)));

    // Constant-time comparison
    if (computed.length !== h1.length) return false;

    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ h1.charCodeAt(i);
    }

    return mismatch === 0;

  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

// ─── Fetch Customer Email from Paddle API ────────────────────────
async function getCustomerEmail(customerId: string | undefined): Promise<string> {
  if (!customerId) return "unknown@email.com";

  try {
    const res = await fetch(`${PADDLE_API_BASE}/customers/${customerId}`, {
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(`Paddle API error: ${res.status} for customer ${customerId}`);
      return "unknown@email.com";
    }

    const data = await res.json();
    return data?.data?.email || "unknown@email.com";

  } catch (err) {
    console.error("Failed to fetch customer email:", err);
    return "unknown@email.com";
  }
}

// ─── License Key Generation ─────────────────────────────────────
// Format: MOJI-XXXX-XXXX-XXXX-XXXX (20 chars, uppercase alphanumeric)
async function generateLicenseKey(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let key = "";

  for (let i = 0; i < 16; i++) {
    key += chars[bytes[i] % chars.length];
  }

  return `MOJI-${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}`;
}

// ─── Helper ─────────────────────────────────────────────────────
function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
