import dotenv from 'dotenv'

dotenv.load()

const {
  AWS_BUCKET,
  AWS_REGION,
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY
} = process.env

export default {
  AWS_BUCKET,
  AWS_REGION,
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY,

  s3Options: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
  },

  s3Params: {
    Bucket: AWS_BUCKET
  }
}
