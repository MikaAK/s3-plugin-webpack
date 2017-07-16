[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]
[![chat][chat]][chat-url]

<div align="center">
  <img width="200" height="200"
    src="https://cdn.worldvectorlogo.com/logos/aws-s3.svg">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
  <h1>S3 Plugin</h1>
  <p>This plugin will upload all built assets to s3.</p>
</div>

<h2 align="center">Install</h2>

```bash
$ npm i webpack-s3-plugin
```
Note: This plugin needs NodeJS > 4.3.0

<h2 align="center">Usage</h2>

> I notice a lot of people are setting the directory option when the files are part of their build. Please don't set   directory if your uploading your build. Using the directory option reads the files after compilation to upload instead of from the build process.

> You can also use a [credentials file](https://blogs.aws.amazon.com/security/post/Tx3D6U6WSFGOK2H/A-New-and-Standardized-Way-to-Manage-Credentials-in-the-AWS-SDKs) from AWS.

> s3Options default to `ACL: 'public-read'` so you may need to override if you have other needs. See [#28](https://github.com/MikaAK/s3-plugin-webpack/issues/28#issuecomment-309171024)


##### Require `webpack-s3-plugin`
```javascript
var S3Plugin = require('webpack-s3-plugin')
```

##### With exclude
```javascript
var config = {
  plugins: [
    new S3Plugin({
      // Exclude uploading of html
      exclude: /.*\.html$/,
      // s3Options are required
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'us-west-1'
      },
      s3UploadOptions: {
        Bucket: 'MyBucket'
      },
      cdnizerOptions: {
        defaultCDNBase: 'http://asdf.ca'
      }
    })
  ]
}
```

##### With include
```javascript
var config = {
  plugins: [
    new S3Plugin({
      // Only upload css and js
      include: /.*\.(css|js)/,
      // s3Options are required
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      s3UploadOptions: {
        Bucket: 'MyBucket'
      }
    })
  ]
}
```

##### Advanced `include` and `exclude rules`

`include` and `exclude` rules behave similarly to Webpack's loader options.  In addition to a RegExp you can pass a function which will be called with the path as its first argument.  Returning a truthy value will match the rule.  You can also pass an Array of rules, all of which must pass for the file to be included or excluded.

```javascript
import isGitIgnored from 'is-gitignored'

// Up to you how to handle this
var isPathOkToUpload = function(path) {
  return require('my-projects-publishing-rules').checkFile(path)
}

var config = {
  plugins: [
    new S3Plugin({
      // Only upload css and js and only the paths that our rules database allows
      include: [
        /.*\.(css|js)/,
        function(path) { isPathOkToUpload(path) }
      ],

      // function to check if the path is gitignored
      exclude: isGitIgnored,

      // s3Options are required
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      s3UploadOptions: {
        Bucket: 'MyBucket'
      }
    })
  ]
}
```

##### With basePathTransform
```javascript
import gitsha from 'gitsha'

var addSha = function() {
  return new Promise(function(resolve, reject) {
    gitsha(__dirname, function(error, output) {
      if(error)
        reject(error)
      else
       // resolve to first 5 characters of sha
       resolve(output.slice(0, 5))
    })
  })
}

var config = {
  plugins: [
    new S3Plugin({
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      s3UploadOptions: {
        Bucket: 'MyBucket'
      },
      basePathTransform: addSha
    })
  ]
}


// Will output to /${mySha}/${fileName}
```

##### With CloudFront invalidation
```javascript
var config = {
  plugins: [
    new S3Plugin({
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      s3UploadOptions: {
        Bucket: 'MyBucket'
      },
      cloudfrontInvalidateOptions: {
        DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        Items: ["/*"]
      }
    })
  ]
}
```

##### With Dynamic Upload Options
```javascript
var config = {
  plugins: [
    new S3Plugin({
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      s3UploadOptions: {
        Bucket: 'MyBucket',
        ContentEncoding(fileName) {
          if (/\.gz/.test(fileName))
            return 'gzip'
        },

        ContentType(fileName) {
          if (/\.js/.test(fileName))
            return 'application/javascript'
          else
            return 'text/plain'
        }
      }
    })
  ]
}
```

### Options

- `exclude`: A Pattern to match for excluded content. Behaves similarly to webpack's loader configuration.
- `include`: A Pattern to match for included content. Behaves the same as the `exclude`.
- `s3Options`: Provide keys for upload extention of [s3Config](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property)
- `s3UploadOptions`: Provide upload options [putObject](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property )
- `basePath`: Provide the namespace where upload files on S3
- `directory`: Provide a directory to upload (if not supplied will upload js/css from compilation)
- `htmlFiles`: Html files to cdnize (defaults to all in output directory)
- `cdnizerCss`: Config for css cdnizer check below
- `noCdnizer`: Disable cdnizer (defaults true if no cdnizerOptions passed)
- `cdnizerOptions`: options to pass to [cdnizer](https://www.npmjs.com/package/cdnizer)
- `basePathTransform`: transform the base path to add a folder name. Can return a promise or a string
- `progress`: Enable progress bar (defaults true)


<h2 align="center">Maintainers</h2>

<table>
  <tbody>
    <tr>
      <td align="center">
        <img width="150" height="150"
        src="https://avatars3.githubusercontent.com/u/4650931?v=3&s=150">
        </br>
        <a href="https://github.com/MikaAK">Mika Kalathil</a>
      </td>
      <td align="center">
        <img width="150" height="150"
        src="https://avatars3.githubusercontent.com/u/166921?v=3&s=150">
        </br>
        <a href="https://github.com/bebraw">Juho Vepsäläinen</a>
      </td>
      <td align="center">
        <img width="150" height="150"
        src="https://avatars2.githubusercontent.com/u/8420490?v=3&s=150">
        </br>
        <a href="https://github.com/d3viant0ne">Joshua Wiens</a>
      </td>
      <td align="center">
        <img width="150" height="150"
        src="https://avatars3.githubusercontent.com/u/533616?v=3&s=150">
        </br>
        <a href="https://github.com/SpaceK33z">Kees Kluskens</a>
      </td>
      <td align="center">
        <img width="150" height="150"
        src="https://avatars3.githubusercontent.com/u/3408176?v=3&s=150">
        </br>
        <a href="https://github.com/TheLarkInn">Sean Larkin</a>
      </td>
    </tr>
  <tbody>
</table>


[npm]: https://img.shields.io/npm/v/s3-plugin-webpack.svg
[npm-url]: https://npmjs.com/package/s3-plugin-webpack

[node]: https://img.shields.io/node/v/s3-plugin-webpack.svg
[node-url]: https://nodejs.org

[deps]: https://david-dm.org/webpack-contrib/s3-plugin-webpack.svg
[deps-url]: https://david-dm.org/webpack-contrib/s3-plugin-webpack

[tests]: http://img.shields.io/travis/webpack-contrib/s3-plugin-webpack.svg
[tests-url]: https://travis-ci.org/webpack-contrib/s3-plugin-webpack

[cover]: https://coveralls.io/repos/github/webpack-contrib/s3-plugin-webpack/badge.svg
[cover-url]: https://coveralls.io/github/webpack-contrib/s3-plugin-webpack

[chat]: https://badges.gitter.im/webpack/webpack.svg
[chat-url]: https://gitter.im/webpack/webpack
