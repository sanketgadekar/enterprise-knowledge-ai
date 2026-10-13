import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} role="img" aria-label="Enterprise Knowledge AI logo">
      <rect width="32" height="32" rx="8" fill="hsl(142 72% 29%)" />
      <g stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M16 8.5v15M16 16 9.5 12M16 16l6.5-4M16 16l-6.5 4.5M16 16l6.5 4.5" opacity=".85" />
      </g>
      <g fill="white">
        <circle cx="16" cy="8.5" r="2.2" />
        <circle cx="9.5" cy="12" r="2" />
        <circle cx="22.5" cy="12" r="2" />
        <circle cx="9.5" cy="20.5" r="2" />
        <circle cx="22.5" cy="20.5" r="2" />
        <circle cx="16" cy="23.5" r="2.2" />
      </g>
    </svg>
  );
}

export function Logo({ className, light = true }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <p className={cn("text-sm font-semibold", light ? "text-white" : "text-foreground")}>Enterprise</p>
        <p className={cn("text-xs font-medium", light ? "text-accent" : "text-primary")}>Knowledge AI</p>
      </div>
    </div>
  );
}
