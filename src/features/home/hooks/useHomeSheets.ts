import { useState } from "react";

export type HomeSheet = "new" | "categories" | "settings" | "notifications" | "inbox";

export function useHomeSheets() {
  const [openSheet, setOpenSheet] = useState<HomeSheet | null>(null);

  function sheetProps(sheet: HomeSheet) {
    return {
      isOpen: openSheet === sheet,
      onOpenChange: (isOpen: boolean) => setOpenSheet(isOpen ? sheet : null),
    };
  }

  return { open: setOpenSheet, sheetProps };
}
