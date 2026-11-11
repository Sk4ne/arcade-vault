import { connection } from "next/server";

type HealthResponse =
  { ok: true } | { ok: false; error: "missing_env" | "unreachable" };

const TIMEOUT_MS = 5000;

function json(body: HealthResponse, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  // With cacheComponents, a GET that touches no runtime data is prerendered
  // at build time. Force request-time execution on every call.
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return json({ ok: false, error: "missing_env" }, 503);
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return res.ok
      ? json({ ok: true }, 200)
      : json({ ok: false, error: "unreachable" }, 503);
  } catch {
    // Never leak URL, key or internal error messages.
    return json({ ok: false, error: "unreachable" }, 503);
  }
}
