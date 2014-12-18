angular.module('i18n', ['web.storage', 'ui.bootstrap.modal'])
    .service('i18n', ['i18nMessageReader', 'localeResolver', '$cacheFactory', 'config', I18nService])
    .factory('i18nLocation', ['$location', 'localeResolver', I18nLocationFactory])
    .factory('i18nResolver', ['i18n', I18nResolverFactory])
    .factory('localeResolver', ['localStorage', 'sessionStorage', LocaleResolverFactory])
    .factory('localeSwapper', ['localStorage', 'sessionStorage', 'topicMessageDispatcher', LocaleSwapperFactory])
    .controller('SelectLocaleController', ['$scope', '$routeParams', 'localeResolver', 'localeSwapper', SelectLocaleController])
    .directive('i18nSupport', i18nSupportDirectiveFactory)
    .directive('i18nDefault', ['localeSwapper', I18nDefaultDirectiveFactory])
    .directive('i18nTranslate', ['i18n', 'ngRegisterTopicHandler', 'activeUserHasPermission', 'topicMessageDispatcher', 'localeResolver', '$q', i18nDirectiveFactory])
    .directive('i18n', ['i18n', 'ngRegisterTopicHandler', 'activeUserHasPermission', 'topicMessageDispatcher', 'localeResolver', '$q', i18nDirectiveFactory])
    .run(['$cacheFactory', function($cacheFactory) {
        $cacheFactory('i18n');
    }]);

function I18nLocationFactory($location, localeResolver) {
    return {
        search:function(it) {$location.search(it);},
        path:function(path) {
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
        controller: ['$scope', '$location', 'i18nMessageWriter', 'topicRegistry', 'usecaseAdapterFactory', 'localeResolver',
            'localeSwapper', 'config', '$modal', '$cacheFactory', I18nSupportController]
    }
}
function i18nDirectiveFactory(i18n, ngRegisterTopicHandler, activeUserHasPermission, topicMessageDispatcher, localeResolver, $q) {
    return {
        require: '^i18nSupport',
        restrict: ['E', 'A'],
        scope: true,
        link: function (scope, element, attrs, support) {
            scope.var = undefined;
            scope.code = undefined;
            scope.default = undefined;

            scope.$watch(function () {
                return [attrs.code, attrs.default, localeResolver()];
            }, function () {
                scope.code = attrs.code;
                scope.default = attrs.default;
                var deferred = $q.defer();
                i18n.resolve(scope, deferred.resolve);
                deferred.promise.then(updateTranslation);
            }, true);

            scope.translate = function () {
                support.open(scope.code, scope.var, {
                    success: function (translation) {
                        topicMessageDispatcher.fire('i18n.updated', {code: scope.code, translation: translation});
                    }
                }, attrs.editor);
            };

            function bindClickEvent(editMode) {
                if (editMode) {
                    element.bind("click", function () {
                        scope.$apply(scope.translate());
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
                    no: function() {
                        if(isTranslatable()) bindClickEvent(false);
                    },
                    yes: function () {
                        if(isTranslatable()) bindClickEvent(editMode);
                    },
                    scope: scope
                }, 'i18n.message.add');
            };

            ngRegisterTopicHandler(scope, 'edit.mode', toggleEditMode);
            ngRegisterTopicHandler(scope, 'i18n.updated', function (t) {
                if (scope.code == t.code) updateTranslation(t.translation);
            });

            function updateTranslation(translation) {
                scope.var = translation;
                if (attrs.var) scope.$parent[attrs.var] = translation;
            }
        }
    };
}

function I18nService(i18nMessageGateway, localeResolver, $cacheFactory, config) {
    var cache = $cacheFactory.get('i18n');

    this.resolve = function (context, presenter) {
        function isUnknown(translation) {
            return context.default && translation == '???' + context.code + '???';
        }

        function fallbackToDefaultWhenUnknown(translation) {
            if (context.default == '') context.default = ' ';
            if (!context.default) context.default = 'place your text here';
            return isUnknown(translation) ? context.default : translation;
        }

        if (config.namespace) context.namespace = config.namespace;
        if (localeResolver()) context.locale = localeResolver();
        if (isCached())
            presenter(getFromCache());
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
                presenter(fallbackToDefaultWhenUnknown(translation));
                storeInCache(fallbackToDefaultWhenUnknown(translation));
            }, function () {
                presenter(context.default);
            });
        }

        function storeInCache(msg) {
            cache.put(toKey(), msg);
        }
    };
}

