import { NextResponse } from "next/server";

import { fetchPostsCursor } from "@/lib/actions/thread.actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limitParam = Number(url.searchParams.get("limit") ?? 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 10;

    const data = await fetchPostsCursor({
      pageSize: Math.min(limit, 25),
      cursor,
    });

    return NextResponse.json(
      {
        posts: data.posts,
        nextCursor: data.nextCursor,
        hasNext: data.hasNext,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to load feed" },
      { status: 500 }
    );
  }
}
