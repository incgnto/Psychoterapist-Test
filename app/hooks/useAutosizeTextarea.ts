import { useEffect, useRef } from "react";

export function useAutosizeTextarea(value: string, max = 160) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, [value, max]);

  return ref;
}
