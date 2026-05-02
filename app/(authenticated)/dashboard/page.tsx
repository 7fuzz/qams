import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { ActivityLog } from "@/components/grids/ActivityLog";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-8 flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of testing activities and system status.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Projects</CardTitle>
            <CardDescription>Active projects in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Registered team members</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Actions in the last 24h</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Live</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Track who modified what and when.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLog />
        </CardContent>
      </Card>
    </div>
  );
}
