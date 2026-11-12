export type NotifyOutput =
  | { status: 'created'; notificationId: string; deliveryIds: string[] }
  | { status: 'duplicate' };
