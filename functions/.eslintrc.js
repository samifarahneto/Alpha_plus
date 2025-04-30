module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    extends: ["eslint:recommended"],
    parserOptions: {
        ecmaVersion: 12,
    },
    rules: {
        "object-curly-spacing": ["error", "never"],
        indent: ["error", 4],
        "comma-dangle": ["error", "always-multiline"],
        "no-unused-vars": ["warn"], // Torna 'no-unused-vars' apenas um aviso
    },
    overrides: [
        {
            files: ["**/*.spec.*"],
            env: {
                mocha: true,
            },
            rules: {},
        },
    ],
    globals: {},
};
