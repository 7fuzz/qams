import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, SessionData } from "@/lib/session";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] overflow-hidden bg-surface-muted">
      <Sidebar userRole={session.role} userPermissions={session.permissions} />
      <div className="flex flex-1 flex-col overflow-hidden" style={{ marginLeft: "var(--app-sidebar-width, 16rem)" }}>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
