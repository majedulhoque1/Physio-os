import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getRouteMeta } from "@/lib/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TrialBanner } from "@/components/shared/TrialBanner";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";

export function AppShell() {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground lg:h-screen">
      <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />

      <div
        className={`flex min-h-screen flex-col lg:h-screen transition-all duration-200 ease-out ${
          isExpanded ? "lg:ml-60" : "lg:ml-[68px]"
        }`}
      >
        <Header breadcrumbs={routeMeta.breadcrumbs} title={routeMeta.title} />

        <main className="flex-1 overflow-y-auto bg-background px-4 py-5 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 lg:pb-6 lg:px-8">
          <div className="page-enter mx-auto w-full max-w-[1280px]" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
      <TrialBanner />
      <SubscriptionGate />
    </div>
  );
}
