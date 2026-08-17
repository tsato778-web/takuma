export function PlaceholderPage({
  title,
  description,
  sprint,
}: {
  title: string;
  description: string;
  sprint: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-[--color-muted]">{description}</p>
      <div className="mt-6 rounded-xl border border-dashed border-[--color-border] bg-white p-8 text-center">
        <p className="text-sm font-semibold">この画面は未実装です</p>
        <p className="mt-1 text-[13px] text-[--color-muted]">実装予定：{sprint}</p>
      </div>
    </div>
  );
}
