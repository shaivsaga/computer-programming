"use client";

import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

export default function Providers({ children }) {
  return <Theme theme={neutralTheme} mode="light">{children}</Theme>;
}
