// Legacy Paddle webhook endpoint.
//
// Moji Pro now provisions licenses through Stripe. This disabled handler keeps
// accidental deployments from writing to the removed Paddle transaction column
// or logging generated license keys.

Deno.serve((_req) => {
  return json(
    {
      error: "Paddle checkout is no longer supported. Use the Stripe webhook endpoint.",
    },
    410,
  );
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
