import type { ShowcaseView } from "../types";

type ServiceDetailsCardProps = {
  activeView: ShowcaseView;
};

export const ServiceDetailsCard = ({ activeView }: ServiceDetailsCardProps) => {
  const ActiveIcon = activeView.icon;

  return (
    <div className="pointer-events-auto absolute top-1/2 right-12 z-10 w-[420px] -translate-y-1/2 transition-opacity duration-1000">
      <div className="overflow-hidden rounded-sm border border-white/5 bg-[#050505]/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-600/40 bg-[#1a0505]/80 shadow-[0_0_15px_rgba(255,0,0,0.15)]">
            <ActiveIcon />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-red-500 uppercase drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]">
            {activeView.subtitle}
          </span>
        </div>

        <h2 className="font-serif-playfair mb-4 text-4xl tracking-wide text-white">{activeView.title}</h2>
        <p className="mb-8 text-sm leading-relaxed font-light text-gray-400">{activeView.description}</p>

        <div className="flex flex-wrap gap-3">
          {activeView.tags.map((tag) => (
            <span
              key={`${activeView.id}-${tag}`}
              className="inline-flex items-center rounded-sm border border-red-900/40 bg-red-950/30 px-3 py-1.5 text-[11px] font-medium tracking-wide text-red-400 backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

