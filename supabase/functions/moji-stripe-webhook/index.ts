// Moji Stripe Webhook Handler
// Receives checkout.session.completed events from Stripe
// Generates a license key and stores it in the database
// Deploy: supabase functions deploy moji-stripe-webhook

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const stripe = new Stripe(STRIPE_SECRET_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1. Get the raw body and Stripe signature header
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return json({ error: "Missing stripe-signature header" }, 401);
  }

  // 2. Verify the webhook signature
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return json({ error: "Invalid signature" }, 401);
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge but ignore other event types
    return json({ message: "Event type ignored" });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Only handle one-time payment sessions
  if (session.mode !== "payment") {
    return json({ message: "Session mode ignored" });
  }

  try {
    const sessionId = session.id;
    const customerEmail = session.customer_details?.email ?? "unknown@email.com";

    // 3. Check for duplicate — don't create a second license for the same session
    const { data: existing } = await supabase
      .from("licenses")
      .select("id, license_key")
      .eq("stripe_checkout_session_id", sessionId)
      .single();

    if (existing) {
      console.log(`Session already processed: ${sessionId}`);
      return json({ message: "Session already processed", license_key: existing.license_key });
    }

    // 4. Generate a unique license key
    const licenseKey = generateLicenseKey();

    // 5. Insert into the database
    const { error: insertError } = await supabase
      .from("licenses")
      .insert({
        license_key: licenseKey,
        customer_email: customerEmail,
        stripe_checkout_session_id: sessionId,
      });

    if (insertError) {
      console.error("License insert error:", insertError);
      return json({ error: "Failed to create license" }, 500);
    }

    console.log(`License created for ${customerEmail} (session: ${sessionId})`);

    return json({ message: "License created", license_key: licenseKey });

  } catch (err) {
    console.error("Webhook processing error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

// ─── License Key Generation ─────────────────────────────────────
// Format: MOJI-XXXX-XXXX-XXXX-XXXX (20 chars, uppercase alphanumeric)
function generateLicenseKey(): string {
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
