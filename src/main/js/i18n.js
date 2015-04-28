angular.module('i18n', ['i18n.gateways', 'config', 'angular.usecase.adapter', 'web.storage', 'ui.bootstrap.modal', 'notifications', 'checkpoint', 'angularx'])
    .service('i18n', ['i18nMessageReader', 'localeResolver', '$cacheFactory', 'config', '$q', 'i18nMessageWriter', 'usecaseAdapterFactory', I18nService])
    .service('i18nRenderer', ['i18nDefaultRenderer', I18nRendererService])
    .service('i18nDefaultRenderer', ['config', '$modal', '$rootScope', I18nDefaultRendererService])
    .factory('i18nRendererInstaller', ['i18nRenderer', I18nRendererInstallerFactory])
    .factory('i18nLocation', ['$location', 'localeResolver', I18nLocationFactory])
    .factory('i18nResolver', ['i18n', I18nResolverFactory])
    .factory('localeResolver', ['localStorage', 'sessionStorage', LocaleResolverFactory])
    .factory('localeSwapper', ['localStorage', 'sessionStorage', 'topicMessageDispatcher', LocaleSwapperFactory])
    .controller('SelectLocaleController', ['$scope', '$routeParams', 'localeResolver', 'localeSwapper', SelectLocaleController])
    .directive('i18nSupport', i18nSupportDirectiveFactory)
    .directive('i18nDefault', ['localeSwapper', I18nDefaultDirectiveFactory])
    .directive('i18nTranslate', ['i18n', 'i18nRenderer', 'ngRegisterTopicHandler', 'activeUserHasPermission', 'topicMessageDispatcher', 'localeResolver', i18nDirectiveFactory])
    .directive('i18n', ['i18n', 'i18nRenderer', 'ngRegisterTopicHandler', 'activeUserHasPermission', 'topicMessageDispatcher', 'localeResolver', i18nDirectiveFactory])
    .directive('binLink', ['i18n', 'localeResolver', 'ngRegisterTopicHandler', 'activeUserHasPermission', 'i18nRenderer', 'topicMessageDispatcher', BinLinkDirectiveFactory])
    .controller('i18nDefaultModalController', ['$scope', '$modalInstance', I18nDefaultModalController])
    .run(['$cacheFactory', function ($cacheFactory) {
        $cacheFactory('i18n');
    }])
    .run(['$rootScope', 'resourceLoader', 'activeUserHasPermission', function ($rootScope, resourceLoader, activeUserHasPermission) {
        activeUserHasPermission({
            yes: function () {
                resourceLoader.add('//cdn.binarta.com/js/tinymce/4.1.7/tinymce.min.js');
                resourceLoader.add('//cdn.binarta.com/js/tinymce/4.1.7/skins/lightgray/skin.min.css'); //pre-loading skin
            },
            scope: $rootScope
        }, 'edit.mode');
    }])
    .filter('trust', ['$sce', function ($sce) {
        return function (val) {
            return $sce.trustAsHtml(val);
        };
    }]);

function I18nLocationFactory($location, localeResolver) {
    return {
        search: function (it) {
            $location.search(it);
        },
        path: function (path) {
            var locale = localeResolver();
            $location.path((locale && locale != 'default' ? '/' + locale : '') + path);
        }
    }
}

function LocaleResolverFactory(localStorage, sessionStorage) {
    function promoted(locale) {
        sessionStorage.locale = locale;
        return locale;
    }

    return function () {
        if (sessionStorage.locale) return sessionStorage.locale;
        if (localStorage.locale) return promoted(localStorage.locale);
        return undefined;
    }
}

function LocaleSwapperFactory(localStorage, sessionStorage, topicMessageDispatcher) {
    return function (locale) {
        sessionStorage.locale = locale;
        localStorage.locale = locale;
        topicMessageDispatcher.firePersistently('i18n.locale', locale);
    }
}

function i18nSupportDirectiveFactory() {
    return {
        restrict: 'C',
        controller: ['$rootScope', '$location', 'localeResolver', 'localeSwapper', 'config', I18nSupportController]
    }
}

