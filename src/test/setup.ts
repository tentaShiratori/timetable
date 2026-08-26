import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { notificationMocks } from "./mocks/notification";
import { appFiles } from "./mocks/tauri";

beforeEach(() => {
  appFiles.clear();
  notificationMocks.isPermissionGranted.mockReset().mockResolvedValue(false);
  notificationMocks.requestPermission.mockReset().mockResolvedValue("denied");
  notificationMocks.sendNotification.mockReset();
  notificationMocks.cancelAll.mockReset().mockResolvedValue(undefined);
  notificationMocks.createChannel.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  appFiles.clear();
});
