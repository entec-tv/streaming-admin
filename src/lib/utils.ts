import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Automatically formats a MAC address string:
 * - Converts Eastern Arabic / Indic numbers to Western digits
 * - Strips all non-hexadecimal characters (keeps only 0-9, A-F)
 * - Converts letters to uppercase
 * - Automatically groups into 2-character hex pairs separated by colons (:)
 * - Automatically inserts a colon after every 2 characters when actively typing
 * - Handles backspacing cleanly so the user doesn't get trapped by auto-inserted colons
 * - Restricts length to 12 hex digits (17 chars total formatted)
 */
export function formatMacAddress(input: string, prevInput?: string): string {
  if (!input) return "";

  // Convert Eastern Arabic/Indic numerals to Western Arabic numerals if present
  const normalized = input.replace(/[٠-٩۰-۹]/g, (d) =>
    String(d.charCodeAt(0) - (d.charCodeAt(0) >= 1776 ? 1776 : 1632))
  );

  const isDeleting = prevInput !== undefined && normalized.length < prevInput.length;
  let workingInput = normalized;

  // If user pressed backspace on a trailing colon (e.g. "AA:" -> "AA"),
  // delete the preceding character too so they aren't stuck re-triggering the colon
  if (isDeleting && prevInput.endsWith(":") && normalized === prevInput.slice(0, -1)) {
    workingInput = normalized.slice(0, -1);
  }

  const clean = workingInput.replace(/[^0-9A-Fa-f]/g, "").toUpperCase().slice(0, 12);
  if (!clean) return "";

  const parts = clean.match(/.{1,2}/g) || [];
  let res = parts.join(":");

  const isTyping = prevInput !== undefined ? !isDeleting : false;
  if (isTyping && clean.length < 12 && clean.length % 2 === 0) {
    res += ":";
  }

  return res;
}