function BinLinkDirectiveFactory(i18n, localeResolver, ngRegisterTopicHandler, activeUserHasPermission, i18nRenderer, topicMessageDispatcher) {
    return {
        restrict: ['E', 'A'],
        scope: true,
        link: function (scope, element, attrs) {

            scope.$watch(function () {
                return localeResolver();
            }, function () {
                scope.code = attrs.code;
                var promise = i18n.resolve(scope);
                promise.then(updateTranslation);
            });

            scope.open = function () {
                i18nRenderer.open({
                    code: scope.code,
                    translation: angular.copy(scope.link),
                    editor: 'bin-link',
                    submit: translate,
                    template: '<form>' +
                    '<div class=\"form-group\">' +
                    '<label for=\"inputLinkText\">Naam</label>' +
                    '<input type=\"text\" id=\"inputLinkText\" ng-model=\"translation.name\">' +
                    '</div>' +
                    '<div class=\"form-group\">' +
                    '<label for=\"inputLinkUrl\">Url</label>' +
                    '<input type=\"text\" id=\"inputLinkUrl\" ng-model=\"translation.url\">' +
                    '</div>' +
                    '</form>' +
                    '<div class=\"dropdown-menu-buttons\">' +
                    '<button type="submit" class="btn btn-primary inline" ng-click="submit(translation)" i18n code="i18n.menu.save.button" default="Opslaan" read-only>{{var}}</button>' +
                    '<button type="reset" class="btn btn-default inline" ng-click="cancel()" i18n code="i18n.menu.cancel.button" default="Annuleren" read-only>{{var}}</button>' +
                    '</div>'
                });
            };

            ngRegisterTopicHandler(scope, 'edit.mode', toggleEditMode);
            ngRegisterTopicHandler(scope, 'link.updated', function (args) {
                if (scope.code == args.code) updateTranslation(args.translation);
            });

            function toggleEditMode(editMode) {
                activeUserHasPermission({
                    no: function () {
                        if (isTranslatable()) bindClickEvent(false);
                    },
                    yes: function () {
                        if (isTranslatable()) bindClickEvent(editMode);
                    },
                    scope: scope
                }, 'i18n.message.add');
            }

            function isTranslatable() {
                return attrs.readOnly == undefined;
            }

            function translate(link) {
                var translationString = JSON.stringify(link);

                var promise = i18n.translate({
                    code: scope.code,
                    translation: translationString
                });
                promise.then(function () {
                    topicMessageDispatcher.fire('link.updated', {code: scope.code, translation: translationString});
                });
            }

            function bindClickEvent(editMode) {
                if (editMode) {
                    element.bind("click", function () {
                        scope.$apply(scope.open());
                        return false;
                    });
                } else {
                    element.unbind("click");
                }
            }

            function updateTranslation(translation) {
                try {
                    scope.link = JSON.parse(translation);
                } catch (e) {
                    scope.link = getDefaultLink();
                }
            }

            function getDefaultLink() {
                var defaultName = 'link';
                if (attrs.defaultName) defaultName = attrs.defaultName;
                var defaultUrl = '';
                if (attrs.defaultUrl) defaultUrl = attrs.defaultUrl;

                return {
                    name: defaultName,
                    url: defaultUrl
                };
            }
        }
    };
}

function i18nDirectiveFactory(i18n, i18nRenderer, ngRegisterTopicHandler, activeUserHasPermission, topicMessageDispatcher, localeResolver) {
    return {
        restrict: ['E', 'A'],
        scope: true,
        link: function (scope, element, attrs) {
            scope.var = undefined;

            scope.$watch(function () {
                return [attrs.code, attrs.default, localeResolver()];
            }, function () {
                var ctx = {
                    code: attrs.code,
                    default: attrs.default
                };
                if (attrs.noLocale != undefined) ctx.locale = 'default';

                var promise = i18n.resolve(ctx);
                promise.then(updateTranslation);
            }, true);

            scope.open = function () {
                i18nRenderer.open({
                    code: attrs.code,
                    translation: angular.copy(scope.var),
                    editor: attrs.editor,
                    submit: translate,
                    template: i18nDirectiveTemplate(attrs.editor)
                });
            };

            function translate(translation) {
                var ctx = {
                    code: attrs.code,
                    translation: translation
                };
                if (attrs.noLocale != undefined) ctx.locale = 'default';

                var promise = i18n.translate(ctx);
                promise.then(function () {
                    topicMessageDispatcher.fire('i18n.updated', ctx);
                });
            }

            function bindClickEvent(editMode) {
                if (editMode) {
                    element.bind("click", function () {
                        scope.$apply(scope.open());
                        return false;
                    });
                } else {
                    element.unbind("click");
                }
            }

            function isTranslatable() {
                return attrs.readOnly == undefined;
            }

            var toggleEditMode = function (editMode) {
                activeUserHasPermission({
                    no: function () {
                        if (isTranslatable()) bindClickEvent(false);
                    },
                    yes: function () {
                        if (isTranslatable()) bindClickEvent(editMode);
                    },
                    scope: scope
                }, 'i18n.message.add');
            };

            ngRegisterTopicHandler(scope, 'edit.mode', toggleEditMode);
            ngRegisterTopicHandler(scope, 'i18n.updated', function (t) {
                if (attrs.code == t.code) updateTranslation(t.translation);
            });

            function updateTranslation(translation) {
                scope.var = translation;
                if (attrs.var) scope.$parent[attrs.var] = translation;
            }
        }
    };
}

