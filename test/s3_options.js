import dotenv from 'dotenv'

dotenv.load()

const {
  AWS_BUCKET,
  AWS_REGION,
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY,
  CLOUDFRONT_DISTRIBUTION_ID
} = process.env

export default {
  AWS_BUCKET,
  AWS_REGION,
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY,
  CLOUDFRONT_DISTRIBUTION_ID,

  s3Options: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
  },

  s3UploadOptions: {
    Bucket: AWS_BUCKET
  },

  cloudfrontInvalidateOptions: {
    DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
    Items: ['/*']
  },

  indexOptions: {
    IndexDocument: 'index.123.html',
    s3: true,
    cloudfront: true,
  },
}
