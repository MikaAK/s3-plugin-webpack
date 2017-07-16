import _ from 'lodash';
import path from 'path';
import S3Opts from './s3_options';
import testHelpers from './upload_test_helpers';
import jest from 'jest';

const CONTEXT = __dirname;

const assertFileMatches = testHelpers.assertFileMatches.bind(testHelpers),
  testForFailFromStatsOrGetS3Files = testHelpers.testForFailFromStatsOrGetS3Files.bind(testHelpers),
  testForErrorsOrGetFileNames = testHelpers.testForErrorsOrGetFileNames.bind(testHelpers);

// Notes:
// I had to use a resolve for the error instead of reject
// because it would fire if an assertion failed in a .then
describe('S3 Webpack Upload', () => {
  beforeEach(testHelpers.cleanOutputDirectory);

  describe('With directory', () => {
    let s3Config,
      config,
      testS3Upload = testHelpers.testForFailFromDirectoryOrGetS3Files(testHelpers.OUTPUT_PATH);

    beforeEach(() => {
      s3Config = { directory: path.resolve(CONTEXT, '.tmp') };
      config = testHelpers.createWebpackConfig({ s3Config });

      testHelpers.createOutputPath();
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH);
    });

    it('uploads entire directory to s3', () => testHelpers.runWebpackConfig({ config, s3Config })
      .then(testHelpers.testForFailFromDirectoryOrGetS3Files(testHelpers.OUTPUT_PATH))
      .then(assertFileMatches));

    it('uploads directory recursivly to s3', () => {
      const createPath = (...fPath) => path.resolve(testHelpers.OUTPUT_PATH, ...fPath);

      testHelpers.createFolder(createPath('deeply', 'nested', 'folder'));
      testHelpers.createFolder(createPath('deeply', 'nested', 'folder2'));
      testHelpers.createFolder(createPath('deeply', 'nested2'));

      testHelpers.createRandomFile(createPath('deeply'));
      testHelpers.createRandomFile(createPath('deeply', 'nested'));
      testHelpers.createRandomFile(createPath('deeply', 'nested', 'folder'));
      testHelpers.createRandomFile(createPath('deeply', 'nested', 'folder2'));
      testHelpers.createRandomFile(createPath('deeply', 'nested', 'folder2'));
      testHelpers.createRandomFile(createPath('deeply', 'nested2'));

      return testHelpers.runWebpackConfig({ config, s3Config })
        .then(testS3Upload)
        .then(assertFileMatches);
    });
  });

  describe('Without Directory', () => {
    it('uploads build to s3', () => {
      let randomFile,
        config = testHelpers.createWebpackConfig();

      testHelpers.createOutputPath();
      randomFile = testHelpers.createRandomFile(testHelpers.OUTPUT_PATH);

      return testHelpers.runWebpackConfig({ config })
        .then(testForFailFromStatsOrGetS3Files)
        .then(assertFileMatches)
        .then(() => testHelpers.fetch(testHelpers.S3_URL + randomFile.fileName))
        .then(fileBody => expect(fileBody).toMatch(testHelpers.S3_ERROR_REGEX));
    });

    it('uploads build to s3 with basePath', () => {
      const BASE_PATH = 'test';
      const s3Config = { basePath: BASE_PATH };

      let randomFile,
        config = testHelpers.createWebpackConfig({ s3Config });

      testHelpers.createOutputPath();
      randomFile = testHelpers.createRandomFile(testHelpers.OUTPUT_PATH);

      return testHelpers.runWebpackConfig({ config })
        .then(testForErrorsOrGetFileNames)
        .then(() => testHelpers.fetch(`${testHelpers.S3_URL}${BASE_PATH}/${randomFile.fileName}`))
        .then(fileBody => expect(fileBody).toMatch(testHelpers.S3_ERROR_REGEX));
    });
  });

  describe('basePathTransform', () => {
    it('can transform base path with promise', () => {
      let NAME_PREFIX = 'TEST112233',
        BASE_PATH = 'test';
      const s3Config = {
        basePath: BASE_PATH,
        basePathTransform(basePath) {
          return Promise.resolve(basePath + NAME_PREFIX);
        },
      };
      const config = testHelpers.createWebpackConfig({ s3Config });

      return testHelpers.runWebpackConfig({ config })
        .then(testForErrorsOrGetFileNames)
        .then(fileNames => _.filter(fileNames, fileName => /\.js/.test(fileName)))
        .then(([fileName]) => Promise.all([
          testHelpers.readFileFromOutputDir(fileName),
          testHelpers.fetch(`${testHelpers.S3_URL}${BASE_PATH}/${NAME_PREFIX}/${fileName}`),
        ]))
        .then(([localFile, remoteFile]) => expect(remoteFile).toEqual(localFile));
    });

    it('can transform base path without promise', () => {
      let NAME_PREFIX = 'TEST112233',
        BASE_PATH = 'test';
      const s3Config = {
        basePath: BASE_PATH,
        basePathTransform(basePath) {
          return basePath + NAME_PREFIX;
        },
      };
      const config = testHelpers.createWebpackConfig({ s3Config });

      return testHelpers.runWebpackConfig({ config })
        .then(testForErrorsOrGetFileNames)
        .then(fileNames => _.filter(fileNames, fileName => /\.js/.test(fileName)))
        .then(([fileName]) => Promise.all([
          testHelpers.readFileFromOutputDir(fileName),
          testHelpers.fetch(`${testHelpers.S3_URL}${BASE_PATH}/${NAME_PREFIX}/${fileName}`),
        ]))
        .then(([localFile, remoteFile]) => expect(remoteFile).toEqual(localFile));
    });
  });

  it('starts a CloudFront invalidation', () => {
    let config,
      randomFile;

    const s3Config = {
      cloudfrontInvalidateOptions: testHelpers.getCloudfrontInvalidateOptions(),
    };

    config = testHelpers.createWebpackConfig({ s3Config });

    testHelpers.createOutputPath();
    randomFile = testHelpers.createRandomFile(testHelpers.OUTPUT_PATH);

    return testHelpers.runWebpackConfig({ config })
      .then(testForFailFromStatsOrGetS3Files)
      .then(assertFileMatches)
      .then(() => testHelpers.fetch(testHelpers.S3_URL + randomFile.fileName))
      .then(randomFileBody => expect(randomFileBody).toMatch(testHelpers.S3_ERROR_REGEX));
  });

  it('excludes files from `exclude` property', () => {
    testHelpers.createOutputPath();

    const randomFiles = [
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH),
      testHelpers.createRandomFile(testHelpers.OUTPUT_PATH),
    ];
    const excludeRegex = new RegExp(`${_.map(randomFiles, 'fileName').join('|')}`);
    const s3Config = {
      exclude: excludeRegex,
    };
    const excludeFilter = ({ name }) => excludeRegex.test(name);

    const config = testHelpers.createWebpackConfig({ s3Config });

    return testHelpers.runWebpackConfig({ config })
      .then(testForFailFromStatsOrGetS3Files)
      .then(assertFileMatches)
      .then((files) => {
        const fFiles = files.filter(excludeFilter);

        for (const { name, actual } of fFiles) { expect(actual).toMatch(testHelpers.S3_ERROR_REGEX); }
      });
  });

  it('cdnizes links inside of html files', () => {
    const s3Config = {
      cdnizerOptions: {
        defaultCDNBase: testHelpers.S3_URL,
      },
    };

    const config = testHelpers.createWebpackConfig({ s3Config });

    return testHelpers.runWebpackConfig({ config })
      .then(testForErrorsOrGetFileNames)
      .then(fileNames => Promise.resolve(fileNames.filter(name => /.*\.html$/.test(name))))
      .then(([htmlFile]) => {
        let outputFile = testHelpers.readFileFromOutputDir(htmlFile),
          s3UrlRegex = new RegExp(testHelpers.S3_URL, 'gi');

        return expect(outputFile).toMatch(s3UrlRegex);
      });
  });

  it('cdnizes links inside of CSS files', () => {
    const s3Config = {
      cdnizerOptions: {
        defaultCDNBase: testHelpers.S3_URL,
      },
    };

    const config = testHelpers.createWebpackConfig({ s3Config });

    return testHelpers.runWebpackConfig({ config })
      .then(testForErrorsOrGetFileNames)
      .then(fileNames => Promise.resolve(fileNames.filter(name => /.*\.css$/.test(name))))
      .then(([file]) => {
        let outputFile = testHelpers.readFileFromOutputDir(file),
          s3UrlRegex = new RegExp(testHelpers.S3_URL, 'gi');

        return expect(outputFile).toMatch(s3UrlRegex);
      });
  });
});
