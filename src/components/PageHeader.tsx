import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="flex items-start sm:items-center gap-4 mb-8 min-w-0">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground mt-1 sm:mt-0" />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm sm:text-base text-muted-foreground mt-1 font-medium break-words">{subtitle}</p>}
      </div>
    </div>
  );
}
