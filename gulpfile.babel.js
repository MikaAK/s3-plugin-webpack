import gulp from 'gulp'
import loadPlugins from 'gulp-load-plugins'

var $ = loadPlugins()

gulp.task('test', function() {
  return gulp.src('test/**/*_spec.js', {read: false})
    .pipe($.mocha({reporter: 'mocha-better-spec-reporter'}))
})

gulp.task('build', function() {
  return gulp.src('src/*')
    .pipe($.eslint())
    .pipe($.babel())
    .pipe(gulp.dest('dist'))
})
