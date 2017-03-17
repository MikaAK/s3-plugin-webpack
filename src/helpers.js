import _ from 'lodash'
import path from 'path'
import readDir from 'recursive-readdir'

export const UPLOAD_IGNORES = [
  '.DS_Store'
]

export const DEFAULT_UPLOAD_OPTIONS = {
  ACL: 'public-read'
}


export const REQUIRED_S3_UP_OPTS = ['Bucket']
export const PATH_SEP = path.sep
export const S3_PATH_SEP = '/'
export const DEFAULT_TRANSFORM = (item) => Promise.resolve(item)

export const addTrailingS3Sep = fPath => {
  return fPath ? fPath.replace(/\/?(\?|#|$)/, '/$1') : fPath
}

export const addSeperatorToPath = (fPath) => {
  if (!fPath)
    return fPath

  return _.endsWith(fPath, PATH_SEP) ? fPath : fPath + PATH_SEP
}

export const translatePathFromFiles = (rootPath) => {
  return files => {
    return _.map(files, file => {
      return {
        path: file,
        name: file
          .replace(rootPath, '')
          .split(PATH_SEP)
          .join(S3_PATH_SEP)
      }
    })
  }
}

export const getDirectoryFilesRecursive = (dir, ignores = []) => {
  return new Promise((resolve, reject) => {
    readDir(dir, ignores, (err, files) => err ? reject(err) : resolve(files))
  })
    .then(translatePathFromFiles(dir))
}

export const testRule = (rule, subject) => {
  if (_.isRegExp(rule)) {
    return rule.test(subject)
  } else if (_.isFunction(rule)) {
    return !!rule(subject)
  } else if (_.isArray(rule)) {
    return _.every(rule, (condition) => testRule(condition, subject))
  } else if (_.isString(rule)) {
    return new RegExp(rule).test(subject)
  } else {
    throw new Error('Invalid include / exclude rule')
  }
}
