import { vi } from "vitest";

const { notificationMocks } = vi.hoisted(() => ({
  notificationMocks: {
    isPermissionGranted: vi.fn(async () => false),
    requestPermission: vi.fn(async () => "denied" as const),
    sendNotification: vi.fn(),
    cancel: vi.fn(async () => undefined),
    createChannel: vi.fn(async () => undefined),
  },
}));

export { notificationMocks };

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: notificationMocks.isPermissionGranted,
  requestPermission: notificationMocks.requestPermission,
  sendNotification: notificationMocks.sendNotification,
  cancel: notificationMocks.cancel,
  createChannel: notificationMocks.createChannel,
  Schedule: {
    interval: (interval: { weekday?: number; hour?: number; minute?: number }, allowWhileIdle = false) => ({
      at: undefined,
      interval: { interval, allowWhileIdle },
      every: undefined,
    }),
  },
  Importance: { None: 0, Min: 1, Low: 2, Default: 3, High: 4 },
  Visibility: { Secret: -1, Private: 0, Public: 1 },
}));
