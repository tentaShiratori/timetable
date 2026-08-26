import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { appFiles } from "./mocks/tauri";

beforeEach(() => {
  appFiles.clear();
});

afterEach(() => {
  cleanup();
  appFiles.clear();
});
