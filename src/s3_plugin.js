import http from 'http'
import https from 'https'
import s3 from 's3'
import fs from 'fs'
import path from 'path'
import ProgressBar from 'progress'
import cdnizer from 'cdnizer'
import _ from 'lodash'
import aws from 'aws-sdk'

import {
  addSeperatorToPath,
  addTrailingS3Sep,
  getDirectoryFilesRecursive,
  testRule,
  UPLOAD_IGNORES,
  DEFAULT_UPLOAD_OPTIONS,
  REQUIRED_S3_UP_OPTS,
  PATH_SEP,
  DEFAULT_TRANSFORM,
} from './helpers'

http.globalAgent.maxSockets = https.globalAgent.maxSockets = 50

const compileError = function(compilation, error) {
  compilation.errors.push(new Error(error))
}

module.exports = class S3Plugin {
  constructor(options = {}) {
    var {
      include,
      exclude,
      progress,
      basePath,
      directory,
      htmlFiles,
      basePathTransform = DEFAULT_TRANSFORM,
      s3Options = {},
      cdnizerOptions = {},
      s3UploadOptions = {},
      cloudfrontInvalidateOptions = {}
    } = options

    this.uploadOptions = s3UploadOptions
    this.cloudfrontInvalidateOptions = cloudfrontInvalidateOptions
    this.isConnected = false
    this.cdnizerOptions = cdnizerOptions
    this.urlMappings = []
    this.uploadTotal = 0
    this.uploadProgress = 0
    this.basePathTransform = basePathTransform
    basePath = basePath ? addTrailingS3Sep(basePath) : ''

    this.options = {
      directory,
      include,
      exclude,
      basePath,
      htmlFiles: typeof htmlFiles === 'string' ? [htmlFiles] : htmlFiles,
      progress: _.isBoolean(progress) ? progress : true
    }

    this.clientConfig = {
      s3Options,
      maxAsyncS3: 50
    }

    this.noCdnizer = !Object.keys(this.cdnizerOptions).length

    if (!this.noCdnizer && !this.cdnizerOptions.files)
      this.cdnizerOptions.files = []
  }

  apply(compiler) {
    this.connect()

    const isDirectoryUpload = !!this.options.directory,
          hasRequiredUploadOpts = _.every(REQUIRED_S3_UP_OPTS, type => this.uploadOptions[type])

    // Set directory to output dir or custom
    this.options.directory = this.options.directory          ||
                             compiler.options.output.path    ||
                             compiler.options.output.context ||
                             '.'

    compiler.plugin('after-emit', (compilation, cb) => {
      var error

      if (!hasRequiredUploadOpts)
        error = `S3Plugin-RequiredS3UploadOpts: ${REQUIRED_S3_UP_OPTS.join(', ')}`

      if (error) {
        compileError(compilation, error)
        cb()
      }

      if (isDirectoryUpload) {
        const dPath = addSeperatorToPath(this.options.directory)

        this.getAllFilesRecursive(dPath)
          .then((files) => this.handleFiles(files, compilation))
          .then(() => cb())
          .catch(e => this.handleErrors(e, compilation, cb))
      } else {
        this.getAssetFiles(compilation)
          .then((files) => this.handleFiles(files, compilation))
          .then(() => cb())
          .catch(e => this.handleErrors(e, compilation, cb))
      }
    })
  }

  handleFiles(files, compilation) {
    return this.changeUrls(files)
      .then((files) => this.filterAllowedFiles(files))
      .then((files) => this.uploadFiles(files, compilation))
      .then(() => this.invalidateCloudfront())
  }

  handleErrors(error, compilation, cb) {
    compileError(compilation, `S3Plugin: ${error}`)
    cb()
  }

  getAllFilesRecursive(fPath) {
    return getDirectoryFilesRecursive(fPath)
  }

  addPathToFiles(files, fPath) {
    return files.map(file => ({name: file, path: path.resolve(fPath, file)}))
  }

  getFileName(file = '') {
    if (_.includes(file, PATH_SEP))
      return file.substring(_.lastIndexOf(file, PATH_SEP) + 1)
    else
      return file
  }

  getAssetFiles({assets}) {
    const files = _.map(assets, (value, name) => ({name, path: value.existsAt}))

    return Promise.resolve(files)
  }

  cdnizeHtml(file) {
    return new Promise((resolve, reject) => {
      fs.readFile(file.path, (err, data) => {
        if (err)
          return reject(err)

        fs.writeFile(file.path, this.cdnizer(data.toString()), (err) => {
          if (err)
            return reject(err)

          resolve(file)
        })
      })
    })
  }

  changeUrls(files = []) {
    if (this.noCdnizer)
      return Promise.resolve(files)

    var allHtml

    const {directory, htmlFiles = []} = this.options

    if (htmlFiles.length)
      allHtml = this.addPathToFiles(htmlFiles, directory).concat(files)
    else
      allHtml = files

    this.cdnizerOptions.files = allHtml.map(({name}) => `*${name}*`)
    this.cdnizer = cdnizer(this.cdnizerOptions)

    const [cdnizeFiles, otherFiles] = _(allHtml)
      .uniq('name')
      .partition((file) => /\.(html|css)/.test(file.name))
      .value()

    return Promise.all(cdnizeFiles.map(file => this.cdnizeHtml(file)).concat(otherFiles))
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

    isInclude = include ? testRule(include, file) : true
    isExclude = exclude ? testRule(exclude, file) : false

    return isInclude && !isExclude
  }

  connect() {
    if (this.isConnected)
      return

    this.client = s3.createClient(this.clientConfig)
    this.isConnected = true
  }

  transformBasePath(compilation) {
    return Promise.resolve(this.basePathTransform(this.options.basePath, compilation))
      .then(addTrailingS3Sep)
      .then(nPath => this.options.basePath = nPath)
  }

  setupProgressBar(uploadFiles) {
    var progressAmount = Array(uploadFiles.length)
    var progressTotal = Array(uploadFiles.length)
    var progressTracker = 0
    const calculateProgress = () => _.sum(progressAmount) / _.sum(progressTotal)
    const countUndefined = (array) => _.reduce(array, (res, value) => {
      return res += _.isUndefined(value) ? 1 : 0
    }, 0)

    const progressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
      complete: '>',
      incomplete: '∆',
      total: 100
    })

    uploadFiles.forEach(function({upload}, i) {
      upload.on('progress', function() {
        var definedModifier,
            progressValue

        progressTotal[i] = this.progressTotal
        progressAmount[i] = this.progressAmount
        definedModifier = countUndefined(progressTotal) / 10
        progressValue = calculateProgress() - definedModifier

        if (progressValue !== progressTracker) {
          progressBar.update(progressValue)
          progressTracker = progressValue
        }
      })
    })
  }

  uploadFiles(files = [], compilation) {
    return this.transformBasePath(compilation)
      .then(() => {
        var uploadFiles = files.map(file => this.uploadFile(file.name, file.path))

        if (this.options.progress) {
          this.setupProgressBar(uploadFiles)
        }

        return Promise.all(uploadFiles.map(({promise}) => promise))
      })
  }

  uploadFile(fileName, file) {
    let Key = this.options.basePath + fileName
    const s3Params = _.mapValues(this.uploadOptions, (optionConfig) => {
      return _.isFunction(optionConfig) ? optionConfig(fileName, file) : optionConfig
    })

    // avoid noname folders in bucket
    if (Key[0] === '/') {
      Key = Key.substr(1)
    }

    // Remove Gzip from encoding if ico
    if (/\.ico/.test(fileName) && s3Params.ContentEncoding === 'gzip')
      delete s3Params.ContentEncoding

    const upload = this.client.uploadFile({
      localFile: file,
      s3Params: _.merge({Key}, DEFAULT_UPLOAD_OPTIONS, s3Params)
    })

    if (!this.noCdnizer)
      this.cdnizerOptions.files.push(`*${fileName}*`)

    const promise = new Promise((resolve, reject) => {
      upload.on('error', reject)
      upload.on('end', () => resolve(file))
    })

    return {upload, promise}
  }

  invalidateCloudfront() {
    const {clientConfig, cloudfrontInvalidateOptions} = this

    return new Promise(function(resolve, reject) {
      if (cloudfrontInvalidateOptions.DistributionId) {
        const {accessKeyId, secretAccessKey} = clientConfig.s3Options
        const cloudfront = new aws.CloudFront()

        if (accessKeyId && secretAccessKey)
          cloudfront.config.update({accessKeyId, secretAccessKey})

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
