'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _s3 = require('s3');

var _s32 = _interopRequireDefault(_s3);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _progress = require('progress');

var _progress2 = _interopRequireDefault(_progress);

_http2['default'].globalAgent.maxSockets = _https2['default'].globalAgent.maxSockets = 50;

var S3Plugin = (function () {
  function S3Plugin() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? { s3Options: {} } : arguments[0];

    _classCallCheck(this, S3Plugin);

    var s3Options = options.s3Options;
    var directory = options.directory;
    var include = options.include;
    var exclude = options.exclude;

    this.requiredS3Opts = ['accessKeyId', 'secretAccessKey', 'Bucket'];
    this.isConnected = false;

    this.options = { directory: directory, include: include, exclude: exclude };
    this.clientConfig = {
      maxAsyncS3: 50,
      s3Options: s3Options
    };
  }

  _createClass(S3Plugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      var hasRequiredOptions = this.requiredS3Opts.every(function (type) {
        return _this.clientConfig.s3Options[type];
      });

      // Set directory to output dir or custom
      this.options.directory = this.options.directory || compiler.options.output.path;

      compiler.plugin('after-emit', function (compilation, cb) {
        if (!hasRequiredOptions) {
          compilation.errors.push(new Error('S3Plugin: Must provide Bucket, secretAccessKey and accessKeyId'));
          cb();
        }

        _fs2['default'].readdir(_this.options.directory, function (error, files) {
          if (error) {
            compilation.errors.push(new Error('S3Plugin: ' + error));
            cb();
          } else {
            _this.uploadFiles(_this.filterAllowedFiles(files)).then(function () {
              console.log('Finished Uploading to S3');
              cb();
            })['catch'](function (e) {
              compilation.errors.push(new Error('S3Plugin: ' + e));
              cb();
            });
          }
        });
      });
    }
  }, {
    key: 'filterAllowedFiles',
    value: function filterAllowedFiles(files) {
      var _this2 = this;

      return files.reduce(function (res, file) {
        if (_this2.isIncludeOrExclude(file)) res.push({
          name: file,
          path: _path2['default'].resolve(_this2.options.directory, file)
        });

        return res;
      }, []);
    }
  }, {
    key: 'isIncludeOrExclude',
    value: function isIncludeOrExclude(file) {
      var isExclude;
      var isInclude;
      var _options = this.options;
      var include = _options.include;
      var exclude = _options.exclude;

      if (!include) isInclude = true;else isInclude = include.test(file);

      if (!exclude) isExclude = false;else isExclude = exclude.test(file);

      return isInclude && !isExclude;
    }
  }, {
    key: 'connect',
    value: function connect() {
      if (this.isConnected) return;

      this.client = _s32['default'].createClient(this.clientConfig);
      this.isConnected = true;
    }
  }, {
    key: 'uploadFiles',
    value: function uploadFiles() {
      var _this3 = this;

      var files = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

      return Promise.all(files.map(function (file) {
        return _this3.uploadFile(file.name, file.path);
      }));
    }
  }, {
    key: 'uploadFile',
    value: function uploadFile(fileName, file) {
      this.connect();
      var upload = this.client.uploadFile({
        localFile: file,
        s3Params: {
          Key: fileName,
          Bucket: this.clientConfig.s3Options.Bucket
        }
      });

      //var progressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
      //complete: '>',
      //incomplete: '-',
      //total: 100
      //})

      console.log('Uploading ', fileName);
      return new Promise(function (resolve, reject) {
        upload.on('error', reject);

        upload.on('progress', function () {
          var progress = (upload.progressAmount / upload.progressTotal).toFixed(2);

          if (progress === 100.00) console.log('Finished Uploading ', fileName);
        });

        upload.on('end', resolve);
      });
    }
  }]);

  return S3Plugin;
})();

exports['default'] = S3Plugin;
module.exports = exports['default'];
//progressBar.update(progress)

