describe('i18n', function () {
    var cache;

    var resourceLoaderSpy = [];

    angular.module('checkpoint', []);
    angular.module('angularx', [])
        .service('resourceLoader', function () {
            this.add = function (href) {
                resourceLoaderSpy.push(href);
            };
        });

    beforeEach(module('i18n'));
    beforeEach(module('i18n.gateways'));
    beforeEach(module('angular.usecase.adapter'));
    beforeEach(module('notifications'));
    beforeEach(module('permissions'));
    beforeEach(module('web.storage'));
    beforeEach(module('config'));

    var modal, modalInstance, submitModalSpy, cancelModalSpy;

    beforeEach(function () {
        modal = {
            open: {}
        };
        modalInstance = {
            result: {
                then: function (result, dismissed) {
                    submitModalSpy = result;
                    cancelModalSpy = dismissed;
                }
            }
        };
        spyOn(modal, 'open').andReturn(modalInstance);

        module(function ($provide) {
            $provide.value('$modal', modal);
        });
    });

    beforeEach(inject(function($cacheFactory) {
        cache = $cacheFactory.get('i18n');
    }));

    describe('on module loaded', function() {
        it('cache for i18n is created', inject(function($cacheFactory) {
            expect($cacheFactory.get('i18n')).toBeDefined();
        }))
    });

    describe('load tinymce', function () {
        describe('when active user has permission', function () {
            var permitter;

            beforeEach(inject(function (activeUserHasPermissionHelper) {
                resourceLoaderSpy = [];

                permitter = activeUserHasPermissionHelper;
                permitter.yes();
            }));

            it('user has edit.mode permission', function () {
                expect(permitter.permission).toEqual('edit.mode');
            });

            it('resources are loaded', function () {
                expect(resourceLoaderSpy).toEqual([
                    '//cdn.binarta.com/js/tinymce/4.1.7/tinymce.min.js',
                    '//cdn.binarta.com/js/tinymce/4.1.7/skins/lightgray/skin.min.css'
                ]);
            });
        });
    });

    describe('i18n service', function () {
        var $rootScope, config, i18n, localStorage;

        beforeEach(inject(function (_i18n_, _config_, _$rootScope_, _localStorage_) {
            $rootScope = _$rootScope_;
            config = _config_;
            i18n = _i18n_;
            localStorage = _localStorage_;
        }));

        it('i18n service should be defined', function () {
            expect(i18n).toBeDefined();
        });

        describe('on translate', function () {
            var writer, context, usecaseAdapter;

            beforeEach(inject(function (i18nMessageWriter, usecaseAdapterFactory) {
                writer = i18nMessageWriter;
                usecaseAdapter = usecaseAdapterFactory;
                context = {
                    code: 'code',
                    translation: 'translation'
                };
            }));

            function expectContextEquals(ctx) {
                expect(writer.calls[0].args[0]).toEqual(ctx);
            }

            describe('construct context', function () {
                it('default', function () {
                    i18n.translate(context);

                    expectContextEquals({
                        key: 'code',
                        message: 'translation',
                        locale: 'default'
                    });
                });

                it('with namespace', function () {
                    config.namespace = 'test';

                    i18n.translate(context);

                    expectContextEquals({
                        key: 'code',
                        message: 'translation',
                        namespace: 'test',
                        locale: 'default'
                    });
                });

                it('with locale', function () {
                    localStorage.locale = 'nl';

                    i18n.translate(context);

                    expectContextEquals({
                        key: 'code',
                        message: 'translation',
                        locale: 'nl'
                    });
                });

                it('with custom locale on context', function () {
                    localStorage.locale = 'nl';
                    context.locale = 'custom';

                    i18n.translate(context);

                    expectContextEquals({
                        key: 'code',
                        message: 'translation',
                        locale: 'custom'
                    });
                });
            });

            it('context is passed to usecaseAdapter', function () {
                i18n.translate(context);

                expect(usecaseAdapter.calls[0].args[0]).toEqual(context);
            });

            describe('on success', function () {
                it('default', function () {
                    i18n.translate(context);
                    usecaseAdapter.calls[0].args[1]();

                    expect(cache.get('default:default:code')).toEqual('translation');
                });

                it('with namespace', function () {
                    config.namespace = 'N';

                    i18n.translate(context);
                    usecaseAdapter.calls[0].args[1]();

                    expect(cache.get('N:default:code')).toEqual('translation');
                });

                it('with locale', function () {
                    localStorage.locale = 'L';

                    i18n.translate(context);
                    usecaseAdapter.calls[0].args[1]();

                    expect(cache.get('default:L:code')).toEqual('translation');
                });

                it('with custom locale on context', function () {
                    localStorage.locale = 'L';
                    context.locale = 'custom';

                    i18n.translate(context);
                    usecaseAdapter.calls[0].args[1]();

                    expect(cache.get('default:custom:code')).toEqual('translation');
                });
            });
        });

        describe('on resolve', function () {
            var registry, permitter;
            var code = 'translation.code';
            var translation = 'translation message';
            var defaultTranslation = 'default translation';
            var unknownCode = '???' + code + '???';
            var receivedTranslation;
            var presenter = function (translation) {
                receivedTranslation = translation;
            };
            var context;
            var reader;

            beforeEach(inject(function(i18nMessageReader) {
                reader = i18nMessageReader;
            }));
            beforeEach(inject(function (localStorage, topicRegistryMock, activeUserHasPermissionHelper) {
                receivedTranslation = '';
                context = {};
                registry = topicRegistryMock;
                permitter = activeUserHasPermissionHelper;
            }));

            function expectContextEquals(ctx) {
                expect(reader.calls[0].args[0]).toEqual(ctx);
            }

            it('on resolve construct context with namespace', function () {
                context.code = code;
                i18n.resolve(context).then(presenter);
                expectContextEquals({code:code, namespace:config.namespace});
            });

            function resolveTo(translation) {
                i18n.resolve(context).then(presenter);
                reader.calls[0].args[1](translation);
                $rootScope.$digest();
            }

            function failed() {
                i18n.resolve(context).then(presenter);
                reader.calls[0].args[2]();
                $rootScope.$digest();
            }

            describe('given translation code', function() {
                beforeEach(function() {
                    context.code = code;
                });

                it('resolve to translation', inject(function () {
                    resolveTo(translation);
                    expect(receivedTranslation).toEqual(translation);
                    expect(cache.get('default:default:translation.code')).toEqual(translation);
                }));

                it('resolution fallback to default', function () {
                    context.code = code;
                    context.default = defaultTranslation;
                    resolveTo(unknownCode);
                    expect(receivedTranslation).toEqual(defaultTranslation);
                    expect(cache.get('default:default:translation.code')).toEqual(defaultTranslation);
                });

                it('resolution fallback to empty default', function () {
                    context.code = code;
                    context.default = '';
                    resolveTo(unknownCode);
                    expect(receivedTranslation).toEqual(' ');
                    expect(cache.get('default:default:translation.code')).toEqual(' ');
                });

                it('resolution without fallback to default available', function () {
                    context.code = code;
                    i18n.resolve(context).then(presenter);
                    resolveTo(unknownCode);
                    expect(receivedTranslation).toEqual('place your text here');
                    expect(cache.get('default:default:translation.code')).toEqual('place your text here');
                });

                it('failed resolution fallback to default', function () {
                    context.default = defaultTranslation;
                    failed();
                    expect(receivedTranslation).toEqual(defaultTranslation);
                });
            });

            describe('given a previously selected locale', function () {
                var locale;

                beforeEach(function () {
                    locale = 'lang';
                    localStorage.locale = locale;
                });

                it('resolution includes the locale on context', function () {
                    i18n.resolve(context, presenter);
                    expectContextEquals({locale:locale});
                });
            });

            describe('with namespace and locale', function() {
                beforeEach(function() {
                    localStorage.locale = 'L';
                    config.namespace = 'N';
                    context.code = 'C';
                });

                describe('when resolving a message for the first time', function() {
                    beforeEach(function() {
                        resolveTo(translation);
                    });

                    it('then namespace locale and code are embedded in cache key', function() {
                        expect(cache.get('N:L:C')).toEqual(translation);
                    });

                    describe('and subsequent calls', function() {
                        beforeEach(function() {
                            reader.reset();
                            i18n.resolve(context, presenter);
                        });

                        it('then no gateway calls are done', function() {
                            expect(reader.calls[0]).toBeUndefined();
                        })
                    });
                });

                describe('when using a custom locale', function () {
                    beforeEach(function () {
                        context.locale = 'custom';

                        i18n.resolve(context, presenter);
                    });

                    it('resolution includes the custom locale on context', function () {
                        expect(reader.calls[0].args[0].locale).toEqual('custom');
                    });
                });
            });
        });


    });

    describe('I18nDefaultRendererService', function () {
        var service, config;

        beforeEach(inject(function (i18nDefaultRenderer, _config_) {
            service = i18nDefaultRenderer;
            config = _config_;
        }));

        describe('open dialog modal', function (){
            var submittedValue, canceled;

            beforeEach(function () {
                submittedValue = {};
                canceled = false;

                service.open({
                    translation: 'translation',
                    editor: 'editor',
                    submit: function (value) {
                        submittedValue = value;
                    },
                    cancel: function () {
                        canceled = true;
                    }
                });
            });

            it('modal is opened', function () {
                expect(modal.open).toHaveBeenCalled();
            });

            it('modal is opened with scope setting', function () {
                expect(modal.open.mostRecentCall.args[0].scope).toBeDefined();
            });

            it('modal is opened with controller setting', function () {
                expect(modal.open.mostRecentCall.args[0].controller).toEqual('i18nDefaultModalController');
            });

            it('modal is opened with default templateUrl setting', function () {
                expect(modal.open.mostRecentCall.args[0].templateUrl).toEqual('bower_components/binarta.i18n.angular/template/i18n-modal.html');
            });

            it('template url with specific styling', function () {
                config.styling = 'bootstrap3';
                service.open({});

                expect(modal.open.mostRecentCall.args[0].templateUrl).toEqual('bower_components/binarta.i18n.angular/template/bootstrap3/i18n-modal.html');
            });

            it('template url with specific components directory', function () {
                config.styling = 'bootstrap3';
                config.componentsDir = 'components';
                service.open({});

                expect(modal.open.mostRecentCall.args[0].templateUrl).toEqual('components/binarta.i18n.angular/template/bootstrap3/i18n-modal.html');
            });

            it('modal is submitted', function () {
                submitModalSpy('translated value');

                expect(submittedValue).toEqual('translated value');
            });

            it('modal is canceled', function () {
                cancelModalSpy();

                expect(canceled).toBeTruthy();
            });
        });
    });

    describe('I18nSupportController', function () {
        var $rootScope, registry, dispatcher, local, session, $location, window;
        var code = 'message.code';
        var translation = 'message translation';
        var config;

        beforeEach(inject(function ($controller, topicRegistryMock, topicMessageDispatcherMock, localStorage, sessionStorage, _$rootScope_, _$location_, _config_, $window) {
            $rootScope = _$rootScope_;
            $location = _$location_;
            local = localStorage;
            session = sessionStorage;
            registry = topicRegistryMock;
            dispatcher = topicMessageDispatcherMock;
            config = _config_;
            config.namespace = 'namespace';

            window = $window;
            window.navigator = {
                userLanguage: 'en_BE',
                language: 'en_BE'
            };

            $controller(I18nSupportController, {$rootScope: $rootScope, config: config, $window: window});
        }));

        function goToPath(path) {
            $location.path(path);
            $rootScope.$broadcast('$routeChangeStart', {params: {}});
        }

        it('no i18n.locale notification should be raised yet', function() {
            expect(dispatcher.persistent['i18n.locale']).toBeUndefined();
        });

        describe('when locale is remembered', function () {
            beforeEach(inject(function ($controller) {
                local.locale = 'en';

                $controller(I18nSupportController, {$rootScope: $rootScope, config: config, $window: window});
            }));

            it('raise i18n.locale notification', function () {
                expect(dispatcher.persistent['i18n.locale']).toEqual('en');
            });
        });

        [undefined, []].forEach(function (lang) {
            describe('when supportedLanguages is ' + lang, function () {
                beforeEach(function () {
                    config.supportedLanguages = lang;
                });

                it('localePrefix is empty string', function () {
                    goToPath('/foo/bar');

                    expect($rootScope.localePrefix).toBeUndefined();
                });

                it('remembered locale is default', function () {
                    goToPath('/foo/bar');

                    expect(local.locale).toEqual('default');
                    expect(dispatcher.persistent['i18n.locale']).toEqual('default');
                });

                it('with one path param, remove trailing slash', function () {
                    goToPath('/foo/');

                    expect($rootScope.unlocalizedPath).toEqual('/foo');
                });

                it('with more than one path param, do not remove trailing slash', inject(function() {
                    goToPath('/foo/bar');

                    expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
                }));

                describe('and default locale is remembered', function() {
                    beforeEach(function() {
                        local.locale = 'default';
                    });

                    it('test', inject(function() {
                        goToPath('/foo/bar');

                        expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
                    }));
                });
            });
        });

        describe('locale is supported', function () {
            var locale;

            beforeEach(function () {
                locale = 'lang';
                config.supportedLanguages = [locale, 'remembered', 'en'];
            });

            describe('and locale encoded in path then', function () {
                beforeEach(function () {
                    goToPath('/' + locale + '/foo/bar');
                });

                it('expose locale on rootScope', function () {
                    expect($rootScope.locale).toEqual(locale);
                });

                it('expose localePrefix on rootScope', function () {
                    expect($rootScope.localePrefix).toEqual('/' + locale);
                });

                it('remember locale', function () {
                    expect(local.locale).toEqual(locale);
                });

                it('broadcast locale', function() {
                    expect(dispatcher.persistent['i18n.locale']).toEqual(locale);
                });

                it('expose unlocalized path on scope', function () {
                    expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
                });
            });

            describe('and locale not encoded in path then', function () {
                it('redirect to localized page', function () {
                    goToPath('/foo/bar');

                    expect($location.path()).toEqual('/lang/foo/bar');
                });

                it('unlocalized path is on scope', function () {
                    goToPath('/foo/bar');

                    expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
                });

                it('localePrefix is set to first locale', function () {
                    goToPath('/foo/bar');

                    expect($rootScope.localePrefix).toEqual('/lang');
                });

                it('with more than one path param, do not remove trailing slash', function () {
                    goToPath('/foo/bar/');

                    expect($rootScope.unlocalizedPath).toEqual('/foo/bar/');
                });

                describe('and remembered locale', function () {
                    beforeEach(function () {
                        local.locale = 'remembered';
                    });

                    it('redirects to localized page', function () {
                        goToPath('/path');

                        expect($location.path()).toEqual('/remembered/path');
                    });
                });

                describe('and no remembered locale', function () {
                    beforeEach(function () {
                        local.locale = undefined;
                    });

                    describe('with fallback to browser locale', function () {
                        beforeEach(function () {
                            config.fallbackToBrowserLocale = true;
                        });

                        it('and when no browser user language or browser language, fall back to first supported locale', function() {
                            window.navigator.language = undefined;
                            window.navigator.userLanguage = undefined;

                            goToPath('/');

                            expect($location.path()).toEqual('/lang/');
                            //expect(dispatcher.persistent['i18n.locale']).toEqual('lang');
                        });

                        describe('and browser user language is supported', function() {
                            beforeEach(function() {
                                window.navigator.userLanguage = 'en_BE';
                            });

                            it('fallback to browser locale', function() {
                                goToPath('/');

                                expect($location.path()).toEqual('/en/');
                                //expect(dispatcher.persistent['i18n.locale']).toEqual('en');
                            });
                        });

                        describe('and browser user language is not supported', function() {
                            beforeEach(function() {
                                window.navigator.userLanguage = 'un_SU';
                            });

                            it('fall back to first supported locale', inject(function() {
                                goToPath('/');

                                expect($location.path()).toEqual('/lang/');
                                //expect(dispatcher.persistent['i18n.locale']).toEqual('lang');
                            }));
                        });

                        describe('and no browser user language with browser language', function() {
                            beforeEach(function() {
                                window.navigator.language = 'en_BE';
                                window.navigator.userLanguage = undefined;
                            });

                            it('with fallback to browser locale', function() {
                                goToPath('/');

                                expect($location.path()).toEqual('/en/');
                                //expect(dispatcher.persistent['i18n.locale']).toEqual('en');
                            });
                        });
                    });

                    describe('without fallback to browser locale', function () {
                        beforeEach(function () {
                            config.fallbackToBrowserLocale = false;
                        });

                        describe('and browser user language is supported', function() {
                            beforeEach(function() {
                                window.navigator.userLanguage = 'en_BE';
                            });

                            it('fall back to first supported locale', function() {
                                goToPath('/');

                                expect($location.path()).toEqual('/lang/');
                            });
                        });

                        describe('and browser language is supported', function() {
                            beforeEach(function() {
                                window.navigator.language = 'en_BE';
                            });

                            it('fall back to first supported locale', function() {
                                goToPath('/');

                                expect($location.path()).toEqual('/lang/');
                            });
                        });
                    });
                });

                describe('and no fallback to default locale', function () {
                    beforeEach(function() {
                        config.fallbackToDefaultLocale = false;
                    });

                    it('do not redirect', function () {
                        goToPath('/');

                        expect($location.path()).toEqual('/');
                    });
                });
            });
        });
    });

    describe('bin-link directive', function () {
        var element, scope, $rootScope, i18n, link, registry, topics, permitter, $compile, $q;
        var rendererOpenCalled, rendererArgs;

        beforeEach(inject(function (_$rootScope_, _i18n_, topicRegistryMock, topicMessageDispatcherMock,
                                    activeUserHasPermissionHelper, _$compile_, _$q_, i18nRendererInstaller) {
            i18n = _i18n_;
            i18n.resolve = function (args) {
                i18n.resolveArgsSpy = args;
                var deferred = $q.defer();
                deferred.resolve(args.default);
                return deferred.promise;
            };

            i18n.translate = function (args) {
                i18n.translateArgsSpy = args;
                var deferred = $q.defer();
                deferred.resolve('success');
                return deferred.promise;
            };

            $rootScope = _$rootScope_;
            registry = topicRegistryMock;
            topics = topicMessageDispatcherMock;
            permitter = activeUserHasPermissionHelper;
            $compile = _$compile_;
            $q = _$q_;

            link = {
                name: 'link',
                url: ''
            };

            rendererOpenCalled = false;
            rendererArgs = {};
            var renderer = {
                open: function (args) {
                    rendererOpenCalled = true;
                    rendererArgs = args;
                }
            };

            i18nRendererInstaller(renderer);
        }));

        function createElement(html) {
            element = angular.element(html);
            $compile(element)($rootScope);
            scope = element.scope();
            $rootScope.$digest();
        }

        describe('when no translation exists', function () {
            describe('and no default is given', function () {
                beforeEach(function () {
                    createElement('<bin-link code="code"></bin-link>');
                });

                it('get empty values', function () {
                    $rootScope.$digest();

                    expect(scope.link).toEqual(link);
                });
            });

            describe('and default is given', function () {
                beforeEach(function () {
                    link = {
                        name: 'default-name',
                        url: 'default-url'
                    };
                    createElement('<bin-link code="code" default-name="' + link.name + '" default-url="' + link.url + '"></bin-link>')
                });

                it('get empty values', function () {
                    $rootScope.$digest();

                    expect(scope.link).toEqual(link);
                });
            });
        });

        describe('when translation exists', function () {
            beforeEach(inject(function ($compile, $q) {
                link = {
                    name: 'link-name',
                    url: 'link-url'
                };

                i18n.resolve = function (scope) {
                    i18n.resolveArgsSpy = scope;
                    var deferred = $q.defer();
                    deferred.resolve(JSON.stringify(link));
                    return deferred.promise;
                };

                createElement('<bin-link code="code"></bin-link>');
                $rootScope.$digest();
            }));

            it('scope is passed to i18n service', function () {
                expect(i18n.resolveArgsSpy.code).toEqual('code');
            });

            it('get values', function () {
                expect(scope.link).toEqual(link);
            });

            describe('and locale is changed', function () {
                beforeEach(inject(function (sessionStorage) {
                    link = {
                        name: 'link-name-nl',
                        url: 'link-url-nl'
                    };
                    sessionStorage.locale = 'nl';
                    $rootScope.$digest();
                }));

                it('link is translated', function () {
                    expect(scope.link).toEqual(link);
                });
            });
        });

        describe('when translatable', function () {
            beforeEach(function () {
                link = {
                    name: 'link',
                    url: 'http://binarta.com'
                };

                createElement('<bin-link code="code"  default-url="http://binarta.com"></bin-link>');
            });

            describe('when edit.mode topic received', function () {
                beforeEach(function () {
                    registry['edit.mode'](true);
                });

                describe('and user has permission', function () {
                    beforeEach(function () {
                        permitter.yes();
                    });

                    it('with permission', function () {
                        expect(permitter.permission).toEqual('i18n.message.add');
                    });

                    describe('and element is clicked', function () {
                        beforeEach(function () {
                             element.triggerHandler('click');
                        });

                        it('renderer is opened', function () {
                            expect(rendererOpenCalled).toBeTruthy();
                            expect(rendererArgs).toEqual({
                                code: 'code',
                                translation: link,
                                editor: 'bin-link',
                                submit: jasmine.any(Function),
                                template: jasmine.any(String)
                            });
                        });

                        it('translation is a copy', function () {
                            scope.link.name = 'updated name';

                            expect(rendererArgs.translation.name).toEqual('link');
                        });

                        it('on submit', function () {
                            rendererArgs.submit(link);

                            expect(i18n.translateArgsSpy).toEqual({
                                code: 'code',
                                translation: JSON.stringify(link)
                            });
                        });

                        it('notification is sent', function () {var promise = rendererArgs.submit(link);
                            $rootScope.$digest();

                            expect(topics['link.updated']).toEqual({
                                code: 'code',
                                translation: JSON.stringify(link)
                            });
                        });
                    });
                });
            });
        });

        describe('when not translatable', function () {
            beforeEach(function () {
                createElement('<bin-link code="code" read-only></bin-link>');
            });

            describe('when edit.mode topic received', function () {
                beforeEach(function () {
                    registry['edit.mode'](true);
                });

                describe('and user has permission', function () {
                    beforeEach(function () {
                        permitter.yes();
                    });

                    it('with permission', function () {
                        expect(permitter.permission).toEqual('i18n.message.add');
                    });

                    describe('and element is clicked', function () {
                        beforeEach(function () {
                            element.triggerHandler('click');
                        });

                        it('renderer is not opened', function () {
                            expect(rendererOpenCalled).toBeFalsy();
                        });
                    });
                });
            });
        });

        describe('when link.updated topic received', function () {
            var updatedLink = {
                code: 'code',
                translation: JSON.stringify({
                    name: 'updated name',
                    url: 'updated url'
                })
            };

            beforeEach(function () {
                createElement('<bin-link code="code"></bin-link>');

                registry['link.updated']({
                    code: 'code',
                    translation: JSON.stringify(updatedLink)
                });
            });

            it('link is translated', function () {
                expect(scope.link).toEqual(updatedLink);
            });
        });
    });

    describe('i18n directive', function () {
        var directive, $rootScope, scope, resolver, registry, permitter, dispatcher, topics, locale;
        var attrs, rendererOpenCalled, rendererArgs;

        beforeEach(inject(function (activeUserHasPermission, activeUserHasPermissionHelper, topicMessageDispatcherMock,
                                    topicMessageDispatcher, topicRegistryMock, ngRegisterTopicHandler, _$rootScope_, $q) {
            attrs = {};
            permitter = activeUserHasPermissionHelper;
            $rootScope = _$rootScope_;
            scope = $rootScope.$new();
            scope.$apply = function(arg){};
            scope.$on = function (event, callback) {
                scope.on[event] = callback;
            };
            scope.on = {};
            scope.$parent = [];
            resolver = {
                resolve: function (args) {
                    var deferred = $q.defer();
                    resolver.args = args;
                    deferred.resolve('translation');
                    return deferred.promise;
                },
                translationMode: false,
                addListener: function (callback) {
                    resolver.listener = callback;
                },
                translate: function (args) {
                    resolver.translateArgsSpy = args;
                    var deferred = $q.defer();
                    deferred.resolve('success');
                    return deferred.promise;
                }
            };
            registry = topicRegistryMock;
            dispatcher = topicMessageDispatcher;
            topics = topicMessageDispatcherMock;

            var localeResolver = function () {
                return locale;
            };

            rendererOpenCalled = false;
            rendererArgs = {};
            var renderer = {
                open: function (args) {
                    rendererOpenCalled = true;
                    rendererArgs = args;
                }
            };

            directive = i18nDirectiveFactory(resolver, renderer, ngRegisterTopicHandler, activeUserHasPermission, dispatcher, localeResolver);

        }));

        it('restricted to', function () {
            expect(directive.restrict).toEqual(['E', 'A']);
        });

        it('scope', function () {
            expect(directive.scope).toEqual(true);
        });

        describe('when linked', function () {
            var bindClickEvent;
            var unbindClickEvent;
            var clickHandler;
            var element = {
                bind: function(event, handler){
                    bindClickEvent = event;
                    clickHandler = handler;
                },
                unbind: function(event) {
                    unbindClickEvent = event;
                }
            };

            beforeEach(function () {
                attrs.code = 'code';
                attrs.default = 'default';
                attrs.readOnly = undefined;
                scope.var = 'var';

                directive.link(scope, element, attrs);
            });

            it('initialize var on scope', function () {
                expect(scope.var).toBeUndefined();
            });

            describe('and attribute watch is triggered', function () {
                beforeEach(function () {
                    scope.$digest();
                });

                it('triggers message resolution', function () {
                    expect(resolver.args).toEqual({
                        code: 'code',
                        default: 'default'
                    });
                });

                it('with default locale', function () {
                    attrs.noLocale = '';
                    directive.link(scope, element, attrs);
                    scope.$digest();

                    expect(resolver.args).toEqual({
                        code: 'code',
                        default: 'default',
                        locale: 'default'
                    });
                });

                describe('and code is changed', function () {
                    beforeEach(function () {
                        resolver.args = {};
                        attrs.code = 'changed';
                        scope.$digest();
                    });

                    it('triggers message resolution', function () {
                        expect(resolver.args).toEqual({
                            code: 'changed',
                            default: 'default'
                        });
                    });
                });

                describe('and default is changed', function () {
                    beforeEach(function () {
                        resolver.args = {};
                        attrs.default = 'changed';
                        scope.$digest();
                    });

                    it('triggers message resolution', function () {
                        expect(resolver.args).toEqual({
                            code: 'code',
                            default: 'changed'
                        });
                    });
                });

                describe('and locale is changed', function () {
                    beforeEach(function () {
                        resolver.args = {};
                        locale = 'en';
                        scope.$digest();
                    });

                    it('triggers message resolution', function () {
                        expect(resolver.args).toEqual({
                            code: 'code',
                            default: 'default'
                        });
                    });
                });

                describe('and message resolution completes without var defined on attributes', function () {
                    it('exposes translation on scope', function () {
                        scope.$digest();
                        expect(scope.var).toEqual('translation');
                    });

                    it('does not exposes translation on parent scope', function () {
                        expect(scope.$parent[attrs.var]).toEqual(undefined);
                    });
                });

                describe('and message resolution completes with var defined on attributes', function () {
                    beforeEach(function () {
                        attrs.var = 'var';
                        directive.link(scope, element, attrs);
                        scope.$digest();
                    });

                    it('exposes translation on scope', function () {
                        expect(scope.var).toEqual('translation');
                    });

                    it('exposes translation on parent scope', function () {
                        expect(scope.$parent[attrs.var]).toEqual('translation');
                    });
                });

                describe('and received edit.mode enabled notification', function () {
                    beforeEach(function () {
                        registry['edit.mode'](true);
                    });

                    it('current scope should be passed to the permission check', function () {
                        expect(permitter.scope).toEqual(scope);
                    });

                    it('the directive should check if the active user has i18n.message.add permission', function () {
                        expect(permitter.permission).toEqual('i18n.message.add');
                    });

                    describe('and active user has i18n.message.add permission', function () {
                        beforeEach(function () {
                            permitter.yes();
                        });

                        describe('and element receives click event', function () {
                            it('linker calls open function', function() {
                                scope.var = 'var';

                                var clickResponse = clickHandler();

                                expect(clickResponse).toEqual(false);
                                expect(bindClickEvent).toEqual('click');
                                expect(rendererArgs.code).toEqual('code');
                                expect(rendererArgs.translation).toEqual(scope.var);
                            });
                        });

                        describe('and element is not translatable', function () {
                            beforeEach(function () {
                                attrs.readOnly = "";
                                bindClickEvent = undefined;
                                unbindClickEvent = undefined;
                                clickHandler = undefined;

                                directive.link(scope, element, attrs);
                                registry['edit.mode'](true);
                                permitter.yes();
                            });

                            it('click event is not bound', function () {
                                expect(bindClickEvent).toBeUndefined();
                                expect(clickHandler).toBeUndefined();
                            });
                        });
                    });

                    describe('and active user does not has i18n.message.add permission', function () {
                        beforeEach(function () {
                            permitter.no();
                        });

                        describe('and element is translatable', function () {
                            it('click event is unbound', function () {
                                expect(unbindClickEvent).toEqual('click');
                            });
                        });

                        describe('and element is not translatable', function () {
                            beforeEach(function () {
                                attrs.readOnly = "";
                                bindClickEvent = undefined;
                                unbindClickEvent = undefined;
                                clickHandler = undefined;

                                directive.link(scope, element, attrs);
                                registry['edit.mode'](true);
                                permitter.no();
                            });

                            it('should do nothing', function () {
                                expect(unbindClickEvent).toBeUndefined();
                            });
                        });
                    });
                });

                describe('and received edit.mode disabled notification', function () {
                    beforeEach(function () {
                        registry['edit.mode'](false);
                    });

                    describe('and active user has i18n.message.add permission', function () {
                        beforeEach(function () {
                            permitter.yes();
                        });

                        it('element should unbind click event', function () {
                            expect(unbindClickEvent).toEqual('click');
                        });
                    });
                });
            });
        });

        it('linker registers an open function', function () {
            attrs.code = 'code';
            directive.link(scope, null, attrs);
            scope.var = 'var';
            scope.open();
            expect(rendererArgs.code).toEqual('code');
            expect(rendererArgs.translation).toEqual(scope.var);
        });

        describe('on translation success', function () {
            beforeEach(function () {
                attrs.code = 'code';
                directive.link(scope, null, attrs);
                scope.$digest();
                scope.open();
                rendererArgs.submit('translation');
            });

            it('message is translated', function () {
                expect(resolver.translateArgsSpy).toEqual({
                    code: 'code',
                    translation: 'translation'
                });
            });

            it('raises i18n.updated notification', function () {
                scope.$digest();

                expect(topics['i18n.updated']).toEqual({
                    code: 'code',
                    translation: 'translation'
                });
            });

            describe('and received i18n.updated notification', function () {
                describe('and code matches', function () {
                    beforeEach(function () {
                        directive.link(scope, null, attrs);

                        registry['i18n.updated']({code: 'code', translation: 'foo'});
                    });

                    it('update translation', function() {
                        expect(scope.var).toEqual('foo');
                    });
                });

                describe('and code is different', function () {
                    beforeEach(function () {
                        attrs.code = 'code';
                        attrs.var = 'var';
                        directive.link(scope, null, attrs);
                        scope.var = 'translation';

                        registry['i18n.updated']({code: 'other.code', translation: 'foo'});
                    });

                    it('translation should not be altered', function() {
                        expect(scope.var).toEqual('translation');
                    });
                });
            });
        });

        describe('on translation success with custom locale', function () {
            beforeEach(function () {
                attrs.code = 'code';
                attrs.noLocale = '';
                directive.link(scope, null, attrs);
                scope.$digest();
                scope.open();
                rendererArgs.submit('translation');
            });

            it('message is translated', function () {
                expect(resolver.translateArgsSpy).toEqual({
                    code: 'code',
                    translation: 'translation',
                    locale: 'default'
                });
            });
        });
    });

    describe('i18n resolver', function () {
        var resolver, i18n, presenter, msg, $rootScope;

        beforeEach(inject(function ($q, _$rootScope_) {
            $rootScope = _$rootScope_;
            presenter = function (it) {
                msg = it;
            };
            i18n = {
                resolve: function (ctx) {
                    var deferred = $q.defer();
                    i18n.ctx = ctx;
                    deferred.resolve('message');
                    return deferred.promise;
                }
            };
            resolver = I18nResolverFactory(i18n);
        }));

        it('resolve', function () {
            resolver('context', presenter);
            $rootScope.$digest();

            expect(i18n.ctx).toEqual('context');
            expect(msg).toEqual('message');
        });
    });

    describe('SelectLocaleController', function () {
        var ctrl, scope, params, local, locale, topics;

        beforeEach(inject(function ($controller, topicMessageDispatcherMock, localStorage) {
            scope = {};
            params = {};
            local = localStorage;
            topics = topicMessageDispatcherMock;
            ctrl = $controller(SelectLocaleController, {$scope: scope, $routeParams: params});
        }));

        describe('when selecting a locale', function () {
            beforeEach(function () {
                locale = 'lang';
                scope.select(locale);
            });

            it('expose the active selection', function () {
                expect(scope.locale).toEqual(locale);
            });

            it('remember the selection', function () {
                expect(local.locale).toEqual(locale);
            });

            it('broadcast the selection', function () {
                expect(topics.persistent['i18n.locale']).toEqual(locale);
            });
        });

        describe('given a previous selection', function () {
            beforeEach(function () {
                locale = 'lang';
                local.locale = locale;
            });

            describe('on init', function () {
                beforeEach(function () {
                    scope.init();
                });

                it('activate the previous selection', function () {
                    expect(scope.locale).toEqual(locale);
                });
            });
        });

        describe('given locale is encoded in location path', function () {
            beforeEach(function () {
                locale = 'lang';
                params.locale = locale;
            });

            describe('on init', function () {
                beforeEach(function () {
                    scope.init();
                });

                it('then expose locale on scope', function () {
                    expect(scope.locale).toEqual(locale);
                });
            });
        });
    });

    describe('locale resolution', function() {
        var resolve, swap, localStorage, sessionStorage;

        beforeEach(inject(function(localeResolver, localeSwapper, _localStorage_, _sessionStorage_) {
            resolve = localeResolver;
            swap = localeSwapper;
            localStorage = _localStorage_;
            sessionStorage = _sessionStorage_;
        }));

        it('starts out undefined', function() {
            expect(resolve()).toEqual(undefined);
        });

        describe('when locale is specified in local storage', function() {
            beforeEach(function() {
                localStorage.locale = 'from-local-storage';
            });

            it('then resolves from local storage', function() {
                expect(resolve()).toEqual('from-local-storage');
            });

            describe('and locale is specified in session storage', function() {
                beforeEach(function() {
                    sessionStorage.locale = 'from-session-storage';
                });

                it('then resolves from session storage', function() {
                    expect(resolve()).toEqual('from-session-storage');
                });

                describe('and session storage is cleared', function () {
                    beforeEach(function () {
                        delete sessionStorage.locale
                    });

                    it('then resolves from local storage', function () {
                        expect(resolve()).toEqual('from-local-storage');
                    });
                });

                describe('and has previously been resolved', function () {
                    beforeEach(function () {
                        sessionStorage.locale = 'from-memory';
                        resolve();
                    });

                    describe('and session storage and local storage are cleared', function () {
                        beforeEach(function () {
                            delete sessionStorage.locale;
                            delete localStorage.locale;
                        });

                        it('then resolves to remembered locale', function () {
                            expect(resolve()).toEqual('from-memory');
                        });
                    });
                });
            });

            describe('and resolving from local storage', function() {
                beforeEach(function() {
                    resolve();
                });

                it('then local storage locale is promoted to session storage locale', inject(function(sessionStorage, localStorage) {
                    expect(sessionStorage.locale).toEqual(localStorage.locale);
                }));
            });
        });

        describe('when swapped locale', function() {
            var topics;

            beforeEach(inject(function(topicMessageDispatcherMock) {
                topics = topicMessageDispatcherMock;
                swap('swapped-locale');
            }));

            it('then locale is saved in local storage', function() {
                expect(localStorage.locale).toEqual('swapped-locale');
            });

            it('then locale is saved in session storage', function() {
                expect(sessionStorage.locale).toEqual('swapped-locale');
            });

            it('then broadcast the swap', function () {
                expect(topics.persistent['i18n.locale']).toEqual('swapped-locale');
            });
        });
    });

    describe('i18nLocation', function() {
        var location, target, session;

        beforeEach(inject(function(i18nLocation, $location, sessionStorage) {
            location = i18nLocation;
            target = $location;
            session = sessionStorage;
        }));

        it('search params fall through to $location', function() {
            location.search({a:'b'});
            expect(target.search()).toEqual({a:'b'});
        });

        it('path with no locale', function() {
            location.path('/');
            expect(target.path()).toEqual('/');
        });

        it('path with locale', function() {
            session.locale = 'en';
            location.path('/');
            expect(target.path()).toEqual('/en/');
        });

        it('path with default locale', function() {
            session.locale = 'default';
            location.path('/');
            expect(target.path()).toEqual('/');
        });
    });
});
