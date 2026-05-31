import { useState } from 'react';

export type FaqItem = {
  q: string;
  a: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const expanded = openIndex === index;
        return (
          <div key={item.q} className="overflow-hidden rounded-lg border border-gray-light bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium"
              aria-expanded={expanded}
              onClick={() => setOpenIndex(expanded ? null : index)}
            >
              {item.q}
              <span className="shrink-0 text-sky">{expanded ? '−' : '+'}</span>
            </button>
            {expanded && (
              <div className="border-t border-gray-light px-4 pb-4 pt-3 text-sm text-gray-mid">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
