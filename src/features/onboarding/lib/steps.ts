export const ONBOARDING_STEPS = ["type", "voice", "budget", "month"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type StepDirection = 1 | -1;

type KeyboardIntent = "next" | "back" | "skip";

type CompletionTarget = "categories" | "app";

interface DragGesture {
  offset: { x: number };
  velocity: { x: number };
}

export const LAST_STEP_INDEX = ONBOARDING_STEPS.length - 1;

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

const KEYBOARD_INTENTS = new Map<string, KeyboardIntent>([
  ["ArrowRight", "next"],
  ["ArrowLeft", "back"],
  ["Escape", "skip"],
]);

export function isValidStepIndex(index: number) {
  return index >= 0 && index <= LAST_STEP_INDEX;
}

export function keyboardIntent(key: string): KeyboardIntent | null {
  return KEYBOARD_INTENTS.get(key) ?? null;
}

export function swipeStepDelta({ offset, velocity }: DragGesture): StepDirection | 0 {
  if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) return 1;
  if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) return -1;
  return 0;
}

export function completionTarget(createsCategory: boolean, skipped: boolean): CompletionTarget {
  return createsCategory && !skipped ? "categories" : "app";
}
