(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("http"), require("https"), require("s3"), require("fs"), require("path"), require("progress"), require("cdnizer"), require("lodash"), require("aws-sdk"), require("recursive-readdir"));
	else if(typeof define === 'function' && define.amd)
		define(["http", "https", "s3", "fs", "path", "progress", "cdnizer", "lodash", "aws-sdk", "recursive-readdir"], factory);
	else if(typeof exports === 'object')
		exports["webpack-s3-plugin"] = factory(require("http"), require("https"), require("s3"), require("fs"), require("path"), require("progress"), require("cdnizer"), require("lodash"), require("aws-sdk"), require("recursive-readdir"));
	else
		root["webpack-s3-plugin"] = factory(root["http"], root["https"], root["s3"], root["fs"], root["path"], root["progress"], root["cdnizer"], root["lodash"], root["aws-sdk"], root["recursive-readdir"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__, __WEBPACK_EXTERNAL_MODULE_3__, __WEBPACK_EXTERNAL_MODULE_4__, __WEBPACK_EXTERNAL_MODULE_5__, __WEBPACK_EXTERNAL_MODULE_6__, __WEBPACK_EXTERNAL_MODULE_7__, __WEBPACK_EXTERNAL_MODULE_8__, __WEBPACK_EXTERNAL_MODULE_9__, __WEBPACK_EXTERNAL_MODULE_11__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _http = __webpack_require__(1);

	var _http2 = _interopRequireDefault(_http);

	var _https = __webpack_require__(2);

	var _https2 = _interopRequireDefault(_https);

	var _s2 = __webpack_require__(3);

	var _s3 = _interopRequireDefault(_s2);

	var _fs = __webpack_require__(4);

	var _fs2 = _interopRequireDefault(_fs);

	var _path = __webpack_require__(5);

	var _path2 = _interopRequireDefault(_path);

	var _progress = __webpack_require__(6);

	var _progress2 = _interopRequireDefault(_progress);

	var _cdnizer = __webpack_require__(7);

	var _cdnizer2 = _interopRequireDefault(_cdnizer);

	var _lodash = __webpack_require__(8);

	var _lodash2 = _interopRequireDefault(_lodash);

	var _awsSdk = __webpack_require__(9);

	var _awsSdk2 = _interopRequireDefault(_awsSdk);

	var _helpers = __webpack_require__(10);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	_http2.default.globalAgent.maxSockets = _https2.default.globalAgent.maxSockets = 50;

	var compileError = function compileError(compilation, error) {
	  compilation.errors.push(new Error(error));
	};

	module.exports = function () {
	  function S3Plugin() {
	    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	    _classCallCheck(this, S3Plugin);

	    var include = options.include;
	    var exclude = options.exclude;
	    var basePath = options.basePath;
	    var directory = options.directory;
	    var htmlFiles = options.htmlFiles;
	    var _options$basePathTran = options.basePathTransform;
	    var basePathTransform = _options$basePathTran === undefined ? _helpers.DEFAULT_TRANSFORM : _options$basePathTran;
	    var _options$s3Options = options.s3Options;
	    var s3Options = _options$s3Options === undefined ? {} : _options$s3Options;
	    var _options$cdnizerOptio = options.cdnizerOptions;
	    var cdnizerOptions = _options$cdnizerOptio === undefined ? {} : _options$cdnizerOptio;
	    var _options$s3UploadOpti = options.s3UploadOptions;
	    var s3UploadOptions = _options$s3UploadOpti === undefined ? {} : _options$s3UploadOpti;
	    var _options$cloudfrontIn = options.cloudfrontInvalidateOptions;
	    var cloudfrontInvalidateOptions = _options$cloudfrontIn === undefined ? {} : _options$cloudfrontIn;
	    var _options$indexOptions = options.indexOptions;
	    var indexOptions = _options$indexOptions === undefined ? {} : _options$indexOptions;
	    var _options$gzipOptions = options.gzipOptions;
	    var gzipOptions = _options$gzipOptions === undefined ? {} : _options$gzipOptions;


	    this.uploadOptions = s3UploadOptions;
	    this.cloudfrontInvalidateOptions = cloudfrontInvalidateOptions;
	    this.indexOptions = indexOptions;
	    this.gzipOptions = gzipOptions;
	    this.isConnected = false;
	    this.cdnizerOptions = cdnizerOptions;
	    this.urlMappings = [];
	    this.uploadTotal = 0;
	    this.uploadProgress = 0;
	    this.basePathTransform = basePathTransform;
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
	      s3Options: _lodash2.default.merge({}, _helpers.DEFAULT_S3_OPTIONS, s3Options)
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
	          hasRequiredUploadOpts = _lodash2.default.every(_helpers.REQUIRED_S3_UP_OPTS, function (type) {
	        return _this.uploadOptions[type];
	      });

	      // Set directory to output dir or custom
	      this.options.directory = this.options.directory || compiler.options.output.path || compiler.options.output.context || '.';

	      compiler.plugin('after-emit', function (compilation, cb) {
	        if (!hasRequiredOptions) {
	          compileError(compilation, 'S3Plugin: Must provide ' + _helpers.REQUIRED_S3_OPTS.join(', '));
	          cb();
	        }

	        if (!hasRequiredUploadOpts) {
	          compileError(compilation, 'S3Plugin-RequiredS3UploadOpts: ' + _helpers.REQUIRED_S3_UP_OPTS.join(', '));
	          cb();
	        }

	        if (isDirectoryUpload) {
	          var dPath = (0, _helpers.addSeperatorToPath)(_this.options.directory);

	          _this.getAllFilesRecursive(dPath).then(function (files) {
	            return _this.handleFiles(files, cb);
	          }).then(function () {
	            return cb();
	          }).catch(function (e) {
	            return _this.handleErrors(e, compilation, cb);
	          });
	        } else {
	          _this.getAssetFiles(compilation).then(function (files) {
	            return _this.handleFiles(files);
	          }).then(function () {
	            return cb();
	          }).catch(function (e) {
	            return _this.handleErrors(e, compilation, cb);
	          });
	        }
	      });
	    }
	  }, {
	    key: 'handleFiles',
	    value: function handleFiles(files) {
	      var _this2 = this;

	      return this.changeUrls(files).then(function (files) {
	        return _this2.filterAllowedFiles(files);
	      }).then(function (files) {
	        return _this2.uploadFiles(files);
	      }).then(function () {
	        return _this2.invalidateCloudfront();
	      }).then(function () {
	        return _this2.setIndex();
	      });
	    }
	  }, {
	    key: 'handleErrors',
	    value: function handleErrors(error, compilation, cb) {
	      compileError(compilation, 'S3Plugin: ' + error);
	      cb();
	    }
	  }, {
	    key: 'getAllFilesRecursive',
	    value: function getAllFilesRecursive(fPath) {
	      return (0, _helpers.getDirectoryFilesRecursive)(fPath);
	    }
	  }, {
	    key: 'addPathToFiles',
	    value: function addPathToFiles(files, fPath) {
	      return files.map(function (file) {
	        return { name: file, path: _path2.default.resolve(fPath, file) };
	      });
	    }
	  }, {
	    key: 'getFileName',
	    value: function getFileName() {
	      var file = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

	      return _lodash2.default.includes(file, _helpers.PATH_SEP) ? file.substring(_lodash2.default.lastIndexOf(file, _helpers.PATH_SEP) + 1) : file;
	    }
	  }, {
	    key: 'getAssetFiles',
	    value: function getAssetFiles(_ref) {
	      var assets = _ref.assets;

	      var files = _lodash2.default.map(assets, function (value, name) {
	        return { name: name, path: value.existsAt };
	      });

	      return Promise.resolve(files);
	    }
	  }, {
	    key: 'cdnizeHtml',
	    value: function cdnizeHtml(file) {
	      var _this3 = this;

	      return new Promise(function (resolve, reject) {
	        _fs2.default.readFile(file.path, function (err, data) {
	          if (err) return reject(err);

	          _fs2.default.writeFile(file.path, _this3.cdnizer(data.toString()), function (err) {
	            if (err) return reject(err);

	            resolve(file);
	          });
	        });
	      });
	    }
	  }, {
	    key: 'changeUrls',
	    value: function changeUrls() {
	      var _this4 = this;

	      var files = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

	      if (this.noCdnizer) return Promise.resolve(files);

	      var allHtml;
	      var _options = this.options;
	      var directory = _options.directory;
	      var _options$htmlFiles = _options.htmlFiles;
	      var htmlFiles = _options$htmlFiles === undefined ? [] : _options$htmlFiles;


	      allHtml = htmlFiles.length ? this.addPathToFiles(htmlFiles, directory).concat(files) : files;
	      this.cdnizerOptions.files = allHtml.map(function (_ref2) {
	        var name = _ref2.name;
	        return '*' + name + '*';
	      });
	      this.cdnizer = (0, _cdnizer2.default)(this.cdnizerOptions);

	      var _$uniq$partition$valu = (0, _lodash2.default)(allHtml).uniq('name').partition(function (file) {
	        return (/\.(html)/.test(file.name)
	        );
	      }) // |css - Add when cdnize css is done
	      .value();

	      var _$uniq$partition$valu2 = _slicedToArray(_$uniq$partition$valu, 2);

	      var cdnizeFiles = _$uniq$partition$valu2[0];
	      var otherFiles = _$uniq$partition$valu2[1];


	      return Promise.all(cdnizeFiles.map(function (file) {
	        return _this4.cdnizeHtml(file);
	      }).concat(otherFiles));
	    }

	    // For future implimentation
	    // changeCssUrls(files = []) {
	    //   if (this.noCdnizer)
	    //     return Promise.resolve(files)

	    //   data.replace(/url\(\/images/g, `url(${imagePath}`)

	    //   return this.cdnizeCss(cssFile2, imagePath, files)
	    // }

	  }, {
	    key: 'filterAllowedFiles',
	    value: function filterAllowedFiles(files) {
	      var _this5 = this;

	      return files.reduce(function (res, file) {
	        if (_this5.isIncludeAndNotExclude(file.name) && !_this5.isIgnoredFile(file.name)) res.push(file);

	        return res;
	      }, []);
	    }
	  }, {
	    key: 'isIgnoredFile',
	    value: function isIgnoredFile(file) {
	      return _lodash2.default.some(_helpers.UPLOAD_IGNORES, function (ignore) {
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

	      this.client = _s3.default.createClient(this.clientConfig);
	      this.isConnected = true;
	    }
	  }, {
	    key: 'transformBasePath',
	    value: function transformBasePath() {
	      var _this6 = this;

	      return Promise.resolve(this.basePathTransform(this.options.basePath)).then(function (nPath) {
	        return _this6.options.basePath = (0, _helpers.addSeperatorToPath)(nPath);
	      });
	    }
	  }, {
	    key: 'setupProgressBar',
	    value: function setupProgressBar(uploadFiles) {
	      var progressAmount = Array(uploadFiles.length);
	      var progressTotal = Array(uploadFiles.length);
	      var countUndefined = function countUndefined(array) {
	        return _lodash2.default.reduce(array, function (res, value) {
	          return res += _lodash2.default.isUndefined(value) ? 1 : 0;
	        }, 0);
	      };
	      var calculateProgress = function calculateProgress() {
	        return _lodash2.default.sum(progressAmount) / _lodash2.default.sum(progressTotal);
	      };
	      var progressTracker = 0;

	      var progressBar = new _progress2.default('Uploading [:bar] :percent :etas', {
	        complete: '>',
	        incomplete: '∆',
	        total: 100
	      });

	      uploadFiles.forEach(function (_ref3, i) {
	        var upload = _ref3.upload;

	        upload.on('progress', function () {
	          var definedModifier, progressValue;

	          progressTotal[i] = this.progressTotal;
	          progressAmount[i] = this.progressAmount;
	          definedModifier = countUndefined(progressTotal) / 10;
	          progressValue = calculateProgress() - definedModifier;

	          if (progressValue !== progressTracker) {
	            progressBar.update(progressValue);
	            progressTracker = progressValue;
	          }
	        });
	      });
	    }
	  }, {
	    key: 'uploadFiles',
	    value: function uploadFiles() {
	      var _this7 = this;

	      var files = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

	      return this.transformBasePath().then(function () {
	        var uploadFiles = files.map(function (file) {
	          return _this7.uploadFile(file.name, file.path);
	        });

	        _this7.setupProgressBar(uploadFiles);

	        return Promise.all(uploadFiles.map(function (_ref4) {
	          var promise = _ref4.promise;
	          return promise;
	        }));
	      });
	    }
	  }, {
	    key: 'uploadFile',
	    value: function uploadFile(fileName, file) {
	      var upload,
	          s3Params = _lodash2.default.merge({ Key: this.options.basePath + fileName }, _helpers.DEFAULT_UPLOAD_OPTIONS, this.uploadOptions);

	      // Remove Gzip from encoding if ico
	      if (/\.ico/.test(fileName) && s3Params.ContentEncoding === 'gzip') delete s3Params.ContentEncoding;

	      if (this.gzipOptions.test) {
	        if (this.gzipOptions.test.test(fileName)) s3Params.ContentEncoding = 'gzip';
	      }

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
	      var clientConfig = this.clientConfig;
	      var cloudfrontInvalidateOptions = this.cloudfrontInvalidateOptions;


	      return new Promise(function (resolve, reject) {
	        if (cloudfrontInvalidateOptions.DistributionId) {
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
	            return err ? reject(err) : resolve(res.Id);
	          });
	        } else {
	          return resolve(null);
	        }
	      });
	    }
	  }, {
	    key: 'setIndex',
	    value: function setIndex() {
	      var clientConfig = this.clientConfig;
	      var uploadOptions = this.uploadOptions;
	      var cloudfrontInvalidateOptions = this.cloudfrontInvalidateOptions;
	      var indexOptions = this.indexOptions;
	      var client = this.client;


	      return new Promise(function (resolve, reject) {
	        if (indexOptions.IndexDocument) {

	          // Cloudfront Index
	          if (indexOptions.cloudfront) {
	            var cloudfront = new _awsSdk2.default.CloudFront();

	            cloudfront.config.update({
	              accessKeyId: clientConfig.s3Options.accessKeyId,
	              secretAccessKey: clientConfig.s3Options.secretAccessKey
	            });

	            // Get the existing distribution id
	            cloudfront.getDistribution({ Id: cloudfrontInvalidateOptions.DistributionId }, function (err, data) {
	              if (err) {
	                reject(err);
	              } else {
	                if (data.DistributionConfig.DefaultRootObject === indexOptions.IndexDocument) {
	                  return resolve();
	                }

	                // Update the distribution with the new default root object
	                data.DistributionConfig.DefaultRootObject = indexOptions.IndexDocument;

	                cloudfront.updateDistribution({
	                  IfMatch: data.ETag,
	                  Id: cloudfrontInvalidateOptions.DistributionId,
	                  DistributionConfig: data.DistributionConfig
	                }, function (err, data) {
	                  if (err) {
	                    reject(err);
	                  } else {
	                    resolve();
	                  }
	                });
	              }
	            });
	          }
	          // S3 Index
	          if (indexOptions.s3) {
	            // AWS.config.region = options.region;
	            var s3Client = new _awsSdk2.default.S3({
	              params: {
	                Bucket: uploadOptions.Bucket
	              },
	              accessKeyId: clientConfig.s3Options.accessKeyId,
	              secretAccessKey: clientConfig.s3Options.secretAccessKey,
	              region: clientConfig.s3Options.region
	            });
	            s3Client.getBucketWebsite({}, function (err, data) {
	              if (err) {
	                reject(err);
	              } else {
	                if (data.IndexDocument.Suffix === indexOptions.IndexDocument) {
	                  return resolve();
	                }

	                // Update the distribution with the new default root object
	                data.IndexDocument.Suffix = indexOptions.IndexDocument;

	                //Remove empty properties
	                Object.keys(data).forEach(function (k) {
	                  if (!data[k] || Array.isArray(data[k]) && !data[k].length) {
	                    delete data[k];
	                  }
	                });

	                s3Client.putBucketWebsite({
	                  WebsiteConfiguration: data
	                }, function (err) {
	                  if (err) {
	                    reject(err);
	                  } else {
	                    resolve();
	                  }
	                });
	              }
	            });
	          }
	        } else {
	          return resolve(null);
	        }
	      });
	    }
	  }]);

	  return S3Plugin;
	}();

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = require("http");

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = require("https");

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_3__;

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("fs");

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = require("path");

