module.exports =  {
        root: true,
        parser:  '@typescript-eslint/parser',
        extends:  [ '@brightlayer-ui/eslint-config/ts' ],
        parserOptions:  {
            project: "./tsconfig.json",
        },
        rules: {
          '@typescript-eslint/naming-convention': false
        },
        env: {
            browser: true
        }
    };
