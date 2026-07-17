import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:5000';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin      = searchParams.get('origin');
  const destination = searchParams.get('destination');

  if (!origin || !destination) {
    return NextResponse.json(
      { success: false, error: 'origin and destination are required' },
      { status: 400 }
    );
  }

  const qs = new URLSearchParams({ origin, destination, maxChanges: '1' });

  try {
    const res = await fetch(`${BACKEND}/api/routes/find?${qs}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
