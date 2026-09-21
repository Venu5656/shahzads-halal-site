import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "legacy/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    rules: {
      // `_prev` is the unused first argument every useActionState action receives.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/app/page.tsx", "src/components/home/**"],
    rules: {
      // The ported homepage must keep using plain <img>: next/image would
      // change the markup the legacy stylesheet and its animations target.
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
