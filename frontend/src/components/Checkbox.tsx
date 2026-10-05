import { useId, type ReactNode } from "react";
import { CheckIcon } from "./Icons";

/** Eckiges Häkchen wie im Prototyp. Der Text daneben darf Links enthalten. */
export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (next: boolean) => void; children: ReactNode }) {
  const id = useId();
  return (
    <div className="chk">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={id}
        className={"cb" + (checked ? " on" : "")}
        onClick={() => onChange(!checked)}
      >
        {checked && <CheckIcon size={14} />}
      </button>
      <span id={id} onClick={(event) => { if (!(event.target as HTMLElement).closest("a")) onChange(!checked); }}>{children}</span>
    </div>
  );
}
