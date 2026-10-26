"use client";

import { useState } from "react";

/**
 * Shop logo with a graceful fallback.
 * If /logo.png cannot be loaded for any reason, an "STE" monogram tile is
 * rendered instead of the browser's broken-image placeholder.
 */
export function Logo({ className = "h-10 w-10", rounded = "rounded-xl" }: { className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${className} ${rounded} grid shrink-0 place-items-center bg-orange-500 font-extrabold leading-none text-black`}
        aria-label="STE logo"
      >
        <span className="text-[0.6em]">STE</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Star Tech Electronics logo"
      className={`${className} ${rounded} shrink-0 object-cover`}
      onError={() => setFailed(true)}
    />
  );
}
