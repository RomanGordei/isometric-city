import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      /**
       * This repo intentionally uses refs + effect-driven state updates for
       * real-time simulation/render loops. The stricter react-hooks rules
       * (set-state-in-effect/immutability/refs) are not compatible with those patterns.
       */
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default config;
