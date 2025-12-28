import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    // These rules are too strict for our game-style animation loops and refs.
    // We intentionally mutate objects stored in refs for performance, and we
    // intentionally sync refs to the latest state for rAF loops.
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
