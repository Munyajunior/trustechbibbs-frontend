import "@testing-library/jest-dom";

// next/font is a build-time transform; stub it so component tests don't need it.
jest.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter", className: "font-inter" }),
  Poppins: () => ({ variable: "--font-poppins", className: "font-poppins" }),
  JetBrains_Mono: () => ({
    variable: "--font-jetbrains-mono",
    className: "font-jetbrains-mono",
  }),
}));