function I18nService(i18nMessageGateway, localeResolver, $cacheFactory, config, $q, i18nMessageWriter, usecaseAdapterFactory) {
    var cache = $cacheFactory.get('i18n');

    this.resolve = function (context) {
        var deferred = $q.defer();

        function isUnknown(translation) {
            return context.default && translation == '???' + context.code + '???';
        }

        function fallbackToDefaultWhenUnknown(translation) {
            if (context.default == '') context.default = ' ';
            if (!context.default) context.default = 'place your text here';
            return isUnknown(translation) ? context.default : translation;
        }

        if (config.namespace) context.namespace = config.namespace;
        if (!context.locale) context.locale = localeResolver();
        if (isCached())
            deferred.resolve(getFromCache());
        else
            getFromGateway();

        function isCached() {
            return getFromCache() != undefined;
        }

        function getFromCache() {
            return cache.get(toKey());
        }

        function toKey() {
            return (context.namespace || 'default') + ':' + (context.locale || 'default') + ':' + context.code;
        }

        function getFromGateway() {
            i18nMessageGateway(context, function (translation) {
                deferred.resolve(fallbackToDefaultWhenUnknown(translation));
                storeInCache(fallbackToDefaultWhenUnknown(translation));
            }, function () {
                deferred.resolve(context.default);
            });
        }

        function storeInCache(msg) {
            cache.put(toKey(), msg);
        }

        return deferred.promise;
    };

    this.translate = function (context) {
        var deferred = $q.defer();

        var ctx = {key: context.code, message: context.translation};
        if (config.namespace) ctx.namespace = config.namespace;
        ctx.locale = context.locale || localeResolver() || 'default';
        var onSuccess = function () {
            deferred.resolve(cache.put(toKey(), ctx.message));
        };
        i18nMessageWriter(ctx, usecaseAdapterFactory(context, onSuccess));

        function toKey() {
            return (ctx.namespace || 'default') + ':' + (ctx.locale || 'default') + ':' + ctx.key;
        }

        return deferred.promise;
    };
}

function I18nResolverFactory(i18n) {
    return function (ctx, presenter) {
        var promise = i18n.resolve(ctx);
        promise.then(presenter);
    };
}

function I18nRendererInstallerFactory(i18nRenderer) {
    return function (renderer) {
        i18nRenderer.open = renderer.open;
    }
}

function I18nDefaultRendererService(config, $modal, $rootScope) {
    this.open = function (args) {
        var componentsDir = config.componentsDir || 'bower_components';
        var styling = config.styling ? config.styling + '/' : '';

        var scope = $rootScope.$new();
        scope.dialog = {
            translation: args.translation,
            editor: args.editor
        };

        var modalInstance = $modal.open({
            scope: scope,
            controller: 'i18nDefaultModalController',
            templateUrl: componentsDir + '/binarta.i18n.angular/template/' + styling + 'i18n-modal.html'
        });

        modalInstance.result.then(args.submit, args.cancel);
    };

}

function I18nDefaultModalController($scope, $modalInstance) {
    $scope.submit = function () {
        $modalInstance.close($scope.dialog.translation);
    };

    $scope.close = function () {
        $modalInstance.dismiss('cancel');
    };
}

function I18nRendererService(i18nDefaultRenderer) {
    this.open = i18nDefaultRenderer.open;
}

