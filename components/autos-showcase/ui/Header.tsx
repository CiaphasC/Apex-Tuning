import { PremiumLogo } from "../icons";

const NAV_ITEMS = ["INICIO", "NOSOTROS", "SERVICIOS", "TRABAJOS", "TESTIMONIOS", "CONTACTO"];

export const Header = () => (
  <header className="pointer-events-auto absolute top-0 left-0 z-10 flex w-full items-center justify-between bg-gradient-to-b from-black/90 to-transparent p-6">
    <div className="group flex cursor-pointer flex-col items-center">
      <div className="relative flex items-center justify-center">
        <PremiumLogo />
      </div>
      <span className="mt-2 text-[11px] font-black tracking-[0.25em] text-white uppercase transition-colors duration-500 group-hover:text-red-500 drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]">
        APEX TUNING
      </span>
    </div>

    <nav className="hidden gap-8 text-[11px] font-bold tracking-widest md:flex">
      {NAV_ITEMS.map((item) => (
        <a key={item} href="#" className="text-white transition-colors hover:text-red-500">
          {item}
        </a>
      ))}
    </nav>

    <button className="flex items-center gap-2 border border-red-600/50 px-5 py-2.5 text-[11px] font-bold tracking-widest text-white transition-all backdrop-blur-sm shadow-[0_0_10px_rgba(255,0,0,0.1)] hover:bg-red-600/20 hover:shadow-[0_0_20px_rgba(255,0,0,0.3)]">
      AGENDAR CITA <span className="ml-1 text-red-500">→</span>
    </button>
  </header>
);
