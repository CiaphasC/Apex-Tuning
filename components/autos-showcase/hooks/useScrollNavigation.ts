import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

type UseScrollNavigationParams = {
  enabled: boolean;
  viewCount: number;
  setActiveViewIndex: Dispatch<SetStateAction<number>>;
};

export const useScrollNavigation = ({ enabled, viewCount, setActiveViewIndex }: UseScrollNavigationParams) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isThrottled = false;

    const handleScroll = (event: WheelEvent) => {
      if (isThrottled) {
        return;
      }

      isThrottled = true;

      setActiveViewIndex((previousIndex) =>
        event.deltaY > 0 ? (previousIndex + 1) % viewCount : (previousIndex - 1 + viewCount) % viewCount,
      );

      window.setTimeout(() => {
        isThrottled = false;
      }, 1200);
    };

    window.addEventListener("wheel", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleScroll);
    };
  }, [enabled, setActiveViewIndex, viewCount]);
};

