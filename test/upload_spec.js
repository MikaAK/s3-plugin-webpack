import _ from 'lodash'
import path from 'path'
import testHelpers from './upload_test_helpers'
import {assert} from 'chai'

const CONTEXT = __dirname

var assertFileMatches = testHelpers.assertFileMatches.bind(testHelpers),
    testForFailFromStatsOrGetS3Files = testHelpers.testForFailFromStatsOrGetS3Files.bind(testHelpers)

// Notes:
// I had to use a resolve for the error instead of reject
// because it would fire if an assertion failed in a .then
describe('S3 Webpack Upload', function() {
  before(testHelpers.cleanOutputDirectory)
  describe('With directory', function() {
    var s3Config,
        config

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
      testHelpers.createFolder(path.resolve(testHelpers.OUTPUT_PATH, 'deeply', 'nested', 'folder'))
      testHelpers.createRandomFile(path.resolve(testHelpers.OUTPUT_PATH, 'deeply'))
      testHelpers.createRandomFile(path.resolve(testHelpers.OUTPUT_PATH, 'deeply', 'nested'))
      testHelpers.createRandomFile(path.resolve(testHelpers.OUTPUT_PATH, 'deeply', 'nested', 'folder'))

      return testHelpers.runWebpackConfig({config, s3Config})
        .then(testHelpers.testForFailFromDirectoryOrGetS3Files(testHelpers.OUTPUT_PATH))
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
        .then(randomFileBody => assert.match(randomFileBody, testHelpers.S3_ERROR_REGEX, 'random file exists'))
    })
  })

  it('excludes files from `exclude` property', function() {
    testHelpers.createOutputPath()

    var randomFiles = [
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH),
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH)
    ]
    var excludeRegex = new RegExp(`${_.pluck(randomFiles, 'fileName').join('|')}`)
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
      .then(function({stats, errors}) {
        if (errors)
          return assert.fail([], errors, 'Webpack Build Failed')

        return testHelpers.getFilesFromStats(stats)
      })
      .then(files => Promise.resolve(files.filter(name => /.*\.html$/.test(name))))
      .then(function([htmlFile]) {
        assert.match(testHelpers.readFileFromOutputDir(htmlFile), new RegExp(testHelpers.S3_URL, 'gi'), `Url not changed to ${testHelpers.S3_URL}`)
      })
  })
})
