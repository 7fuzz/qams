import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get('releaseId');

    try {
        if (!releaseId) return NextResponse.json([]);

        const changes = db.prepare(`
            SELECT 
                rc.*,
                (SELECT GROUP_CONCAT(m.name, '||') FROM release_change_modules rcm JOIN modules m ON rcm.module_id = m.module_id WHERE rcm.change_id = rc.change_id) as module_names,
                (SELECT GROUP_CONCAT(m.module_id, '||') FROM release_change_modules rcm WHERE rcm.change_id = rc.change_id) as module_ids,
                (SELECT GROUP_CONCAT(i.title, '||') FROM release_change_issues rci JOIN issues i ON rci.issue_id = i.issue_id WHERE rci.change_id = rc.change_id) as issue_titles,
                (SELECT GROUP_CONCAT(i.issue_id, '||') FROM release_change_issues rci WHERE rci.change_id = rc.change_id) as issue_ids
            FROM release_changes rc
            WHERE rc.release_id = ?
            ORDER BY rc.created_at ASC
        `).all(releaseId);

        // Parse the concatenated strings into arrays
        const formattedChanges = changes.map((c: any) => ({
            ...c,
            module_names: c.module_names ? c.module_names.split('||') : [],
            module_ids: c.module_ids ? c.module_ids.split('||') : [],
            issue_titles: c.issue_titles ? c.issue_titles.split('||') : [],
            issue_ids: c.issue_ids ? c.issue_ids.split('||') : []
        }));

        return NextResponse.json(formattedChanges);
    } catch (error) {
        console.error('Fetch Changes Error:', error);
        return NextResponse.json({ error: 'Failed to fetch release changes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { release_id, module_ids, type, title, description, issue_ids } = await request.json();
        const changeId = generateId();
        
        const transaction = db.transaction(() => {
            db.prepare(`
                INSERT INTO release_changes (change_id, release_id, type, title, description)
                VALUES (?, ?, ?, ?, ?)
            `).run(changeId, release_id, type, title, description || null);

            if (module_ids && Array.isArray(module_ids)) {
                const insertModule = db.prepare('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)');
                module_ids.forEach(id => insertModule.run(changeId, id));
            }

            if (issue_ids && Array.isArray(issue_ids)) {
                const insertIssue = db.prepare('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)');
                issue_ids.forEach(id => insertIssue.run(changeId, id));
            }
        });

        transaction();
        
        return NextResponse.json({ change_id: changeId, title });
    } catch (error) {
        console.error('POST Change Error:', error);
        return NextResponse.json({ error: 'Failed to add change' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { change_id, module_ids, type, title, description, issue_ids } = await request.json();
        
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE release_changes 
                SET type = ?, title = ?, description = ?
                WHERE change_id = ?
            `).run(type, title, description || null, change_id);

            // Sync Modules
            db.prepare('DELETE FROM release_change_modules WHERE change_id = ?').run(change_id);
            if (module_ids && Array.isArray(module_ids)) {
                const insertModule = db.prepare('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)');
                module_ids.forEach(id => insertModule.run(change_id, id));
            }

            // Sync Issues
            db.prepare('DELETE FROM release_change_issues WHERE change_id = ?').run(change_id);
            if (issue_ids && Array.isArray(issue_ids)) {
                const insertIssue = db.prepare('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)');
                issue_ids.forEach(id => insertIssue.run(change_id, id));
            }
        });

        transaction();
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT Change Error:', error);
        return NextResponse.json({ error: 'Failed to update change' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM release_changes WHERE change_id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete change' }, { status: 500 });
    }
}
