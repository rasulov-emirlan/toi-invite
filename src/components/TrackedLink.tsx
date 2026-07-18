"use client";

import { track } from "@/lib/track";

/** An <a> that fires a product beacon on tap. Rendering stays server-side —
 *  this exists only because click handlers need a client component. */
export default function TrackedLink({
  href,
  event,
  slug,
  className,
  target,
  rel,
  children,
}: {
  href: string;
  event: string;
  slug?: string;
  className?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      target={target}
      rel={rel}
      onClick={() => track(event, slug)}
    >
      {children}
    </a>
  );
}
