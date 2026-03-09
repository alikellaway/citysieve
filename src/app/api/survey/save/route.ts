import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Reject payloads whose JSON-serialised state exceeds this byte limit. */
const MAX_STATE_BYTES = 64 * 1024; // 64 KB — generous for survey state
const MAX_LABEL_LENGTH = 200;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { state, label } = body;

  if (!state || typeof state !== 'object') {
    return NextResponse.json({ error: 'Missing survey state' }, { status: 400 });
  }

  const serialised = JSON.stringify(state);
  if (serialised.length > MAX_STATE_BYTES) {
    return NextResponse.json({ error: 'Survey state too large' }, { status: 413 });
  }

  const safeLabel = typeof label === 'string'
    ? label.slice(0, MAX_LABEL_LENGTH)
    : 'Untitled Survey';

  const saved = await prisma.savedSurvey.create({
    data: {
      userId: session.user.id,
      label: safeLabel || 'Untitled Survey',
      state: serialised,
    },
  });

  return NextResponse.json({ id: saved.id });
}