/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_6__;

/***/ },
/* 7 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_7__;

/***/ },
/* 8 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_8__;

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_9__;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.getDirectoryFilesRecursive = exports.translatePathFromFiles = exports.addSeperatorToPath = exports.DEFAULT_TRANSFORM = exports.S3_PATH_SEP = exports.PATH_SEP = exports.REQUIRED_S3_UP_OPTS = exports.REQUIRED_S3_OPTS = exports.DEFAULT_S3_OPTIONS = exports.DEFAULT_UPLOAD_OPTIONS = exports.UPLOAD_IGNORES = undefined;

	var _lodash = __webpack_require__(8);

	var _lodash2 = _interopRequireDefault(_lodash);

	var _path = __webpack_require__(5);

	var _path2 = _interopRequireDefault(_path);

	var _recursiveReaddir = __webpack_require__(11);

	var _recursiveReaddir2 = _interopRequireDefault(_recursiveReaddir);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var UPLOAD_IGNORES = exports.UPLOAD_IGNORES = ['.DS_Store'];

	var DEFAULT_UPLOAD_OPTIONS = exports.DEFAULT_UPLOAD_OPTIONS = {
	  ACL: 'public-read'
	};

	var DEFAULT_S3_OPTIONS = exports.DEFAULT_S3_OPTIONS = {
	  region: 'us-west-2'
	};

	var REQUIRED_S3_OPTS = exports.REQUIRED_S3_OPTS = ['accessKeyId', 'secretAccessKey'];
	var REQUIRED_S3_UP_OPTS = exports.REQUIRED_S3_UP_OPTS = ['Bucket'];
	var PATH_SEP = exports.PATH_SEP = _path2.default.sep;
	var S3_PATH_SEP = exports.S3_PATH_SEP = '/';
	var DEFAULT_TRANSFORM = exports.DEFAULT_TRANSFORM = function DEFAULT_TRANSFORM(item) {
	  return Promise.resolve(item);
	};

	var addSeperatorToPath = exports.addSeperatorToPath = function addSeperatorToPath(fPath) {
	  if (!fPath) return fPath;

	  return _lodash2.default.endsWith(fPath, PATH_SEP) ? fPath : fPath + PATH_SEP;
	};

	var translatePathFromFiles = exports.translatePathFromFiles = function translatePathFromFiles(rootPath) {
	  return function (files) {
	    return _lodash2.default.map(files, function (file) {
	      return {
	        path: file,
	        name: file.replace(rootPath, '').split(PATH_SEP).join(S3_PATH_SEP)
	      };
	    });
	  };
	};

	var getDirectoryFilesRecursive = exports.getDirectoryFilesRecursive = function getDirectoryFilesRecursive(dir) {
	  var ignores = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

	  return new Promise(function (resolve, reject) {
	    (0, _recursiveReaddir2.default)(dir, ignores, function (err, files) {
	      return err ? reject(err) : resolve(files);
	    });
	  }).then(translatePathFromFiles(dir));
	};

/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_11__;

/***/ }
/******/ ])
});
;