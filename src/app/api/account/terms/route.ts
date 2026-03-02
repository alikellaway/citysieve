import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TERMS_VERSION } from '@/lib/terms-version';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsVersion: true, termsAcceptedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    accepted: user.termsVersion === TERMS_VERSION,
    termsVersion: user.termsVersion,
    termsAcceptedAt: user.termsAcceptedAt,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { termsVersion } = body;

  if (typeof termsVersion !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      termsVersion,
      termsAcceptedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
