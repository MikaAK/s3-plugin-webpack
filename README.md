S3 Plugin
===

This plugin will upload all built assets to s3


### Install Instructions

```bash
$ npm i webpack-s3-plugin
```
Note: This plugin needs NodeJS > 0.12.0

### Usage Instructions

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


### Options

- `exclude`: Regex to match for excluded content
- `include`: Regex to match for included content
- `s3Options`: Provide keys for upload extention of [s3Config](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property)
- `s3UploadOptions`: Provide upload options [putObject](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property )
- `basePath`: Provide the namespace where upload files on S3
- `directory`: Provide a directory to upload (defaults to webpack output directory)
- `htmlFiles`: Html files to cdnize (defaults to all in output directory)
- `noCdnizer`: Disable cdnizer (defaults true if no cdnizerOptions passed)
- `cdnizerOptions`: options to pass to [cdnizer](https://www.npmjs.com/package/cdnizer)
