import { Dumbbell, Sparkles, Soup, User, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

type IconProps = { size?: number; className?: string };

/** Zig-zag trend line with a magnifier, matching the Progress icon in the design. */
function ProgressIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <polyline points="3 17 8 10 12 14 16 6 19 9" />
      <circle cx="17" cy="16" r="3" />
      <line x1="19.2" y1="18.2" x2="22" y2="21" />
    </svg>
  );
}

type Tab = {
  to: string;
  label: string;
  icon: LucideIcon | ((props: IconProps) => React.JSX.Element);
};

const TABS: Tab[] = [
  { to: "/today", label: "Today", icon: Sparkles },
  { to: "/tracks", label: "Tracks", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: ProgressIcon },
  { to: "/diet", label: "Diet", icon: Soup },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    // The wrapper lets taps pass through the gaps around the floating bar
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Primary"
        className="pointer-events-auto rounded-full border border-line bg-surface/95 p-2 shadow-2xl shadow-black/60 backdrop-blur"
      >
        <ul className="flex items-center justify-between gap-1">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                aria-label={label}
                className={({ isActive }) =>
                  `flex h-12 items-center justify-center gap-2.5 rounded-full text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft ${
                    isActive
                      ? "bg-brand px-6 text-white shadow-lg shadow-brand/30"
                      : "w-12 bg-line/60 text-zinc-400 hover:text-zinc-200"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} />
                    {isActive && <span className="text-xs">{label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
