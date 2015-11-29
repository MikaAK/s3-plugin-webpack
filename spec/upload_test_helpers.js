import _ from 'lodash'
import path from 'path'
import webpack from 'webpack'
import S3WebpackPlugin from '../src/s3_plugin'

const BUCKET = process.env.AWS_BUCKET,
      S3_URL = `https://s3-us-west-2.amazonaws.com/${BUCKET}/`

var generatePluginConfig = function(config) {
  return new S3WebpackPlugin(_.extend(config, {
    s3Options: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-west-2'
    },
    s3UploadOptions: {
      Bucket: BUCKET
    },
    cdnizerOptions: {
      defaultCDNBase: S3_URL
    }
  }))
}

export default {
  createWebpackConfig({config, s3config}) {
    return _.extend({
      entry: path.join(__dirname, 'fixtures/index.js'),
      plugins: [generatePluginConfig(s3Config)],
      ouput: {
        path: OUTPUT_PATH,
        filename: 'index.js'
      }
    }, config)
  }
}
