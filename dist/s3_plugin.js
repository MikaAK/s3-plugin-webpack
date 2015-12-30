'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _s = require('s3');

var _s2 = _interopRequireDefault(_s);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _progress = require('progress');

var _progress2 = _interopRequireDefault(_progress);

var _cdnizer = require('cdnizer');

var _cdnizer2 = _interopRequireDefault(_cdnizer);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_http2.default.globalAgent.maxSockets = _https2.default.globalAgent.maxSockets = 50;

var UPLOAD_IGNORES = ['.DS_Store'];

var DEFAULT_UPLOAD_OPTIONS = {
  ACL: 'public-read'
};

var DEFAULT_S3_OPTIONS = {
  region: 'us-west-2'
};

var REQUIRED_S3_OPTS = ['accessKeyId', 'secretAccessKey'],
    REQUIRED_S3_UP_OPTS = ['Bucket'];

var PATH_SEP = _path2.default.sep;

module.exports = (function () {
  function S3Plugin() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, S3Plugin);

    var _options$s3Options = options.s3Options;
    var s3Options = _options$s3Options === undefined ? {} : _options$s3Options;
    var _options$s3UploadOpti = options.s3UploadOptions;
    var s3UploadOptions = _options$s3UploadOpti === undefined ? {} : _options$s3UploadOpti;
    var _options$cloudfrontIn = options.cloudfrontInvalidateOptions;
    var cloudfrontInvalidateOptions = _options$cloudfrontIn === undefined ? {} : _options$cloudfrontIn;
    var directory = options.directory;
    var include = options.include;
    var exclude = options.exclude;
    var basePath = options.basePath;
    var _options$cdnizerOptio = options.cdnizerOptions;
    var cdnizerOptions = _options$cdnizerOptio === undefined ? {} : _options$cdnizerOptio;
    var htmlFiles = options.htmlFiles;

    this.uploadOptions = s3UploadOptions;
    this.cloudfrontInvalidateOptions = cloudfrontInvalidateOptions;
    this.isConnected = false;
    this.cdnizerOptions = cdnizerOptions;
    this.urlMappings = [];
    this.uploadTotal = 0;
    this.uploadProgress = 0;
    basePath = basePath ? basePath.replace(/\/?(\?|#|$)/, '/$1') : '';

    this.options = {
      directory: directory,
      include: include,
      exclude: exclude,
      basePath: basePath,
      htmlFiles: typeof htmlFiles === 'string' ? [htmlFiles] : htmlFiles
    };

    this.clientConfig = {
      maxAsyncS3: 50,
      s3Options: _lodash2.default.merge({}, DEFAULT_S3_OPTIONS, s3Options)
    };

    this.noCdnizer = !Object.keys(this.cdnizerOptions).length;

    if (!this.noCdnizer && !this.cdnizerOptions.files) this.cdnizerOptions.files = [];
  }

  _createClass(S3Plugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      this.connect();

      var isDirectoryUpload = !!this.options.directory,
          hasRequiredOptions = this.client.s3.config.credentials !== null,
          hasRequiredUploadOpts = REQUIRED_S3_UP_OPTS.every(function (type) {
        return _this.uploadOptions[type];
      });

      // Set directory to output dir or custom
      this.options.directory = this.options.directory || compiler.options.output.path || compiler.options.output.context || '.';

      compiler.plugin('after-emit', function (compilation, cb) {
        if (!hasRequiredOptions) {
          compilation.errors.push(new Error('S3Plugin: Must provide ' + REQUIRED_S3_OPTS.join(', ')));
          cb();
        }

        if (!hasRequiredUploadOpts) {
          compilation.errors.push(new Error('S3Plugin-RequiredS3UploadOpts: ' + REQUIRED_S3_UP_OPTS.join(', ')));
          cb();
        }

        if (isDirectoryUpload) {
          var dPath = _this.addSeperatorToPath(_this.options.directory);
          _this.getAllFilesRecursive(dPath).then(_this.filterPathFromFiles(dPath)).then(_this.filterAllowedFiles.bind(_this)).then(_this.uploadFiles.bind(_this)).then(_this.changeHtmlUrls.bind(_this)).then(_this.invalidateCloudfront.bind(_this)).then(function () {
            return cb();
          }).catch(function (e) {
            compilation.errors.push(new Error('S3Plugin: ' + e));
            cb();
          });
        } else {
          _this.uploadFiles(_this.getAssetFiles(compilation)).then(_this.changeHtmlUrls.bind(_this)).then(_this.invalidateCloudfront.bind(_this)).then(function () {
            return cb();
          }).catch(function (e) {
            compilation.errors.push(new Error('S3Plugin: ' + e));
            cb();
          });
        }
      });
    }
  }, {
    key: 'filterPathFromFiles',
    value: function filterPathFromFiles(path) {
      return function (files) {
        return files.map(function (file) {
          return {
            path: file,
            name: file.replace(path, '')
          };
        });
      };
    }
  }, {
    key: 'addSeperatorToPath',
    value: function addSeperatorToPath(path) {
      return path.endsWith(PATH_SEP) ? path : path + PATH_SEP;
    }
  }, {
    key: 'getAllFilesRecursive',
    value: function getAllFilesRecursive(path) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        var results = [];

        _fs2.default.readdir(path, function (err, list) {
          if (err) return reject(err);

          var i = 0;

          (function next() {
            var _this2 = this;

            var file = list[i++];

            if (!file) return resolve(results);

            file = (path.endsWith(PATH_SEP) || file.startsWith(PATH_SEP) ? path : path + PATH_SEP) + file;

            _fs2.default.stat(file, function (err, stat) {
              if (stat && stat.isDirectory()) {
                _this2.getAllFilesRecursive(file).then(function (res) {
                  results.push.apply(results, _toConsumableArray(res));
                  next();
                });
              } else {
                results.push(file);
                next();
              }
            });
          }).call(_this3);
        });
      });
    }
  }, {
    key: 'addPathToFiles',
    value: function addPathToFiles(files, fPath) {
      return files.map(function (file) {
        return _path2.default.resolve(fPath, file);
      });
    }
  }, {
    key: 'getFileName',
    value: function getFileName() {
      var file = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

      return file.includes(PATH_SEP) ? file.substring(file.lastIndexOf(PATH_SEP) + 1) : file;
    }
  }, {
    key: 'getAssetFiles',
    value: function getAssetFiles(_ref) {
      var chunks = _ref.chunks;
      var options = _ref.options;

      var publicPath = options.output.publicPath || options.output.path;

      var files = (0, _lodash2.default)(chunks).pluck('files').flatten().map(function (name) {
        return { path: _path2.default.resolve(publicPath, name), name: name };
      }).value();

      return this.filterAllowedFiles(files);
    }
  }, {
    key: 'cdnizeHtml',
    value: function cdnizeHtml(htmlPath) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        _fs2.default.readFile(htmlPath, function (err, data) {
          if (err) return reject(err);

          _fs2.default.writeFile(htmlPath, _this4.cdnizer(data.toString()), function (err) {
            if (err) return reject(err);

            resolve();
          });
        });
      });
    }
  }, {
    key: 'changeHtmlUrls',
    value: function changeHtmlUrls() {
      var _this5 = this;

      if (this.noCdnizer) return Promise.resolve();

      var allHtml;
      var _options = this.options;
      var directory = _options.directory;
      var htmlFiles = _options.htmlFiles;

      htmlFiles = htmlFiles || _fs2.default.readdirSync(directory).filter(function (file) {
        return (/\.html$/.test(file)
        );
      });

      allHtml = this.addPathToFiles(htmlFiles, directory);

      this.cdnizer = (0, _cdnizer2.default)(this.cdnizerOptions);

      return Promise.all(allHtml.map(function (file) {
        return _this5.cdnizeHtml(file);
      }));
    }
  }, {
    key: 'filterAllowedFiles',
    value: function filterAllowedFiles(files) {
      var _this6 = this;

      return files.reduce(function (res, file) {
        if (_this6.isIncludeAndNotExclude(file.name) && !_this6.isIgnoredFile(file.name)) res.push(file);

        return res;
      }, []);
    }
  }, {
    key: 'isIgnoredFile',
    value: function isIgnoredFile(file) {
      return _lodash2.default.some(UPLOAD_IGNORES, function (ignore) {
        return new RegExp(ignore).test(file);
      });
    }
  }, {
    key: 'isIncludeAndNotExclude',
    value: function isIncludeAndNotExclude(file) {
      var isExclude;
      var isInclude;
      var _options2 = this.options;
      var include = _options2.include;
      var exclude = _options2.exclude;

      isInclude = include ? include.test(file) : true;
      isExclude = exclude ? exclude.test(file) : false;

      return isInclude && !isExclude;
    }
  }, {
    key: 'connect',
    value: function connect() {
      if (this.isConnected) return;

      this.client = _s2.default.createClient(this.clientConfig);
      this.isConnected = true;
    }
  }, {
    key: 'uploadFiles',
    value: function uploadFiles() {
      var _this7 = this;

      var files = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

      var sum = function sum(array) {
        return array.reduce(function (res, val) {
          return res += val;
        }, 0);
      };
      var uploadFiles = files.map(function (file) {
        return _this7.uploadFile(file.name, file.path);
      });
      var progressAmount = Array(files.length);
      var progressTotal = Array(files.length);

      var progressBar = new _progress2.default('Uploading [:bar] :percent :etas', {
        complete: '>',
        incomplete: '∆',
        total: 100
      });

      //uploadFiles.forEach(function({upload}, i) {
      //upload.on('progress', function() {
      //progressTotal[i] = this.progressTotal
      //progressAmount[i] = this.progressAmount

      //progressBar.update((sum(progressAmount) / sum(progressTotal)).toFixed(2))
      //})
      //})

      return Promise.all(uploadFiles.map(function (_ref2) {
        var promise = _ref2.promise;
        return promise;
      }));
    }
  }, {
    key: 'uploadFile',
    value: function uploadFile(fileName, file) {
      var upload,
          s3Params = _lodash2.default.merge({ Key: this.options.basePath + fileName }, DEFAULT_UPLOAD_OPTIONS, this.uploadOptions);

      // Remove Gzip from encoding if ico
      if (/\.ico/.test(fileName) && s3Params.ContentEncoding === 'gzip') delete s3Params.ContentEncoding;

      upload = this.client.uploadFile({
        localFile: file,
        s3Params: s3Params
      });

      if (!this.noCdnizer) this.cdnizerOptions.files.push('*' + fileName + '*');

      var promise = new Promise(function (resolve, reject) {
        upload.on('error', reject);
        upload.on('end', function () {
          return resolve(file);
        });
      });

      return { upload: upload, promise: promise };
    }
  }, {
    key: 'invalidateCloudfront',
    value: function invalidateCloudfront() {
      var cloudfrontInvalidateOptions = this.cloudfrontInvalidateOptions;
      var clientConfig = this.clientConfig;

      return new Promise(function (resolve, reject) {
        if (cloudfrontInvalidateOptions.DistributionId != undefined) {
          var cloudfront = new _awsSdk2.default.CloudFront();
          cloudfront.config.update({
            accessKeyId: clientConfig.s3Options.accessKeyId,
            secretAccessKey: clientConfig.s3Options.secretAccessKey
          });

          cloudfront.createInvalidation({
            DistributionId: cloudfrontInvalidateOptions.DistributionId,
            InvalidationBatch: {
              CallerReference: Date.now().toString(),
              Paths: {
                Quantity: cloudfrontInvalidateOptions.Items.length,
                Items: cloudfrontInvalidateOptions.Items
              }
            }
          }, function (err, res) {
            if (err) {
              return reject(err);
            }
            return resolve(res.Id);
          });
        } else {
          return resolve(null);
        }
      });
    }
  }]);

  return S3Plugin;
})();