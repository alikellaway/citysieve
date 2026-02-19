import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailOptIn: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ emailOptIn: user.emailOptIn });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { emailOptIn } = body;

  if (typeof emailOptIn !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailOptIn },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return NextResponse.json({ success: true });
}
