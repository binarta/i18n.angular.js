angular.module('i18n', ['i18n.templates', 'binarta-applicationjs-angular1', 'i18n.gateways', 'config', 'config.gateways', 'angular.usecase.adapter', 'web.storage', 'notifications', 'checkpoint', 'toggle.edit.mode'])
    .service('i18n', ['$rootScope', '$q', '$location', 'config', 'i18nMessageReader', '$cacheFactory', 'i18nMessageWriter', 'usecaseAdapterFactory', 'publicConfigReader', 'publicConfigWriter', '$http', 'binarta', '$log', 'topicMessageDispatcher', I18nService])
    .service('i18nRenderer', function () {})
    .factory('i18nRendererInstaller', ['i18nRenderer', I18nRendererInstallerFactory])
    .factory('i18nLocation', ['$q', '$location', '$routeParams', 'i18n', I18nLocationFactory])
    .factory('i18nResolver', ['i18n', I18nResolverFactory])
    .factory('localeResolver', ['binarta', '$log', LocaleResolverFactory])
    .factory('localeSwapper', ['binarta', '$log', 'topicMessageDispatcher', LocaleSwapperFactory])
    .factory('i18nRendererTemplate', I18nRendererTemplateFactory)
    .factory('i18nRendererTemplateInstaller', ['i18nRendererTemplate', I18nRendererTemplateInstallerFactory])
    .controller('SelectLocaleController', ['$scope', '$routeParams', 'localeResolver', 'localeSwapper', SelectLocaleController])
    .directive('i18nTranslate', ['$rootScope', 'i18n', 'i18nRenderer', 'editMode', 'localeResolver', 'i18nRendererTemplate', 'ngRegisterTopicHandler', 'binarta', i18nDirectiveFactory])
    .directive('i18n', ['$rootScope', 'i18n', 'i18nRenderer', 'editMode', 'localeResolver', 'i18nRendererTemplate', 'ngRegisterTopicHandler', 'binarta', i18nDirectiveFactory])
    .directive('binLink', ['i18n', 'localeResolver', 'ngRegisterTopicHandler', 'editMode', 'i18nRenderer', 'topicMessageDispatcher', BinLinkDirectiveFactory])
    .directive('i18nLanguageSwitcher', ['config', 'i18n', 'editMode', 'editModeRenderer', 'activeUserHasPermission', 'binarta', I18nLanguageSwitcherDirective])
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
    .filter('i18nRoute', ['$routeParams', function ($routeParams) {
        return function (val) {
            return '#!' + ($routeParams.locale ? '/' + $routeParams.locale : '') + val;
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
        }
    }])
    .run(['binarta', 'config', '$cacheFactory', 'topicMessageDispatcher', '$rootScope', function (binarta, config, $cacheFactory, topicMessageDispatcher, $rootScope) {
        binarta.application.adhesiveReading.handlers.add(new CacheI18nMessageHandler());
        binarta.application.eventRegistry.add(new SetLocaleAdapter());

        function CacheI18nMessageHandler() {
            var messages = $cacheFactory.get('i18n');

            this.type = 'i18n';
            this.cache = function (it) {
                var locale = binarta.application.localeForPresentation() || binarta.application.locale();
                messages.put(config.namespace + ':' + locale + ':' + it.key, it.message);
            }
        }

        function SetLocaleAdapter() {
            this.setLocale = function (locale) {
                topicMessageDispatcher.firePersistently('i18n.locale', binarta.application.localeForPresentation() || binarta.application.locale());
                $rootScope.unlocalizedPath = binarta.application.unlocalizedPath();
                $rootScope.locale = binarta.application.localeForPresentation() || '';
                $rootScope.localePrefix = $rootScope.locale ? '/' + $rootScope.locale : '';
                $rootScope.mainLocale = binarta.application.primaryLanguage() || '';
            }
        }
    }]);

function I18nLocationFactory($q, $location, $routeParams, i18n) {
    function decorate(path) {
        return ($routeParams.locale ? '/' + $routeParams.locale : '') + path;
    }

    return {
        search: function (it) {
            $location.search(it);
        },
        url: function (url) {
            return $location.url(decorate(url));
        },
        path: function (path) {
            return $location.path(decorate(path));
        },
        unlocalizedPath: i18n.unlocalizedPath
    }
}

