(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("http"), require("https"), require("fs"), require("path"), require("progress"), require("cdnizer"), require("lodash"), require("aws-sdk"), require("recursive-readdir"));
	else if(typeof define === 'function' && define.amd)
		define(["http", "https", "fs", "path", "progress", "cdnizer", "lodash", "aws-sdk", "recursive-readdir"], factory);
	else if(typeof exports === 'object')
		exports["webpack-s3-plugin"] = factory(require("http"), require("https"), require("fs"), require("path"), require("progress"), require("cdnizer"), require("lodash"), require("aws-sdk"), require("recursive-readdir"));
	else
		root["webpack-s3-plugin"] = factory(root["http"], root["https"], root["fs"], root["path"], root["progress"], root["cdnizer"], root["lodash"], root["aws-sdk"], root["recursive-readdir"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__, __WEBPACK_EXTERNAL_MODULE_3__, __WEBPACK_EXTERNAL_MODULE_4__, __WEBPACK_EXTERNAL_MODULE_5__, __WEBPACK_EXTERNAL_MODULE_6__, __WEBPACK_EXTERNAL_MODULE_7__, __WEBPACK_EXTERNAL_MODULE_8__, __WEBPACK_EXTERNAL_MODULE_13__) {
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

	var _fs = __webpack_require__(3);

	var _fs2 = _interopRequireDefault(_fs);

	var _path = __webpack_require__(4);

	var _path2 = _interopRequireDefault(_path);

	var _progress = __webpack_require__(5);

	var _progress2 = _interopRequireDefault(_progress);

	var _cdnizer = __webpack_require__(6);

	var _cdnizer2 = _interopRequireDefault(_cdnizer);

	var _lodash = __webpack_require__(7);

	var _lodash2 = _interopRequireDefault(_lodash);

	var _awsSdk = __webpack_require__(8);

	var _awsSdk2 = _interopRequireDefault(_awsSdk);

	var _lite = __webpack_require__(9);

	var _lite2 = _interopRequireDefault(_lite);

	var _helpers = __webpack_require__(12);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	_http2.default.globalAgent.maxSockets = _https2.default.globalAgent.maxSockets = 50;

	var compileError = function compileError(compilation, error) {
	  compilation.errors.push(new Error(error));
	};

	module.exports = function () {
	  function S3Plugin() {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	    _classCallCheck(this, S3Plugin);

	    var include = options.include,
	        exclude = options.exclude,
	        progress = options.progress,
	        basePath = options.basePath,
	        directory = options.directory,
	        htmlFiles = options.htmlFiles,
	        _options$basePathTran = options.basePathTransform,
	        basePathTransform = _options$basePathTran === undefined ? _helpers.DEFAULT_TRANSFORM : _options$basePathTran,
	        _options$s3Options = options.s3Options,
	        s3Options = _options$s3Options === undefined ? {} : _options$s3Options,
	        _options$cdnizerOptio = options.cdnizerOptions,
	        cdnizerOptions = _options$cdnizerOptio === undefined ? {} : _options$cdnizerOptio,
	        _options$s3UploadOpti = options.s3UploadOptions,
	        s3UploadOptions = _options$s3UploadOpti === undefined ? {} : _options$s3UploadOpti,
	        _options$cloudfrontIn = options.cloudfrontInvalidateOptions,
	        cloudfrontInvalidateOptions = _options$cloudfrontIn === undefined ? {} : _options$cloudfrontIn;


	    this.uploadOptions = s3UploadOptions;
	    this.cloudfrontInvalidateOptions = cloudfrontInvalidateOptions;
	    this.isConnected = false;
	    this.cdnizerOptions = cdnizerOptions;
	    this.urlMappings = [];
	    this.uploadTotal = 0;
	    this.uploadProgress = 0;
	    this.basePathTransform = basePathTransform;
	    basePath = basePath ? (0, _helpers.addTrailingS3Sep)(basePath) : '';

	    this.options = {
	      directory: directory,
	      include: include,
	      exclude: exclude,
	      basePath: basePath,
	      htmlFiles: typeof htmlFiles === 'string' ? [htmlFiles] : htmlFiles,
	      progress: _lodash2.default.isBoolean(progress) ? progress : true
	    };

	    this.clientConfig = {
	      s3Options: s3Options,
	      maxAsyncS3: 50
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
	          hasRequiredUploadOpts = _lodash2.default.every(_helpers.REQUIRED_S3_UP_OPTS, function (type) {
	        return _this.uploadOptions[type];
	      });

	      // Set directory to output dir or custom
	      this.options.directory = this.options.directory || compiler.options.output.path || compiler.options.output.context || '.';

	      compiler.plugin('after-emit', function (compilation, cb) {
	        var error;

	        if (!hasRequiredUploadOpts) error = 'S3Plugin-RequiredS3UploadOpts: ' + _helpers.REQUIRED_S3_UP_OPTS.join(', ');

	        if (error) {
	          compileError(compilation, error);
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
	      var file = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

	      if (_lodash2.default.includes(file, _helpers.PATH_SEP)) return file.substring(_lodash2.default.lastIndexOf(file, _helpers.PATH_SEP) + 1);else return file;
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

	      var files = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

	      if (this.noCdnizer) return Promise.resolve(files);

	      var allHtml;

	      var _options = this.options,
	          directory = _options.directory,
	          _options$htmlFiles = _options.htmlFiles,
	          htmlFiles = _options$htmlFiles === undefined ? [] : _options$htmlFiles;


	      if (htmlFiles.length) allHtml = this.addPathToFiles(htmlFiles, directory).concat(files);else allHtml = files;

	      this.cdnizerOptions.files = allHtml.map(function (_ref2) {
	        var name = _ref2.name;
	        return '*' + name + '*';
	      });
	      this.cdnizer = (0, _cdnizer2.default)(this.cdnizerOptions);

	      var _$uniq$partition$valu = (0, _lodash2.default)(allHtml).uniq('name').partition(function (file) {
	        return (/\.(html|css)/.test(file.name)
	        );
	      }).value(),
	          _$uniq$partition$valu2 = _slicedToArray(_$uniq$partition$valu, 2),
	          cdnizeFiles = _$uniq$partition$valu2[0],
	          otherFiles = _$uniq$partition$valu2[1];

	      return Promise.all(cdnizeFiles.map(function (file) {
	        return _this4.cdnizeHtml(file);
	      }).concat(otherFiles));
	    }
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
	      var isExclude,
	          isInclude,
	          _options2 = this.options,
	          include = _options2.include,
	          exclude = _options2.exclude;


	      isInclude = include ? (0, _helpers.testRule)(include, file) : true;
	      isExclude = exclude ? (0, _helpers.testRule)(exclude, file) : false;

	      return isInclude && !isExclude;
	    }
	  }, {
	    key: 'connect',
	    value: function connect() {
	      if (this.isConnected) return;

	      this.client = new _awsSdk2.default.S3(this.clientConfig.s3Options);
	      this.isConnected = true;
	    }
	  }, {
	    key: 'transformBasePath',
	    value: function transformBasePath() {
	      var _this6 = this;

	      return Promise.resolve(this.basePathTransform(this.options.basePath)).then(_helpers.addTrailingS3Sep).then(function (nPath) {
	        return _this6.options.basePath = nPath;
	      });
	    }
	  }, {
	    key: 'setupProgressBar',
	    value: function setupProgressBar(uploadFiles) {
	      var progressAmount = Array(uploadFiles.length);
	      var progressTotal = Array(uploadFiles.length);
	      var progressTracker = 0;
	      var calculateProgress = function calculateProgress() {
	        return _lodash2.default.sum(progressAmount) / _lodash2.default.sum(progressTotal);
	      };
	      var countUndefined = function countUndefined(array) {
	        return _lodash2.default.reduce(array, function (res, value) {
	          return res += _lodash2.default.isUndefined(value) ? 1 : 0;
	        }, 0);
	      };

	      var progressBar = new _progress2.default('Uploading [:bar] :percent :etas', {
	        complete: '>',
	        incomplete: '∆',
	        total: 100
	      });

	      uploadFiles.forEach(function (_ref3, i) {
	        var upload = _ref3.upload;

	        upload.on('httpUploadProgress', function () {
	          var definedModifier, progressValue;

	          progressTotal[i] = this.total;
	          progressAmount[i] = this.loaded;
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

	      var files = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

	      return this.transformBasePath().then(function () {
	        var uploadFiles = files.map(function (file) {
	          return _this7.uploadFile(file.name, file.path);
	        });

	        if (_this7.options.progress) {
	          _this7.setupProgressBar(uploadFiles);
	        }

	        return Promise.all(uploadFiles.map(function (_ref4) {
	          var promise = _ref4.promise;
	          return promise;
	        }));
	      });
	    }
	  }, {
	    key: 'uploadFile',
	    value: function uploadFile(fileName, file) {
	      var Key = this.options.basePath + fileName;
	      var s3Params = _lodash2.default.mapValues(this.uploadOptions, function (optionConfig) {
	        return _lodash2.default.isFunction(optionConfig) ? optionConfig(fileName, file) : optionConfig;
	      });

	      // avoid noname folders in bucket
	      if (Key[0] === '/') {
	        Key = Key.substr(1);
	      }

	      // Remove Gzip from encoding if ico
	      if (/\.ico/.test(fileName) && s3Params.ContentEncoding === 'gzip') delete s3Params.ContentEncoding;

	      if (s3Params.ContentType === undefined) {
	        s3Params.ContentType = _lite2.default.getType(fileName);
	      }

	      var Body = _fs2.default.createReadStream(file);

	      var upload = this.client.upload(_lodash2.default.merge({ Key: Key, Body: Body }, _helpers.DEFAULT_UPLOAD_OPTIONS, s3Params));

	      if (!this.noCdnizer) this.cdnizerOptions.files.push('*' + fileName + '*');

	      return { upload: upload, promise: upload.promise() };
	    }
	  }, {
	    key: 'invalidateCloudfront',
	    value: function invalidateCloudfront() {
	      var clientConfig = this.clientConfig,
	          cloudfrontInvalidateOptions = this.cloudfrontInvalidateOptions;


	      return new Promise(function (resolve, reject) {
	        if (cloudfrontInvalidateOptions.DistributionId) {
	          var _clientConfig$s3Optio = clientConfig.s3Options,
	              accessKeyId = _clientConfig$s3Optio.accessKeyId,
	              secretAccessKey = _clientConfig$s3Optio.secretAccessKey;

	          var cloudfront = new _awsSdk2.default.CloudFront();

	          if (accessKeyId && secretAccessKey) cloudfront.config.update({ accessKeyId: accessKeyId, secretAccessKey: secretAccessKey });

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

	module.exports = require("fs");

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("path");

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_5__;

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
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Mime = __webpack_require__(10);
	module.exports = new Mime(__webpack_require__(11));


/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * @param typeMap [Object] Map of MIME type -> Array[extensions]
	 * @param ...
	 */
	function Mime() {
	  this._types = Object.create(null);
	  this._extensions = Object.create(null);

	  for (var i = 0; i < arguments.length; i++) {
	    this.define(arguments[i]);
	  }
	}

	/**
	 * Define mimetype -> xtension mappings.  Each key is a mime-type that maps
	 * to an array of extensions associated with the type.  The first extension is
	 * used as the default extension for the type.
	 *
	 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
	 *
	 * @param map (Object) type definitions
	 */
	Mime.prototype.define = function(typeMap, force) {
	  for (var type in typeMap) {
	    var extensions = typeMap[type];
	    for (var i = 0; i < extensions.length; i++) {
	      var ext = extensions[i];
	      if (!force && (ext in this._types)) {
	        throw new Error(
	          'Attempt to change mapping for "' + ext +
	          '" extension from "' + this._types[ext] + '" to "' + type +
	          '". Pass `force=true` to allow this, otherwise remove "' + ext +
	          '" from the list of extensions for "' + type + '".'
	        );
	      }

	      this._types[ext] = type;
	    }

	    // Use first extension as default
	    if (force || !this._extensions[type]) {
	      this._extensions[type] = extensions[0];
	    }
	  }
	};

	/**
	 * Lookup a mime type based on extension
	 */
	Mime.prototype.getType = function(path) {
	  path = String(path);
	  var last = path.replace(/^.*[/\\]/, '').toLowerCase();
	  var ext = last.replace(/^.*\./, '').toLowerCase();

	  var hasPath = last.length < path.length;
	  var hasDot = ext.length < last.length - 1;

	  return (hasDot || !hasPath) && this._types[ext] || null;
	};

	/**
	 * Return file extension associated with a mime type
	 */
	Mime.prototype.getExtension = function(type) {
	  type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
	  return type && this._extensions[type.toLowerCase()] || null;
	};

	module.exports = Mime;


/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = {"application/andrew-inset":["ez"],"application/applixware":["aw"],"application/atom+xml":["atom"],"application/atomcat+xml":["atomcat"],"application/atomsvc+xml":["atomsvc"],"application/bdoc":["bdoc"],"application/ccxml+xml":["ccxml"],"application/cdmi-capability":["cdmia"],"application/cdmi-container":["cdmic"],"application/cdmi-domain":["cdmid"],"application/cdmi-object":["cdmio"],"application/cdmi-queue":["cdmiq"],"application/cu-seeme":["cu"],"application/dash+xml":["mpd"],"application/davmount+xml":["davmount"],"application/docbook+xml":["dbk"],"application/dssc+der":["dssc"],"application/dssc+xml":["xdssc"],"application/ecmascript":["ecma"],"application/emma+xml":["emma"],"application/epub+zip":["epub"],"application/exi":["exi"],"application/font-tdpfr":["pfr"],"application/font-woff":["woff"],"application/font-woff2":[],"application/geo+json":["geojson"],"application/gml+xml":["gml"],"application/gpx+xml":["gpx"],"application/gxf":["gxf"],"application/gzip":["gz"],"application/hjson":["hjson"],"application/hyperstudio":["stk"],"application/inkml+xml":["ink","inkml"],"application/ipfix":["ipfix"],"application/java-archive":["jar","war","ear"],"application/java-serialized-object":["ser"],"application/java-vm":["class"],"application/javascript":["js","mjs"],"application/json":["json","map"],"application/json5":["json5"],"application/jsonml+json":["jsonml"],"application/ld+json":["jsonld"],"application/lost+xml":["lostxml"],"application/mac-binhex40":["hqx"],"application/mac-compactpro":["cpt"],"application/mads+xml":["mads"],"application/manifest+json":["webmanifest"],"application/marc":["mrc"],"application/marcxml+xml":["mrcx"],"application/mathematica":["ma","nb","mb"],"application/mathml+xml":["mathml"],"application/mbox":["mbox"],"application/mediaservercontrol+xml":["mscml"],"application/metalink+xml":["metalink"],"application/metalink4+xml":["meta4"],"application/mets+xml":["mets"],"application/mods+xml":["mods"],"application/mp21":["m21","mp21"],"application/mp4":["mp4s","m4p"],"application/msword":["doc","dot"],"application/mxf":["mxf"],"application/octet-stream":["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"],"application/oda":["oda"],"application/oebps-package+xml":["opf"],"application/ogg":["ogx"],"application/omdoc+xml":["omdoc"],"application/onenote":["onetoc","onetoc2","onetmp","onepkg"],"application/oxps":["oxps"],"application/patch-ops-error+xml":["xer"],"application/pdf":["pdf"],"application/pgp-encrypted":["pgp"],"application/pgp-signature":["asc","sig"],"application/pics-rules":["prf"],"application/pkcs10":["p10"],"application/pkcs7-mime":["p7m","p7c"],"application/pkcs7-signature":["p7s"],"application/pkcs8":["p8"],"application/pkix-attr-cert":["ac"],"application/pkix-cert":["cer"],"application/pkix-crl":["crl"],"application/pkix-pkipath":["pkipath"],"application/pkixcmp":["pki"],"application/pls+xml":["pls"],"application/postscript":["ai","eps","ps"],"application/pskc+xml":["pskcxml"],"application/raml+yaml":["raml"],"application/rdf+xml":["rdf"],"application/reginfo+xml":["rif"],"application/relax-ng-compact-syntax":["rnc"],"application/resource-lists+xml":["rl"],"application/resource-lists-diff+xml":["rld"],"application/rls-services+xml":["rs"],"application/rpki-ghostbusters":["gbr"],"application/rpki-manifest":["mft"],"application/rpki-roa":["roa"],"application/rsd+xml":["rsd"],"application/rss+xml":["rss"],"application/rtf":["rtf"],"application/sbml+xml":["sbml"],"application/scvp-cv-request":["scq"],"application/scvp-cv-response":["scs"],"application/scvp-vp-request":["spq"],"application/scvp-vp-response":["spp"],"application/sdp":["sdp"],"application/set-payment-initiation":["setpay"],"application/set-registration-initiation":["setreg"],"application/shf+xml":["shf"],"application/smil+xml":["smi","smil"],"application/sparql-query":["rq"],"application/sparql-results+xml":["srx"],"application/srgs":["gram"],"application/srgs+xml":["grxml"],"application/sru+xml":["sru"],"application/ssdl+xml":["ssdl"],"application/ssml+xml":["ssml"],"application/tei+xml":["tei","teicorpus"],"application/thraud+xml":["tfi"],"application/timestamped-data":["tsd"],"application/voicexml+xml":["vxml"],"application/wasm":["wasm"],"application/widget":["wgt"],"application/winhlp":["hlp"],"application/wsdl+xml":["wsdl"],"application/wspolicy+xml":["wspolicy"],"application/xaml+xml":["xaml"],"application/xcap-diff+xml":["xdf"],"application/xenc+xml":["xenc"],"application/xhtml+xml":["xhtml","xht"],"application/xml":["xml","xsl","xsd","rng"],"application/xml-dtd":["dtd"],"application/xop+xml":["xop"],"application/xproc+xml":["xpl"],"application/xslt+xml":["xslt"],"application/xspf+xml":["xspf"],"application/xv+xml":["mxml","xhvml","xvml","xvm"],"application/yang":["yang"],"application/yin+xml":["yin"],"application/zip":["zip"],"audio/3gpp":[],"audio/adpcm":["adp"],"audio/basic":["au","snd"],"audio/midi":["mid","midi","kar","rmi"],"audio/mp3":[],"audio/mp4":["m4a","mp4a"],"audio/mpeg":["mpga","mp2","mp2a","mp3","m2a","m3a"],"audio/ogg":["oga","ogg","spx"],"audio/s3m":["s3m"],"audio/silk":["sil"],"audio/wav":["wav"],"audio/wave":[],"audio/webm":["weba"],"audio/xm":["xm"],"font/collection":["ttc"],"font/otf":["otf"],"font/ttf":["ttf"],"font/woff":[],"font/woff2":["woff2"],"image/apng":["apng"],"image/bmp":["bmp"],"image/cgm":["cgm"],"image/g3fax":["g3"],"image/gif":["gif"],"image/ief":["ief"],"image/jp2":["jp2","jpg2"],"image/jpeg":["jpeg","jpg","jpe"],"image/jpm":["jpm"],"image/jpx":["jpx","jpf"],"image/ktx":["ktx"],"image/png":["png"],"image/sgi":["sgi"],"image/svg+xml":["svg","svgz"],"image/tiff":["tiff","tif"],"image/webp":["webp"],"message/rfc822":["eml","mime"],"model/gltf+json":["gltf"],"model/gltf-binary":["glb"],"model/iges":["igs","iges"],"model/mesh":["msh","mesh","silo"],"model/vrml":["wrl","vrml"],"model/x3d+binary":["x3db","x3dbz"],"model/x3d+vrml":["x3dv","x3dvz"],"model/x3d+xml":["x3d","x3dz"],"text/cache-manifest":["appcache","manifest"],"text/calendar":["ics","ifb"],"text/coffeescript":["coffee","litcoffee"],"text/css":["css"],"text/csv":["csv"],"text/html":["html","htm","shtml"],"text/jade":["jade"],"text/jsx":["jsx"],"text/less":["less"],"text/markdown":["markdown","md"],"text/mathml":["mml"],"text/n3":["n3"],"text/plain":["txt","text","conf","def","list","log","in","ini"],"text/richtext":["rtx"],"text/rtf":[],"text/sgml":["sgml","sgm"],"text/shex":["shex"],"text/slim":["slim","slm"],"text/stylus":["stylus","styl"],"text/tab-separated-values":["tsv"],"text/troff":["t","tr","roff","man","me","ms"],"text/turtle":["ttl"],"text/uri-list":["uri","uris","urls"],"text/vcard":["vcard"],"text/vtt":["vtt"],"text/xml":[],"text/yaml":["yaml","yml"],"video/3gpp":["3gp","3gpp"],"video/3gpp2":["3g2"],"video/h261":["h261"],"video/h263":["h263"],"video/h264":["h264"],"video/jpeg":["jpgv"],"video/jpm":["jpgm"],"video/mj2":["mj2","mjp2"],"video/mp2t":["ts"],"video/mp4":["mp4","mp4v","mpg4"],"video/mpeg":["mpeg","mpg","mpe","m1v","m2v"],"video/ogg":["ogv"],"video/quicktime":["qt","mov"],"video/webm":["webm"]}

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.testRule = exports.getDirectoryFilesRecursive = exports.translatePathFromFiles = exports.addSeperatorToPath = exports.addTrailingS3Sep = exports.DEFAULT_TRANSFORM = exports.S3_PATH_SEP = exports.PATH_SEP = exports.REQUIRED_S3_UP_OPTS = exports.DEFAULT_UPLOAD_OPTIONS = exports.UPLOAD_IGNORES = undefined;

	var _lodash = __webpack_require__(7);

	var _lodash2 = _interopRequireDefault(_lodash);

	var _path = __webpack_require__(4);

	var _path2 = _interopRequireDefault(_path);

	var _recursiveReaddir = __webpack_require__(13);

	var _recursiveReaddir2 = _interopRequireDefault(_recursiveReaddir);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var UPLOAD_IGNORES = exports.UPLOAD_IGNORES = ['.DS_Store'];

	var DEFAULT_UPLOAD_OPTIONS = exports.DEFAULT_UPLOAD_OPTIONS = {
	  ACL: 'public-read'
	};

	var REQUIRED_S3_UP_OPTS = exports.REQUIRED_S3_UP_OPTS = ['Bucket'];
	var PATH_SEP = exports.PATH_SEP = _path2.default.sep;
	var S3_PATH_SEP = exports.S3_PATH_SEP = '/';
	var DEFAULT_TRANSFORM = exports.DEFAULT_TRANSFORM = function DEFAULT_TRANSFORM(item) {
	  return Promise.resolve(item);
	};

	var addTrailingS3Sep = exports.addTrailingS3Sep = function addTrailingS3Sep(fPath) {
	  return fPath ? fPath.replace(/\/?(\?|#|$)/, '/$1') : fPath;
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
	  var ignores = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

	  return new Promise(function (resolve, reject) {
	    (0, _recursiveReaddir2.default)(dir, ignores, function (err, files) {
	      return err ? reject(err) : resolve(files);
	    });
	  }).then(translatePathFromFiles(dir));
	};

	var testRule = exports.testRule = function testRule(rule, subject) {
	  if (_lodash2.default.isRegExp(rule)) {
	    return rule.test(subject);
	  } else if (_lodash2.default.isFunction(rule)) {
	    return !!rule(subject);
	  } else if (_lodash2.default.isArray(rule)) {
	    return _lodash2.default.every(rule, function (condition) {
	      return testRule(condition, subject);
	    });
	  } else if (_lodash2.default.isString(rule)) {
	    return new RegExp(rule).test(subject);
	  } else {
	    throw new Error('Invalid include / exclude rule');
	  }
	};

/***/ },
/* 13 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_13__;

/***/ }
/******/ ])
});
;