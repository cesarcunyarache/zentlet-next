export type CheckBudgetOutput = { checked: false } | { checked: true; spent: number; limit: number; notified: boolean };
