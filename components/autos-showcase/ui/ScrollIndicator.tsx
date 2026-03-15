type ScrollIndicatorProps = {
  activeViewIndex: number;
  totalViews: number;
};

export const ScrollIndicator = ({ activeViewIndex, totalViews }: ScrollIndicatorProps) => (
  <div className="pointer-events-none absolute top-[12%] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center transition-opacity duration-1000 md:top-[16%]">
    <span className="mb-4 text-[9px] font-semibold tracking-[0.3em] text-white/60 uppercase drop-shadow-md">Haz Scroll para explorar</span>

    <div className="relative h-20 w-[2px] overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_5px_rgba(0,0,0,0.5)] md:h-28">
      <div
        className="absolute top-0 left-0 w-full rounded-full bg-gradient-to-b from-[#ff0033] to-[#8b0000] shadow-[0_0_10px_rgba(255,0,51,0.8)] transition-transform duration-700 ease-in-out"
        style={{
          height: `${100 / totalViews}%`,
          transform: `translateY(${activeViewIndex * 100}%)`,
        }}
      />
    </div>

    <div className="mt-4 flex flex-col items-center gap-1.5 opacity-80">
      <span className="font-mono text-[10px] font-bold tracking-widest text-red-500">0{activeViewIndex + 1}</span>
      <div className="h-[1px] w-3 bg-white/20" />
      <span className="font-mono text-[9px] tracking-widest text-white/40">0{totalViews}</span>
    </div>
  </div>
);

