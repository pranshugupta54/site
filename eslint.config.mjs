import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // newer rules that flag existing patterns (client-only values set after mount,
    // plain <a> to app routes) — warn until those call sites are revisited
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "mockups/**"] },
];

export default eslintConfig;
