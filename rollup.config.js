import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import styles from 'rollup-plugin-styles';
import { terser } from 'rollup-plugin-terser';
import { browser, main, module } from './package.json';

export default [
  {
    input: 'src/index.ts',
    output: {
      name: 'Handy',
      file: browser,
      format: 'umd',
      sourcemap: true,
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
      }),
      resolve(),
      commonjs(),
      styles(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
  },
  {
    input: 'src/index.ts',
    plugins: [
      resolve(),
      commonjs(),
      styles(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
    output: [
      { file: main, format: 'cjs', sourcemap: true },
      { file: module, format: 'es', sourcemap: true },
    ],
  },
];
