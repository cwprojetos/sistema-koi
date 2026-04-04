import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-base text-muted-foreground mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
