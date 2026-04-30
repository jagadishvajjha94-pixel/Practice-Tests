import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Payments are disabled. The platform is free for all students.' },
    { status: 410 }
  );
}
