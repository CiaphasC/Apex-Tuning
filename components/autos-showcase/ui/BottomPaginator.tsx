type BottomPaginatorProps = {
  activeViewIndex: number;
  totalViews: number;
  onChange: (viewIndex: number) => void;
};

export const BottomPaginator = ({ activeViewIndex, totalViews, onChange }: BottomPaginatorProps) => (
  <div className="pointer-events-auto absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-3">
    {Array.from({ length: totalViews }).map((_, index) => (
      <button
        key={index}
        type="button"
        aria-label={`Ir al servicio ${index + 1}`}
        onClick={() => onChange(index)}
        className={`h-2 w-2 rounded-full transition-all duration-300 ${
          index === activeViewIndex
            ? "scale-125 bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)]"
            : "bg-gray-700 hover:bg-gray-500"
        }`}
      />
    ))}
  </div>
);

