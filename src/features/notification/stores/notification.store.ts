"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "../services/notification.service";
import type { NotificationFeed } from "../types";

export const notificationKeys = {
  feed: ["notifications"] as const,
};

const POLL_INTERVAL_MS = 60_000;

const markFeedRead = (feed: NotificationFeed, readAt: string): NotificationFeed => ({
  items: feed.items.map((item) => (item.readAt ? item : { ...item, readAt })),
  unreadCount: 0,
});

export function useNotifications() {
  const query = useQuery({
    queryKey: notificationKeys.feed,
    queryFn: () => notificationService.getFeed(),
    refetchInterval: POLL_INTERVAL_MS,
  });
  return { items: query.data?.items ?? [], unreadCount: query.data?.unreadCount ?? 0, isLoading: query.isPending };
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    networkMode: "always",
    onMutate: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationFeed>(notificationKeys.feed, (feed) => feed && markFeedRead(feed, readAt));
    },
    onError: () => queryClient.invalidateQueries({ queryKey: notificationKeys.feed }),
  });
  return mutation.mutate;
}
