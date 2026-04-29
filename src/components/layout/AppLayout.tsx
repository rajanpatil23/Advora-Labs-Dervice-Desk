import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { ShortcutsDialog } from "@/components/common/ShortcutsDialog";
import { CommandPalette } from "@/components/common/CommandPalette";
import { useOrgSync } from "@/lib/store";

export function AppLayout() {
  useOrgSync();
  return (
    <div className="flex h-screen w-full bg-background mesh-bg overflow-hidden">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <ShortcutsDialog />
      <CommandPalette />
    </div>
  );
}
