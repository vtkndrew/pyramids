import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

export default defineConfig([
  ...fsd.configs.recommended,
  { ignores: ["./src/main.tsx"] }, // HTML entry delegates to app bootstrap.
  { files: ["./src/**"], rules: { "fsd/insignificant-slice": "off" } }, // One page composes independently testable scenarios.
]);
