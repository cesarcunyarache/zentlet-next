export interface SignUpRollback {
  undo(userId: string): Promise<void>;
}
