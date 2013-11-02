angular.module('i18n', ['web.storage'])
    .factory('i18n', ['i18nMessageReader', 'topicRegistry', 'topicMessageDispatcher', 'activeUserHasPermission', 'localStorage',
        function (i18nMessageReader, topicRegistry, topicMessageDispatcher, activeUserHasPermission, localStorage) {
            return new i18n(i18nMessageReader, topicRegistry, topicMessageDispatcher, activeUserHasPermission, localStorage);
        }])
    .factory('i18nResolver', ['i18n', I18nResolverFactory])
    .controller('SelectLocaleController', ['$scope', '$routeParams', 'localStorage', 'topicMessageDispatcher', SelectLocaleController])
    .directive('i18nSupport', i18nSupportDirectiveFactory)
    .directive('i18nDefault', ['localStorage', 'topicMessageDispatcher', I18nDefaultDirectiveFactory])
    .directive('i18nDialog', function (i18n) {
        return {
            restrict: 'E',
            templateUrl: 'app/partials/i18n/dialog.html',
            require: '^i18nSupport',
            link: function (scope, element, attrs, controller) {
                scope.dialog = controller.dialog;
                scope.close = controller.close;
                scope.submit = controller.translate;
            }
        }
    })
    .directive('i18nTranslate', i18nDirectiveFactory)
    .directive('i18n', ['i18n', 'topicRegistry', 'activeUserHasPermission', i18nDirectiveFactory]);

function i18nSupportDirectiveFactory() {
    return {
        restrict: 'C',
        controller: ['$scope', '$location', 'i18nMessageWriter', 'topicRegistry', 'topicMessageDispatcher', 'localStorage', 'usecaseAdapterFactory', I18nSupportController]
    }
}
function i18nDirectiveFactory(i18n, topicRegistry, activeUserHasPermission) {
    return {
        require: '^i18nSupport',
        restrict: ['E', 'A'],
        transclude: true,
        templateUrl: 'app/partials/i18n/translation.html',
        scope: {
            code: '@',
            'default': '@',
            'var': '=',
            striptags: '=',
            editor: '@'
        },
        link: function (scope, element, attrs, support) {
            var initialized = false;

            scope.translate = function () {
                support.open(scope.code, scope.var, {
                    success: function (translation) {
                        if (scope.striptags) translation = translation.replace(/<.*?>/g, '');
                        scope.var = translation;
                    }
                }, scope.editor);
            };

            scope.translating = false;

            function resolve() {
                i18n.resolve(scope, function (translation) {
                    scope.var = translation;
                    scope.translation = translation;
                });
            }

            topicRegistry.subscribe('edit.mode', function (editMode) {
                activeUserHasPermission({
                    no: function () {
                        scope.translating = false;
                    },
                    yes: function () {
                        scope.translating = editMode;
                    }
                }, 'i18n.message.add');
            });
            function resolveWhenInitialized() {
                scope.$watch('[code, default]', function () {
                    initialized = true;
                    resolve();
                }, true);
            }

            topicRegistry.subscribe('app.start', function () {
                topicRegistry.subscribe('i18n.locale', function () {
                    initialized ? resolve() : resolveWhenInitialized();
                });
            });
        }
    };
}

function i18n(i18nMessageGateway, topicRegistry, topicMessageDispatcher, activeUserHasPermission, localStorage) {
    var self = this;

    topicRegistry.subscribe('config.initialized', function (config) {
        self.namespace = config.namespace;
    });
    topicRegistry.subscribe('edit.mode', function (editMode) {
        activeUserHasPermission({
            yes: function () {
                if (editMode) {
                    topicMessageDispatcher.fire('system.warning', {
                        code: 'i18n.active.warning',
                        default: 'Edit mode enabled. Editable links are disabled.'
                    })
                }
                else {
                    topicMessageDispatcher.fire('system.info', {
                        code: 'i18n.inactive.info',
                        default: 'Edit mode disabled.'
                    })
                }
            }
        }, 'i18n.message.add');
    });

    this.resolve = function (context, presenter) {
        function isUnknown(translation) {
            return context.default && translation == '???' + context.code + '???';
        }

        function fallbackToDefaultWhenUnknown(translation) {
            return isUnknown(translation) ? context.default : translation;
        }

        if (self.namespace) context.namespace = self.namespace;
        if (localStorage.locale) context.locale = localStorage.locale;
        i18nMessageGateway(context, function (translation) {
            if (context.striptags) translation = translation.replace(/<.*?>/g, '');
            presenter(fallbackToDefaultWhenUnknown(translation));
        }, function () {
            presenter(context.default);
        });
    };
}

