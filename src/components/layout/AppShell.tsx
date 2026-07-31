import { useState, type ReactNode } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "./Sidebar";
import { useTheme } from "@/store/theme";

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 right-0 hidden w-64 border-l border-sidebar-border lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:mr-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="القائمة">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <SheetTitle className="sr-only">القائمة الجانبية</SheetTitle>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight md:text-xl">{title}</h1>
            {description ? (
              <p className="text-xs text-muted-foreground md:text-sm">{description}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <Button variant="outline" size="icon" onClick={toggle} aria-label="تبديل الوضع الليلي">
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}