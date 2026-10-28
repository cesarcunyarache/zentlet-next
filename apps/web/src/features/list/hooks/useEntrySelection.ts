import { useState } from "react";

export function useEntrySelection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { selected, toggle, clear: () => setSelected(new Set()), ids: [...selected] };
}
