S3 Plugin
===

This plugin will upload all built assets to s3


### Install Instructions

```bash
$ npm i webpack-s3-plugin
```

### Usage Instructions

#### Require `webpack-s3-plugin`
```javascript
var S3Plugin = require('webpack-s3-plugin')
```

#### With exclude
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
        Bucket: 'MyBucket'
      }  
    })
  ]
}
```

#### With include
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
        Bucket: 'MyBucket'
      }  
    })
  ]
}
