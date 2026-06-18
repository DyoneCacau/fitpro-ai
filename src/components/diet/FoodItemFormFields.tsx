import type { FoodUnitId } from "@/lib/diet";
import { FOOD_UNIT_OPTIONS, defaultQuantityForUnit, getFoodUnitMeta } from "@/lib/diet";

export function FoodItemFormFields({
  food,
  quantity,
  unit,
  itemNotes,
  onFoodChange,
  onQuantityChange,
  onUnitChange,
  onNotesChange,
  disabled,
  showNotes = true,
  foodPlaceholder = "Ex.: pão integral, ovo, mamão",
}: {
  food: string;
  quantity: string;
  unit: FoodUnitId;
  itemNotes: string;
  onFoodChange: (v: string) => void;
  onQuantityChange: (v: string) => void;
  onUnitChange: (v: FoodUnitId) => void;
  onNotesChange: (v: string) => void;
  disabled?: boolean;
  showNotes?: boolean;
  foodPlaceholder?: string;
}) {
  const unitMeta = getFoodUnitMeta(unit);

  return (
    <>
      <Field label="Alimento">
        <input
          required
          value={food}
          onChange={(e) => onFoodChange(e.target.value)}
          placeholder={foodPlaceholder}
          className="field-input"
          disabled={disabled}
        />
      </Field>
      <Field label="Unidade de medida">
        <select
          value={unit}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value as FoodUnitId;
            onUnitChange(next);
            onQuantityChange(defaultQuantityForUnit(next));
          }}
          className="field-input"
        >
          {FOOD_UNIT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={unitMeta.quantityHint}>
        <input
          type="number"
          min={1}
          step={unit === "g" || unit === "ml" ? 1 : 1}
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          className="field-input"
          disabled={disabled}
        />
      </Field>
      {showNotes && (
        <Field label="Observação (opcional)">
          <input
            value={itemNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ex.: sem sal, pão de forma Pullman"
            className="field-input"
            disabled={disabled}
          />
        </Field>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
