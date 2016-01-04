import gulp from 'gulp'
import loadPlugins from 'gulp-load-plugins'

var $ = loadPlugins()

gulp.task('default', ['test', 'build'])

gulp.task('test', function() {
  return gulp.src('test/**/*_test.js', {read: false})
    .pipe($.mocha({ui: 'bdd'}))
})

gulp.task('build', function() {
  return gulp.src('src/*')
    .pipe($.eslint())
    .pipe($.babel())
    .pipe(gulp.dest('dist'))
})

gulp.task('watch', function() {
  return gulp.watch(['src/*.js', 'test/upload_test*'], ['test'])
    /* eslint-disable */
    .on('error', console.log.bind(console))
    /* eslint-enable */
})
