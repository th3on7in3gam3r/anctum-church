export function NumberedItem({ index, title, text }: { index: number; title: string; text: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-gold">{String(index).padStart(2, '0')}</p>
      {title ? <h3 className="font-display mt-3 text-3xl font-normal">{title}</h3> : null}
      <p className="mt-3 leading-relaxed text-ink/80">{text}</p>
    </div>
  );
}
