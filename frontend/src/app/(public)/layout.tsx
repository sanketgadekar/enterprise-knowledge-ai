import { Logo } from "@/components/layout/logo";
import { Database, MessagesSquare, ShieldCheck } from "lucide-react";

const points = [
  { icon: Database, title: "Your documents, your answers", text: "Upload company documents and ask questions grounded in them." },
  { icon: ShieldCheck, title: "Built for multi-tenant isolation", text: "Every request is authorised by the backend for your company." },
  { icon: MessagesSquare, title: "Conversations you can return to", text: "Pick up earlier chat sessions whenever you need them." },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-navy p-10 text-white lg:flex">
        <Logo />
        <div className="max-w-md space-y-8">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Answers from your company&apos;s own knowledge.
          </h2>
          <ul className="space-y-5">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-2 text-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">© Enterprise Knowledge AI</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo light={false} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
