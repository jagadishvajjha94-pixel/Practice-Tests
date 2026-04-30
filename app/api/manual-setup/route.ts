import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Manual setup started');

    // Initialize database
    const initUrl = new URL('/api/setup/init-direct', request.url);
    const initResponse = await fetch(initUrl.toString(), { method: 'POST' });
    const initData = await initResponse.json();
    console.log('[v0] Init response:', initData);

    if (!initResponse.ok) {
      return NextResponse.json({
        success: false,
        step: 'initialization',
        error: initData.error || 'Database initialization failed'
      }, { status: 400 });
    }

    // Seed database
    const seedUrl = new URL('/api/setup/seed-direct', request.url);
    const seedResponse = await fetch(seedUrl.toString(), { method: 'POST' });
    const seedData = await seedResponse.json();
    console.log('[v0] Seed response:', seedData);

    if (!seedResponse.ok) {
      return NextResponse.json({
        success: false,
        step: 'seeding',
        error: seedData.error || 'Database seeding failed'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup complete',
      initialization: initData,
      seeding: seedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[v0] Manual setup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed'
    }, { status: 500 });
  }
}
