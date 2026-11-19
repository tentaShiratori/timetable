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
        setHistory((current) => (current.length > 1 ? current.slice(1) : ["/"]));
      },
      home: () => {
        setHistory(["/"]);
      },
      push: (path: string) => {
        setHistory((current) => [path, ...current]);
      },
    };
  }, [history, setHistory]);
};
