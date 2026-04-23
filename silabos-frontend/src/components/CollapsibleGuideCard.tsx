import { ReactNode, useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface CollapsibleGuideCardProps {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleGuideCard({
  icon: Icon,
  title,
  eyebrow,
  description,
  children,
  defaultOpen = true,
}: CollapsibleGuideCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="app-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left sm:px-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)]">
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="app-kicker mb-1 text-[0.65rem] tracking-[0.18em]">{eyebrow}</p>
            ) : null}
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
            ) : null}
          </div>
        </div>

        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-white text-slate-500">
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-[var(--line-subtle)] px-5 py-5 sm:px-6">{children}</div>
      ) : null}
    </section>
  );
}
