import { Inter, JetBrains_Mono, Poppins } from "next/font/google";

/**
 * Trustech Design Language typefaces, self-hosted by next/font.
 *
 * Each exposes a CSS variable that `globals.css` maps onto a Tailwind font
 * token. `display: "swap"` keeps text visible during font load (CLS budget).
 */

/** Body, UI and dashboard text. */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

/** Hero and H1–H3 headings. */
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

/** Student IDs, reference numbers and codes. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/** Convenience: every font variable, for the <html> class list. */
export const fontVariables = [
  inter.variable,
  poppins.variable,
  jetbrainsMono.variable,
].join(" ");
