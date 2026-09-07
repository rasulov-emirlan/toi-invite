/**
 * Build a WhatsApp "click to share" deep link. Opens WhatsApp (mobile app or
 * web) with the message + URL pre-filled; the recipient picker is WhatsApp's.
 * The URL unfurls via the invite's OpenGraph card. `message` is optional.
 */
export function whatsappShareUrl(message: string, url: string): string {
  const text = message.trim() ? `${message.trim()} ${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Telegram's share deep link — the #2 messenger in KG; the OG card already
 * unfurls there. Telegram takes url and text as separate params.
 */
export function telegramShareUrl(message: string, url: string): string {
  const base = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
  return message.trim() ? `${base}&text=${encodeURIComponent(message.trim())}` : base;
}

/**
 * A WhatsApp link that opens the chat with ONE specific person, message
 * pre-filled — no contact picker. For a 150-guest toi this is the difference
 * between an evening of copy-paste and a few minutes of tapping, which is why
 * it sits behind the paid tier.
 */
export function whatsappDirectUrl(digits: string, message: string, url: string): string {
  const text = message.trim() ? `${message.trim()} ${url}` : url;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
