import { Activity, Heart, Smartphone, Watch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WearableProvider } from "./types";

export type ProviderMeta = {
  id: WearableProvider;
  label: string;
  description: string;
  icon: LucideIcon;
  /** OAuth web ou permissão nativa no app */
  connectMode: "oauth" | "native";
  /** Disponível só no app nativo */
  nativeOnly?: boolean;
  /** Plataforma alvo */
  platforms: ("web" | "android" | "ios")[];
};

export const WEARABLE_PROVIDERS: ProviderMeta[] = [
  {
    id: "strava",
    label: "Strava",
    description: "Importe corridas, ciclismo e calorias das suas atividades.",
    icon: Activity,
    connectMode: "oauth",
    platforms: ["web", "android", "ios"],
  },
  {
    id: "health_connect",
    label: "Health Connect",
    description: "Samsung, Garmin, Fitbit e outros via Android (Health Connect).",
    icon: Heart,
    connectMode: "native",
    nativeOnly: true,
    platforms: ["android"],
  },
  {
    id: "healthkit",
    label: "Apple Saúde / Watch",
    description: "Passos, calorias e treinos do Apple Watch e iPhone.",
    icon: Watch,
    connectMode: "native",
    nativeOnly: true,
    platforms: ["ios"],
  },
  {
    id: "samsung_health",
    label: "Samsung Health",
    description: "Sincronize via Samsung Health → Health Connect no Android.",
    icon: Smartphone,
    connectMode: "native",
    nativeOnly: true,
    platforms: ["android"],
  },
];

export function getProviderMeta(id: WearableProvider): ProviderMeta | undefined {
  return WEARABLE_PROVIDERS.find((p) => p.id === id);
}
