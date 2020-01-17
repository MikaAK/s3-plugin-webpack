import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import ProgressBar from 'progress'
import cdnizer from 'cdnizer'
import _ from 'lodash'
import mime from 'mime/lite'
import {S3, CloudFront} from 'aws-sdk'

import packageJson from '../package.json'

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
      cloudfrontInvalidateOptions = {},
      priority
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
      priority,
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

    compiler.hooks.done.tapPromise(packageJson.name, async(compilation) => {
      var error

      if (!hasRequiredUploadOpts)
        error = `S3Plugin-RequiredS3UploadOpts: ${REQUIRED_S3_UP_OPTS.join(', ')}`

      if (error) return compileError(compilation, error)

      if (isDirectoryUpload) {
        const dPath = addSeperatorToPath(this.options.directory)

        return this.getAllFilesRecursive(dPath)
          .then((files) => this.handleFiles(files))
          .catch(e => this.handleErrors(e, compilation))
      } else {
        return this.getAssetFiles(compilation)
          .then((files) => this.handleFiles(files))
          .catch(e =>  this.handleErrors(e, compilation))
      }
    })
  }

  handleFiles(files) {
    return this.changeUrls(files)
      .then((files) => this.filterAllowedFiles(files))
      .then((files) => this.uploadFiles(files))
      .then(() => this.invalidateCloudfront())
  }

  async handleErrors(error, compilation) {
    compileError(compilation, `S3Plugin: ${error}`)
    throw error
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

    this.cdnizerOptions.files = allHtml.map(({name}) => `{/,}*${name}*`)
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

    this.client = new S3(this.clientConfig.s3Options)
    this.isConnected = true
  }

  transformBasePath() {
    return Promise.resolve(this.basePathTransform(this.options.basePath))
      .then(addTrailingS3Sep)
      .then(nPath => this.options.basePath = nPath)
  }

  setupProgressBar(uploadFiles) {
    const progressTotal = uploadFiles
      .reduce((acc, {upload}) => upload.totalBytes + acc, 0)

    const progressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
      complete: '>',
      incomplete: '∆',
      total: progressTotal
    })

    var progressValue = 0

    uploadFiles.forEach(function({upload}) {
      upload.on('httpUploadProgress', function({loaded}) {
        progressValue += loaded

        progressBar.update(progressValue)
      })
    })
  }

  prioritizeFiles(files) {
    const remainingFiles = [...files]
    const prioritizedFiles = this.options.priority
      .map(reg => _.remove(remainingFiles, (file) => reg.test(file.name)))


    return [remainingFiles, ...prioritizedFiles]
  }

  uploadPriorityChunk(priorityChunk) {
    const uploadFiles = priorityChunk.map(file => this.uploadFile(file.name, file.path))


    return Promise.all(uploadFiles.map(({promise}) => promise))
  }

  uploadInPriorityOrder(files) {
    const priorityChunks = this.prioritizeFiles(files)
    const uploadFunctions = priorityChunks
      .map(priorityChunk =>
        () => this.uploadPriorityChunk(priorityChunk))


    return uploadFunctions.reduce((promise, uploadFn) => promise.then(uploadFn), Promise.resolve())
  }

  uploadFiles(files = []) {
    return this.transformBasePath()
      .then(() => {
        if (this.options.priority) {
          return this.uploadInPriorityOrder(files)
        } else {
          const uploadFiles = files.map(file => this.uploadFile(file.name, file.path))

          if (this.options.progress) {
            this.setupProgressBar(uploadFiles)
          }

          return Promise.all(uploadFiles.map(({promise}) => promise))
        }
      })
  }

  uploadFile(fileName, file) {
    let Key = this.options.basePath + fileName
    const s3Params = _.mapValues(this.uploadOptions, (optionConfig) => {
      return _.isFunction(optionConfig) ? optionConfig(fileName, file) : optionConfig
    })

    // avoid noname folders in bucket
    if (Key[0] === '/')
      Key = Key.substr(1)

    if (s3Params.ContentType === undefined)
      s3Params.ContentType = mime.getType(fileName)

    const Body = fs.createReadStream(file)
    const upload = this.client.upload(
      _.merge({Key, Body}, DEFAULT_UPLOAD_OPTIONS, s3Params)
    )

    if (!this.noCdnizer)
      this.cdnizerOptions.files.push(`*${fileName}*`)

    return {upload, promise: upload.promise()}
  }

  invalidateCloudfront() {
    const {clientConfig, cloudfrontInvalidateOptions} = this

    if (cloudfrontInvalidateOptions.DistributionId) {
      const {accessKeyId, secretAccessKey, sessionToken} = clientConfig.s3Options
      const cloudfront = new CloudFront({accessKeyId, secretAccessKey, sessionToken})

      if (!_.isArray(cloudfrontInvalidateOptions.DistributionId))
        cloudfrontInvalidateOptions.DistributionId = [cloudfrontInvalidateOptions.DistributionId]

      const cloudfrontInvalidations = cloudfrontInvalidateOptions.DistributionId
        .map((DistributionId) => new Promise((resolve, reject) => {
          cloudfront.createInvalidation({
            DistributionId,
            InvalidationBatch: {
              CallerReference: Date.now().toString(),
              Paths: {
                Quantity: cloudfrontInvalidateOptions.Items.length,
                Items: cloudfrontInvalidateOptions.Items
              }
            }
          }, (err, res) => {
            if (err)
              reject(err)
            else
              resolve(res.Id)
          })
        }))

      return Promise.all(cloudfrontInvalidations)
    } else {
      return Promise.resolve(null)
    }
  }
}
