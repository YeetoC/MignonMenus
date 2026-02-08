import { MenusSidebar } from "@/components/dashboard/menus-sidebar";
import { MenusHeader } from "@/components/dashboard/menus-header";
import { MenusContent } from "@/components/dashboard/menus-content";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function BookmarksPage() {
  return (
    <SidebarProvider className="bg-sidebar">
      <MenusSidebar />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col items-center justify-start bg-container h-full w-full bg-background">
          <MenusHeader />
          <MenusContent />
        </div>
      </div>
    </SidebarProvider>
  );
}

