"use client";

import { useEffect, useId, useRef } from "react";
import DOMPurify from "dompurify";

interface Props {
  chart: string;
}

export default function MermaidBlock({ chart }: Props) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "dark" });
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
          });
        }
      } catch (err) {
        if (!cancelled && ref.current) {
          const safeErr = DOMPurify.sanitize(String(err));
          ref.current.innerHTML = `<pre class="text-red-400 text-xs p-2">${safeErr}</pre>`;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chart, id]);

  return (
    <div
      ref={ref}
      className="my-4 flex justify-center overflow-x-auto rounded-lg bg-gray-900 p-4 border border-gray-800"
    />
  );
}
