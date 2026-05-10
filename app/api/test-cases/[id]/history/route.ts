import { NextResponse } from 'next/server';
import { TestRunModel } from '@/models/TestRun';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    try {
        const history = await TestRunModel.findExecutionHistory(id);
        return NextResponse.json(history);
    } catch (error) {
        console.error('Fetch Test Case History Error:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
