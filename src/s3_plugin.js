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
  UPLOAD_IGNORES,
  DEFAULT_UPLOAD_OPTIONS,
  DEFAULT_S3_OPTIONS,
  REQUIRED_S3_OPTS,
  REQUIRED_S3_UP_OPTS,
  PATH_SEP,
  DEFAULT_TRANSFORM,
} from './helpers'

http.globalAgent.maxSockets = https.globalAgent.maxSockets = 50

var compileError = function(compilation, error) {
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
      indexOptions = {},
      gzipOptions = {},
      cacheOptions = {}
    } = options

    this.uploadOptions = s3UploadOptions
    this.cloudfrontInvalidateOptions = cloudfrontInvalidateOptions
    this.indexOptions = indexOptions
    this.gzipOptions = gzipOptions
    this.cacheOptions = cacheOptions
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
        hasRequiredUploadOpts = _.every(REQUIRED_S3_UP_OPTS, type => this.uploadOptions[type])

    // Set directory to output dir or custom
    this.options.directory = this.options.directory          ||
                             compiler.options.output.path    ||
                             compiler.options.output.context ||
                             '.'

    compiler.plugin('after-emit', (compilation, cb) => {
      var error

      if (!hasRequiredOptions)
        error = `S3Plugin: Must provide ${REQUIRED_S3_OPTS.join(', ')}`

      if (!hasRequiredUploadOpts)
        error = `S3Plugin-RequiredS3UploadOpts: ${REQUIRED_S3_UP_OPTS.join(', ')}`

      if (error) {
        compileError(compilation, error)
        cb()
      }

      if (isDirectoryUpload) {
        let dPath = addSeperatorToPath(this.options.directory)

        this.getAllFilesRecursive(dPath)
          .then((files) => this.handleFiles(files, cb))
          .then(() => cb())
          .catch(e => this.handleErrors(e, compilation, cb))
      } else {
        this.getAssetFiles(compilation)
          .then((files) => this.handleFiles(files))
          .then(() => cb())
          .catch(e => this.handleErrors(e, compilation, cb))
      }
    })
  }

  handleFiles(files) {
    return this.changeUrls(files)
      .then((files) => this.filterAllowedFiles(files))
      .then((files) => this.uploadFiles(files))
      .then(() => this.invalidateCloudfront())
      .then(() => this.setIndex())
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
    var files = _.map(assets, (value, name) => ({name, path: value.existsAt}))

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

    var allHtml,
        {directory, htmlFiles = []} = this.options

    if (htmlFiles.length)
      allHtml = this.addPathToFiles(htmlFiles, directory).concat(files)
    else
      allHtml = files

    this.cdnizerOptions.files = allHtml.map(({name}) => `*${name}*`)
    this.cdnizer = cdnizer(this.cdnizerOptions)

    // Add |css to regex - Add when cdnize css is done
    var [cdnizeFiles, otherFiles] = _(allHtml)
      .uniq('name')
      .partition((file) => /\.(html)/.test(file.name))
      .value()

    return Promise.all(cdnizeFiles.map(file => this.cdnizeHtml(file)).concat(otherFiles))
  }

  // For future implimentation
  // changeCssUrls(files = []) {
  //   if (this.noCdnizer)
  //     return Promise.resolve(files)

  //   data.replace(/url\(\/images/g, `url(${imagePath}`)

  //   return this.cdnizeCss(cssFile2, imagePath, files)
  // }

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

  transformBasePath() {
    return Promise.resolve(this.basePathTransform(this.options.basePath))
      .then(addTrailingS3Sep)
      .then(nPath => this.options.basePath = nPath)
  }

  setupProgressBar(uploadFiles) {
    var progressAmount = Array(uploadFiles.length)
    var progressTotal = Array(uploadFiles.length)
    var calculateProgress = () => _.sum(progressAmount) / _.sum(progressTotal)
    var progressTracker = 0
    var countUndefined = (array) => _.reduce(array, (res, value) => {
      return res += _.isUndefined(value) ? 1 : 0
    }, 0)

    var progressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
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

  uploadFiles(files = []) {
    return this.transformBasePath()
      .then(() => {
        var uploadFiles = files.map(file => this.uploadFile(file.name, file.path))

        if (this.options.progress) {
          this.setupProgressBar(uploadFiles)
        }

        return Promise.all(uploadFiles.map(({promise}) => promise))
      })
  }

  uploadFile(fileName, file) {
    var upload

    const Key = this.options.basePath + fileName
    const s3Params = _.mapValues(this.uploadOptions, (optionConfig) => {
      return _.isFunction(optionConfig) ? optionConfig(fileName, file) : optionConfig
    })

    // Remove Gzip from encoding if ico
    if (/\.ico/.test(fileName) && s3Params.ContentEncoding === 'gzip')
      delete s3Params.ContentEncoding

    if (this.gzipOptions.test) {
      if (this.gzipOptions.test.test(fileName))
        s3Params.ContentEncoding = 'gzip';
    }

    if (this.cacheOptions.cacheControl) {
      s3Params.CacheControl = this.cacheOptions.cacheControl;
    }

    upload = this.client.uploadFile({
      localFile: file,
      s3Params: _.merge({Key}, DEFAULT_UPLOAD_OPTIONS, s3Params)
    })

    if (!this.noCdnizer)
      this.cdnizerOptions.files.push(`*${fileName}*`)

    var promise = new Promise((resolve, reject) => {
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

  setCloudfrontIndex(clientConfig, indexOptions) {
    return new Promise(function(resolve, reject) {
      // Setup Cloudfront
      var cloudfront = new aws.CloudFront()
      cloudfront.config.update({
        accessKeyId: clientConfig.s3Options.accessKeyId,
        secretAccessKey: clientConfig.s3Options.secretAccessKey,
      });

      // Get the existing distribution
      cloudfront.getDistribution({
        Id: indexOptions.DistributionId
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          if (data.DistributionConfig.DefaultRootObject === indexOptions.IndexDocument) {
            resolve()
          }

          // Update the distribution with the new default root object
          data.DistributionConfig.DefaultRootObject = indexOptions.IndexDocument;

          cloudfront.updateDistribution({
            IfMatch: data.ETag,
            Id: indexOptions.DistributionId,
            DistributionConfig: data.DistributionConfig
          }, function(err, data) {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          });
        }
      });
    });
  }

  setS3Index(clientConfig, uploadOptions, indexOptions) {
    return new Promise(function(resolve, reject) {
      var s3Client = new aws.S3({
        params: {
          Bucket: uploadOptions.Bucket,
        },
        accessKeyId: clientConfig.s3Options.accessKeyId,
        secretAccessKey: clientConfig.s3Options.secretAccessKey,
        region: clientConfig.s3Options.region,
      })
      s3Client.getBucketWebsite({}, (err, data) => {
        if (err) {
          reject(err)
        } else {
          if (data.IndexDocument.Suffix === indexOptions.IndexDocument) {
            resolve()
          }

          // Update the distribution with the new default root object
          data.IndexDocument.Suffix = indexOptions.IndexDocument

          //Remove empty properties
          Object.keys(data).forEach(function (k) {
            if (!data[k] || (Array.isArray(data[k]) && !data[k].length)) {
              delete data[k]
            }
          });

          s3Client.putBucketWebsite({
            WebsiteConfiguration: data
          }, function (err) {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          });
        }
      });
    });
  }

  setIndex() {
    var {
      clientConfig,
      uploadOptions,
      cloudfrontInvalidateOptions,
      indexOptions,
      client,
    } = this

    var self = this

    if (indexOptions.IndexDocument) {
      var promises = [];
      // Cloudfront Index
      if (indexOptions.cloudfront) {
        promises.push(self.setCloudfrontIndex(clientConfig, indexOptions))
      }
      // S3 Index
      if (indexOptions.s3) {
        promises.push(self.setS3Index(clientConfig, uploadOptions, indexOptions))
      }

      return Promise.all(promises)
    } else {
      return Promise.resolve();
    }
  }
}
