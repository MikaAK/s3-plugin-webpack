import _ from 'lodash';
import https from 'https';
import path from 'path';
import webpack from 'webpack';
import fs from 'fs';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import s3Opts from './s3_options';
import S3WebpackPlugin from '../src/index.js';
import { spawnSync } from 'child_process';
import ExtractTextPlugin from 'extract-text-webpack-plugin';

const S3_URL = `https://s3.dualstack.${s3Opts.AWS_REGION}.amazonaws.com/${s3Opts.AWS_BUCKET}/`,
  S3_ERROR_REGEX = /<Error>/,
  OUTPUT_FILE_NAME = 's3Test',
  OUTPUT_PATH = path.resolve(__dirname, '.tmp'),
  ENTRY_PATH = path.resolve(__dirname, 'fixtures/index.js'),
  createBuildFailError = errors => `Webpack Build Failed ${errors}`;

var deleteFolderRecursive = function (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file) => {
      const curPath = `${path}/${file}`;

      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });

    fs.rmdirSync(path);
  }
};

const generateS3Config = function (config) {
  const params = _.merge({}, {
    s3Options: s3Opts.s3Options,
    s3UploadOptions: s3Opts.s3UploadOptions,
  }, config);

  return new S3WebpackPlugin(params);
};

export default {
  OUTPUT_FILE_NAME,
  OUTPUT_PATH,
  S3_URL,
  S3_ERROR_REGEX,

  fetch(url) {
    return new Promise(((resolve, reject) => {
      https.get(url, (response) => {
        let body = '';

        response.on('data', data => body += data);
        response.on('end', () => resolve(body));
        response.on('error', reject);
      });
    }));
  },

  addSlashToPath(pathName) {
    return pathName.endsWith(path.sep) ? pathName : pathName + path.sep;
  },

  createFolder(pathToFolder) {
    spawnSync('mkdir', ['-p', pathToFolder], { stdio: 'inherit' });
  },

  testForFailFromStatsOrGetS3Files({ errors, stats }) {
    if (errors) { return expect(createBuildFailError(errors)).toBe(false); }

    return this.getBuildFilesFromS3(this.getFilesFromStats(stats));
  },

  testForFailFromDirectoryOrGetS3Files(directory) {
    return ({ errors }) => {
      const basePath = this.addSlashToPath(`${directory}`);

      if (errors) { return expect(createBuildFailError(errors)).toBe(false); }
      return this.getBuildFilesFromS3(this.getFilesFromDirectory(directory, basePath));
    };
  },

  cleanOutputDirectory() {
    deleteFolderRecursive(OUTPUT_PATH);
  },

  createOutputPath() {
    if (!fs.existsSync(OUTPUT_PATH)) { fs.mkdirSync(OUTPUT_PATH); }
  },

  createRandomFile(newPath) {
    let hash = Math.random() * 10000,
      fileName = `random-file-${hash}`,
      newFileName = `${newPath}/${fileName}`;

    // Create Random File to upload
    fs.writeFileSync(newFileName, `This is a new file - ${hash}`);

    return { fullPath: newFileName, fileName };
  },

  createWebpackConfig({ config, s3Config } = {}) {
    return _.extend({
      entry: ENTRY_PATH,
      module: {
        loaders: [{
          test: /\.png/,
          loader: 'file-loader?name=[name]-[hash].[ext]',
        }, {
          test: /\.css$/,
          loader: ExtractTextPlugin.extract('css-loader'),
        }],
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new ExtractTextPlugin('styles.css'),
        generateS3Config(s3Config),
      ],
      output: {
        path: OUTPUT_PATH,
        filename: `${OUTPUT_FILE_NAME}-[hash]-${+new Date()}.js`,
      },
    }, config);
  },

  runWebpackConfig({ config }) {
    this.createOutputPath();

    return new Promise(((resolve) => {
      webpack(config, (err, stats) => {
        if (stats.toJson().errors.length) { resolve({ errors: stats.toJson().errors }); } else { resolve({ config, stats }); }
      });
    }));
  },

  getFilesFromDirectory(directory, basePath) {
    const res = (function readDirectory(dir) {
      return fs.readdirSync(dir)
        .reduce((res, file) => {
          const fPath = path.resolve(dir, file);

          if (fs.lstatSync(fPath).isDirectory()) { res.push(...readDirectory(fPath)); } else { res.push(fPath); }

          return res;
        }, []);
    }).call(this, directory);

    return res
      .map(file => file.replace(basePath, ''));
  },

  getFilesFromStats(stats) {
    return _.map(stats.toJson().assets, 'name');
  },

  getBuildFilesFromS3(files) {
    const fetchFiles = files
      .filter(file => !/.*\.html$/.test(file));

    return Promise.all(fetchFiles.map(file => this.fetch(S3_URL + file)))
      .then(nFiles => nFiles.map((file, i) => {
        const fetchFile = fetchFiles[i];

        return {
          name: fetchFile,
          s3Url: S3_URL + fetchFile,
          actual: file,
          expected: this.readFileFromOutputDir(fetchFile),
        };
      }));
  },

  readFileFromOutputDir(file) {
    return fs.readFileSync(path.resolve(OUTPUT_PATH, file)).toString();
  },

  testForErrorsOrGetFileNames({ stats, errors }) {
    if (errors) { return expect(createBuildFailError(errors)).toBe(false); }

    return this.getFilesFromStats(stats);
  },

  assertFileMatches(files) {
    const errors = _(files)
      .map(({ expected, actual, name, s3Url }) => expect(actual).toEqual(expected))
      .compact()
      .value();

    return Promise.all(_.some(errors) ? errors : files);
  },

  getCloudfrontInvalidateOptions() {
    return s3Opts.cloudfrontInvalidateOptions;
  },
};
