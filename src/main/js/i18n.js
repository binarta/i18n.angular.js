angular.module('i18n', ['i18n.gateways', 'config', 'config.gateways', 'angular.usecase.adapter', 'web.storage', 'ui.bootstrap.modal', 'notifications', 'checkpoint', 'toggle.edit.mode'])
    .service('i18n', ['$rootScope', '$q', '$location', 'config', 'i18nMessageReader', 'localeResolver', '$cacheFactory', 'i18nMessageWriter', 'usecaseAdapterFactory', 'publicConfigReader', 'publicConfigWriter', '$http', I18nService])
    .service('i18nRenderer', ['i18nDefaultRenderer', I18nRendererService])
    .service('i18nDefaultRenderer', ['config', '$modal', '$rootScope', I18nDefaultRendererService])
    .factory('i18nRendererInstaller', ['i18nRenderer', I18nRendererInstallerFactory])
    .factory('i18nLocation', ['$location', 'localeResolver', I18nLocationFactory])
    .factory('i18nResolver', ['i18n', I18nResolverFactory])
    .factory('localeResolver', ['localStorage', 'sessionStorage', LocaleResolverFactory])
    .factory('localeSwapper', ['localStorage', 'sessionStorage', 'topicMessageDispatcher', LocaleSwapperFactory])
    .factory('i18nRendererTemplate', I18nRendererTemplateFactory)
    .factory('i18nRendererTemplateInstaller', ['i18nRendererTemplate', I18nRendererTemplateInstallerFactory])
    .controller('SelectLocaleController', ['$scope', '$routeParams', 'localeResolver', 'localeSwapper', SelectLocaleController])
    .directive('i18nTranslate', ['$rootScope', 'i18n', 'i18nRenderer', 'ngRegisterTopicHandler', 'editMode', 'topicMessageDispatcher', 'localeResolver', 'i18nRendererTemplate', i18nDirectiveFactory])
    .directive('i18n', ['$rootScope', 'i18n', 'i18nRenderer', 'ngRegisterTopicHandler', 'editMode', 'topicMessageDispatcher', 'localeResolver', 'i18nRendererTemplate', i18nDirectiveFactory])
    .directive('binLink', ['i18n', 'localeResolver', 'ngRegisterTopicHandler', 'editMode', 'i18nRenderer', 'topicMessageDispatcher', BinLinkDirectiveFactory])
    .directive('i18nLanguageSwitcher', ['$rootScope', 'config', 'i18n', 'editMode', 'editModeRenderer', '$location', '$route', 'activeUserHasPermission', I18nLanguageSwitcherDirective])
    .controller('i18nDefaultModalController', ['$scope', '$modalInstance', I18nDefaultModalController])
    .run(['$cacheFactory', function ($cacheFactory) {
        $cacheFactory('i18n');
    }])
    .filter('trust', ['$sce', function ($sce) {
        return function (val) {
            return $sce.trustAsHtml(val);
        };
    }])
    .filter('toLanguageName', ['config', function (config) {
        return function (val) {
            var lang = '';
            for (var i = 0; i < (config.languages || []).length; i++) {
                if (config.languages[i].code == val) {
                    lang = config.languages[i].name;
                    break;
                }
            }
            return lang;
        }
    }])
    .run(['i18nRendererTemplateInstaller', 'ngRegisterTopicHandler', function (installer, ngRegisterTopicHandler) {
        ngRegisterTopicHandler({
            topic: 'edit.mode',
            handler: installTemplates,
            executeHandlerOnce: true
        });

        function installTemplates() {
            installer.add('default', function (args) {
                return '<form name="i18nForm" ng-submit="submit()">' +
                    '<div class="bin-menu-edit-body">' +
                    installer.topMenuControls() +
                    '<textarea name="translation" rows="12" ng-model="translation" ' + (args.isEditable ? '' : 'disabled="true"') + '></textarea>' +
                    '</div>' +
                    installer.bottomMenuControls(args.isEditable) +
                    '</form>';
            });

            installer.add('icon', function () {
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
                var iconTemplate = '<form name="i18nForm" ng-submit="submit()"><div class="bin-menu-edit-body"><div class="icons-list">';
                for (var i in icons) {
                    iconTemplate += '<button ng-click="translation = \'fa-' + icons[i] + '\'" title="' + icons[i] + '" ng-class="{\'active\':translation == \'fa-' + icons[i] + '\'}">' +
                        '<i class="fa fa-' + icons[i] + ' fa-fw"></i></button>';
                }
                iconTemplate += '</div></div>' +
                    '<div class="bin-menu-edit-actions">' +
                    '<button type="reset" class="btn btn-default" ng-click="cancel()" i18n code="i18n.menu.cancel.button" read-only ng-bind="var"></button>' +
                    '</div></form>';
                return iconTemplate;
            });
        }
    }])
    .run(['$rootScope', '$location', 'localeResolver', 'localeSwapper', 'config', '$window', 'i18n', '$q', I18nSupportController]);

