import { render, type RenderOptions } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactElement, ReactNode } from "react";

export function createTestStore() {
  return createStore();
}

function Providers({ children, store }: { children: ReactNode; store: ReturnType<typeof createStore> }) {
  return <Provider store={store}>{children}</Provider>;
}

export function renderApp(ui: ReactElement, options: Omit<RenderOptions, "wrapper"> = {}) {
  const store = createTestStore();

  const result = render(ui, {
    ...options,
    wrapper: ({ children }) => <Providers store={store}>{children}</Providers>,
  });

  return { store, ...result };
}
