import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { ShortcutsDialog } from "@/components/common/ShortcutsDialog";
import { useOrgSync } from "@/lib/store";

export function AppLayout() {
  useOrgSync();
  return (
    <div className="flex h-screen w-full bg-background mesh-bg overflow-hidden">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <ShortcutsDialog />
    </div>
  );
}
