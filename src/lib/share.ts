/**
 * Build a WhatsApp "click to share" deep link. Opens WhatsApp (mobile app or
 * web) with the message + URL pre-filled; the recipient picker is WhatsApp's.
 * The URL unfurls via the invite's OpenGraph card. `message` is optional.
 */
export function whatsappShareUrl(message: string, url: string): string {
  const text = message.trim() ? `${message.trim()} ${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
