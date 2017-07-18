var gulp = require('gulp'),
    minifyHtml = require('gulp-minify-html'),
    templateCache = require('gulp-angular-templatecache'),
    karma = require('karma').Server;

gulp.task('test', function (done) {
  new karma({configFile: __dirname + '/karma10.conf.js'}, done).start();
});

var minifyHtmlOpts = {
    empty: true,
    cdata: true,
    conditionals: true,
    spare: true,
    quotes: true
};

gulp.task('bootstrap3', function () {
    gulp.src('template/bootstrap3/*.html')
        .pipe(minifyHtml(minifyHtmlOpts))
        .pipe(templateCache('i18n-tpls-bootstrap3.js', {standalone: true, module: 'i18n.templates'}))
        .pipe(gulp.dest('src/main/js'));
});

gulp.task('default', ['bootstrap3']);