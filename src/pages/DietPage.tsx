import { Soup } from "lucide-react";

export default function DietPage() {
  return (
    <main className="min-h-screen bg-[#01010D] px-4 pt-6 pb-24 text-white">
      <div className="flex items-center gap-3">
        <Soup size={24} className="text-[#88F9C0]" />

        <h1 className="text-xl font-bold">Diet</h1>
      </div>

      <p className="mt-4 text-sm text-zinc-400">
        Your nutrition tracking dashboard is coming soon.
      </p>
    </main>
  );
}
