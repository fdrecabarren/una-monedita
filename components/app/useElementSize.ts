"use client";

import { useEffect, useState } from "react";

// Tamaño (clientWidth/clientHeight) de un elemento, actualizado con
// ResizeObserver. Usa un callback ref: si el elemento aparece más tarde (p. ej.
// después de un estado de carga que devolvía otra cosa), se engancha igual.
export function useElementSize<T extends HTMLElement = HTMLDivElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size] as const;
}
