import path from 'path'
import {DefinePlugin} from 'webpack'

const CONTEXT = path.resolve(__dirname),
      {NODE_ENV} = process.env

var createPath = function(nPath) {
  return path.resolve(CONTEXT, nPath)
}

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
    loaders: [{
      test: /\.js/,
      loader: 'babel',
      include: [createPath('src'), createPath('test')],
      exclude: [createPath('node_modules')]
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
