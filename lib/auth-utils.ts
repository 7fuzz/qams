import { SessionData } from "./session";
import { ProjectModel } from "@/models/Project";

/**
 * Checks if a user has permission to manage a project.
 * Returns true if the user has the 'projects:manage_all' permission
 * OR if the user is explicitly assigned to the project (including lead developer).
 */
export async function canManageProject(session: SessionData, projectId: string): Promise<boolean> {
    if (!session.isLoggedIn) return false;
    
    // Admins or users with global project management permission
    if (session.permissions.includes('projects:manage_all')) {
        return true;
    }
    
    // Check project-specific assignment
    return await ProjectModel.isUserAssigned(projectId, session.user_id);
}
