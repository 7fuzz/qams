import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TestCaseModel } from '@/models/TestCase';
import { ProjectModel } from '@/models/Project';
import { logActivity } from '@/lib/logger';
import { canManageProject } from '@/lib/auth-utils';

export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');

    try {
        const scenarios = await TestCaseModel.findScenarios(moduleId || undefined);
        return NextResponse.json(scenarios);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { module_id, name } = await request.json();
        
        // Check project access
        const projectId = await ProjectModel.getProjectIdFromModule(module_id);
        if (!projectId) return NextResponse.json({ error: "Module not found" }, { status: 404 });
        
        if (!await canManageProject(session, projectId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const scenarioId = await TestCaseModel.createScenario(module_id, name);
        
        await logActivity(session.user_id, 'CREATE', 'SCENARIO', scenarioId, { name, module_id });
        
        return NextResponse.json({ scenario_id: scenarioId, module_id, name });
    } catch {
        return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { scenario_id, name } = await request.json();
        
        // Check project access
        const projectId = await ProjectModel.getProjectIdFromScenario(scenario_id);
        if (!projectId) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
        
        if (!await canManageProject(session, projectId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await TestCaseModel.updateScenario(scenario_id, name);
        await logActivity(session.user_id, 'UPDATE', 'SCENARIO', scenario_id, { name });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    try {
        // Check project access
        const projectId = await ProjectModel.getProjectIdFromScenario(id);
        if (!projectId) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
        
        if (!await canManageProject(session, projectId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await TestCaseModel.deleteScenario(id);
        await logActivity(session.user_id, 'DELETE', 'SCENARIO', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
    }
}
