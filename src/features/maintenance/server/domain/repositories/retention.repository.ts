export interface RetentionRepository {
  deleteUsageLimitsBefore(date: Date): Promise<number>;

  deleteAuthRateLimitsBefore(date: Date): Promise<number>;

  deleteSessionsExpiredBy(date: Date): Promise<number>;

  deleteVerificationsExpiredBy(date: Date): Promise<number>;

  deleteNotificationsBefore(date: Date): Promise<number>;

  deleteInboxItemsResolvedBefore(date: Date): Promise<number>;

  deleteWhatsappMessagesBefore(date: Date): Promise<number>;

  deleteWhatsappLinkCodesExpiredBy(date: Date): Promise<number>;

  countUsersWithoutConsentCreatedBefore(date: Date): Promise<number>;
}
