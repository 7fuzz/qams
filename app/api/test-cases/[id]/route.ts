import { NextResponse } from 'next/server';
import { TestCaseModel } from '@/models/TestCase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    try {
        const testCase = await TestCaseModel.findById(id);
        if (!testCase) {
            return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
        }
        return NextResponse.json(testCase);
    } catch (error) {
        console.error('Fetch Test Case Error:', error);
        return NextResponse.json({ error: 'Failed to fetch test case' }, { status: 500 });
    }
}
