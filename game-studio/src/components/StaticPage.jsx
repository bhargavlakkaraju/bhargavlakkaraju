export default function StaticPage({ title, updated = null, children }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <h1 className="font-cond text-5xl font-extrabold uppercase leading-[0.95]">{title}</h1>
      {updated && <p className="mt-1 text-sm text-white/40">Last updated {updated}</p>}
      <div className="prose-game card mt-6 p-6 sm:p-8 [&_a]:text-aqua [&_a]:underline">{children}</div>
    </div>
  );
}
