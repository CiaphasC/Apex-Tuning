export const LoadingOverlay = () => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md">
    <div className="mb-8 h-16 w-16 animate-spin rounded-full border-4 border-red-900 border-t-red-500" />
    <h2 className="mb-2 text-sm font-bold tracking-[0.3em] text-white uppercase">Cargando Apex Tuning</h2>
    <p className="text-xs tracking-widest text-gray-500">Descargando modelo de alta resolución...</p>
  </div>
);
