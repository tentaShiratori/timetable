import { PropsWithChildren } from "react";
import { useRouter } from "./useRouter";

/**
 * @public
 */
export const Route = ({ path, children }: PropsWithChildren<{ path: string }>) => {
  const router = useRouter();
  return router.path === path ? children : null;
};
