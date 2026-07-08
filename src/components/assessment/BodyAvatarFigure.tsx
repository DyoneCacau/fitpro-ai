import {
  type BodyProfileModel,
  type BodyZoneId,
  type ZoneStatus,
  zoneStatusColor,
} from "@/lib/body-profile";
import { BodyMorphFigure } from "@/components/assessment/BodyMorphFigure";
import { cn } from "@/lib/utils";

type Props = {
  profile: BodyProfileModel;
  bmr?: number | null;
  showCallouts?: boolean;
  activeZone?: BodyZoneId | null;
  className?: string;
};

export function BodyAvatarFigure({ profile, bmr, showCallouts = true, activeZone, className }: Props) {
  const isFemale = profile.sex === "F";
  const positions = isFemale ? ZONE_POS_F : ZONE_POS_M;
  const alertZones = profile.zones.filter(
    (z) => z.status === "attention" || z.status === "critical" || z.status === "clinical",
  );

  return (
    <div className={cn("relative w-full h-full min-h-[380px] flex items-end justify-center", className)}>
      {showCallouts && (
        <>
          <AvatarCallout
            label="Percentual de gordura"
            value={profile.bodyFatPct != null ? `${profile.bodyFatPct.toFixed(1)}%` : "—"}
            className="absolute left-0 top-[10%] max-w-[40%] z-20"
            align="left"
          />
          <AvatarCallout
            label="Perímetro cintura"
            value={profile.waistCm != null ? `${profile.waistCm.toFixed(1)} cm` : "—"}
            className="absolute right-0 top-[24%] max-w-[40%] z-20"
            align="right"
          />
          <AvatarCallout
            label="Massa magra"
            value={profile.leanMassKg != null ? `${profile.leanMassKg.toFixed(1)} kg` : "—"}
            className="absolute left-0 bottom-[26%] max-w-[40%] z-20"
            align="left"
          />
          <AvatarCallout
            label="Taxa metabólica basal"
            value={bmr != null ? `${bmr} kcal` : "—"}
            className="absolute right-0 bottom-[16%] max-w-[40%] z-20"
            align="right"
          />
        </>
      )}

      <BodyMorphFigure
        profile={profile}
        className="relative z-10 h-full w-auto max-h-full select-none pointer-events-none drop-shadow-[0_8px_24px_rgba(45,212,191,0.15)]"
      />

      <div className="absolute inset-0 z-[15] pointer-events-none" aria-hidden>
        {alertZones.map((zone) => {
          const pos = positions[zone.id];
          if (!pos) return null;
          const color = zoneStatusColor(zone.status).stroke;
          const isActive = activeZone === zone.id;
          return (
            <span
              key={zone.id}
              className="absolute rounded-full"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.size}%`,
                height: `${pos.size}%`,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, ${color} 0%, ${color}00 70%)`,
                opacity: isActive ? 0.85 : 0.55,
                filter: "blur(2px)",
                mixBlendMode: "screen",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

type ZonePos = { x: number; y: number; size: number };

const ZONE_POS_M: Record<BodyZoneId, ZonePos> = {
  chest: { x: 50, y: 30, size: 26 },
  abdomen: { x: 50, y: 42, size: 24 },
  hips: { x: 50, y: 52, size: 28 },
  left_arm: { x: 30, y: 40, size: 16 },
  right_arm: { x: 70, y: 40, size: 16 },
  left_leg: { x: 43, y: 72, size: 18 },
  right_leg: { x: 57, y: 72, size: 18 },
};

const ZONE_POS_F: Record<BodyZoneId, ZonePos> = {
  chest: { x: 50, y: 30, size: 24 },
  abdomen: { x: 50, y: 42, size: 22 },
  hips: { x: 50, y: 52, size: 30 },
  left_arm: { x: 32, y: 40, size: 14 },
  right_arm: { x: 68, y: 40, size: 14 },
  left_leg: { x: 44, y: 72, size: 17 },
  right_leg: { x: 56, y: 72, size: 17 },
};

function AvatarCallout({
  label,
  value,
  className,
  align,
}: {
  label: string;
  value: string;
  className?: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-teal-500/25 bg-[#0a1218]/85 backdrop-blur-sm px-2.5 py-2 shadow-lg",
        className,
      )}
    >
      <p
        className={cn(
          "text-[8px] uppercase tracking-wide text-teal-200/55 leading-tight",
          align === "right" && "text-right",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-black text-teal-100 tabular-nums mt-0.5",
          align === "right" && "text-right",
        )}
      >
        {value}
      </p>
    </div>
  );
}
