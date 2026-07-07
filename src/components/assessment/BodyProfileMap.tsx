import { useState } from "react";
import { ScanLine } from "lucide-react";
import { BodyAvatarFigure } from "@/components/assessment/BodyAvatarFigure";
import {
  type BodyProfileModel,
  type BodyZoneId,
  type ZoneStatus,
  zoneStatusColor,
  zoneStatusLabel,
} from "@/lib/body-profile";
import { cn } from "@/lib/utils";

type Props = {
  profile: BodyProfileModel;
  sourceLabel?: string;
  bmr?: number | null;
  className?: string;
};

export function BodyProfileMap({ profile, sourceLabel, bmr, className }: Props) {
  const [activeZone, setActiveZone] = useState<BodyZoneId | null>(null);
  const active = profile.zones.find((z) => z.id === activeZone) ?? profile.zones[0];

  const sexLabel = profile.sex === "F" ? "Feminino" : "Masculino";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border overflow-hidden bg-card text-card-foreground shadow-lg",
        className,
      )}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 bg-gradient-to-r from-teal-950/20 to-transparent">
        <div className="flex items-center gap-2">
          <ScanLine className="size-4 text-teal-400" />
          <div>
            <h3 className="text-sm font-black tracking-wide">Avatar corporal 3D</h3>
            <p className="text-[10px] text-muted-foreground">{sourceLabel ?? profile.summary}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-teal-400/70 font-bold">{sexLabel}</p>
          <p className="text-sm font-black text-teal-300">{profile.shapeLabel}</p>
        </div>
      </div>

      <div className="relative bg-card px-3 pt-4 pb-2">
        <div className="mx-auto w-full max-w-[340px] aspect-[3/5] min-h-[420px]">
          <BodyAvatarFigure profile={profile} bmr={bmr} activeZone={activeZone} />
        </div>
      </div>

      <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border bg-muted/20 pt-3">
        <MiniMetric label="IMC" value={profile.bmi != null ? profile.bmi.toFixed(1) : "—"} />
        <MiniMetric label="Peso" value={profile.weightKg != null ? `${profile.weightKg.toFixed(1)} kg` : "—"} />
        <MiniMetric label="Altura" value={profile.heightCm != null ? `${(profile.heightCm / 100).toFixed(2)} m` : "—"} />
        <MiniMetric
          label="% Gordura"
          value={profile.bodyFatPct != null ? `${profile.bodyFatPct.toFixed(1)}%` : "—"}
        />
      </div>

      <div className="px-3 pb-3">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-2">
          Zonas · as áreas em atenção acendem no corpo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {profile.zones.map((zone) => (
            <ZoneChip
              key={zone.id}
              zone={zone}
              active={activeZone === zone.id}
              onClick={() => setActiveZone(zone.id)}
            />
          ))}
        </div>
      </div>

      {active && (
        <div className="mx-3 mb-3 rounded-xl border border-teal-500/20 bg-teal-500/5 px-3 py-2.5">
          <p className="text-xs font-bold text-teal-100">{active.label}</p>
          <p className={cn("text-[11px] font-semibold mt-0.5", statusTextClass(active.status))}>
            {zoneStatusLabel(active.status)}
          </p>
          <p className="text-[11px] text-white/55 mt-1 leading-relaxed">{active.message}</p>
        </div>
      )}

      <LegendBar />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center">
      <p className="text-[8px] uppercase text-white/40">{label}</p>
      <p className="text-[11px] font-bold text-white/90 tabular-nums">{value}</p>
    </div>
  );
}

function ZoneChip({
  zone,
  active,
  onClick,
}: {
  zone: { id: BodyZoneId; label: string; status: ZoneStatus };
  active: boolean;
  onClick: () => void;
}) {
  const color = zoneStatusColor(zone.status).stroke;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] transition-all border",
        active ? "border-teal-400/40 bg-teal-500/15 text-teal-100" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      )}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {zone.label}
    </button>
  );
}

function LegendBar() {
  const items: { status: ZoneStatus; label: string }[] = [
    { status: "ok", label: "Normal" },
    { status: "attention", label: "Atenção" },
    { status: "critical", label: "Crítico" },
    { status: "clinical", label: "Clínico" },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-2.5 border-t border-white/10 bg-black/20">
      {items.map((item) => (
        <span key={item.status} className="inline-flex items-center gap-1.5 text-[9px] text-white/45">
          <span className="size-2 rounded-full" style={{ backgroundColor: zoneStatusColor(item.status).stroke }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function statusTextClass(status: ZoneStatus): string {
  switch (status) {
    case "critical":
      return "text-red-400";
    case "attention":
      return "text-amber-400";
    case "clinical":
      return "text-orange-400";
    case "ok":
      return "text-emerald-400";
    default:
      return "text-white/50";
  }
}
