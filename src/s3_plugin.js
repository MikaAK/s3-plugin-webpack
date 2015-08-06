'use strict'

import http from 'http'
import https from 'https'
import s3 from 's3'
import fs from 'fs'
import path from 'path'
import ProgressBar from 'progress'
import cdnizer from 'cdnizer'
import _ from 'lodash'

http.globalAgent.maxSockets = https.globalAgent.maxSockets = 50

const DEFAULT_UPLOAD_OPTIONS = {
  ACL: 'public-read'
}

const DEFAULT_S3_OPTIONS = {
  region: 'us-west-2'
}

export default class S3Plugin {
  constructor(options = {}) {
    var {s3Options = {}, s3UploadOptions = {}, directory, include, exclude, basePath, cdnizerOptions, htmlFiles} = options

    this.requiredS3Opts = ['accessKeyId', 'secretAccessKey']
    this.requiredS3UpOpts = ['Bucket']
    this.uploadOptions = s3UploadOptions
    this.isConnected = false
    this.cdnizerOptions = cdnizerOptions
    this.urlMappings = []
    this.uploadTotal = 0
    this.uploadProgress = 0

    this.options = {
      directory, 
      include, 
      exclude, 
      htmlFiles: typeof htmlFiles === 'string' ? [htmlFiles] : htmlFiles
    }

    this.clientConfig = {
      maxAsyncS3: 50,
      s3Options: _.merge(s3Options, DEFAULT_S3_OPTIONS)
    }

    if (!this.cdnizerOptions.files)
      this.cdnizerOptions.files = []

    if (!this.cdnizerOptions)
      this.noCdnizer = true
  }

  apply(compiler) {
    var hasRequiredOptions = this.requiredS3Opts
      .every(type => this.clientConfig.s3Options[type])

    var hasRequiredUploadOpts = this.requiredS3UpOpts
      .every(type => this.uploadOptions[type])

    // Set directory to output dir or custom
    this.options.directory = this.options.directory || compiler.options.output.path || compiler.options.output.context || '.'

    compiler.plugin('after-emit', (compilation, cb) => {
      if (!hasRequiredOptions) {
        compilation.errors.push(new Error('S3Plugin: Must provide ' + this.requiredS3Opts.join(' and ')))
        cb()
      }

      if (!this.requiredS3UpOpts) {
        compilation.errors.push(new Error('S3Plugin-RequiredS3UploadOpts: ' + this.requiredS3UpOpts.join(' and ')))
        cb()
      }

      fs.readdir(this.options.directory, (error, files) => {
        if (error) {
          compilation.errors.push(new Error('S3Plugin-ReadOutputDir: ' + error))
          cb()
        } else {
          this.uploadFiles(this.getAssetFiles(compilation))
            .then(this.changeHtmlUrls.bind(this))
            .then(() => {
              cb()
            })
            .catch(e => {
              compilation.errors.push(new Error('S3Plugin: ' + e))
              cb()
            })
        }
      })
    })
  }
  
  getFileName(file = '') {
    return file.search('/') === -1 ? file : file.match(/[^\/]+$/)[0]
  }
  
  getAssetFiles({chunks, options}) {
    var publicPath = options.output.publicPath || options.output.path

    var files = _(chunks)
      .pluck('files')
      .flatten()
      .map(file => path.resolve(publicPath, file))
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

    var {directory, htmlFiles} = this.options

    var allHtml = (htmlFiles || fs.readdirSync(directory).filter(file => /\.html$/.test(file)))
      .map(file => path.resolve(directory, file))

    this.cdnizer = cdnizer(this.cdnizerOptions)

    return Promise.all(allHtml.map(file => this.cdnizeHtml(file)))
  }

  filterAllowedFiles(files) {
    return files.reduce((res, file) => {
      if (this.isIncludeOrExclude(file))
        res.push({
          name: file,
          path: path.resolve(this.options.directory, file)
        })

      return res
    }, [])
  }

  isIncludeOrExclude(file) {
    var isExclude,
        isInclude,
        {include, exclude} = this.options

    if (!include)
      isInclude = true
    else 
      isInclude = include.test(file)

    if (!exclude)
      isExclude = false
    else
      isExclude = exclude.test(file)

    return isInclude && !isExclude
  }

  connect() {
    if (this.isConnected)
      return

    this.client = s3.createClient(this.clientConfig)
    this.isConnected = true
  }

  uploadFiles(files = []) {
    var sum = (array) => array.reduce((res, val) => res += val, 0)
    var uploadFiles = files.map(file => this.uploadFile(file.name, file.path))
    var progressAmount = Array(files.length)
    var progressTotal = Array(files.length)
    var finishedUploads = []

    console.log('Uploading Files: \n' + files.map(file => this.getFileName(file.name)).join('\n'))

    var progressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
      complete: '>',
      incomplete: '-',
      total: 100
    })


    uploadFiles.forEach(function({upload}, i) {
      upload.on('end', function() {
        finishedUploads.push(true)

        if (finishedUploads.length === files.length)
          progressBar.update(100)
      })

      upload.on('progress', function() {
        progressTotal[i] = this.progressTotal
        progressAmount[i] = this.progressAmount

        progressBar.update(sum(progressAmount) / sum(progressTotal).toFixed(2))
      })
    })
    
    return Promise.all(uploadFiles.map(({promise}) => promise))
  }

  uploadFile(fileName, file) {
    if (fs.lstatSync(file).isDirectory())
      return this.uploadFiles(this.filterAllowedFiles(fs.readdirSync(file)))

    var upload,
        s3Params = _.merge({Key: fileName}, this.uploadOptions, DEFAULT_UPLOAD_OPTIONS)
     
    // Remove Gzip from encoding if ico
    if (/\.ico/.test(fileName) && s3Params.ContentEncoding === 'gzip')
      delete s3Params.ContentEncoding

    this.connect()
    upload = this.client.uploadFile({
      localFile: file,
      s3Params 
    })

    this.cdnizerOptions.files.push(fileName)
    this.cdnizerOptions.files.push(fileName + '*')

    var promise = new Promise((resolve, reject) => {
      upload.on('error', reject)
      upload.on('end', () => resolve(file))
    })


    return {upload, promise} 
  }
}
