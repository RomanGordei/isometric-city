import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    // Disable React Compiler immutability rules for game systems
    // These files use intentional ref mutations for performance in animation loops
    files: ["src/components/game/**/*.ts", "src/components/game/**/*.tsx"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

export default config;
