
export default {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    // Disable strict style rules to prevent deployment blocking
    "quotes": "off",
    "indent": "off",
    "max-len": "off",
    "object-curly-spacing": "off",
    "comma-dangle": "off",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
};
