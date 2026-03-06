import { build } from 'esbuild'

build({
  entryPoints: ['src/index.ts'],
  outdir: 'build',
  outbase: 'src',
  outExtension: {
    '.js': '.cjs',
  },
  format: 'cjs',
  platform: 'node',
  target: 'node24',
  bundle: true,
  write: true,
  //minify: true,
  external: ['prettier'],
}).catch(() => process.exit(1))
