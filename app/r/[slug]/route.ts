import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!baseUrl || !publishableKey) {
    return NextResponse.json({ error: "Tracking is not configured." }, { status: 503 });
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/rpc/tm_resolve_tracked_link`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_slug: slug }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const destination: unknown = await response.json();
    if (typeof destination !== "string") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const target = new URL(destination);
    if (!["http:", "https:"].includes(target.protocol)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
