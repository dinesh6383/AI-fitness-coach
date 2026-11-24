type Props = { step: number; total: number };

export default function SegmentedProgress({ step, total }: Props) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      className="flex gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i < step ? "bg-mint" : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}