function I18nSupportController($rootScope, $location, localeResolver, localeSwapper, config) {
    function isLocaleEncodedInPath(params) {
        return params.locale
    }

    function isLocaleSupported(locale) {
        if (config.supportedLanguages.indexOf(locale) == -1) redirectToDefaultLocalePageNotFound();
        return true;
    }

    function redirectToDefaultLocalePageNotFound() {
        $location.path('/' + getDefaultLocaleFromSupportedLanguages() + '/404');
    }

    function extractLocaleFromPath(params) {
        expose(params.locale);
        if (isNewlySelected(params.locale)) {
            remember(params.locale);
        }
    }

    function expose(locale) {
        $rootScope.locale = locale;
        $rootScope.localePrefix = locale == 'default' ? '' : '/' + locale;
    }

    function isNewlySelected(locale) {
        return localeResolver() != locale;
    }

    function remember(locale) {
        localeSwapper(locale);
    }

    function localeNotInPath() {
        if (shouldInitializeLocaleByConfig()) initializeLocaleByConfig();
        if (isLocaleRemembered()) redirectToLocalizedPage();
    }

    function shouldInitializeLocaleByConfig() {
        return !isLocaleRemembered() && isLocalizationSupported();
    }

    function isLocaleRemembered() {
        return localeResolver() && localeResolver() != 'default';
    }

    function isLocalizationSupported() {
        return config.supportedLanguages != null;
    }

    function initializeLocaleByConfig() {
        if (shouldFallbackToBrowserLocale()) remember(browserLanguage());
        else if (shouldFallbackToDefaultLocale()) setLocaleToFirstSupportedLanguage();
        else $location.path('/');
    }

    function shouldFallbackToDefaultLocale() {
        return config.fallbackToDefaultLocale != false;
    }

    function setLocaleToFirstSupportedLanguage() {
        remember(getDefaultLocaleFromSupportedLanguages());
    }

    function getDefaultLocaleFromSupportedLanguages() {
       return config.supportedLanguages[0];
    }

    function shouldFallbackToBrowserLocale() {
        return config.fallbackToBrowserLocale && isBrowserLanguageSupported();
    }

    function isBrowserLanguageSupported() {
        return config.supportedLanguages.indexOf(browserLanguage()) > -1;
    }

    function browserLanguage() {
        return (window.navigator.userLanguage || window.navigator.language).substr(0, 2);
    }

    function redirectToLocalizedPage() {
        var prefix = '/' + localeResolver();
        var suffix = $rootScope.unlocalizedPath ? $rootScope.unlocalizedPath : '/';
        $location.path(prefix + suffix);
    }

    function getUnlocalizedPathPath(locale) {
        var path = $location.path();
        if (!locale) return path.replace('//', '/').replace(/^\/[^\/]+\/$/, path.slice(0,-1));
        return path.replace('/' + locale, '');
    }

    $rootScope.$on('$routeChangeSuccess', function (evt, route) {
        $rootScope.unlocalizedPath = getUnlocalizedPathPath(route.params.locale);
        isLocaleEncodedInPath(route.params) && isLocaleSupported(route.params.locale) ? extractLocaleFromPath(route.params) : localeNotInPath();
    });

    if (isLocaleRemembered()) localeSwapper(localeResolver());
}

function I18nDefaultDirectiveFactory(localeSwapper) {
    return {
        restrict: 'C',
        link: function () {
            localeSwapper('default');
        }
    };
}

function SelectLocaleController($scope, $routeParams, localeResolver, localeSwapper) {
    function expose(locale) {
        $scope.locale = locale;
    }

    function remember(locale) {
        localeSwapper(locale);
    }

    $scope.select = function (locale) {
        expose(locale);
        remember(locale);
    };

    $scope.init = function () {
        if (localeResolver())
            expose(localeResolver());
        else
            expose($routeParams.locale);
    }
}

