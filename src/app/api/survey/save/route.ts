import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { state, label } = body;

  if (!state) {
    return NextResponse.json({ error: 'Missing survey state' }, { status: 400 });
  }

  const saved = await prisma.savedSurvey.create({
    data: {
      userId: session.user.id,
      label: label || 'Untitled Survey',
      state: JSON.stringify(state),
    },
  });

  return NextResponse.json({ id: saved.id });
}
