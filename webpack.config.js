const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin');

// Root paths.
const root = path.resolve(__dirname, './')
const build = path.resolve(__dirname, './build')
const src = path.resolve(__dirname, './src')

module.exports = {
  mode: 'production',
  target: 'node',
  entry: `${src}/index.ts`,
  output: {
    path: build,
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.(ts|js|json)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    modules: ['node_modules'],
  },
  plugins: [
    // Cleans the destination folder before building new.
    new CleanWebpackPlugin([build], { root }),
  ],
}
