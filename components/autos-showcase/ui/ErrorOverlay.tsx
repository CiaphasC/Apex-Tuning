export const ErrorOverlay = () => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-6 text-center backdrop-blur-md">
    <svg viewBox="0 0 24 24" fill="none" className="mb-6 h-16 w-16 text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">
      <path
        d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 8V13M12 16H12.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <h2 className="mb-4 text-xl font-bold tracking-[0.2em] text-white uppercase">Error de Conexión</h2>
    <p className="mb-6 max-w-md text-sm leading-relaxed text-gray-400">
      Tu navegador o red está bloqueando la descarga del modelo 3D externo (CORS). Asegúrate de alojar el archivo{" "}
      <code>.glb</code> en el mismo servidor de tu página web.
    </p>
  </div>
);

