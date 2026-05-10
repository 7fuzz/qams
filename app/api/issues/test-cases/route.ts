import { NextResponse } from 'next/server';
import { IssueModel } from '@/models/Issue';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        const testCases = await IssueModel.getTestCases(id);
        return NextResponse.json(testCases);
    } catch (error) {
        console.error('Fetch Issue Test Cases Error:', error);
        return NextResponse.json({ error: 'Failed to fetch test cases' }, { status: 500 });
    }
}
