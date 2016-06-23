import _ from 'lodash'
import path from 'path'
import S3Opts from './s3_options'
import testHelpers from './upload_test_helpers'
import {assert} from 'chai'
import * as sinon from 'sinon'

const CONTEXT = __dirname

const assertFileMatches = testHelpers.assertFileMatches.bind(testHelpers),
      testForFailFromStatsOrGetS3Files = testHelpers.testForFailFromStatsOrGetS3Files.bind(testHelpers),
      testForErrorsOrGetFileNames = testHelpers.testForErrorsOrGetFileNames.bind(testHelpers)

// Notes:
// I had to use a resolve for the error instead of reject
// because it would fire if an assertion failed in a .then
describe('S3 Webpack Upload', function() {
  beforeEach(testHelpers.cleanOutputDirectory)

  describe('With directory', function() {
    var s3Config,
        config,
        testS3Upload = testHelpers.testForFailFromDirectoryOrGetS3Files(testHelpers.OUTPUT_PATH)

    beforeEach(function() {
      s3Config = {directory: path.resolve(CONTEXT, '.tmp')}
      config = testHelpers.createWebpackConfig({s3Config})

      testHelpers.createOutputPath()
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH)
    })

    it('uploads entire directory to s3', function() {
      return testHelpers.runWebpackConfig({config, s3Config})
        .then(testHelpers.testForFailFromDirectoryOrGetS3Files(testHelpers.OUTPUT_PATH))
        .then(assertFileMatches)
    })

    it('uploads directory recursivly to s3', function() {
      const createPath = (...fPath) => path.resolve(testHelpers.OUTPUT_PATH, ...fPath)

      testHelpers.createFolder(createPath('deeply', 'nested', 'folder'))
      testHelpers.createFolder(createPath('deeply', 'nested', 'folder2'))
      testHelpers.createFolder(createPath('deeply', 'nested2'))

      testHelpers.createRandomFile(createPath('deeply'))
      testHelpers.createRandomFile(createPath('deeply', 'nested'))
      testHelpers.createRandomFile(createPath('deeply', 'nested', 'folder'))
      testHelpers.createRandomFile(createPath('deeply', 'nested', 'folder2'))
      testHelpers.createRandomFile(createPath('deeply', 'nested', 'folder2'))
      testHelpers.createRandomFile(createPath('deeply', 'nested2'))

      return testHelpers.runWebpackConfig({config, s3Config})
        .then(testS3Upload)
        .then(assertFileMatches)
    })
  })

  describe('Without Directory', function() {
    it('uploads build to s3', function() {
      var randomFile,
          config = testHelpers.createWebpackConfig()

      testHelpers.createOutputPath()
      randomFile = testHelpers.createRandomFile(testHelpers.OUTPUT_PATH)

      return testHelpers.runWebpackConfig({config})
        .then(testForFailFromStatsOrGetS3Files)
        .then(assertFileMatches)
        .then(() => testHelpers.fetch(testHelpers.S3_URL + randomFile.fileName))
        .then(fileBody => assert.match(fileBody, testHelpers.S3_ERROR_REGEX, 'random file exists'))
    })

    it('uploads build to s3 with basePath', function() {
      const BASE_PATH = 'test'
      const s3Config = {basePath : BASE_PATH}

      var randomFile,
          config = testHelpers.createWebpackConfig({s3Config})

      testHelpers.createOutputPath()
      randomFile = testHelpers.createRandomFile(testHelpers.OUTPUT_PATH)

      return testHelpers.runWebpackConfig({config})
        .then(testForErrorsOrGetFileNames)
        .then(() => testHelpers.fetch(`${testHelpers.S3_URL}${BASE_PATH}/${randomFile.fileName}`))
        .then(fileBody => assert.match(fileBody, testHelpers.S3_ERROR_REGEX, 'random file exists'))
    })
  })

  describe('basePathTransform', function() {
    it('can transform base path with promise', function() {
      var NAME_PREFIX = 'TEST112233',
          BASE_PATH = 'test'
      var s3Config = {
        basePath: BASE_PATH,
        basePathTransform(basePath) {
          return Promise.resolve(basePath + NAME_PREFIX)
        }
      }
      var config = testHelpers.createWebpackConfig({s3Config})

      return testHelpers.runWebpackConfig({config})
        .then(testForErrorsOrGetFileNames)
        .then(fileNames => _.filter(fileNames, fileName => /\.js/.test(fileName)))
        .then(([fileName]) => {
          return Promise.all([
            testHelpers.readFileFromOutputDir(fileName),
            testHelpers.fetch(`${testHelpers.S3_URL}${BASE_PATH}/${NAME_PREFIX}/${fileName}`)
          ])
        })
        .then(([localFile, remoteFile]) => assert.equal(remoteFile, localFile, 'basepath and prefixes added'))
    })

    it('can transform base path without promise', function() {
      var NAME_PREFIX = 'TEST112233',
          BASE_PATH = 'test'
      var s3Config = {
        basePath: BASE_PATH,
        basePathTransform(basePath) {
          return basePath + NAME_PREFIX
        }
      }
      var config = testHelpers.createWebpackConfig({s3Config})

      return testHelpers.runWebpackConfig({config})
        .then(testForErrorsOrGetFileNames)
        .then(fileNames => _.filter(fileNames, fileName => /\.js/.test(fileName)))
        .then(([fileName]) => {
          return Promise.all([
            testHelpers.readFileFromOutputDir(fileName),
            testHelpers.fetch(`${testHelpers.S3_URL}${BASE_PATH}/${NAME_PREFIX}/${fileName}`)
          ])
        })
        .then(([localFile, remoteFile]) => assert.equal(remoteFile, localFile, 'basepath and prefixes added'))
    })
  })

  it('starts a CloudFront invalidation', function() {
    var config,
        randomFile

    var s3Config = {
      cloudfrontInvalidateOptions: testHelpers.getCloudfrontInvalidateOptions()
    }

    config = testHelpers.createWebpackConfig({s3Config})

    testHelpers.createOutputPath()
    randomFile = testHelpers.createRandomFile(testHelpers.OUTPUT_PATH)

    return testHelpers.runWebpackConfig({config})
      .then(testForFailFromStatsOrGetS3Files)
      .then(assertFileMatches)
      .then(() => testHelpers.fetch(testHelpers.S3_URL + randomFile.fileName))
      .then(randomFileBody => assert.match(randomFileBody, testHelpers.S3_ERROR_REGEX, 'random file exists'))
  })

  it('excludes files from `exclude` property', function() {
    testHelpers.createOutputPath()

    var randomFiles = [
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH),
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH)
    ]
    var excludeRegex = new RegExp(`${_.map(randomFiles, 'fileName').join('|')}`)
    var s3Config = {
      exclude: excludeRegex
    }
    var excludeFilter = ({name}) => excludeRegex.test(name)

    var config = testHelpers.createWebpackConfig({s3Config})

    return testHelpers.runWebpackConfig({config})
      .then(testForFailFromStatsOrGetS3Files)
      .then(assertFileMatches)
      .then((files) => {
        var fFiles = files.filter(excludeFilter)

        for (let {name, actual} of fFiles)
          assert.match(actual, testHelpers.S3_ERROR_REGEX, `Excluded File ${name} Exists in S3`)
      })
  })

  it('cdnizes links inside of html files', function() {
    var s3Config = {
      cdnizerOptions: {
        defaultCDNBase: testHelpers.S3_URL
      }
    }

    var config = testHelpers.createWebpackConfig({s3Config})

    return testHelpers.runWebpackConfig({config})
      .then(testForErrorsOrGetFileNames)
      .then(fileNames => Promise.resolve(fileNames.filter(name => /.*\.html$/.test(name))))
      .then(function([htmlFile]) {
        var outputFile = testHelpers.readFileFromOutputDir(htmlFile),
            s3UrlRegex = new RegExp(testHelpers.S3_URL, 'gi')

        return assert.match(outputFile, s3UrlRegex, `Url not changed to ${testHelpers.S3_URL}`)
      })
  })

  it('allows functions to be used for "s3UploadOptions"', function() {
    const Bucket = sinon.spy(() => S3Opts.AWS_BUCKET)

    var s3Config = {
      s3UploadOptions: {Bucket}
    }

    var config = testHelpers.createWebpackConfig({s3Config})

    return testHelpers.runWebpackConfig({config})
      .then(testForFailFromStatsOrGetS3Files)
      .then(() => sinon.assert.called(Bucket))
  })
})
