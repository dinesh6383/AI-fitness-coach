import type { ReactNode } from "react";

type Props = { title: string; right?: ReactNode };

/** Small uppercase heading that sits above a group of cards. */
export default function SectionLabel({ title, right }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      {right}
    </div>
  );
}
