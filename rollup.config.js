import typescript from 'rollup-plugin-typescript2';
import babel from 'rollup-plugin-babel';

const pkg = require('./package.json');

const globals =  {
    'react': 'React',
    'decko': 'decko',
    '@viewjs/utils': 'viewjs.utils'
};

 
export default {
    input: './src/index.ts',
    // output: {
    //     file: './dist/bolighed-autocompleter.js',
    //     format: 'esm',
    //     name: 'bolighed.autocompleter',
    // },
    output: [{
        file: pkg.browser,
        format: 'umd',
        name: 'bolighed.autocompleter',
        globals
    }, {
        file: pkg.module,
        format: 'es',
        globals
    }],
    external: [
        'react', '@viewjs/utils', 'decko'
    ],
    plugins: [
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    module: 'ES2015'
                }
            }
        }),
        babel({
            exclude: ['node_modules/**']
        })
    ]
}