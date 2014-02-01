describe('i18n', function () {
    beforeEach(module('i18n'));
    beforeEach(module('i18n.gateways'));
    beforeEach(module('angular.usecase.adapter'));
    beforeEach(module('notifications'));
    beforeEach(module('permissions'));
    beforeEach(module('web.storage'));

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

        beforeEach(inject(function(i18nMessageReader) {
            reader = i18nMessageReader;
        }));
        beforeEach(inject(function (i18n, localStorage, topicRegistryMock, i18nMessageReader, topicMessageDispatcher, activeUserHasPermission, activeUserHasPermissionHelper) {
            receivedTranslation = '';
            context = {};
            local = localStorage;
            registry = topicRegistryMock
            permitter = activeUserHasPermissionHelper;
            resolver = i18n;
        }));

        it('i18n service should be defined', function () {
            expect(resolver).toBeDefined();
        });

        it('subscribes for config.initialized notifications', function () {
            expect(registry['config.initialized']).toBeDefined();
        });

        function expectContextEquals(ctx) {
            expect(reader.calls[0].args[0]).toEqual(ctx);
        }

        it('on resolve construct context without namespace', function () {
            context.code = code;
            resolver.resolve(context, presenter);
            expectContextEquals({code:code});
        });

        describe('with config.initialized notification received', function () {
            var config = {
                namespace: 'namespace'
            };

            beforeEach(function () {
                registry['config.initialized'](config);
            });

            it('on resolve construct context with namespace', function () {
                context.code = code;
                resolver.resolve(context, presenter);
                expectContextEquals({code:code, namespace:config.namespace});
            });
        });

        describe('given translation code', function() {
            beforeEach(function() {
                context.code = code;
            });

            function resolveTo(translation) {
                resolver.resolve(context, presenter);
                reader.calls[0].args[1](translation);
            }

            function failed() {
                resolver.resolve(context, presenter);
                reader.calls[0].args[2]();
            }

            it('resolve to translation', function () {
                resolveTo(translation);
                expect(receivedTranslation).toEqual(translation);
            });

            it('resolution fallback to default', function () {
                context.code = code;
                context.default = defaultTranslation;
                resolveTo(unknownCode);
                expect(receivedTranslation).toEqual(defaultTranslation);
            });

            it('resolution without fallback to default available', function () {
                context.code = code;
                resolver.resolve(context, presenter);
                resolveTo(unknownCode);
                expect(receivedTranslation).toEqual('place your text here');
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
            ctrl = $controller(I18nSupportController, {$scope: scope, config: config});
        }));

        it('on init', function () {
            expect(ctrl.dialog.visibilityClass).toEqual('hide');
        });
        it('open dialog for editing', function () {
            ctrl.open(code, translation, presenter, editor);
            expect(ctrl.dialog.visibilityClass).toEqual('show');
            expect(ctrl.dialog.code).toEqual(code);
            expect(ctrl.dialog.translation).toEqual(translation);
            expect(ctrl.presenter).toEqual(presenter);
            expect(ctrl.dialog.editor).toEqual(editor);
        });
        it('on open dialog a renderer can be notified', function () {
            var valueToRender;
            ctrl.renderer = function (value) {
                valueToRender = value;
            };
            ctrl.open(code, translation, presenter);
            expect(valueToRender).toEqual(translation);
        });

        it('subscribes for config.initialized notifications', function () {
            expect(registry['config.initialized']).toBeDefined();
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

        describe('with config.initialized notification received', function () {
            beforeEach(function () {
                registry['config.initialized'](config);
            });

            describe('on translate with namespace', function() {
                beforeEach(function() {
                    ctrl.dialog.code = code;
                    ctrl.dialog.translation = translation;
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

            describe('on $routeChangeStart', function () {
                var params, locale;

                beforeEach(function () {
                    locale = 'lang';
                    params = {};
                });

                it('i18n.locale persistent message is cleared', function() {
                    dispatcher.persistent['i18n.locale'] = {};
                    scope.$routeChangeStart(null, {params: params});

                    expect(dispatcher.persistent['i18n.locale']).toBeUndefined();
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
                        params.locale = locale;
                        scope.$routeChangeSuccess(null, {params: params});
                    });

                    it('expose locale on scope', function () {
                        expect(scope.locale).toEqual(locale);
                    });

                    it('remember locale', function () {
                        expect(local.locale).toEqual(locale);
                    });

                    it('broadcast locale', function() {
                        expect(dispatcher.persistent['i18n.locale']).toEqual(locale);
                    });
                });

                describe('and remembered locale', function () {
                    beforeEach(function () {
                        local.locale = locale;
                        scope.$routeChangeSuccess(null, {params: params});
                    });

                    it('redirects to associated home page', inject(function ($location) {
                        expect($location.path()).toEqual('/' + locale + '/');
                    }));
                });

                it('and remembered locale and locale encoded in path match then notification is raised', function() {
                    params.locale = locale;
                    local.locale = locale;
                    scope.$routeChangeSuccess(null, {params: params});
                    expect(dispatcher.persistent['i18n.locale']).toEqual(locale);
                });

                it('and unlocalized path is on scope', inject(function ($location) {
                    params.locale = locale;
                    $location.path('/' + locale + '/foo/bar');

                    scope.$routeChangeSuccess(null, {params: params});

                    expect(scope.unlocalizedPath).toEqual('/foo/bar');
                }));

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

                        describe('without configured supported languages', function() {
                            beforeEach(function () {
                                config.supportedLanguages = null;

                                scope.$routeChangeSuccess(null, {params: params});
                            });

                            it('should broadcast default locale', function() {
                                expect(dispatcher.persistent['i18n.locale']).toEqual('default');
                            });
                        });

                        describe('without supported languages', function() {
                            beforeEach(function () {
                                config.supportedLanguages = [];

                                scope.$routeChangeSuccess(null, {params: params});
                            });

                            it('should broadcast default locale', function() {
                                expect(dispatcher.persistent['i18n.locale']).toEqual('default');
                            });
                        });

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
        });

        describe('on translate without namespace', function() {
            var adapterFactory;

            beforeEach(inject(function(usecaseAdapterFactory) {
                adapterFactory = usecaseAdapterFactory;
                ctrl.dialog.visibilityClass = '';
                ctrl.dialog.code = code;
                ctrl.dialog.translation = translation;
                ctrl.presenter = presenter;
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
                    expect(ctrl.dialog.visibilityClass).toEqual('hide');
                    expect(ctrl.dialog.code).toEqual('');
                    expect(ctrl.dialog.translation).toEqual('');
                    expect(ctrl.presenter).toEqual(null);
                });

                it('pass translation to presenter', function () {
                    expect(presenter.translation).toEqual(translation);
                });
            });
        });

        describe('on translate with editor', function() {
            beforeEach(function() {
                ctrl.editor = function () {
                    return translation;
                };
                ctrl.dialog.code = code;
                ctrl.presenter = presenter;
                ctrl.translate();
            });

            it('construct context', function () {
                expectContextEquals({key:code, message:translation, locale:'default'});
            });
        });

        it('close dialog', function () {
            ctrl.dialog.visibilityClass = '';
            ctrl.dialog.code = code;
            ctrl.dialog.translation = translation;
            ctrl.close();
            expect(ctrl.dialog.visibilityClass).toEqual('hide');
            expect(ctrl.dialog.code).toEqual('');
            expect(ctrl.dialog.translation).toEqual('');
            expect(ctrl.presenter).toEqual(null);
        });

        it('on checkpoint.signout notification close dialog', function () {
            ctrl.dialog.visibilityClass = '';
            ctrl.dialog.code = code;
            ctrl.dialog.translation = translation;
            registry['checkpoint.signout']();
            expect(ctrl.dialog.visibilityClass).toEqual('hide');
            expect(ctrl.dialog.code).toEqual('');
            expect(ctrl.dialog.translation).toEqual('');
            expect(ctrl.presenter).toEqual(null);
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
            expect(directive.controller).toEqual(['$scope', '$location', 'i18nMessageWriter', 'topicRegistry', 'topicMessageDispatcher', 'localStorage', 'usecaseAdapterFactory', 'config', I18nSupportController]);
        });
    });

    describe('i18n-default directive', function() {
        var directive, dispatcher;

        beforeEach(inject(function(localStorage, topicMessageDispatcher, topicMessageDispatcherMock) {
            dispatcher = topicMessageDispatcherMock;
            directive = I18nDefaultDirectiveFactory(localStorage, topicMessageDispatcher);
        }));

        it('restrict to class', function() {
            expect(directive.restrict).toEqual('C');
        });

        describe('on link', function() {
            beforeEach(function() {
                directive.link();
            });

            it('reset locale to default', inject(function(localStorage) {
                expect(localStorage.locale).toEqual('');
            }));
        });
    });

    describe('i18n directive', function () {
        var directive, scope, resolver, support, registry, permitter, dispatcher, topics;
        var attrs = [];

        beforeEach(inject(function (activeUserHasPermission, activeUserHasPermissionHelper, topicMessageDispatcherMock, topicMessageDispatcher, topicRegistryMock, topicRegistry) {
            permitter = activeUserHasPermissionHelper;
            scope = {
                $watch: function (expression, callback) {
                    scope.watches[expression] = callback;
                },
                watches: {},
                $apply: function(arg){},
                $on: function (event, callback) {
                    scope.on[event] = callback;
                },
                on: {}
            };
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

            directive = i18nDirectiveFactory(resolver, topicRegistry, activeUserHasPermission, dispatcher);

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
            var clickEvent;
            var clickHandler;
            var element = {
                bind: function(event, handler){
                    clickEvent = event;
                    clickHandler = handler;
                },
                unbind: function(event) {
                    clickEvent = event;
                }
            }

            beforeEach(function () {
                attrs.code = 'code';
                attrs.default = 'default';
                directive.link(scope, element, attrs, support);
            });

            it('code and default are available on scope', function () {
                expect(scope.code).toEqual('code');
                expect(scope.default).toEqual('default');
            });

            it('and scope listens to destroy event', function () {
                expect(scope.on['$destroy']).toBeDefined();
            });

            describe('and received edit.mode enabled notification', function () {
                beforeEach(function () {
                    registry['edit.mode'](true);
                });

                it('the directive should check if the active user has i18n.message.add permission', function () {
                    expect(permitter.permission).toEqual('i18n.message.add');
                });

                describe('and active user has i18n.message.add permission', function () {
                    beforeEach(function () {
                        permitter.yes();
                    });

                    it('the directive should enter translation mode', function () {
                        expect(scope.translating).toEqual(true);
                    });

                    describe('and element receives click event', function () {
                        it('linker calls translate function', function() {
                            scope.code = 'code';
                            scope.var = 'var';

                            clickHandler();

                            expect(clickEvent).toEqual('click');
                            expect(support.code).toEqual(scope.code);
                            expect(support.var).toEqual(scope.var);
                        });
                    });
                });

                describe('and translation mode active', function () {
                    beforeEach(function () {
                        scope.translating = true;
                    });

                    describe('and active user does not have i18n.message.add permission', function () {
                        beforeEach(function () {
                            permitter.no();
                        });

                        it('the directive should exit translation mode', function () {
                            expect(scope.translating).toEqual(false);
                        });
                    });
                });
            });

            describe('and translation mode active', function () {
                beforeEach(function () {
                    scope.translating = true;
                });

                describe('and received edit.mode disabled notification', function () {
                    beforeEach(function () {
                        registry['edit.mode'](false);
                    });

                    describe('and active user has i18n.message.add permission', function () {
                        beforeEach(function () {
                            permitter.yes();
                        });

                        it('the directive should exit translation mode', function () {
                            expect(scope.translating).toEqual(false);
                        });

                        it('element should unbind click event', function () {
                            expect(clickEvent).toEqual('click');
                        });
                    });

                    describe('and active user does not have i18n.message.add permission', function () {
                        beforeEach(function () {
                            permitter.no();
                        });

                        it('the directive should exit translation mode', function () {
                            expect(scope.translating).toEqual(false);
                        });
                    });
                });
            });

            it('no attribute change watch should be installed yet', function () {
                expect(scope.watches).toEqual({});
            });

            it('registers for app.start notifications', function () {
                expect(registry['app.start']).toBeDefined();
            });

            describe('and app.start notification received', function () {
                beforeEach(function () {
                    registry['app.start']();
                });

                it('should not install watch yet', function() {
                    expect(scope.watches['[code]']).toBeUndefined();
                });

                describe('and i18n.locale notification received', function () {
                    var locale;

                    beforeEach(function () {
                        locale = 'lang';
                        resolver.args = {};
                        registry['i18n.locale'](locale);
                    });

                    it('does not trigger message resolution', function () {
                        expect(resolver.args).toEqual({});
                    });

                    describe('and code is unknown', function () {
                        beforeEach(function () {
                            scope.code = undefined;
                            scope.watches['[code]']();
                        });

                        it('does not trigger message resolution', function () {
                            expect(resolver.args).toEqual({});
                        });
                    });

                    describe('and code is known', function () {
                        beforeEach(function () {
                            scope.code = 'code';
                        });

                        describe('and attribute change watch has triggered', function () {
                            beforeEach(function () {
                                scope.watches['[code]']();
                            });

                            it('triggers message resolution', function () {
                                expect(resolver.args).toEqual(scope);
                            });

                            describe('and message resolution completes without var defined on attributes', function () {
                                beforeEach(function () {
                                    resolver.callback('translation');
                                });

                                it('exposes translation on scope', function () {
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
                                    expect(scope.var).toEqual('translation');
                                });

                                it('exposes translation on parent scope', function () {
                                    expect(scope.$parent[attrs.var]).toEqual('translation');
                                });
                            });

                            describe('and any subsequent i18n.locale notifications', function () {
                                beforeEach(function () {
                                    locale = 'lang';
                                    resolver.args = {};
                                    scope.watches = {};
                                    registry['i18n.locale'](locale);
                                });

                                it('trigger message resolution', function () {
                                    expect(resolver.args).toEqual(scope);
                                });

                                it('should not re-install watches', function() {
                                    expect(scope.watches).toEqual({});
                                });
                            });
                        });

                    });
                });
            });

            describe('and scope is destroyed', function () {
                beforeEach(function () {
                    registry['i18n.locale'] = {};
                    scope.on['$destroy']();
                });

                it('should unsubscribe app.start', function () {
                    expect(registry['app.start']).toBeUndefined();
                });

                it('should unsubscribe edit.mode', function () {
                    expect(registry['edit.mode']).toBeUndefined();
                });

                it('should unsubscribe i18n.updated', function () {
                    expect(registry['i18n.updated']).toBeUndefined();
                });

                it('should unsubscribe i18n.locale', function () {
                    expect(registry['i18n.locale']).toBeUndefined();
                });
            });

        });

        it('linker exposes resolver translation mode on scope', function () {
            directive.link(scope, null, attrs);
            expect(scope.translating).toEqual(resolver.translationMode);
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

            describe('and var is defined on attributes', function () {
                beforeEach(function () {
                    attrs.var = 'var';
                    directive.link(scope, null, attrs, support);
                    scope.translate();
                    support.callback.success('translation');
                });

            });

            describe('and var is not defined on attributes', function () {
                beforeEach(function () {
                    attrs.var = undefined;
                    directive.link(scope, null, attrs, support);
                    scope.translate();
                    support.callback.success('translation');
                });

                it('raises i18n.updated notification', function () {
                    expect(topics['i18n.updated']).toEqual({
                        code: 'code',
                        translation: 'translation'
                    });
                });
            });

            describe('and received i18n.updated notification', function () {
                describe('and code matches', function () {
                    describe('and var is defined on attributes', function () {
                        beforeEach(function () {
                            scope.code = 'code';
                            scope.var = 'translation';
                            attrs.var = 'var';
                            directive.link(scope, null, attrs, support);

                            registry['i18n.updated']({code: 'code', translation: 'foo'});
                        });

                        it('update translation', function() {
                            expect(scope.var).toEqual('foo');
                            expect(scope.$parent[attrs.var]).toEqual('foo');
                        });
                    });

                    describe('and var is not defined on attributes', function () {
                        beforeEach(function () {
                            scope.code = 'code';
                            scope.var = 'translation';
                            attrs.var = undefined;
                            directive.link(scope, null, attrs, support);

                            registry['i18n.updated']({code: 'code', translation: 'foo'});
                        });

                        it('update translation', function() {
                            expect(scope.var).toEqual('foo');
                            expect(scope.$parent[attrs.var]).toEqual(undefined);
                        });
                    });
                });

                describe('and code is different', function () {
                    describe('and var is defined on attributes', function () {
                        beforeEach(function () {
                            scope.code = 'code';
                            scope.var = 'translation';
                            attrs.var = 'var';
                            scope.$parent[attrs.var] = scope.var;
                            directive.link(scope, null, attrs, support);

                            registry['i18n.updated']({code: 'other.code', translation: 'foo'});
                        });

                        it('translation should not be altered', function() {
                            expect(scope.var).toEqual(scope.var);
                            expect(scope.$parent[attrs.var]).toEqual(scope.var);
                        });
                    });

                    describe('and var is defined on attributes', function () {
                        beforeEach(function () {
                            scope.code = 'code';
                            scope.var = 'translation';
                            attrs.var = undefined;
                            directive.link(scope, null, attrs, support);

                            registry['i18n.updated']({code: 'other.code', translation: 'foo'});
                        });

                        it('translation should not be altered', function() {
                            expect(scope.var).toEqual(scope.var);
                            expect(scope.$parent[attrs.var]).toEqual(undefined);
                        });
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

    describe('i18n notifications', function () {
        var registry, notifications, resolver, permitter;

        beforeEach(inject(function (i18nMessageReader, topicMessageDispatcher, topicMessageDispatcherMock, activeUserHasPermission, activeUserHasPermissionHelper) {
            permitter = activeUserHasPermissionHelper;
            registry = {
                subscribe: function (topic, callback) {
                    registry[topic] = callback;
                }
            };
            resolver = new i18n(i18nMessageReader, registry, topicMessageDispatcher, activeUserHasPermission);
            notifications = topicMessageDispatcherMock;
        }));

        it('raise warning notification when edit mode true', function () {
            registry['edit.mode'](true);
            permitter.yes();

            expect(notifications['system.warning']).toEqual({
                code: 'i18n.active.warning',
                default: 'Edit mode enabled. Editable links are disabled.'
            });
            expect(permitter.permission).toEqual('i18n.message.add');
        });

        it('raise warning notification when edit mode true and permission is i18n.message.add', function () {
            registry['edit.mode'](true);
            permitter.yes();

            expect(notifications['system.warning']).toEqual({
                code: 'i18n.active.warning',
                default: 'Edit mode enabled. Editable links are disabled.'
            });
            expect(permitter.permission).toEqual('i18n.message.add');
        });

        it('raise info notification when edit mode false', function () {
            resolver.translationMode = true;

            registry['edit.mode'](false);
            permitter.yes();

            expect(notifications['system.info']).toEqual({
                code: 'i18n.inactive.info',
                default: 'Edit mode disabled.'
            });
        });

        it('on edit mode true and active user has no permission do nothing', function () {
            registry['edit.mode'](true);

            expect(notifications['system.warning']).toEqual(undefined);
        });
    });

    describe('SelectLocaleController', function () {
        var ctrl, scope, params, localStorage, locale, topics;

        beforeEach(inject(function ($controller, topicMessageDispatcherMock) {
            scope = {};
            params = {};
            localStorage = {};
            topics = topicMessageDispatcherMock;
            ctrl = $controller(SelectLocaleController, {$scope: scope, $routeParams: params, localStorage: localStorage});
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
                expect(localStorage.locale).toEqual(locale);
            });

            it('broadcast the selection', function () {
                expect(topics['i18n.locale']).toEqual(locale);
            });
        });

        describe('given a previous selection', function () {
            beforeEach(function () {
                locale = 'lang';
                localStorage.locale = locale;
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
});