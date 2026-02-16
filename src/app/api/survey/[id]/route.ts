import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const survey = await prisma.savedSurvey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...survey,
    state: JSON.parse(survey.state),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const survey = await prisma.savedSurvey.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.savedSurvey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
