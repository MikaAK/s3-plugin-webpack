
S3 Plugin
===
[![Stories in Ready](https://badge.waffle.io/MikaAK/s3-plugin-webpack.png?label=ready&title=Ready)](https://waffle.io/MikaAK/s3-plugin-webpack)

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

### Contributing
All contributions are welcome. Please make a pull request and make sure things still pass after running `npm run test`

##### Commands to be aware of
###### **WARNING**: The test suit will wipe all files on the amazon bucket due to the high amount of files it creates for randomness with test
`npm run test` - Run test suit (You must have the .env file setup)
`npm run build` - Run build

### Thanks
Thanks to [@Omer](https://github.com/Omer) for fixing credentials from `~/.aws/credentials`
Thanks to [@lostjimmy](https://github.com/lostjimmy) for pointing out `path.sep` for Windows compatibility
