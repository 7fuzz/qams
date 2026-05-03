export type Permission = 
    | 'users:manage' 
    | 'roles:manage' 
    | 'projects:write' 
    | 'projects:read' 
    | 'tests:write' 
    | 'tests:run' 
    | 'issues:manage' 
    | 'logs:read';

export function hasPermission(userPermissions: string[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
}

export function canAccess(pathname: string, method: string, userPermissions: string[]): boolean {
    // 1. Admin/User Management
    if (pathname.startsWith('/admin/users') || pathname.startsWith('/api/users')) {
        return userPermissions.includes('users:manage');
    }

    if (pathname.startsWith('/admin/roles') || pathname.startsWith('/api/roles')) {
        return userPermissions.includes('roles:manage');
    }

    // 2. Logs
    if (pathname.startsWith('/api/logs')) {
        return userPermissions.includes('logs:read');
    }

    // 3. Projects/Modules/Scenarios
    if (pathname.startsWith('/api/projects') || pathname.startsWith('/api/modules') || pathname.startsWith('/api/scenarios')) {
        if (method !== 'GET') {
            return userPermissions.includes('projects:write');
        }
        return userPermissions.includes('projects:read');
    }

    // Default allow for other authenticated routes
    return true; 
}