function i18nDirectiveTemplate(editor) {
    switch (editor) {
        case 'full':
            return '<form>' +
                '<textarea ui-tinymce=\"{' +
                'plugins: [\'link fullscreen textcolor paste table\'],' +
                'toolbar: \'undo redo | styleselect | bold italic | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent table | link | fullscreen\',' +
                'theme_advanced_resizing: true,' +
                'theme_advanced_resizing_use_cookie : false,' +
                'height:\'180\',' +
                'menubar:false}\"' +
                'ng-model=\"translation\">' +
                '</textarea>' +
                '</form>' +
                '<div class=\"dropdown-menu-buttons\">' +
                '<button type="submit" class="btn btn-primary inline" ng-click="submit(translation)" i18n code="i18n.menu.save.button" default="Opslaan" read-only>{{var}}</button>' +
                '<button type="reset" class="btn btn-default inline" ng-click="cancel()" i18n code="i18n.menu.cancel.button" default="Annuleren" read-only>{{var}}</button>' +
                '</div>';
        case 'media':
            return '<form>' +
                '<textarea ui-tinymce=\"{' +
                'plugins: [\'fullscreen media paste\'],' +
                'toolbar: \'undo redo | media | fullscreen\',' +
                'theme_advanced_resizing: true,' +
                'theme_advanced_resizing_use_cookie : false,' +
                'height:\'180\',' +
                'menubar:false}\"' +
                'ng-model=\"translation\">' +
                '</textarea>' +
                '</form>' +
                '<div class=\"dropdown-menu-buttons\">' +
                '<button type="submit" class="btn btn-primary inline" ng-click="submit(translation)" i18n code="i18n.menu.save.button" default="Opslaan" read-only>{{var}}</button>' +
                '<button type="reset" class="btn btn-default inline" ng-click="cancel()" i18n code="i18n.menu.cancel.button" default="Annuleren" read-only>{{var}}</button>' +
                '</div>';
        case 'full-media':
            return '<form>' +
                '<textarea ui-tinymce=\"{' +
                'plugins: [\'link fullscreen media binartax.img textcolor paste table\'],' +
                'toolbar: \'undo redo | styleselect | bold italic | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent table | link | binartax.img media | fullscreen\',' +
                'theme_advanced_resizing: true,' +
                'theme_advanced_resizing_use_cookie : false,' +
                'extended_valid_elements : \'img[src|alt|title|width|height|bin-image]\',' +
                'media_poster: false,' +
                'height:\'180\',' +
                'menubar:false}\"' +
                'ng-model=\"translation\">' +
                '</textarea>' +
                '</form>' +
                '<div class=\"dropdown-menu-buttons\">' +
                '<button type="submit" class="btn btn-primary inline" ng-click="submit(translation)" i18n code="i18n.menu.save.button" default="Opslaan" read-only>{{var}}</button>' +
                '<button type="reset" class="btn btn-default inline" ng-click="cancel()" i18n code="i18n.menu.cancel.button" default="Annuleren" read-only>{{var}}</button>' +
                '</div>';
        case 'icon':
            var icons = ['', 'adjust', 'anchor', 'archive', 'area-chart', 'arrows', 'arrows-h', 'arrows-v', 'asterisk', 'at', 'ban', 'bar-chart', 'barcode', 'bars', 'beer', 'bell',
                'bell-o', 'bell-slash', 'bell-slash-o', 'bicycle', 'binoculars', 'birthday-cake', 'bolt', 'bomb', 'book', 'bookmark', 'bookmark-o', 'briefcase', 'bug',
                'building', 'building-o', 'bullhorn', 'bullseye', 'bus', 'calculator', 'calendar', 'calendar-o', 'camera', 'camera-retro', 'car', 'caret-square-o-down', 'caret-square-o-left',
                'caret-square-o-right', 'caret-square-o-up', 'cc', 'certificate', 'check', 'check-circle', 'check-circle-o', 'check-square', 'check-square-o', 'child', 'circle', 'circle-o',
                'circle-o-notch', 'circle-thin', 'clock-o', 'cloud', 'cloud-download', 'cloud-upload', 'code', 'code-fork', 'coffee', 'cog', 'cogs', 'comment', 'comment-o', 'comments',
                'comments-o', 'compass', 'copyright', 'credit-card', 'crop', 'crosshairs', 'cube', 'cubes', 'cutlery', 'database', 'desktop', 'dot-circle-o', 'download', 'ellipsis-h',
                'ellipsis-v', 'envelope', 'envelope-o', 'envelope-square', 'eraser', 'exchange', 'exclamation', 'exclamation-circle', 'exclamation-triangle', 'external-link', 'external-link-square',
                'eye', 'eye-slash', 'eyedropper', 'fax', 'female', 'fighter-jet', 'file', 'file-o', 'file-text', 'file-text-o', 'file-archive-o', 'file-audio-o', 'file-code-o', 'file-excel-o',
                'file-image-o', 'file-pdf-o', 'file-powerpoint-o', 'file-video-o', 'file-word-o', 'film', 'filter', 'fire', 'fire-extinguisher', 'flag', 'flag-checkered', 'flag-o', 'flask',
                'folder', 'folder-o', 'folder-open', 'folder-open-o', 'frown-o', 'futbol-o', 'gamepad', 'gavel', 'gift', 'glass', 'globe', 'graduation-cap', 'hdd-o', 'headphones',
                'heart', 'heart-o', 'history', 'home', 'inbox', 'info', 'info-circle', 'key', 'keyboard-o', 'language', 'laptop', 'leaf', 'lemon-o', 'level-down', 'level-up',
                'life-ring', 'lightbulb-o', 'line-chart', 'location-arrow', 'lock', 'magic', 'magnet', 'male', 'map-marker', 'meh-o', 'microphone', 'microphone-slash', 'minus', 'minus-circle',
                'minus-square', 'minus-square-o', 'mobile', 'money', 'moon-o', 'music', 'newspaper-o', 'paint-brush', 'paper-plane', 'paper-plane-o', 'paw', 'pencil', 'pencil-square',
                'pencil-square-o', 'phone', 'phone-square', 'picture-o', 'pie-chart', 'plane', 'plug', 'plus', 'plus-circle', 'plus-square', 'plus-square-o', 'power-off', 'print', 'puzzle-piece',
                'qrcode', 'question', 'question-circle', 'quote-left', 'quote-right', 'random', 'recycle', 'refresh', 'reply', 'reply-all', 'retweet', 'road', 'rocket', 'rss', 'rss-square',
                'search', 'search-minus', 'search-plus', 'share', 'share-alt', 'share-alt-square', 'share-square', 'share-square-o', 'shield', 'shopping-cart', 'sign-in', 'sign-out', 'signal',
                'sitemap', 'sliders', 'smile-o', 'sort', 'sort-alpha-asc', 'sort-alpha-desc', 'sort-amount-asc', 'sort-amount-desc', 'sort-asc', 'sort-desc', 'sort-numeric-asc', 'sort-numeric-desc', 'space-shuttle',
                'spinner', 'spoon', 'square', 'square-o', 'star', 'star-half', 'star-half-o', 'star-o', 'suitcase', 'sun-o', 'tablet', 'tachometer', 'tag', 'tags', 'tasks', 'taxi', 'terminal',
                'thumb-tack', 'thumbs-down', 'thumbs-o-down', 'thumbs-o-up', 'thumbs-up', 'ticket', 'times', 'times-circle', 'times-circle-o', 'tint', 'toggle-off', 'toggle-on', 'trash', 'trash-o',
                'tree', 'trophy', 'truck', 'tty', 'umbrella', 'university', 'unlock', 'unlock-alt', 'upload', 'user', 'users', 'video-camera', 'volume-down', 'volume-off', 'volume-up',
                'wheelchair', 'wifi', 'wrench'];
            var iconTemplate = '<form><div class="icons-list">';
            for (var i in icons) {
                iconTemplate += '<button ng-click="submit(\'fa-' + icons[i] + '\')" title="' + icons[i] + '" ng-class="{\'active\':translation == \'fa-' + icons[i] + '\'}">' +
                '<i class="fa fa-' + icons[i] + ' fa-fw"></i></button>';
            }
            iconTemplate += '</div></form>' +
            '<div class="dropdown-menu-buttons"><button type="reset" class="btn btn-default inline" ng-click="cancel()" i18n code="i18n.menu.cancel.button" default="Annuleren" read-only>{{var}}</button>' +
            '</div>';
            return iconTemplate;
        default:
            return '<form>' +
                '<textarea rows=\"12\" ng-model=\"translation\"></textarea>' +
                '</form>' +
                '<div class=\"dropdown-menu-buttons\">' +
                '<button type="submit" class="btn btn-primary inline" ng-click="submit(translation)" i18n code="i18n.menu.save.button" default="Opslaan" read-only>{{var}}</button>' +
                '<button type="reset" class="btn btn-default inline" ng-click="cancel()" i18n code="i18n.menu.cancel.button" default="Annuleren" read-only>{{var}}</button>' +
                '</div>';
    }
}