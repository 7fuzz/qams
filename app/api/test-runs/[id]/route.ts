import { NextResponse } from 'next/server';
import { TestRunModel } from '@/models/TestRun';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const run = await TestRunModel.findById(id);
        if (!run) {
            return NextResponse.json({ error: 'Test run not found' }, { status: 404 });
        }
        return NextResponse.json(run);
    } catch (error) {
        console.error('Fetch Test Run Error:', error);
        return NextResponse.json({ error: 'Failed to fetch test run' }, { status: 500 });
    }
}
