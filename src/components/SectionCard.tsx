import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: LucideIcon;
  title: string;
  tag: string;
  tagTone?: "muted" | "mint";
  children: ReactNode;
};

export default function SectionCard({
  icon: Icon,
  title,
  tag,
  tagTone = "muted",
  children,
}: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icon size={16} className="text-brand-soft" />
          {title}
        </h2>
        <span
          className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
            tagTone === "mint"
              ? "bg-mint/15 text-mint"
              : "bg-line text-zinc-400"
          }`}
        >
          {tag}
        </span>
      </div>
      {children}
    </section>
  );
}
