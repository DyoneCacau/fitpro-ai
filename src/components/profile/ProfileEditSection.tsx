import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";

type Props = {
  onAvatarChange?: (url: string | null) => void;
  onNameChange?: (name: string) => void;
};

export function ProfileEditSection({ onAvatarChange, onNameChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
      >
        <Pencil className="size-4" />
        Editar perfil
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-border">
          <ProfileSettingsForm
            embedded
            onAvatarChange={onAvatarChange}
            onNameChange={onNameChange}
          />
        </div>
      )}
    </div>
  );
}
