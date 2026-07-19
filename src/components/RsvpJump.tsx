"use client";

import { useEffect, useState } from "react";

/**
 * Sticky "answer the invitation" bar. The RSVP form is the last block of a
 * long decorative page — without a shortcut many guests (especially elders)
 * read the card and never realize an answer is expected. Appears only while
 * the #rsvp block is off-screen.
 */
export default function RsvpJump({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("rsvp");
    if (!target || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting);
    });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  if (!visible) return null;
  return (
    <div className="rsvp-jump">
      <a className="btn-ac btn-ac--solid" href="#rsvp">
        {label} ↓
      </a>
    </div>
  );
}
