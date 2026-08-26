import { atom, useAtom } from "jotai";
import { useMemo } from "react";

type History = string[];

const historyAtom = atom<History>(["/"]);

/**
 * @public
 * @returns
 */
export const useRouter = () => {
  const [history, setHistory] = useAtom(historyAtom);
  return useMemo(() => {
    return {
      path: history[0],
      history,
      back: () => {
        setHistory(history.length > 1 ? history.slice(1) : ["/"]);
      },
      push: (path: string) => {
        setHistory([path, ...history]);
      },
    };
  }, [history, setHistory]);
};
