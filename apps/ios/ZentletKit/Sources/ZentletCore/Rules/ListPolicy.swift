import Foundation

/// Who may do what in a list. Mirrors `list.policy.ts` and `invite.policy.ts` on the web.
public enum ListPolicy {
    public static let inviteLifetime: TimeInterval = 7 * 24 * 60 * 60

    public static func canManage(_ role: ListRole) -> Bool { role == .owner }

    public static func canContribute(_ role: ListRole) -> Bool { role == .owner || role == .editor }

    public static func canRemoveEntry(role: ListRole, isAuthor: Bool) -> Bool { role == .owner || isAuthor }

    /// Shared lists accept entries only in their own currency; the private list accepts any.
    public static func acceptsCurrency(of list: TransactionList, accountCurrency: Currency) -> Bool {
        list.isPrivate || list.currency == accountCurrency
    }

    public static func isUsable(_ invite: ListInvite, now: Date) -> Bool {
        invite.acceptedAt == nil && invite.revokedAt == nil && invite.expiresAt > now
    }

    /// Where a new transaction lands. The requested list is used only if the author can contribute and the
    /// currency matches; otherwise it silently goes to the author's private list (never rejected).
    public static func targetListId(
        requested: TransactionList?, role: ListRole?, privateListId: UUID, accountCurrency: Currency
    ) -> UUID {
        guard let requested, let role, canContribute(role),
              acceptsCurrency(of: requested, accountCurrency: accountCurrency) else { return privateListId }
        return requested.id
    }

    /// New owner when the owner deletes their account: earliest-joined editor, else earliest-joined viewer.
    /// nil means the list is deleted.
    public static func successor(among members: [ListMember]) -> ListMember? {
        let candidates = members.filter { $0.role != .owner }
        let byJoin = { (lhs: ListMember, rhs: ListMember) in lhs.joinedAt < rhs.joinedAt }
        return candidates.filter { $0.role == .editor }.min(by: byJoin)
            ?? candidates.filter { $0.role == .viewer }.min(by: byJoin)
    }
}