function LocaleResolverFactory(binarta, $log) {
    $log.warn('@deprecated LocaleResolverFactory - use binarta.application.locale() instead!');
    return binarta.application.locale;
}

function LocaleSwapperFactory(binarta, $log, topicMessageDispatcher) {
    return function (locale) {
        $log.warn('@deprecated LocaleSwapperFactory - use binarta.application.setLocale(locale) instead!');
        binarta.application.setLocale(locale);
        binarta.application.adhesiveReading.readRoute();
        topicMessageDispatcher.firePersistently('i18n.locale', locale);
    }
}

function BinLinkDirectiveFactory(i18n, localeResolver, ngRegisterTopicHandler, editMode, i18nRenderer, topicMessageDispatcher) {
    return {
        restrict: 'EA',
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
                    '<div class="bin-menu-edit-body">' +
                    '<div class=\"form-group\">' +
                    '<label for=\"inputLinkText\">Naam</label>' +
                    '<input type=\"text\" id=\"inputLinkText\" ng-model=\"translation.name\">' +
                    '</div>' +
                    '<div class=\"form-group\">' +
                    '<label for=\"inputLinkUrl\">Url</label>' +
                    '<input type=\"text\" id=\"inputLinkUrl\" ng-model=\"translation.url\">' +
                    '</div>' +
                    '</div>' +
                    '</form>' +
                    '<div class=\"bin-menu-edit-actions\">' +
                    '<button type="submit" class="btn btn-primary" ng-click="submit(translation)" i18n code="i18n.menu.save.button" default="Opslaan" read-only>{{var}}</button>' +
                    '<button type="reset" class="btn btn-default" ng-click="cancel()" i18n code="i18n.menu.cancel.button" default="Annuleren" read-only>{{var}}</button>' +
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

function i18nDirectiveFactory($rootScope, i18n, i18nRenderer, editMode, localeResolver, i18nRendererTemplate, ngRegisterTopicHandler, binarta) {
    return {
        restrict: 'EA',
        scope: true,
        link: function (scope, element, attrs) {
            scope.var = undefined;
            var defaultLocale = 'default';
            var translated;
            var ctx = {
                useExtendedResponse: true
            };

            ngRegisterTopicHandler(scope, 'i18n.locale', resolveWithLocale);

            ngRegisterTopicHandler(scope, 'i18n.updated', function (ctx) {
                if (attrs.code == ctx.code) updateTranslation(ctx.translation);
            });

            ngRegisterTopicHandler(scope, 'edit.mode', function (enabled) {
                scope.editing=enabled;
            });

            scope.open = function () {
                var ctx = {
                    code: attrs.code,
                    translation: angular.copy(scope.var),
                    editor: attrs.editor,
                    submit: translate,
                    template: i18nRendererTemplate.getTemplate({
                        editor: attrs.editor,
                        isEditable: scope.isTranslatable()
                    })
                };
                if (attrs.binHref) ctx.path = getLocalePrefix() + attrs.binHref;
                else if (attrs.href) ctx.path = removeHashbang(attrs.href);

                i18nRenderer.open(ctx);
            };

            function removeHashbang(href) {
                return href.substr(0, 2) === '#!' ? href.substr(2) : href;
            }

            function getLocalePrefix() {
                var locale = binarta.application.localeForPresentation();
                return locale ? '/' + locale : '';
            }

            function resolveWithLocale(locale) {
                ctx.locale = locale;
                if (attrs.watchOnCode != undefined) watchOnCodeChange(ctx);
                else resolveTranslation(ctx);
            }

            function watchOnCodeChange(ctx) {
                scope.$watch(function () {
                    return attrs.code;
                }, function () {
                    resolveTranslation(ctx);
                });
            }

            function translate(translation) {
                var ctx = {
                    code: attrs.code,
                    translation: translation
                };
                if (useDefaultLocale()) ctx.locale = defaultLocale;

                i18n.translate(ctx).then(function (translation) {
                    updateTranslation(translation);
                });
            }

            scope.isTranslatable = function () {
                return useDefaultLocale() ? (currentLocaleIsDefault() || currentLocaleIsMain()) : true;
            };

            function useDefaultLocale() {
                return attrs.noLocale != undefined;
            }

            function currentLocaleIsDefault() {
                return localeResolver() == defaultLocale;
            }

            function currentLocaleIsMain() {
                return localeResolver() == $rootScope.mainLocale;
            }

            function isReadOnly() {
                return attrs.readOnly != undefined;
            }

            if (!isReadOnly()) {
                editMode.bindEvent({
                    scope: scope,
                    element: element,
                    permission: 'i18n.message.add',
                    onClick: scope.open
                });
            }

            function resolveTranslation(ctx) {
                ctx.code = attrs.code;
                ctx.default = attrs.default;
                i18n.resolve(ctx).then(function (update) {
                    updateTranslation(update.translation);
                }, function () {
                    isReadOnly() ? setEmptyText() : setPlaceholderTextWhenInEditMode();
                });
            }

            function setPlaceholderTextWhenInEditMode() {
                ngRegisterTopicHandler(scope, 'edit.mode', function (enabled) {
                    if (!translated) enabled ? setPlaceholderText() : setEmptyText();
                });
            }

            function setEmptyText() {
                setVar('');
            }

            function setPlaceholderText() {
                setVar('place your text here');
            }

            function updateTranslation(translation) {
                translated = true;
                setVar(translation);
            }

            function setVar(translation) {
                scope.var = translation;
                if (attrs.var) scope.$parent[attrs.var] = translation;
            }
        }
    };
}

function I18nLanguageSwitcherDirective(config, i18n, editMode, editModeRenderer, activeUserHasPermission, binarta) {
    return {
        restrict: 'EA',
        scope: true,
        link: function (scope, element) {
            var activeLanguageName, destroyCallbacks = [];

            binarta.schedule(function () {
                scope.supportedLanguages = getSupportedLanguages(binarta.application.supportedLanguages());
                scope.locale = binarta.application.localeForPresentation();
                setActiveLanguageName();

                var event = {
                    setLocaleForPresentation: function (locale) {
                        scope.locale = locale;
                        setActiveLanguageName();
                    }
                };

                binarta.application.eventRegistry.add(event);
                destroyCallbacks.push(function () {
                    binarta.application.eventRegistry.remove(event);
                });
            });

            scope.$on('$routeChangeSuccess', function () {
                scope.unlocalizedPath = binarta.application.unlocalizedPath();
            });

            scope.getActiveLanguageName = function () {
                return activeLanguageName;
            };

            scope.open = function () {
                var rendererScope = scope.$new();

                rendererScope.close = function () {
                    editModeRenderer.close();
                };

                activeUserHasPermission({
                    no: unauthorized,
                    yes: authorized
                }, 'i18n.config.update');

                function unauthorized() {
                    editModeRenderer.open({
                        templateUrl: 'bin-i18n-language-switcher-unavailable.html',
                        scope: rendererScope
                    });
                }

                function authorized() {
                    var primaryLanguage = binarta.application.primaryLanguage();

                    rendererScope.languages = orderByPrimaryLanguage(angular.copy(scope.supportedLanguages), primaryLanguage);
                    rendererScope.availableLanguages = getAvailableLanguages(rendererScope.languages);
                    updateSelectedLanguage();

                    rendererScope.remove = function (lang) {
                        rendererScope.languages = rendererScope.languages.filter(function (it) {
                            return it.code != lang.code;
                        });
                        rendererScope.availableLanguages.push({name: lang.name, code: lang.code});
                        sortLanguagesByName(rendererScope.availableLanguages);
                        updateSelectedLanguage();
                    };

                    rendererScope.add = function (lang) {
                        if (rendererScope.languages.length == 0) primaryLanguage = lang.code;
                        rendererScope.languages.push({name: lang.name, code: lang.code});
                        rendererScope.languages = orderByPrimaryLanguage(rendererScope.languages, primaryLanguage);
                        rendererScope.availableLanguages = rendererScope.availableLanguages.filter(function (it) {
                            return it.code != lang.code;
                        });
                        updateSelectedLanguage();
                    };

                    rendererScope.save = function () {
                        i18n.updateSupportedLanguages(getLanguageCodes(rendererScope.languages), function () {
                            scope.supportedLanguages = rendererScope.languages;
                            sortLanguagesByName(scope.supportedLanguages);
                            editModeRenderer.close();
                        });
                    };

                    function updateSelectedLanguage() {
                        if (rendererScope.availableLanguages.length > 0) rendererScope.selectedLanguage = rendererScope.availableLanguages[0];
                    }

                    editModeRenderer.open({
                        templateUrl: 'bin-i18n-language-switcher.html',
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

            scope.$on('$destroy', function () {
                destroyCallbacks.forEach(function (callback) {
                    callback();
                });
            });

            function getSupportedLanguages(languages) {
                var supportedLanguages = [];
                for (var i = 0; i < languages.length; i++) {
                    for (var j = 0; j < (config.languages || []).length; j++) {
                        if (languages[i] == config.languages[j].code) {
                            supportedLanguages.push(config.languages[j]);
                            break;
                        }
                    }
                }
                return sortLanguagesByName(supportedLanguages);
            }

            function setActiveLanguageName() {
                for (var i = 0; i < scope.supportedLanguages.length; i++) {
                    if (scope.supportedLanguages[i].code == scope.locale) {
                        activeLanguageName = scope.supportedLanguages[i].name;
                        break;
                    }
                }
            }

            function sortLanguagesByName(languages) {
                return languages.sort(function (l1, l2) {
                    if (l1.name < l2.name) return -1;
                    if (l1.name > l2.name) return 1;
                    return 0;
                });
            }

            function orderByPrimaryLanguage(languages, primaryLanguage) {
                var primary;
                var ordered = languages.filter(function (it) {
                    if (it.code == primaryLanguage) primary = it;
                    return it.code != primaryLanguage;
                });
                ordered = sortLanguagesByName(ordered);
                if (primary) ordered.unshift(primary);
                return ordered;
            }

            function getAvailableLanguages(languages) {
                var availableLanguages = [];
                for (var i = 0; i < config.languages.length; i++) {
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

function BinartaI18nMessageConverter(context) {
    var self = this;

    this.isUnknown = function (translation) {
        return translation == '???' + context.code + '???';
    };

    this.toDefaultWhenUnknown = function (translation) {
        return self.isUnknown(translation) ? self.toDefaultTranslation() : translation;
    };

    this.toDefaultTranslation = function () {
        return context.default == '' || context.default == undefined ? ' ' : context.default;
    }
}

function I18nService($rootScope, $q, $location, config, i18nMessageReader, $cacheFactory, i18nMessageWriter, usecaseAdapterFactory, publicConfigReader, publicConfigWriter, $http, binarta, $log, topicMessageDispatcher) {
    var self = this;
    var cache = $cacheFactory.get('i18n');
    var supportedLanguages, metadataPromise, internalLocalePromise, externalLocalePromise;

    var adhesiveReadingListener = new AdhesiveReadingListener();
    binarta.application.adhesiveReading.eventRegistry.add(adhesiveReadingListener);

    $rootScope.$on('$routeChangeStart', function () {
        internalLocalePromise = undefined;
        externalLocalePromise = undefined;
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
        if (param) return param[0].replace(/\//g, '');
    }

    this.resolve = function (context) {
        var deferred = $q.defer();

        var messageConverter = new BinartaI18nMessageConverter(context);

        function fallbackToDefaultWhenUnknown(translation) {
            var result = messageConverter.toDefaultWhenUnknown(translation);
            resolveFromMetadataIfEmpty(result);
        }

        function resolveFromMetadataIfEmpty(result) {
            result == ' ' && context.default == undefined ? resolveFromMetadata() : resolveAndCache(result);
        }

        function resolveFromMetadata() {
            config.defaultLocaleFromMetadata ? resolveDefaultTranslationFromMetadata() : deferred.reject();
        }

        function resolveDefaultTranslationFromMetadata() {
            var translation;
            getMetadata().then(function (data) {
                angular.forEach(data, function (metadata) {
                    var messages = metadata.data.msgs[config.defaultLocaleFromMetadata];
                    if (messages && messages[context.code]) translation = messages[context.code];
                });
            }).finally(function () {
                translation ? resolveAndCache(translation) : deferred.reject();
            });
        }

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
            context.section = binarta.application.unlocalizedPath();
            i18nMessageReader(context, function (translation) {
                fallbackToDefaultWhenUnknown(translation);
            }, function () {
                fallbackToDefaultWhenUnknown('???' + context.code + '???');
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

        if (config.namespace) context.namespace = config.namespace;
        binarta.schedule(function () {
            adhesiveReadingListener.schedule(function () {
                if (!context.locale) context.locale = binarta.application.localeForPresentation() || binarta.application.locale();
                isCached() ? fallbackToDefaultWhenUnknown(getFromCache()) : getFromGateway();
            });
        });

        return deferred.promise;
    };

    this.unlocalizedPath = function () {
        var deferred = $q.defer();
        var path = $location.path();
        self.getExternalLocale().then(function (locale) {
            deferred.resolve(path.replace('/' + locale, ''));
        }, function () {
            deferred.resolve(path.replace(/^\/[^\/]+\/$/, path.slice(0, -1)));
        });
        return deferred.promise;
    };

    this.translate = function (context) {
        var deferred = $q.defer();

        var ctx = {key: context.code, message: context.translation};
        if (config.namespace) ctx.namespace = config.namespace;

        self.getInternalLocale().then(function (locale) {
            ctx.locale = context.locale || locale || 'default';
            var onSuccess = function () {
                deferred.resolve(cache.put(toKey(), ctx.message));
                topicMessageDispatcher.fire('i18n.updated', {code: ctx.key, translation: ctx.message});
            };
            i18nMessageWriter(ctx, usecaseAdapterFactory(context, onSuccess));
        });

        function toKey() {
            var locale = binarta.application.localeForPresentation() || 'default';
            if (ctx.locale && ctx.locale != 'default')
                locale = ctx.locale;
            return (ctx.namespace || 'default') + ':' + locale + ':' + ctx.key;
        }

        return deferred.promise;
    };

    this.getSupportedLanguages = function () {
        $log.warn('@deprecated I8nService.getSupportedLanguages() - use binarta.application.supportedLanguages() instead!');
        var deferred = $q.defer();
        binarta.schedule(function () {
            var supportedLanguages = binarta.application.supportedLanguages();
            if (supportedLanguages.length > 0 || !config.supportedLanguages) {
                config.supportedLanguages = supportedLanguages;
            }
            binarta.application.profile().supportedLanguages = config.supportedLanguages;
            deferred.resolve(config.supportedLanguages);
        });
        return deferred.promise;
    };

    this.getMainLanguage = function () {
        $log.warn('@deprecated I8nService.getMainLanguage() - use binarta.application.primaryLanguage() instead!');
        var deferred = $q.defer();
        self.getSupportedLanguages().then(function () {
            deferred.resolve(binarta.application.primaryLanguage());
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
                binarta.application.profile().supportedLanguages = updatedLanguages;
                binarta.application.refreshEvents();
                if (onSuccess) onSuccess();
            }
        });
    };

    this.getInternalLocale = function () {
        var deferred = $q.defer();
        binarta.schedule(function () {
            deferred.resolve(binarta.application.locale());
        });
        return deferred.promise;
    };

    this.getExternalLocale = function () {
        var deferred = $q.defer();
        binarta.schedule(function () {
            var locale = binarta.application.localeForPresentation();
            locale ? deferred.resolve(locale) : deferred.reject();
        });
        return deferred.promise;
    };

    function AdhesiveReadingListener() {
        var jobs = [];
        var started;

        this.start = function () {
            started = true;
        };

        this.stop = function () {
            started = false;
            jobs.forEach(function (it) {
                it();
            });
            jobs = [];
        };

        this.schedule = function (job) {
            if (!started)
                job();
            else
                jobs.push(job);
        }
    }
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
            var template = templates[args.editor || 'default'];
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
