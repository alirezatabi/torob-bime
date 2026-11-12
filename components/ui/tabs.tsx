"use client";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
/** Small keyboard-operable tabs primitive; arrow keys follow RTL reading order. */
export function Tabs({ items }: { items: { id: string; label: string; content: ReactNode }[] }) {
  const prefix = useId();
  const [selected, setSelected] = useState(items[0]?.id);
  if (!items.length) return null;
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (index + (event.key === "ArrowLeft" ? 1 : -1) + items.length) % items.length;
    setSelected(items[next].id);
    document.getElementById(`${prefix}-tab-${items[next].id}`)?.focus();
  }
  return (
    <>
      <div role="tablist" className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            id={`${prefix}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected === item.id}
            aria-controls={`${prefix}-panel-${item.id}`}
            tabIndex={selected === item.id ? 0 : -1}
            onClick={() => setSelected(item.id)}
            onKeyDown={(event) => keyboard(event, index)}
            className={`min-h-11 rounded-xl px-4 text-xs font-bold ${selected === item.id ? "bg-brand-soft text-brand-strong" : "text-text-muted hover:bg-surface-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          id={`${prefix}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${prefix}-tab-${item.id}`}
          hidden={selected !== item.id}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </>
  );
}
