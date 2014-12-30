describe('i18n', function () {
    var cache;

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

    describe('resolver', function () {
        var resolver, registry, permitter, local;
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
        var config;

        beforeEach(inject(function(i18nMessageReader) {
            reader = i18nMessageReader;
        }));
        beforeEach(inject(function (i18n, localStorage, topicRegistryMock, activeUserHasPermissionHelper, _config_) {
            config = _config_;
            receivedTranslation = '';
            context = {};
            local = localStorage;
            registry = topicRegistryMock;
            permitter = activeUserHasPermissionHelper;
            resolver = i18n;
        }));

        it('i18n service should be defined', function () {
            expect(resolver).toBeDefined();
        });

        function expectContextEquals(ctx) {
            expect(reader.calls[0].args[0]).toEqual(ctx);
        }

        it('on resolve construct context with namespace', function () {
            context.code = code;
            resolver.resolve(context, presenter);
            expectContextEquals({code:code, namespace:config.namespace});
        });

        function resolveTo(translation) {
            resolver.resolve(context, presenter);
            reader.calls[0].args[1](translation);
        }

        function failed() {
            resolver.resolve(context, presenter);
            reader.calls[0].args[2]();
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
                resolver.resolve(context, presenter);
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
                local.locale = locale;
            });

            it('resolution includes the locale on context', function () {
                resolver.resolve(context, presenter);
                expectContextEquals({locale:locale});
            });
        });

        describe('with namespace and locale', function() {
            beforeEach(function() {
                local.locale = 'L';
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
                        resolver.resolve(context, presenter);
                    });

                    it('then no gateway calls are done', function() {
                        expect(reader.calls[0]).toBeUndefined();
                    })
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
                expect(modal.open.mostRecentCall.args[0].controller).toEqual(jasmine.any(Function));
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
        var scope, ctrl, registry, dispatcher, local;
        var code = 'message.code';
        var translation = 'message translation';
        var presenter = {success: function (translation) {
            this.translation = translation
        }};
        var editor = 'basic';
        var writer;
        var config = {
            namespace: 'namespace'
        };
        var route = {};

        beforeEach(inject(function ($controller, topicRegistryMock, topicMessageDispatcherMock, localStorage, i18nMessageWriter) {
            writer = i18nMessageWriter;
            local = localStorage;
            scope = {
                $on: function (evt, cb) {
                    scope[evt] = cb;
                }
            };
            registry = topicRegistryMock;
            dispatcher = topicMessageDispatcherMock;

            route.routes = [];
            route.routes['/template/i18n-modal'] = {
                templateUrl: 'i18n-modal.html'
            };

            ctrl = $controller(I18nSupportController, {$scope: scope, config: config, $route: route});
        }));

        describe('on open', function () {
            var rendererOpenCalled;
            var rendererArgs;

            beforeEach(inject(function (i18nRendererInstaller) {
                rendererOpenCalled = false;
                rendererArgs = {};
                var renderer = {
                    open: function (args) {
                        rendererOpenCalled = true;
                        rendererArgs = args;
                    }
                };

                i18nRendererInstaller(renderer);

                ctrl.open(code, translation, presenter, editor);
            }));

            it('i18nRenderer.open is called', function () {
                 expect(rendererOpenCalled).toEqual(true);
            });

            it('args are passed to i18nRenderer', function () {
                expect(rendererArgs.translation).toEqual(translation);
                expect(rendererArgs.editor).toEqual(editor);
            });
        });

        it('no i18n.locale notification should be raised yet', function() {
            expect(dispatcher.persistent['i18n.locale']).toBeUndefined();
        });

        function expectContextEquals(ctx) {
            expect(writer.calls[0].args[0]).toEqual(ctx);
        }

        function expectPresenterProvided() {
            expect(writer.calls[0].args[1]).toEqual('presenter');
        }

        describe('on translate with namespace', function() {
            beforeEach(function() {
                scope.dialog = {
                    code: code,
                    translation: translation
                };
                ctrl.presenter = presenter;
                ctrl.translate();
            });

            it('construct context', function () {
                expectContextEquals({key:code, message:translation, namespace:config.namespace, locale:'default'});
            });

            it('construct presenter', function() {
                expectPresenterProvided();
            });
        });

        describe('on $routeChangeSuccess', function () {
            var params, locale;

            beforeEach(function () {
                locale = 'lang';
                params = {};
            });

            describe('and locale encoded in location path then', function () {
                beforeEach(function () {
                    config.supportedLanguages = ['lang'];
                });

                describe('and locale is supported', function () {
                    beforeEach(inject(function ($location) {
                        params.locale = locale;
                        $location.path('/' + locale + '/foo/bar');
                        scope.$routeChangeSuccess(null, {params: params});
                    }));

                    it('expose locale on scope', function () {
                        expect(scope.locale).toEqual(locale);
                    });

                    it('remember locale', function () {
                        expect(local.locale).toEqual(locale);
                    });

                    it('broadcast locale', function() {
                        expect(dispatcher.persistent['i18n.locale']).toEqual(locale);
                    });

                    it('expose unlocalized path on scope', function () {
                        expect(scope.unlocalizedPath).toEqual('/foo/bar');
                    });
                });

                describe('and locale is not supported', function () {
                    beforeEach(inject(function ($location) {
                        params.locale = 'unsupported';
                        $location.path('/unsupported' + '/foo/bar');
                        scope.$routeChangeSuccess(null, {params: params});
                    }));

                    it('redirect to default 404 page', inject(function ($location) {
                        expect($location.path()).toEqual('/lang/404');
                    }));
                });
            });

            describe('and locale not encoded in location path then', function () {
                beforeEach(inject(function ($location) {
                    locale = '';
                    params.locale = locale;
                    $location.path('/' + locale + '/foo/bar');
                    scope.$routeChangeSuccess(null, {params: params});
                }));

                it('unlocalized path is on scope', function () {
                    expect(scope.unlocalizedPath).toEqual('/foo/bar');
                })
            });

            describe('and remembered locale', function () {
                var redirectsTo;

                beforeEach(inject(function ($location) {
                    config.supportedLanguages = null;

                    redirectsTo = function(locale, path) {
                        local.locale = locale;
                        $location.path('/path');
                        scope.$routeChangeSuccess(null, {params: params});
                        expect($location.path()).toEqual(path + scope.unlocalizedPath);
                    };
                }));

                it('redirects to localized page', function () {
                    redirectsTo('lang', '/lang');
                });

                it('except when remembered locale is default', function() {
                    redirectsTo('default', '');
                });
            });

            describe('and no remembered locale or locale in path with configured supported languages', function() {
                beforeEach(function() {
                    locale.locale = null;
                    config.fallbackToBrowserLocale = true;
                });

                describe('and no browser user language or language', function() {
                    it('with supported languages', inject(function($location, topicMessageDispatcherMock) {
                        config.supportedLanguages = ['su'];

                        scope.$routeChangeSuccess(null, {params: params});

                        expect($location.path()).toEqual('/su/');
                        expect(topicMessageDispatcherMock.persistent['i18n.locale']).toEqual('su');
                    }));
                });

                describe('and browser user language', function() {
                    describe('with user language is supported', function() {
                        beforeEach(function() {
                            window.navigator.userLanguage = 'fr_FR';
                        });

                        it('with fallback to browser locale', inject(function($location, topicMessageDispatcherMock) {
                            config.supportedLanguages = ['nl', 'fr'];

                            scope.$routeChangeSuccess(null, {params: params});

                            expect($location.path()).toEqual('/fr/');
                            expect(topicMessageDispatcherMock.persistent['i18n.locale']).toEqual('fr');
                        }));

                        it('without fallback to browser locale', inject(function($location) {
                            config.supportedLanguages = ['su', 'en'];
                            config.fallbackToBrowserLocale = false;
                            window.navigator.userLanguage = 'en_US';

                            scope.$routeChangeSuccess(null, {params: params});

                            expect($location.path()).toEqual('/su/');
                        }));
                    });

                    describe('with user language is not supported', function() {
                        beforeEach(function() {
                            window.navigator.userLanguage = 'un_SU';
                        });

                        it('fall back to first supported language', inject(function($location, topicMessageDispatcherMock) {
                            config.supportedLanguages = ['su'];

                            scope.$routeChangeSuccess(null, {params: params});

                            expect($location.path()).toEqual('/su/');
                            expect(topicMessageDispatcherMock.persistent['i18n.locale']).toEqual('su');
                        }));
                    });
                });

                describe('and no browser user language with browser language', function() {
                    function browserLanguage() {
                        return window.navigator.language.substr(0, 2);
                    }
                    beforeEach(function() {
                        window.navigator.userLanguage = null;
                    });

                    it('with fallback to browser locale', inject(function($location, topicMessageDispatcherMock) {
                        config.supportedLanguages = ['nl', 'fr', browserLanguage()];

                        scope.$routeChangeSuccess(null, {params: params});

                        expect($location.path()).toEqual('/' + browserLanguage() + '/');
                        expect(topicMessageDispatcherMock.persistent['i18n.locale']).toEqual(browserLanguage());
                    }));

                    it('without fallback to browser locale', inject(function($location) {
                        config.supportedLanguages = ['su', browserLanguage()];
                        config.fallbackToBrowserLocale = false;

                        scope.$routeChangeSuccess(null, {params: params});

                        expect($location.path()).toEqual('/su/');
                    }));
                });

            });
        });

        describe('on translate without namespace', function() {
            var adapterFactory;

            beforeEach(inject(function(usecaseAdapterFactory) {
                config.namespace = undefined;
                adapterFactory = usecaseAdapterFactory;
                scope.dialog = {
                    code: code,
                    translation: translation
                };
                scope.presenter = presenter;
                ctrl.translate();
            }));

            it('pass scope to usecase adapter factory', function() {
                expect(adapterFactory.calls[0].args[0]).toEqual(scope);
            });

            it('construct context', function () {
                expectContextEquals({key:code, message:translation, locale:'default'});
            });

            describe('accepted', function() {
                beforeEach(function() {
                    adapterFactory.calls[0].args[1]();
                });

                it('reset', function () {
                    expect(scope.dialog.code).toEqual('');
                    expect(scope.dialog.translation).toEqual('');
                    expect(scope.presenter).toEqual(null);
                });

                it('pass translation to presenter', function () {
                    expect(presenter.translation).toEqual(translation);
                });

                it('store message in cache', function() {
                    expect(cache.get('default:default:message.code')).toEqual(translation);
                })
            });
        });

        it('close dialog', function () {
            scope.dialog.code = code;
            scope.dialog.translation = translation;
            ctrl.close();
            expect(scope.dialog.code).toEqual('');
            expect(scope.dialog.translation).toEqual('');
            expect(scope.presenter).toEqual(null);
        });

        it('on checkpoint.signout notification close dialog', function () {
            scope.dialog.code = code;
            scope.dialog.translation = translation;
            registry['checkpoint.signout']();
            expect(scope.dialog.code).toEqual('');
            expect(scope.dialog.translation).toEqual('');
            expect(scope.presenter).toEqual(null);
        });

        describe('given a previously selected locale', function () {
            var locale;

            beforeEach(function () {
                locale = 'lang';
                local.locale = locale;
            });

            it('pass locale on context to writer', function () {
                ctrl.presenter = presenter;
                ctrl.translate();
                expectContextEquals({key:'', message:'', locale:locale});
            });
        });
    });

    describe('i18n support directive', function () {
        var directive, scope, resolver, support;

        beforeEach(function () {
            scope = {};
            directive = i18nSupportDirectiveFactory();
        });

        it('restricted to', function () {
            expect(directive.restrict).toEqual('C');
        });

        it('controller', function () {
            expect(directive.controller).toEqual(['$scope', '$location', 'i18nMessageWriter', 'topicRegistry',
                'usecaseAdapterFactory', 'localeResolver', 'localeSwapper', 'config', '$cacheFactory', 'i18nRenderer', I18nSupportController]);
        });
    });

    describe('i18n-default directive', function() {
        var directive, dispatcher;

        beforeEach(inject(function(topicMessageDispatcherMock, localeSwapper) {
            dispatcher = topicMessageDispatcherMock
            directive = I18nDefaultDirectiveFactory(localeSwapper);
        }));

        it('restrict to class', function() {
            expect(directive.restrict).toEqual('C');
        });

        describe('on link', function() {
            beforeEach(function() {
                directive.link();
            });

            it('reset locale to default', inject(function(localStorage) {
                expect(localStorage.locale).toEqual('default');
            }));
        });
    });

    describe('i18n directive', function () {
        var directive, scope, resolver, support, registry, permitter, dispatcher, topics, locale;
        var attrs;
        var $qWrapper, deferred;

        beforeEach(inject(function (activeUserHasPermission, activeUserHasPermissionHelper, topicMessageDispatcherMock,
                                    topicMessageDispatcher, topicRegistryMock, ngRegisterTopicHandler, $rootScope, $q) {
            attrs = {};
            permitter = activeUserHasPermissionHelper;
            scope = $rootScope.$new();
            scope.$apply = function(arg){};
            scope.$on = function (event, callback) {
                scope.on[event] = callback;
            };
            scope.on = {};
            scope.$parent = [];
            resolver = {
                resolve: function (args, callback) {
                    resolver.args = args;
                    resolver.callback = callback;
                },
                translationMode: false,
                addListener: function (callback) {
                    resolver.listener = callback;
                }
            };
            support = {
                open: function (code, target, callback) {
                    support.code = code;
                    support.var = target;
                    support.callback = callback;
                }
            };
            registry = topicRegistryMock;
            dispatcher = topicMessageDispatcher;
            topics = topicMessageDispatcherMock;

            var localeResolver = function () {
                return locale;
            };
            $qWrapper = {
                defer: function() {
                    deferred = $q.defer();
                    return  deferred;
                }
            };
            directive = i18nDirectiveFactory(resolver, ngRegisterTopicHandler, activeUserHasPermission, dispatcher, localeResolver, $qWrapper);

        }));

        it('require', function () {
            expect(directive.require).toEqual('^i18nSupport');
        });

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
                scope.code = 'code';
                scope.default = 'default';

                directive.link(scope, element, attrs, support);
            });

            it('initialize scope values', function () {
                expect(scope.var).toBeUndefined();
                expect(scope.code).toBeUndefined();
                expect(scope.default).toBeUndefined();
            });

            describe('and attribute watch is triggered', function () {
                beforeEach(function () {
                    scope.$digest();
                });

                it('code and default are available on scope', function () {
                    expect(scope.code).toEqual('code');
                    expect(scope.default).toEqual('default');
                });

                it('triggers message resolution', function () {
                    expect(resolver.args).toEqual(scope);
                });

                it('a deferred callback was initialized', function() {
                    expect(deferred).toBeDefined();
                });

                describe('and code is changed', function () {
                    beforeEach(function () {
                        resolver.args = {};
                        attrs.code = 'changed';
                        scope.$digest();
                    });

                    it('triggers message resolution', function () {
                        expect(resolver.args).toEqual(scope);
                    });
                });

                describe('and default is changed', function () {
                    beforeEach(function () {
                        resolver.args = {};
                        attrs.default = 'changed';
                        scope.$digest();
                    });

                    it('triggers message resolution', function () {
                        expect(resolver.args).toEqual(scope);
                    });
                });

                describe('and locale is changed', function () {
                    beforeEach(function () {
                        resolver.args = {};
                        locale = 'en';
                        scope.$digest();
                    });

                    it('triggers message resolution', function () {
                        expect(resolver.args).toEqual(scope);
                    });
                });

                describe('and message resolution completes without var defined on attributes', function () {
                    beforeEach(function () {
                        resolver.callback('translation');
                    });

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
                        resolver.callback('translation');
                    });

                    it('exposes translation on scope', function () {
                        scope.$digest();
                        expect(scope.var).toEqual('translation');
                    });

                    it('exposes translation on parent scope', function () {
                        scope.$digest();
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
                            it('linker calls translate function', function() {
                                scope.code = 'code';
                                scope.var = 'var';

                                clickHandler();

                                expect(bindClickEvent).toEqual('click');
                                expect(support.code).toEqual(scope.code);
                                expect(support.var).toEqual(scope.var);
                            });
                        });

                        describe('and element is not translatable', function () {
                            beforeEach(function () {
                                attrs.readOnly = "";
                                bindClickEvent = undefined;
                                unbindClickEvent = undefined;
                                clickHandler = undefined;

                                directive.link(scope, element, attrs, support);
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

                                directive.link(scope, element, attrs, support);
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

        it('linker registers a translate function', function () {
            directive.link(scope, null, attrs, support);
            scope.code = 'code';
            scope.var = 'var';
            scope.translate();
            expect(support.code).toEqual(scope.code);
            expect(support.var).toEqual(scope.var);
        });

        describe('on translation success', function () {
            beforeEach(function () {
                attrs.code = 'code';
                directive.link(scope, null, attrs, support);
                scope.$digest();
                scope.translate();
                support.callback.success('translation');
            });

            it('raises i18n.updated notification', function () {
                expect(topics['i18n.updated']).toEqual({
                    code: 'code',
                    translation: 'translation'
                });
            });

            describe('and received i18n.updated notification', function () {
                describe('and code matches', function () {
                    beforeEach(function () {
                        directive.link(scope, null, attrs, support);
                        scope.code = 'code';

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
                        directive.link(scope, null, attrs, support);
                        scope.var = 'translation';

                        registry['i18n.updated']({code: 'other.code', translation: 'foo'});
                    });

                    it('translation should not be altered', function() {
                        expect(scope.var).toEqual('translation');
                    });
                });
            });
        });
    });

    describe('i18n resolver', function () {
        var resolver, i18n, presenter, msg;

        beforeEach(function () {
            presenter = function (it) {
                msg = it;
            };
            i18n = {resolve: function (ctx, presenter) {
                i18n.ctx = ctx;
                i18n.presenter = presenter;
            }};
            resolver = I18nResolverFactory(i18n);
        });

        it('resolve', function () {
            resolver('context', presenter);
            i18n.presenter('message');
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
        var resolve, swap;

        beforeEach(inject(function(localeResolver, localeSwapper) {
            resolve = localeResolver;
            swap = localeSwapper;
        }));

        it('starts out undefined', function() {
            expect(resolve()).toEqual(undefined);
        });

        describe('when locale is specified in local storage', function() {
            beforeEach(inject(function(localStorage) {
                localStorage.locale = 'from-local-storage';
            }));

            it('then resolves from local storage', function() {
                expect(resolve()).toEqual('from-local-storage');
            });

            describe('and locale is specified in session storage', function() {
                beforeEach(inject(function(sessionStorage) {
                    sessionStorage.locale = 'from-session-storage';
                }));

                it('then resolves from session storage', function() {
                    expect(resolve()).toEqual('from-session-storage');
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

            it('then locale is saved in local storage', inject(function(localStorage) {
                expect(localStorage.locale).toEqual('swapped-locale');
            }));

            it('then locale is saved in session storage', inject(function(sessionStorage) {
                expect(sessionStorage.locale).toEqual('swapped-locale');
            }));

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