function I18nSupportController($rootScope, $location, localeResolver, localeSwapper, config, $window, i18n, $q) {
    $rootScope.$on('$routeChangeStart', function () {
        var locale;
        isLocalizationSupported().then(function () {
            locale = getLocaleFromPath();
            locale ? remember(locale) : localeNotInPath();
        }, function () {
            remember('default');
        }).finally(function () {
            expose(locale);
        });
    });

    if (localeResolver()) localeSwapper(localeResolver());

    function isLocalizationSupported() {
        var deferred = $q.defer();
        i18n.getSupportedLanguages().then(function (languages) {
            languages.length > 0 ? deferred.resolve() : deferred.reject();
        });
        return deferred.promise;
    }

    function getLocaleFromPath() {
        var param = getFirstRouteParam($location.path());
        if (isLocaleSupported(param)) return param;
    }

    function getFirstRouteParam(path) {
        var param = path.match(/^\/[^\/]+\//);
        if (param) return param[0].replace(/\//g,'');
    }

    function expose(locale) {
        $rootScope.unlocalizedPath = exposeUnlocalizedPath(locale);
        $rootScope.locale = locale || '';
        $rootScope.localePrefix = locale ? '/' + locale : '';

        i18n.getMainLanguage().then(function (lang) {
            $rootScope.mainLocale = lang || '';
        });
    }

    function exposeUnlocalizedPath(locale) {
        var path = $location.path();
        if (locale) return path.replace('/' + locale, '');
        else return path.replace(/^\/[^\/]+\/$/, path.slice(0,-1));
    }

    function remember(locale) {
        i18n.getMainLanguage().then(function (mainLanguage) {
            if (config.useDefaultAsMainLocale && locale == mainLanguage) locale = 'default';
            if (!isLocaleRemembered(locale)) localeSwapper(locale);
        });
    }

    function isLocaleRemembered(locale) {
        return localeResolver() == locale;
    }

    function localeNotInPath() {
        if (isLocaleSupported(localeResolver())) redirectToLocalizedPage(localeResolver());
        else initializeLocaleByConfig();
    }

    function isLocaleSupported(locale) {
        return config.supportedLanguages.indexOf(locale) != -1;
    }

    function initializeLocaleByConfig() {
        if (shouldFallbackToBrowserLocale()) redirectToLocalizedPage(browserLanguage());
        else if (shouldFallbackToMainLocale()) {
            i18n.getMainLanguage().then(function (lang) {
                redirectToLocalizedPage(lang);
            });
        }
        else $location.path('/');
    }

    function shouldFallbackToBrowserLocale() {
        return config.fallbackToBrowserLocale && isBrowserLanguageSupported();
    }

    function shouldFallbackToMainLocale() {
        return config.fallbackToDefaultLocale != false;
    }

    function isBrowserLanguageSupported() {
        return config.supportedLanguages.indexOf(browserLanguage()) > -1;
    }

    function browserLanguage() {
        return ($window.navigator.userLanguage || $window.navigator.language || '').substr(0, 2);
    }

    function redirectToLocalizedPage(locale) {
        var prefix = '/' + locale;
        var suffix = exposeUnlocalizedPath(locale) || '/';
        $location.path(prefix + suffix);
    }
}

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
    var rememberedLocale;

    function remember(locale) {
        rememberedLocale = locale;
        return locale;
    }

    function promoted(locale) {
        sessionStorage.locale = locale;
        return locale;
    }

    return function () {
        if (sessionStorage.locale) return remember(sessionStorage.locale);
        if (localStorage.locale) return promoted(localStorage.locale);
        if (rememberedLocale) return promoted(rememberedLocale);
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

function BinLinkDirectiveFactory(i18n, localeResolver, ngRegisterTopicHandler, editMode, i18nRenderer, topicMessageDispatcher) {
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

            ngRegisterTopicHandler(scope, 'link.updated', function (args) {
                if (scope.code == args.code) updateTranslation(args.translation);
            });

            if (attrs.readOnly == undefined) {
                editMode.bindEvent({
                    scope: scope,
                    element: element,
                    permission: 'i18n.message.add',
                    onClick: scope.open
                });
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

function i18nDirectiveFactory($rootScope, i18n, i18nRenderer, ngRegisterTopicHandler, editMode, topicMessageDispatcher, localeResolver, i18nRendererTemplate) {
    return {
        restrict: ['E', 'A'],
        scope: true,
        link: function (scope, element, attrs) {
            scope.var = undefined;
            var defaultLocale = 'default';
            var ctx;

            scope.$watch(function () {
                return [attrs.code, attrs.default, localeResolver()];
            }, function (value) {
                if (!value[2]) return;

                ctx = {
                    code: value[0],
                    default: value[1],
                    locale: value[2],
                    useExtendedResponse: true
                };
                if (useDefaultLocale()) ctx.locale = defaultLocale;

                var promise = i18n.resolve(ctx);
                promise.then(updateContext);
            }, true);

            scope.open = function () {
                var ctx = {
                    code: attrs.code,
                    translation: angular.copy(scope.var),
                    editor: attrs.editor,
                    submit: translate,
                    template: i18nRendererTemplate.getTemplate({editor: attrs.editor, isEditable: scope.isTranslatable()})
                };
                if (attrs.href) ctx.href = attrs.href;

                i18nRenderer.open(ctx);
            };

            function translate(translation) {
                var ctx = {
                    code: attrs.code,
                    translation: translation
                };
                if (useDefaultLocale()) ctx.locale = defaultLocale;

                var promise = i18n.translate(ctx);
                promise.then(function () {
                    topicMessageDispatcher.fire('i18n.updated', ctx);
                });
            }

            scope.isTranslatable = function() {
                return useDefaultLocale() ? (currentLocaleIsDefault() || currentLocaleIsMain()) : true;
            };

            function useDefaultLocale() {
                return attrs.noLocale != undefined;
            }

            function currentLocaleIsDefault() {
                return localeResolver() == defaultLocale ;
            }

            function currentLocaleIsMain() {
                return localeResolver() == $rootScope.mainLocale;
            }

            if (attrs.readOnly == undefined) {
                editMode.bindEvent({
                    scope: scope,
                    element: element,
                    permission: 'i18n.message.add',
                    onClick: scope.open
                });
            }

            ngRegisterTopicHandler(scope, 'i18n.updated', function (t) {
                if (attrs.code == t.code) updateTranslation(t.translation);
            });

            function updateTranslation(translation) {
                scope.var = translation;
                if (attrs.var) scope.$parent[attrs.var] = translation;
            }

            function updateContext(update) {
                if (update.locale == ctx.locale && update.code == ctx.code && update.default == ctx.default) {
                    updateTranslation(update.translation);
                }
            }
        }
    };
}

function I18nLanguageSwitcherDirective($rootScope, config, i18n, editMode, editModeRenderer, $location, $route, activeUserHasPermission) {
    return {
        restrict: ['E', 'A'],
        scope: true,
        link: function (scope, element) {
            i18n.getSupportedLanguages().then(function (languages) {
                scope.supportedLanguages = [];
                for (var i = 0; i < languages.length; i++) {
                    for (var j = 0; j < (config.languages || []).length; j++) {
                        if (languages[i] == config.languages[j].code) {
                            scope.supportedLanguages.push(config.languages[j]);
                            break;
                        }
                    }
                }
                sortLanguagesByName(scope.supportedLanguages);
            });

            scope.open = function () {
                var rendererScope = $rootScope.$new();

                rendererScope.close = function () {
                    editModeRenderer.close();
                };

                activeUserHasPermission({
                    no: unauthorized,
                    yes: authorized
                }, 'i18n.config.update');

                function unauthorized() {
                    editModeRenderer.open({
                        template: '<div class="bin-menu-edit-body"><p i18n code="i18n.menu.update.language.unauthorized.message" read-only>{{var}}</p></div>' +
                        '<div class="bin-menu-edit-actions">' +
                        '<a class="btn btn-success pull-left" ng-href="{{::binartaUpgradeUri}}" target="_blank" i18n code="i18n.menu.upgrade.button" read-only>{{var}}</a>' +
                        '<button type="reset" class="btn btn-default" ng-click="close()" i18n code="i18n.menu.close.button" read-only>{{var}}</button>' +
                        '</div>',
                        scope: rendererScope
                    });
                }

                function authorized() {
                    var mainLanguage;

                    i18n.getMainLanguage().then(function (locale) {
                        mainLanguage = locale;
                        rendererScope.languages = orderByMainLanguage(angular.copy(scope.supportedLanguages), locale);
                        rendererScope.availableLanguages = getAvailableLanguages(rendererScope.languages);
                        updateSelectedLanguage();
                    });

                    rendererScope.remove = function (lang) {
                        rendererScope.languages = rendererScope.languages.filter(function(it) {
                            return it.code != lang.code;
                        });
                        rendererScope.availableLanguages.push({name: lang.name, code: lang.code});
                        sortLanguagesByName(rendererScope.availableLanguages);
                        updateSelectedLanguage();
                    };

                    rendererScope.add = function (lang) {
                        if (rendererScope.languages.length == 0) mainLanguage = lang.code;
                        rendererScope.languages.push({name: lang.name, code: lang.code});
                        rendererScope.languages = orderByMainLanguage(rendererScope.languages, mainLanguage);
                        rendererScope.availableLanguages = rendererScope.availableLanguages.filter(function(it) {
                            return it.code != lang.code;
                        });
                        updateSelectedLanguage();
                    };

                    rendererScope.save = function () {
                        i18n.updateSupportedLanguages(getLanguageCodes(rendererScope.languages), function () {
                            scope.supportedLanguages = rendererScope.languages;
                            sortLanguagesByName(scope.supportedLanguages);
                            scope.supportedLanguages.length == 0 ? redirectToUnlocalizedPath() : redirectToMainLanguage();
                            editModeRenderer.close();
                        });
                    };

                    function updateSelectedLanguage() {
                        if (rendererScope.availableLanguages.length > 0) rendererScope.selectedLanguage = rendererScope.availableLanguages[0];
                    }

                    editModeRenderer.open({
                        template: '<form ng-submit="save()">' +
                        '<div class="bin-menu-edit-body">' +
                        '<div class="form-group">' +
                        '<table class="table">' +
                        '<tr ng-if="languages.length == 0">' +
                        '<th colspan="2">' +
                        '<i18n code="i18n.menu.what.is.main.language.label" read-only>{{var}}</i18n>' +
                        '</th>' +
                        '</tr>' +
                        '<tr ng-if="languages.length > 0">' +
                        '<th>{{languages[0].name}}</th>' +
                        '<th>' +
                        '<span ng-show="languages.length > 1" i18n code="i18n.menu.main.language.label" read-only>{{var}}</span>' +
                        '<button ng-show="languages.length == 1" type="button" class="btn btn-danger" ng-click="remove(languages[0])" ' +
                        'i18n code="i18n.menu.delete.language.button" read-only>' +
                        '<i class="fa fa-times"></i> {{var}}' +
                        '</button>' +
                        '</th>' +
                        '</tr>' +
                        '<tr ng-repeat="lang in languages track by lang.code" ng-if="!$first">' +
                        '<th>{{lang.name}}</th>' +
                        '<td>' +
                        '<button type="button" class="btn btn-danger" ng-click="remove(lang)" i18n code="i18n.menu.delete.language.button" read-only>' +
                        '<i class="fa fa-times"></i> {{var}}' +
                        '</button>' +
                        '</td>' +
                        '</tr>' +
                        '<tfoot>' +
                        '<tr>' +
                        '<td>' +
                        '<select class="form-control" ng-model="selectedLanguage" ng-options="l.name for l in availableLanguages track by l.code"></select>' +
                        '</td>' +
                        '<td>' +
                        '<button type="button" class="btn btn-primary" ng-click="add(selectedLanguage)">' +
                        '<span ng-show="languages.length == 0" i18n code="i18n.menu.continue.button" read-only>{{var}}</span>' +
                        '<span ng-hide="languages.length == 0" i18n code="i18n.menu.add.language.button" read-only><i class="fa fa-plus"></i> {{var}}</span>' +
                        '</button>' +
                        '</td>' +
                        '</tr>' +
                        '</tfoot>' +
                        '</table>' +
                        '</div>' +
                        '</div>' +
                        '<div class="bin-menu-edit-actions">' +
                        '<button type="submit" class="btn btn-primary" i18n code="i18n.menu.save.button" read-only>{{var}}</button>' +
                        '<button type="reset" class="btn btn-default" ng-click="close()" i18n code="i18n.menu.cancel.button" read-only>{{var}}</button>' +
                        '</div>' +
                        '</form>',
                        scope: rendererScope
                    });
                }
            };

            editMode.bindEvent({
                scope: scope,
                element: element,
                permission: 'config.store',
                onClick: scope.open
            });

            scope.getActiveLanguageName = function() {
                var lang;
                for (var i = 0; i < scope.supportedLanguages.length; i++) {
                    if (scope.supportedLanguages[i].code == $rootScope.locale) {
                        lang = scope.supportedLanguages[i].name;
                        break;
                    }
                }
                return lang;
            };

            function sortLanguagesByName(languages) {
                languages.sort(function (l1, l2) {
                    if(l1.name < l2.name) return -1;
                    if(l1.name > l2.name) return 1;
                    return 0;
                });
            }

            function orderByMainLanguage(languages, mainLanguage) {
                var main;
                var ordered = languages.filter(function(it) {
                    if (it.code == mainLanguage) main = it;
                    return it.code != mainLanguage;
                });
                sortLanguagesByName(ordered);
                if (main) ordered.unshift(main);
                return ordered;
            }

            function redirectToUnlocalizedPath() {
                $location.path($rootScope.unlocalizedPath);
            }

            function redirectToLocalizedPath(locale) {
                $location.path(locale + $rootScope.unlocalizedPath);
            }

            function redirectToMainLanguage() {
                i18n.getMainLanguage().then(function (locale) {
                    if ($location.path() == '/' + locale + $rootScope.unlocalizedPath) {
                        $route.reload();
                    } else {
                        redirectToLocalizedPath(locale);
                    }
                });
            }

            function getAvailableLanguages(languages) {
                var availableLanguages = [];
                for(var i = 0; i < config.languages.length; i++) {
                    var exists = languages.some(function (it) {
                        return it.code == config.languages[i].code;
                    });
                    if (!exists) availableLanguages.push(config.languages[i]);
                }
                sortLanguagesByName(availableLanguages);
                return availableLanguages;
            }

            function getLanguageCodes(languages) {
                var codes = [];
                angular.forEach(languages, function (lang) {
                    codes.push(lang.code);
                });
                return codes;
            }
        }
    };
}

function I18nService($rootScope, $q, $location, config, i18nMessageGateway, localeResolver, $cacheFactory, i18nMessageWriter, usecaseAdapterFactory, publicConfigReader, publicConfigWriter, $http) {
    var self = this;
    var cache = $cacheFactory.get('i18n');
    var supportedLanguages;
    var metadataPromise;
    var internalLocale;

    $rootScope.$on('$routeChangeStart', function () {
        internalLocale = undefined;
    });

    function getMetadata() {
        if (!metadataPromise) {
            metadataPromise = $q.all([
                $http.get('metadata-app.json'),
                $http.get('metadata-system.json')
            ]);
        }
        return metadataPromise;
    }

    function getLocaleFromPath(languages) {
        var param = getFirstRouteParam($location.path());
        if (languages.indexOf(param) != -1) return param;
    }

    function getFirstRouteParam(path) {
        var param = path.match(/^\/[^\/]+\//);
        if (param) return param[0].replace(/\//g,'');
    }

    this.resolve = function (context) {
        var deferred = $q.defer();
        var fallbackMessage = 'place your text here';

        function isUnknown(translation) {
            return translation == '???' + context.code + '???';
        }

        function fallbackToDefaultWhenUnknown(translation) {
            isUnknown(translation) ? resolveDefaultTranslation() : resolveAndCache(translation);
        }

        function resolveDefaultTranslation() {
            if (context.default == '') resolveAndCache(' ');
            else if (context.default) resolveAndCache(context.default);
            else config.defaultLocaleFromMetadata ? resolveDefaultTranslationFromMetadata() : resolveAndCache(fallbackMessage);
        }

        function resolveDefaultTranslationFromMetadata() {
            var translation = fallbackMessage;
            getMetadata().then(function (data) {
                angular.forEach(data, function (metadata) {
                    var messages = metadata.data.msgs[config.defaultLocaleFromMetadata];
                    if (messages && messages[context.code]) translation = messages[context.code];
                });
            }).finally(function () {
                resolveAndCache(translation);
            });
        }

        if (config.namespace) context.namespace = config.namespace;
        if (!context.locale) context.locale = localeResolver();
        isCached() ? resolve(getFromCache()) : getFromGateway();

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
                fallbackToDefaultWhenUnknown(translation);
            }, function () {
                resolveDefaultTranslation();
            });
        }

        function resolveAndCache(msg) {
            resolve(msg);
            storeInCache(msg);
        }

        function resolve(msg) {
            if (context.useExtendedResponse) {
                deferred.resolve({
                    translation: msg,
                    code: context.code,
                    default: context.default,
                    locale: context.locale
                });
            } else {
                deferred.resolve(msg);
            }
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

    this.getSupportedLanguages = function () {
        if(angular.isUndefined(supportedLanguages)) {
            var deferred = $q.defer();
            publicConfigReader({
                key: 'supportedLanguages'
            }).then(function (it) {
                config.supportedLanguages = JSON.parse(it.data.value);
            }).finally(function () {
                deferred.resolve(config.supportedLanguages || []);
            });
            supportedLanguages = deferred.promise;
        }
        return supportedLanguages;
    };

    this.getMainLanguage = function () {
        var deferred = $q.defer();
        self.getSupportedLanguages().then(function (languages) {
            languages.length > 0 ? deferred.resolve(languages[0]) : deferred.resolve();
        });
        return deferred.promise;
    };

    this.updateSupportedLanguages = function (updatedLanguages, onSuccess) {
        return publicConfigWriter({
            key: 'supportedLanguages',
            value: updatedLanguages
        }, {
            success: function () {
                config.supportedLanguages = updatedLanguages;
                supportedLanguages = undefined;
                if (onSuccess) onSuccess();
            }
        });
    };

    this.getInternalLocale = function () {
        if(angular.isUndefined(internalLocale)) {
            var deferred = $q.defer();
            $q.all([
                self.getSupportedLanguages(),
                self.getMainLanguage()
            ]).then(function (result) {
                if (result[0].length > 0) {
                    var locale = getLocaleFromPath(result[0]);
                    if (locale && !(config.useDefaultAsMainLocale && locale == result[1])) deferred.resolve(locale);
                    else deferred.resolve('default');
                } else deferred.resolve('default');
            });
            internalLocale = deferred.promise;
        }
        return internalLocale;
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

function I18nRendererTemplateFactory() {
    var templates = [];

    return {
        getTemplate: function (args) {
            var template = templates[args.editor || 'default'];
            if (template) return template(args);
            else return '';
        },
        addTemplate: function (name, template) {
            templates[name] = template;
        }
    }
}

function I18nRendererTemplateInstallerFactory(i18nRendererTemplate) {
    return {
        add: function (name, template) {
            i18nRendererTemplate.addTemplate(name, template);
        },
        topMenuControls: function () {
            return '<div class=\"clearfix margin-bottom\" ng-show=\"followLink || locale\">' +
                '<button ng-if=\"followLink\" ng-disabled=\"i18nForm.$dirty\" type=\"button\" class=\"btn btn-primary pull-left\" ng-click=\"followLink()\" i18n code=\"i18n.menu.follow.link\" read-only ng-bind="var">' +
                '</button>' +
                '<span class=\"pull-right\" ng-if=\"locale\"><i class=\"fa fa-globe fa-fw\"></i> {{locale | toLanguageName}}</span>' +
                '</div>';
        },
        bottomMenuControls: function (isEditable) {
            return '<div class=\"bin-menu-edit-actions\">' +
                (
                    isEditable
                        ? '<button type=\"reset\" class=\"btn btn-danger pull-left\" ng-click=\"erase()\" i18n code=\"i18n.menu.erase.text.button\" read-only ng-bind="var"></button>' +
                    '<button type=\"submit\" class=\"btn btn-primary\" i18n code=\"i18n.menu.save.button\" read-only ng-bind="var"></button>' +
                    '<button type=\"reset\" class=\"btn btn-default\" ng-click=\"cancel()\" i18n code=\"i18n.menu.cancel.button\" read-only ng-bind="var"></button>'
                        : '<span class=\"pull-left margin-bottom\" i18n code=\"i18n.menu.no.multilingualism.message\" read-only><i class=\"fa fa-info-circle fa-fw\"></i> <span ng-bind="var"></span></span>' +
                    '<button type=\"button\" class=\"btn btn-default\" ng-click=\"cancel()\" i18n code=\"i18n.menu.close.button\" read-only ng-bind="var"></button>'
                ) +
                '</div>';
        }
    }
}