function I18nResolverFactory(i18n) {
    return function (ctx, presenter) {
        i18n.resolve(ctx, presenter);
    }
}

function I18nSupportController($scope, $location, i18nMessageWriter, topicRegistry, usecaseAdapterFactory, localeResolver, localeSwapper, config, $modal, $cacheFactory) {
    var self = this;
    var cache = $cacheFactory.get('i18n');

    this.init = function () {
        $scope.dialog = {
            code: '',
            translation: ''
        };
        $scope.presenter = null;
    };
    this.init();

    function isLocaleEncodedInPath(params) {
        return params.locale
    }

    function isLocaleSupported(locale) {
        if(config.supportedLanguages.indexOf(locale) == -1) redirectToDefaultLocalePageNotFound();
        return true;
    }

    function redirectToDefaultLocalePageNotFound() {
        $location.path('/' + config.supportedLanguages[0] + '/404');
    }

    function extractLocaleFromPath(params) {
        expose(params.locale);
        if (isNewlySelected(params.locale)) {
            remember(params.locale);
        }
    }

    function expose(locale) {
        $scope.locale = locale;
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
        else setLocaleToFirstSupportedLanguage();
    }

    function setLocaleToFirstSupportedLanguage() {
        remember(config.supportedLanguages[0]);
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
        var suffix = $scope.unlocalizedPath ? $scope.unlocalizedPath : '/';
        $location.path(prefix + suffix);
    }

    function getUnlocalizedPathPath(locale) {
        if (!locale) return $location.path().replace('//', '/');
        return $location.path().replace('/' + locale, '');
    }

    $scope.$on('$routeChangeSuccess', function (evt, route) {
        $scope.unlocalizedPath = getUnlocalizedPathPath(route.params.locale);
        isLocaleEncodedInPath(route.params) && isLocaleSupported(route.params.locale) ? extractLocaleFromPath(route.params) : localeNotInPath();
    });

    topicRegistry.subscribe('checkpoint.signout', function () {
        self.init();
    });

    this.open = function (code, translation, presenter, editor) {
        if (this.renderer) this.renderer(translation);

        $scope.presenter = presenter;
        $scope.dialog = {
            code: code,
            translation: translation,
            editor: editor
        };

        var componentsDir = config.componentsDir || 'bower_components';
        var styling = config.styling ? config.styling + '/' : '';

        var modalInstance = $modal.open({
            scope: $scope,
            controller: I18nModalInstanceController,
            templateUrl: componentsDir + '/binarta.i18n.angular/template/' + styling + 'i18n-modal.html'
        });

        modalInstance.result.then(function (translation) {
            $scope.dialog.translation = translation;
            self.translate();
        }, function () {
            self.init();
        });
    };

    this.close = function () {
        self.init();
    };

    this.translate = function () {
        if (self.editor != undefined) $scope.dialog.translation = self.editor();
        var ctx = {key: $scope.dialog.code, message: $scope.dialog.translation};
        if (config.namespace) ctx.namespace = config.namespace;
        ctx.locale = localeResolver() || 'default';
        var onSuccess = function () {
            $scope.presenter.success($scope.dialog.translation);
            self.init();
            cache.put(toKey(), ctx.message);
        };
        i18nMessageWriter(ctx, usecaseAdapterFactory($scope, onSuccess));

        function toKey() {
            return (ctx.namespace || 'default') + ':' + (ctx.locale || 'default') + ':' + ctx.key;
        }
    };

    if (isLocaleRemembered()) localeSwapper(localeResolver());
}

function I18nModalInstanceController($scope, $modalInstance) {
        $scope.submit = function () {
            $modalInstance.close($scope.dialog.translation);
        };

        $scope.close = function () {
            $modalInstance.dismiss('cancel');
        };
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