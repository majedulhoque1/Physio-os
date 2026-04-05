import { Outlet, useLocation } from "react-router-dom";
import { getRouteMeta } from "@/lib/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground lg:h-screen">
      <Sidebar />

      <div className="flex min-h-screen flex-col lg:ml-60 lg:h-screen">
        <Header breadcrumbs={routeMeta.breadcrumbs} title={routeMeta.title} />

        <main className="flex-1 overflow-y-auto bg-background px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:px-6">
          <div className="mx-auto w-full max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
