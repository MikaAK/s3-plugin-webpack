import http from 'http'
import https from 'https'
import s3 from 's3'
import fs from 'fs'
import path from 'path'
//import ProgressBar from 'progress'
import cdnizer from 'cdnizer'
import _ from 'lodash'
import aws from 'aws-sdk'
import gitsha from 'git-bundle-sha'

http.globalAgent.maxSockets = https.globalAgent.maxSockets = 50

const UPLOAD_IGNORES = [
  '.DS_Store'
]

const DEFAULT_UPLOAD_OPTIONS = {
  ACL: 'public-read'
}

const DEFAULT_S3_OPTIONS = {
  region: 'us-west-2'
}

const REQUIRED_S3_OPTS = ['accessKeyId', 'secretAccessKey'],
      REQUIRED_S3_UP_OPTS = ['Bucket']

const PATH_SEP = path.sep

const S3_PATH_SEP = '/'

module.exports = class S3Plugin {
  constructor(options = {}) {
    var {
      include,
      exclude,
      basePath,
      directory,
      htmlFiles,
      s3Options = {},
      cdnizerOptions = {},
      s3UploadOptions = {},
      cloudfrontInvalidateOptions = {},
      git = {}
      } = options

    this.uploadOptions = s3UploadOptions
    this.cloudfrontInvalidateOptions = cloudfrontInvalidateOptions
    this.isConnected = false
    this.cdnizerOptions = cdnizerOptions
    this.urlMappings = []
    this.uploadTotal = 0
    this.uploadProgress = 0
    basePath = basePath ? basePath.replace(/\/?(\?|#|$)/, '/$1') : ''

    this.options = {
      git,
      directory,
      include,
      exclude,
      basePath,
      htmlFiles: typeof htmlFiles === 'string' ? [htmlFiles] : htmlFiles
    }

    this.clientConfig = {
      maxAsyncS3: 50,
      s3Options: _.merge({}, DEFAULT_S3_OPTIONS, s3Options)
    }

    this.noCdnizer = !Object.keys(this.cdnizerOptions).length

    if (!this.noCdnizer && !this.cdnizerOptions.files)
      this.cdnizerOptions.files = []
  }

  apply(compiler) {
    this.connect()

    var isDirectoryUpload = !!this.options.directory,
        hasRequiredOptions = this.client.s3.config.credentials !== null,
        hasRequiredUploadOpts = REQUIRED_S3_UP_OPTS.every(type => this.uploadOptions[type])

    // Set directory to output dir or custom
    this.options.directory = this.options.directory || compiler.options.output.path || compiler.options.output.context || '.'

    compiler.plugin('after-emit', (compilation, cb) => {
      if (!hasRequiredOptions) {
        compilation.errors.push(new Error(`S3Plugin: Must provide ${REQUIRED_S3_OPTS.join(', ')}`))
        cb()
      }

      if (!hasRequiredUploadOpts) {
        compilation.errors.push(new Error(`S3Plugin-RequiredS3UploadOpts: ${REQUIRED_S3_UP_OPTS.join(', ')}`))
        cb()
      }

      if (isDirectoryUpload) {
        this.addGitHashToBasePath(this.options.basePath)
          .then((function(basePath) {
            this.options.basePath = basePath
            let dPath = this.addSeperatorToPath(this.options.directory)
            this.getAllFilesRecursive(dPath)
              .then(this.filterAndTranslatePathFromFiles(dPath))
              .then(this.filterAllowedFiles.bind(this))
              .then(this.uploadFiles.bind(this))
              .then(this.changeHtmlUrls.bind(this))
              .then(this.invalidateCloudfront.bind(this))
              .then(() => cb())
              .catch(e => {
                compilation.errors.push(new Error(`S3Plugin: ${e}`))
                cb()
              })
          }).bind(this))
          .catch(e => {
            compilation.errors.push(new Error(`S3Plugin: ${e}`))
            cb()
          })
      } else {
        this.uploadFiles(this.getAssetFiles(compilation))
          .then(this.changeHtmlUrls.bind(this))
          .then(this.invalidateCloudfront.bind(this))
          .then(() => cb())
          .catch(e => {
            compilation.errors.push(new Error(`S3Plugin: ${e}`))
            cb()
          })
      }
    })
  }

  addGitHashToBasePath(basePath) {
    return new Promise((resolve, reject) => {
      if (!this.options.git || !this.options.git.addGitHash) resolve({basePath})
      var DirectoryLevelToInsertHashConf = this.options.git.DirectoryLevelToInsertHash
      gitsha(function(err, sha) {
        if (err) reject(err)
        var basePathParts = basePath.split(S3_PATH_SEP)
        var DirectoryLevelToInsertHash = basePathParts.length - 2 // set directory level to insert git SHA; default is the last\deepest directory
        if (DirectoryLevelToInsertHashConf) { // unless DirectoryLevelToInsertHashConf is defined
          DirectoryLevelToInsertHash = DirectoryLevelToInsertHashConf - 1 // use the defined directory level and convert it to array index
        }
        basePathParts[DirectoryLevelToInsertHash] += `.${sha.substring(7, 0)}`
        resolve(basePathParts.join(S3_PATH_SEP))
      })
    })
  }

  filterAndTranslatePathFromFiles(rootPath) {
    return files => {
      return files.map(file => {
        return {
          path: file,
          name: file.replace(rootPath, '').split(PATH_SEP).join(S3_PATH_SEP)
        }
      })
    }
  }

  addSeperatorToPath(fPath) {
    return fPath.endsWith(PATH_SEP) ? fPath : fPath + PATH_SEP
  }

  getAllFilesRecursive(fPath) {
    return new Promise((resolve, reject) => {
      var results = []

      fs.readdir(fPath, (err, list) => {
        if (err)
          return reject(err)

        var i = 0;

        (function next() {
          var file = list[i++]

          if (!file)
            return resolve(results)

          file = (fPath.endsWith(PATH_SEP) || file.startsWith(PATH_SEP) ? fPath : fPath + PATH_SEP) + file

          fs.stat(file, (err, stat) => {
            if (stat && stat.isDirectory()) {
              this.getAllFilesRecursive(file)
                .then((res) => {
                  results.push(...res)
                  next.call(this)
                })
            } else {
              results.push(file)
              next.call(this)
            }
          })
        }).call(this)
      })
    })
  }

  addPathToFiles(files, fPath) {
    return files.map(file => path.resolve(fPath, file))
  }

  getFileName(file = '') {
    return file.includes(PATH_SEP) ? file.substring(file.lastIndexOf(PATH_SEP) + 1) : file
  }

  getAssetFiles({chunks, options}) {
    var outputPath = options.output.path

    var files = _(chunks)
      .pluck('files')
      .flatten()
      .map(name => ({path: path.resolve(outputPath, name), name}))
      .value()

    return this.filterAllowedFiles(files)
  }

  cdnizeHtml(htmlPath) {
    return new Promise((resolve, reject) => {
      fs.readFile(htmlPath, (err, data) => {
        if (err)
          return reject(err)

        fs.writeFile(htmlPath, this.cdnizer(data.toString()), function(err) {
          if (err)
            return reject(err)

          resolve()
        })
      })
    })
  }

  changeHtmlUrls() {
    if (this.noCdnizer)
      return Promise.resolve()

    var allHtml,
        {directory, htmlFiles} = this.options

    htmlFiles = htmlFiles || fs.readdirSync(directory).filter(file => /\.html$/.test(file))

    allHtml = this.addPathToFiles(htmlFiles, directory)

    this.cdnizer = cdnizer(this.cdnizerOptions)

    return Promise.all(allHtml.map(file => this.cdnizeHtml(file)))
  }

  filterAllowedFiles(files) {
    return files.reduce((res, file) => {
      if (this.isIncludeAndNotExclude(file.name) && !this.isIgnoredFile(file.name))
        res.push(file)

      return res
    }, [])
  }

  isIgnoredFile(file) {
    return _.some(UPLOAD_IGNORES, ignore => new RegExp(ignore).test(file))
  }

  isIncludeAndNotExclude(file) {
    var isExclude,
        isInclude,
        {include, exclude} = this.options

    isInclude = include ? include.test(file) : true
    isExclude = exclude ? exclude.test(file) : false

    return isInclude && !isExclude
  }

  connect() {
    if (this.isConnected)
      return

    this.client = s3.createClient(this.clientConfig)
    this.isConnected = true
  }

  uploadFiles(files = []) {
    //var sum = (array) => array.reduce((res, val) => res += val, 0)
    var uploadFiles = files.map(file => this.uploadFile(file.name, file.path))
    //var progressAmount = Array(files.length)
    //var progressTotal = Array(files.length)

    //var progressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
    //complete: '>',
    //incomplete: '∆',
    //total: 100
    //})

    //uploadFiles.forEach(function({upload}, i) {
    //upload.on('progress', function() {
    //progressTotal[i] = this.progressTotal
    //progressAmount[i] = this.progressAmount

    //progressBar.update((sum(progressAmount) / sum(progressTotal)).toFixed(2))
    //})
    //})

    return Promise.all(uploadFiles.map(({promise}) => promise))
  }

  uploadFile(fileName, file) {
    var upload,
        s3Params = _.merge({Key: this.options.basePath + fileName}, DEFAULT_UPLOAD_OPTIONS, this.uploadOptions)

    // Remove Gzip from encoding if ico
    if (/\.ico/.test(fileName) && s3Params.ContentEncoding === 'gzip')
      delete s3Params.ContentEncoding

    upload = this.client.uploadFile({
      localFile: file,
      s3Params
    })

    if (!this.noCdnizer)
      this.cdnizerOptions.files.push(`*${fileName}*`)

    var promise = new Promise(function(resolve, reject) {
      upload.on('error', reject)
      upload.on('end', () => resolve(file))
    })

    return {upload, promise}
  }

  invalidateCloudfront() {
    var {clientConfig, cloudfrontInvalidateOptions} = this

    return new Promise(function(resolve, reject) {
      if (cloudfrontInvalidateOptions.DistributionId) {
        var cloudfront = new aws.CloudFront()

        cloudfront.config.update({
          accessKeyId: clientConfig.s3Options.accessKeyId,
          secretAccessKey: clientConfig.s3Options.secretAccessKey,
        })

        cloudfront.createInvalidation({
          DistributionId: cloudfrontInvalidateOptions.DistributionId,
          InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: {
              Quantity: cloudfrontInvalidateOptions.Items.length,
              Items: cloudfrontInvalidateOptions.Items
            }
          }
        }, (err, res) => err ? reject(err) : resolve(res.Id))
      } else {
        return resolve(null)
      }
    })
  }
}