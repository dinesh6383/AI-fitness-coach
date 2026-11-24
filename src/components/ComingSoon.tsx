export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="px-5 py-10">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-zinc-400">Coming soon.</p>
    </main>
  );
}
