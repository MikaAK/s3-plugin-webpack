import _ from 'lodash'
import https from 'https'
import path from 'path'
import webpack from 'webpack'
import fs from 'fs'
import {S3} from 'aws-sdk'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import s3Opts from './s3_options'
import S3WebpackPlugin from '../src/s3_plugin'
import {assert} from 'chai'
import {spawnSync} from 'child_process'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const S3_URL = `https://s3.dualstack.${s3Opts.AWS_REGION}.amazonaws.com/${s3Opts.AWS_BUCKET}/`,
      S3_ERROR_REGEX = /<Error>/,
      OUTPUT_FILE_NAME = 's3Test',
      OUTPUT_PATH = path.resolve(__dirname, '.tmp'),
      ENTRY_PATH = path.resolve(__dirname, 'fixtures/index.js'),
      createBuildFailError = (errors) => `Webpack Build Failed ${errors}`

var deleteFolderRecursive = function(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file) {
      var curPath = `${path}/${file}`

      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath)
      } else {
        // delete file
        fs.unlinkSync(curPath)
      }
    })

    fs.rmdirSync(path)
  }
}

var generateS3Config = function(config) {
  var params = _.merge(
    {},
    {
      s3Options: s3Opts.s3Options,
      s3UploadOptions: s3Opts.s3UploadOptions,
    },
    config
  )

  return new S3WebpackPlugin(params)
}

export default {
  OUTPUT_FILE_NAME,
  OUTPUT_PATH,
  S3_URL,
  S3_ERROR_REGEX,

  fetch(url) {
    return new Promise(function(resolve, reject) {
      https.get(url, function(response) {
        var body = ''

        response.on('data', (data) => (body += data))
        response.on('end', () => resolve(body))
        response.on('error', reject)
      })
    })
  },

  addSlashToPath(pathName) {
    return pathName.endsWith(path.sep) ? pathName : pathName + path.sep
  },

  createFolder(pathToFolder) {
    spawnSync('mkdir', ['-p', pathToFolder], {stdio: 'inherit'})
  },

  testForFailFromStatsOrGetS3Files({errors, stats}) {
    if (errors) return assert.fail([], errors, createBuildFailError(errors))

    return this.getBuildFilesFromS3(this.getFilesFromStats(stats))
  },

  testForFailFromDirectoryOrGetS3Files(directory) {
    return ({errors}) => {
      var basePath = this.addSlashToPath(`${directory}`)

      if (errors) return assert.fail([], errors, createBuildFailError(errors))
      else
        return this.getBuildFilesFromS3(
          this.getFilesFromDirectory(directory, basePath)
        )
    }
  },

  cleanOutputDirectory() {
    deleteFolderRecursive(OUTPUT_PATH)
  },

  createOutputPath() {
    if (!fs.existsSync(OUTPUT_PATH)) fs.mkdirSync(OUTPUT_PATH)
  },

  createRandomFile(newPath) {
    var hash = Math.random() * 10000,
        fileName = `random-file-${hash}`,
        newFileName = `${newPath}/${fileName}`

    // Create Random File to upload
    fs.writeFileSync(newFileName, `This is a new file - ${hash}`)

    return {fullPath: newFileName, fileName}
  },

  createWebpackConfig({config, s3Config} = {}) {
    return _.extend(
      {
        entry: ENTRY_PATH,
        module: {
          rules: [
            {
              test: /\.png/,
              use: [
                {
                  loader: 'file-loader',
                  options: {
                    name: '[name]-[contenthash:8].[ext]',
                  },
                },
              ],
            },
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin(),
          new MiniCssExtractPlugin({
            filename: '[name]-[contenthash:8].css',
          }),
          generateS3Config(s3Config),
        ],
        output: {
          publicPath: '/',
          path: OUTPUT_PATH,
          filename: `${OUTPUT_FILE_NAME}-[contenthash:8]-${+new Date()}.js`,
        },
      },
      config
    )
  },

  runWebpackConfig({config}) {
    this.createOutputPath()

    return new Promise(function(resolve, reject) {
      webpack(config, function(err, stats) {
        if (err) {
          reject(err)

          return
        }

        // console.log(JSON.stringify(arguments, null, 2))
        if (stats.toJson().errors.length)
          resolve({errors: stats.toJson().errors})
        else resolve({config, stats})
      })
    })
  },

  getFilesFromDirectory(directory, basePath) {
    var res = function readDirectory(dir) {
      return fs.readdirSync(dir).reduce(function(res, file) {
        var fPath = path.resolve(dir, file)

        if (fs.lstatSync(fPath).isDirectory())
          res.push(...readDirectory(fPath))
        else res.push(fPath)

        return res
      }, [])
    }.call(this, directory)

    return res.map((file) => file.replace(basePath, ''))
  },

  getFilesFromStats(stats) {
    return _.map(stats.toJson().assets, 'name')
  },

  getBuildFilesFromS3(files) {
    var fetchFiles = files.filter((file) => !/.*\.html$/.test(file))

    return Promise.all(
      fetchFiles.map((file) => this.fetch(S3_URL + file))
    ).then((nFiles) =>
      nFiles.map((file, i) => {
        var fetchFile = fetchFiles[i]

        return {
          name: fetchFile,
          s3Url: S3_URL + fetchFile,
          actual: file,
          expected: this.readFileFromOutputDir(fetchFile),
        }
      })
    )
  },

  readFileFromOutputDir(file) {
    return fs.readFileSync(path.resolve(OUTPUT_PATH, file)).toString()
  },

  testForErrorsOrGetFileNames({stats, errors}) {
    if (errors) return assert.fail([], errors, createBuildFailError(errors))

    return this.getFilesFromStats(stats)
  },

  assertFileMatches(files) {
    var errors = _(files)
      .map(({expected, actual, name, s3Url}) => {
        return assert.equal(
          actual,
          expected,
          `File: ${name} URL: ${s3Url} - NO MATCH`
        )
      })
      .compact()
      .value()

    return Promise.all(_.some(errors) ? errors : files)
  },

  getCloudfrontInvalidateOptions() {
    return s3Opts.cloudfrontInvalidateOptions
  },

  getS3Object(key) {
    const s3 = new S3({
      accessKeyId: s3Opts.AWS_ACCESS_KEY,
      secretAccessKey: s3Opts.AWS_SECRET_ACCESS_KEY,
    })

    return new Promise((resolve, reject) => {
      s3.getObject({Bucket: s3Opts.AWS_BUCKET, Key: key}, function(
        err,
        data
      ) {
        if (!err) {
          resolve(data)
        } else {
          reject(err)
        }
      })
    })
  },
}
