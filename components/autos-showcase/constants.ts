import { PremiumSuspension, PremiumTurbo, PremiumZap } from "./icons";
import type { ShowcaseView } from "./types";

export const views: ShowcaseView[] = [
  {
    id: "dyno",
    title: "Dyno Tuning",
    subtitle: "SERVICIO 01",
    description:
      "Medición precisa de potencia y torque en nuestro dinamómetro de última generación. Optimización completa de rendimiento.",
    icon: PremiumZap,
    tags: ["Reprogramación", "Logs", "Dyno", "ECU"],
    camera: { position: [-6, 2.5, 6], target: [0, 0.5, 0] },
  },
  {
    id: "suspension",
    title: "Suspensión & Rines",
    subtitle: "SERVICIO 04",
    description:
      "Coilovers, muelles deportivos, barras estabilizadoras. Rines forjados y llantas de alto rendimiento para máximo grip.",
    icon: PremiumSuspension,
    tags: ["Coilovers", "KW", "BC Racing", "Forged Wheels"],
    camera: { position: [3, 1, 4.5], target: [1.2, 0.3, 1] },
  },
  {
    id: "turbo",
    title: "Inducción Forzada",
    subtitle: "SERVICIO 03",
    description:
      "Kits de turbo y supercargador. Intercoolers de alto rendimiento, blow-off valves y wastegates para máximo boost.",
    icon: PremiumTurbo,
    tags: ["Turbo", "Supercharger", "Intercooler", "BOV"],
    camera: { position: [4, 1.5, -5], target: [0, 0.5, -1] },
  },
];

