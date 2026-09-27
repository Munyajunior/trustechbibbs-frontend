import localFont from "next/font/local";

/**
 * Self-hosted brand fonts. Keeping the WOFF2 files in the repository makes
 * production builds independent of Google Fonts network availability.
 */
export const inter = localFont({
  src: "../assets/fonts/inter-latin.woff2",
  weight: "400 600",
  variable: "--font-inter",
  display: "swap",
});

export const poppins = localFont({
  src: [
    { path: "../assets/fonts/poppins-500-latin.woff2", weight: "500" },
    { path: "../assets/fonts/poppins-600-latin.woff2", weight: "600" },
    { path: "../assets/fonts/poppins-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: "../assets/fonts/jetbrains-mono-latin.woff2",
  weight: "400 500",
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontVariables = [
  inter.variable,
  poppins.variable,
  jetbrainsMono.variable,
].join(" ");