function I18nResolverFactory(i18n) {
    return function (ctx, presenter) {
        i18n.resolve(ctx, presenter);
    }
}

function I18nSupportController($scope, $location, i18nMessageWriter, topicRegistry, topicMessageDispatcher, localStorage, usecaseAdapterFactory) {
    var self = this;
    var namespace;
    this.dialog = {};

    this.init = function () {
        self.dialog.visibilityClass = 'hide';
        self.dialog.code = '';
        self.dialog.translation = '';
        this.presenter = null;
    };
    this.init();

    function isLocaleEncodedInPath(params) {
        return params.locale
    }

    function extractLocaleFromPath(params) {
        expose(params.locale);
        if(isNewlySelected(params.locale)) {
            remember(params.locale);
            broadcast(params.locale);
        }
    }

    function expose(locale) {
        $scope.locale = locale;
    }

    function isNewlySelected(locale) {
        return localStorage.locale != locale;
    }

    function remember(locale) {
        localStorage.locale = locale;
    }

    function broadcast(locale) {
        topicMessageDispatcher.firePersistently('i18n.locale', locale);
    }

    function redirectToRememberedHomePageOrPortal() {
        if (isLocaleRemembered()) redirectToLocalizedHomePage();
    }

    function isLocaleRemembered() {
        return localStorage.locale;
    }

    function redirectToLocalizedHomePage() {
        $location.path('/' + localStorage.locale + '/');
    }

    function getUnlocalizedPathPath(locale) {
        return $location.path().replace('/' + locale, '');
    }

    topicRegistry.subscribe('config.initialized', function (config) {
        namespace = config.namespace;
        $scope.$on('$routeChangeSuccess', function (evt, route) {
            $scope.unlocalizedPath = getUnlocalizedPathPath(route.params.locale);
            isLocaleEncodedInPath(route.params) ? extractLocaleFromPath(route.params) : redirectToRememberedHomePageOrPortal();
        });
    });
    topicRegistry.subscribe('checkpoint.signout', function () {
        self.init();
    });

    this.open = function (code, translation, presenter, editor) {
        this.dialog.visibilityClass = '';
        this.dialog.code = code;
        this.dialog.translation = translation;
        this.presenter = presenter;
        this.dialog.editor = editor;
        if (this.renderer) this.renderer(translation);
    };
    this.close = function () {
        self.init();
    };

    this.translate = function () {
        if (self.editor != undefined) self.dialog.translation = self.editor();
        var ctx = {key: this.dialog.code, message: this.dialog.translation};
        if (namespace) ctx.namespace = namespace;
        ctx.locale = localStorage.locale || 'default';
        var onSuccess = function () {
            self.presenter.success(self.dialog.translation);
            self.init();
        };
        i18nMessageWriter(ctx, usecaseAdapterFactory($scope, onSuccess));
    };

    if(isLocaleRemembered()) broadcast(localStorage.locale);
}

function I18nDefaultDirectiveFactory(localStorage, topicMessageDispatcher) {
    return {
        restrict:'C',
        link:function() {
            localStorage.locale = '';
            topicMessageDispatcher.firePersistently('i18n.locale', 'default');
        }
    };
}

function SelectLocaleController($scope, $routeParams, localStorage, topicMessageDispatcher) {
    function expose(locale) {
        $scope.locale = locale;
    }

    function remember(locale) {
        localStorage.locale = locale;
    }

    function broadcast(locale) {
        topicMessageDispatcher.fire('i18n.locale', locale);
    }

    $scope.select = function (locale) {
        expose(locale);
        remember(locale);
        broadcast(locale);
    };

    $scope.init = function () {
        if (localStorage.locale)
            expose(localStorage.locale);
        else
            expose($routeParams.locale);
    }
}