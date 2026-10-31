import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // reads the stored snake high score after mount — warn until this file is revisited
    files: ["src/components/github-board.tsx"],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "mockups/**"] },
];

export default eslintConfig;
