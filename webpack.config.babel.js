import path from 'path'
import {DefinePlugin} from 'webpack'

const CONTEXT = path.resolve(__dirname),
      {NODE_ENV} = process.env,
      createPath = nPath => path.resolve(CONTEXT, nPath),
      SRC_PATH = createPath('src'),
      NODE_MODULES = createPath('node_modules')

var config = {
  context: CONTEXT,
  entry: './src/s3_plugin.js',
  target: 'node',

  output: {
    path: createPath('dist'),
    library: 'webpack-s3-plugin',
    libraryTarget: 'umd',
    filename: 's3_plugin.js'
  },

  plugins: [
    new DefinePlugin({
      __DEV__: NODE_ENV === 'development' || NODE_ENV === 'test'
    })
  ],

  module: {
    preLoaders: [{
      test: /\.js/,
      loader: 'eslint',
      include: [SRC_PATH],
      exclude: [NODE_MODULES]
    }],
    loaders: [{
      test: /\.js/,
      loader: 'babel',
      include: [SRC_PATH, createPath('test')],
      exclude: [NODE_MODULES]
    }]
  },

  externals: NODE_ENV === 'test' ? [] : [
    'cdnizer',
    'aws-sdk',
    'lodash',
    's3',
    'recursive-readdir',
    'progress'
  ],

  resolve: {
    extensions: ['.js','']
  }
}

module.exports = config
