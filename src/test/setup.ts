import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { notificationMocks } from "./mocks/notification";
import { alarmPermission, appFiles } from "./mocks/tauri";

beforeEach(() => {
  appFiles.clear();
  alarmPermission.granted = true;
  alarmPermission.checked = false;
  alarmPermission.requested = false;
  notificationMocks.isPermissionGranted.mockReset().mockResolvedValue(false);
  notificationMocks.requestPermission.mockReset().mockResolvedValue("denied");
  notificationMocks.sendNotification.mockReset();
  notificationMocks.cancel.mockReset().mockResolvedValue(undefined);
  notificationMocks.createChannel.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  appFiles.clear();
});
