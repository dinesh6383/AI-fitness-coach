import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  step: number;
  total: number;
  onBack: () => void;
};

export default function Header({ title, step, total, onBack }: Props) {
  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-white focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-mint">
          {title}
        </p>
        <p className="text-lg font-bold leading-tight">
          Step {step} Of {total}
        </p>
      </div>

      {/* Spacer keeps the title centred */}
      <div className="size-11" aria-hidden />
    </header>
  );
}
