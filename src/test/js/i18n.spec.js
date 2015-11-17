describe('i18n', function () {
    var cache;

    angular.module('checkpoint', []);
    angular.module('toggle.edit.mode', [])
        .service('editMode', function () {
            this.bindEvent = jasmine.createSpy('bindEvent');
        });

    beforeEach(module('ngRoute'));
    beforeEach(module('i18n'));
    beforeEach(module('i18n.gateways'));
    beforeEach(module('angular.usecase.adapter'));
    beforeEach(module('notifications'));
    beforeEach(module('permissions'));
    beforeEach(module('web.storage'));
    beforeEach(module('config'));
    beforeEach(module('config.gateways'));

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

    beforeEach(inject(function ($cacheFactory) {
        cache = $cacheFactory.get('i18n');
    }));

    describe('on module loaded', function () {
        it('cache for i18n is created', inject(function ($cacheFactory) {
            expect($cacheFactory.get('i18n')).toBeDefined();
        }))
    });

    describe('i18n service', function () {
        var $rootScope, config, i18n, localStorage, publicConfigReader, publicConfigWriter, $location, $httpBackend;

        beforeEach(inject(function (_i18n_, _config_, _$rootScope_, _localStorage_, _publicConfigReader_, _publicConfigWriter_, _$location_, _$httpBackend_) {
            $rootScope = _$rootScope_;
            config = _config_;
            i18n = _i18n_;
            localStorage = _localStorage_;
            publicConfigReader = _publicConfigReader_;
            publicConfigWriter = _publicConfigWriter_;
            $location = _$location_;
            $httpBackend = _$httpBackend_;
        }));

        it('i18n service should be defined', function () {
            expect(i18n).toBeDefined();
        });

        describe('on translate', function () {
            var $rootScope, writer, context, usecaseAdapter;

            beforeEach(inject(function (_$rootScope_, i18nMessageWriter, usecaseAdapterFactory, $q) {
                $rootScope = _$rootScope_;
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

            describe('with default locale', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve('default');
                    i18n.getInternalLocale = function () {
                        return deferred.promise;
                    }
                }));

                describe('construct context', function () {
                    it('default', function () {
                        i18n.translate(context);
                        $rootScope.$digest();

                        expectContextEquals({
                            key: 'code',
                            message: 'translation',
                            locale: 'default'
                        });
                    });

                    it('with namespace', function () {
                        config.namespace = 'test';

                        i18n.translate(context);
                        $rootScope.$digest();

                        expectContextEquals({
                            key: 'code',
                            message: 'translation',
                            namespace: 'test',
                            locale: 'default'
                        });
                    });

                    it('with custom locale on context', function () {
                        context.locale = 'custom';

                        i18n.translate(context);
                        $rootScope.$digest();

                        expectContextEquals({
                            key: 'code',
                            message: 'translation',
                            locale: 'custom'
                        });
                    });
                });

                it('context is passed to usecaseAdapter', function () {
                    i18n.translate(context);
                    $rootScope.$digest();

                    expect(usecaseAdapter.calls[0].args[0]).toEqual(context);
                });

                describe('on success', function () {
                    it('default', function () {
                        i18n.translate(context);
                        $rootScope.$digest();
                        usecaseAdapter.calls[0].args[1]();

                        expect(cache.get('default:default:code')).toEqual('translation');
                    });

                    it('with namespace', function () {
                        config.namespace = 'N';

                        i18n.translate(context);
                        $rootScope.$digest();
                        usecaseAdapter.calls[0].args[1]();

                        expect(cache.get('N:default:code')).toEqual('translation');
                    });
                });
            });

            describe('with locale', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve('L');
                    i18n.getInternalLocale = function () {
                        return deferred.promise;
                    }
                }));

                it('with locale', function () {
                    i18n.translate(context);
                    $rootScope.$digest();

                    expectContextEquals({
                        key: 'code',
                        message: 'translation',
                        locale: 'L'
                    });
                });

                it('on success', function () {
                    localStorage.locale = 'L';

                    i18n.translate(context);
                    $rootScope.$digest();
                    usecaseAdapter.calls[0].args[1]();

                    expect(cache.get('default:L:code')).toEqual('translation');
                });

                it('with custom locale on context', function () {
                    context.locale = 'custom';

                    i18n.translate(context);
                    $rootScope.$digest();
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
            var receivedContext;
            var presenter = function (ctx) {
                receivedContext = ctx;
            };
            var context;
            var reader;

            beforeEach(inject(function (i18nMessageReader) {
                reader = i18nMessageReader;
            }));
            beforeEach(inject(function (topicRegistryMock, activeUserHasPermissionHelper) {
                receivedContext = {};
                context = {
                    useExtendedResponse: true,
                    code: code
                };
                registry = topicRegistryMock;
                permitter = activeUserHasPermissionHelper;
                config.namespace = 'namespace';
            }));

            function resolveTo(translation) {
                i18n.resolve(context).then(presenter);
                $rootScope.$digest();
                reader.calls[0].args[1](translation);
                $rootScope.$digest();
            }

            function failed() {
                i18n.resolve(context).then(presenter);
                $rootScope.$digest();
                reader.calls[0].args[2]();
                $rootScope.$digest();
            }

            describe('no supported languages', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve([]);
                    i18n.getSupportedLanguages = function () {
                        return deferred.promise;
                    }
                }));

                function expectContextEquals(ctx) {
                    expect(reader.calls[0].args[0]).toEqual(ctx);
                }

                it('on resolve construct context', function () {
                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();
                    expectContextEquals({
                        useExtendedResponse: true,
                        code: code,
                        locale: 'default',
                        namespace: 'namespace'
                    });
                });

                describe('legacy support for simple message response', function () {
                    beforeEach(function () {
                        context.useExtendedResponse = false;
                    });

                    it('resolve to translation', inject(function () {
                        i18n.resolve(context).then(presenter);
                        $rootScope.$digest();
                        reader.calls[0].args[1](translation);
                        $rootScope.$digest();

                        expect(receivedContext).toEqual(translation);
                        expect(cache.get('namespace:default:translation.code')).toEqual(translation);
                    }));
                });

                describe('when resolving a message for the first time', function () {
                    beforeEach(function () {
                        resolveTo(translation);
                    });

                    it('then namespace locale and code are embedded in cache key', function () {
                        expect(cache.get('namespace:default:translation.code')).toEqual(translation);
                    });

                    describe('and subsequent calls', function () {
                        beforeEach(function () {
                            reader.reset();
                            i18n.resolve(context, presenter);
                        });

                        it('then no gateway calls are done', function () {
                            expect(reader.calls[0]).toBeUndefined();
                            expect(receivedContext).toEqual({
                                translation: translation,
                                code: code,
                                locale: 'default'
                            });
                        });
                    });
                });

                it('resolve to translation', inject(function () {
                    resolveTo(translation);
                    expect(receivedContext).toEqual({
                        translation: translation,
                        code: code,
                        locale: 'default'
                    });
                    expect(cache.get('namespace:default:translation.code')).toEqual(translation);
                }));

                it('resolution fallback to default', function () {
                    context.code = code;
                    context.default = defaultTranslation;
                    resolveTo(unknownCode);
                    expect(receivedContext).toEqual({
                        translation: defaultTranslation,
                        code: code,
                        locale: 'default',
                        default: defaultTranslation
                    });
                    expect(cache.get('namespace:default:translation.code')).toEqual(defaultTranslation);
                });

                it('resolution fallback to empty default', function () {
                    context.code = code;
                    context.default = '';
                    resolveTo(unknownCode);
                    expect(receivedContext).toEqual({
                        translation: ' ',
                        code: code,
                        locale: 'default',
                        default: ''
                    });
                    expect(cache.get('namespace:default:translation.code')).toEqual(' ');
                });

                describe('resolution without fallback to default available', function () {
                    beforeEach(function () {
                        context.code = code;
                    });

                    describe('without metadata', function () {
                        it('use fallback text', function () {
                            i18n.resolve(context).then(presenter);
                            resolveTo(unknownCode);

                            expect(receivedContext).toEqual({
                                translation: 'place your text here',
                                code: code,
                                locale: 'default'
                            });
                            expect(cache.get('namespace:default:translation.code')).toEqual('place your text here');
                        });
                    });

                    describe('when using metadata as fallback', function () {
                        describe('and code is in metadata-app', function () {
                            beforeEach(function () {
                                var metadataApp = {
                                    'msgs': {
                                        'en': {
                                            'translation.code': 'translation from app metadata'
                                        }
                                    }
                                }, metadataSystem = {
                                    'msgs': {
                                        'en': {
                                            'unknown': 'translation from system metadata'
                                        }
                                    }
                                };

                                $httpBackend.expectGET('metadata-app.json').respond(metadataApp);
                                $httpBackend.expectGET('metadata-system.json').respond(metadataSystem);
                                config.defaultLocaleFromMetadata = 'en';
                            });

                            it('use translation from metadata', function () {
                                i18n.resolve(context).then(presenter);
                                resolveTo(unknownCode);
                                $httpBackend.flush();

                                expect(receivedContext).toEqual({
                                    translation: 'translation from app metadata',
                                    code: code,
                                    locale: 'default'
                                });
                                expect(cache.get('namespace:default:translation.code')).toEqual('translation from app metadata');
                            });
                        });

                        describe('and code is in metadata-system', function () {
                            beforeEach(function () {
                                var metadataApp = {
                                    'msgs': {
                                        'en': {
                                            'unknown': 'translation from app metadata'
                                        }
                                    }
                                }, metadataSystem = {
                                    'msgs': {
                                        'en': {
                                            'translation.code': 'translation from system metadata'
                                        }
                                    }
                                };

                                $httpBackend.expectGET('metadata-app.json').respond(metadataApp);
                                $httpBackend.expectGET('metadata-system.json').respond(metadataSystem);
                                config.defaultLocaleFromMetadata = 'en';
                            });

                            it('use translation from metadata', function () {
                                i18n.resolve(context).then(presenter);
                                resolveTo(unknownCode);
                                $httpBackend.flush();

                                expect(receivedContext).toEqual({
                                    translation: 'translation from system metadata',
                                    code: code,
                                    locale: 'default'
                                });
                                expect(cache.get('namespace:default:translation.code')).toEqual('translation from system metadata');
                            });
                        });

                        describe('and code is in neither', function () {
                            beforeEach(function () {
                                var metadata = {
                                    'msgs': {
                                        'en': {}
                                    }
                                };

                                $httpBackend.expectGET('metadata-app.json').respond(metadata);
                                $httpBackend.expectGET('metadata-system.json').respond(metadata);
                                config.defaultLocaleFromMetadata = 'en';
                            });

                            it('use translation from metadata', function () {
                                i18n.resolve(context).then(presenter);
                                resolveTo(unknownCode);
                                $httpBackend.flush();

                                expect(receivedContext).toEqual({
                                    translation: 'place your text here',
                                    code: code,
                                    locale: 'default'
                                });
                                expect(cache.get('namespace:default:translation.code')).toEqual('place your text here');
                            });
                        });
                    });
                });

                it('failed resolution fallback to default', function () {
                    context.default = defaultTranslation;
                    failed();
                    expect(receivedContext).toEqual({
                        translation: defaultTranslation,
                        code: code,
                        locale: 'default',
                        default: defaultTranslation
                    });
                });

                describe('when using a custom locale', function () {
                    beforeEach(function () {
                        context.locale = 'custom';
                    });

                    it('resolution includes the locale on context', function () {
                        resolveTo(translation);

                        expectContextEquals({
                            useExtendedResponse: true,
                            code: code,
                            locale: 'custom',
                            namespace: 'namespace'
                        });
                        expect(receivedContext).toEqual({
                            translation: translation,
                            code: code,
                            locale: 'custom'
                        });
                    });
                });
            });

            describe('with supported languages', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve('L');
                    i18n.getInternalLocale = function () {
                        return deferred.promise;
                    }
                }));

                it('resolve to translation', inject(function () {
                    resolveTo(translation);
                    expect(receivedContext).toEqual({
                        translation: translation,
                        code: code,
                        locale: 'L'
                    });
                    expect(cache.get('namespace:L:translation.code')).toEqual(translation);
                }));
            });
        });

        describe('get supported languages', function () {
            var languages;

            function execute() {
                i18n.getSupportedLanguages().then(function (l) {
                    languages = l;
                });
                $rootScope.$digest();
            }

            describe('no languages defined in publicConfig', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.reject();
                    publicConfigReader.andReturn(deferred.promise);
                }));

                it('and no languages in local config', function () {
                    execute();

                    expect(languages).toEqual([]);
                });

                it('and languages in local config', function () {
                    config.supportedLanguages = ['lang'];

                    execute();

                    expect(languages).toEqual(['lang']);
                });
            });

            describe('languages defined in publicConfig', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve({data: {value: '["en"]'}});
                    publicConfigReader.andReturn(deferred.promise);
                }));

                it('and no languages in local config', function () {
                    execute();

                    expect(publicConfigReader.calls[0].args[0]).toEqual({
                        key: 'supportedLanguages'
                    });
                    expect(languages).toEqual(['en']);
                    expect(config.supportedLanguages).toEqual(['en']);
                });

                it('and languages in local config', function () {
                    config.supportedLanguages = ['lang'];

                    execute();

                    expect(languages).toEqual(['en']);
                    expect(config.supportedLanguages).toEqual(['en']);
                });

                it('on multiple calls, same promise is returned', function () {
                    execute();
                    languages = undefined;
                    execute();

                    expect(publicConfigReader.callCount).toEqual(1);
                    expect(languages).toEqual(['en']);
                });
            });
        });

        describe('update supported languages', function () {
            beforeEach(inject(function ($q) {
                var deferred = $q.defer();
                deferred.resolve({data: {value: '["en"]'}});
                publicConfigReader.andReturn(deferred.promise);

                i18n.getSupportedLanguages();
            }));

            [
                {name: 'empty', value: []},
                {name: '["nl", "en"]', value: ["nl", "en"]}
            ].forEach(function (lang) {
                    describe('with languages equal to ' + lang.name, function () {
                        describe('without callback', function () {
                            beforeEach(function () {
                                i18n.updateSupportedLanguages(lang.value);
                            });

                            it('write to public config', function () {
                                expect(publicConfigWriter.calls[0].args[0]).toEqual({
                                    key: 'supportedLanguages',
                                    value: lang.value
                                });
                            });

                            describe('on success', function () {
                                beforeEach(function () {
                                    $rootScope.unlocalizedPath = '/path';
                                    publicConfigWriter.calls[0].args[1].success();
                                });

                                it('supported languages on config are updated', function () {
                                    expect(config.supportedLanguages).toEqual(lang.value);
                                });

                                it('reader returns updated languages', function () {
                                    i18n.getSupportedLanguages();
                                    $rootScope.$digest();

                                    expect(publicConfigReader.callCount).toEqual(2);
                                });
                            });
                        });

                        describe('with callback', function () {
                            var callback;

                            beforeEach(function () {
                                i18n.updateSupportedLanguages(lang.value, function () {
                                    callback = true;
                                });
                            });

                            describe('on success', function () {
                                beforeEach(function () {
                                    publicConfigWriter.calls[0].args[1].success();
                                });

                                it('callback is executed', function () {
                                    expect(callback).toBeTruthy();
                                });
                            });
                        });
                    });
                });
        });

        describe('get main language', function () {
            beforeEach(inject(function ($q) {
                var deferred = $q.defer();
                deferred.reject();
                publicConfigReader.andReturn(deferred.promise);
            }));

            describe('no languages', function () {
                beforeEach(function () {
                    config.supportedLanguages = [];
                });

                it('return nothing', function () {
                    var language;

                    i18n.getMainLanguage().then(function (lang) {
                        language = lang;
                    });
                    $rootScope.$digest();

                    expect(language).toBeUndefined();
                });
            });

            describe('with languages', function () {
                beforeEach(function () {
                    config.supportedLanguages = ['en', 'nl', 'fr'];
                });

                it('return first from list', function () {
                    var language;

                    i18n.getMainLanguage().then(function (lang) {
                        language = lang;
                    });
                    $rootScope.$digest();

                    expect(language).toEqual('en');
                });
            });
        });

        describe('get internal locale', function () {
            var locale;

            function changeRoute(route) {
                $location.path(route);
                $rootScope.$broadcast("$routeChangeStart");
            }

            beforeEach(function () {
                locale = undefined;
            });

            describe('when no multilanguage', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve([]);
                    i18n.getSupportedLanguages = function () {
                        return deferred.promise;
                    }
                }));

                it('should return default locale', function () {
                    i18n.getInternalLocale().then(function (l) {
                        locale = l
                    });
                    $rootScope.$digest();

                    expect(locale).toEqual('default');
                });
            });

            describe('with multilanguage', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve(['en', 'nl', 'fr']);
                    i18n.getSupportedLanguages = function () {
                        return deferred.promise;
                    }
                }));

                describe('and do not use default as main locale', function () {
                    beforeEach(function () {
                        config.useDefaultAsMainLocale = false;
                    });

                    describe('and main locale is in path', function () {
                        beforeEach(function () {
                            changeRoute('/en/some/path');
                        });

                        it('should return locale', function () {
                            i18n.getInternalLocale().then(function (l) {
                                locale = l
                            });
                            $rootScope.$digest();

                            expect(locale).toEqual('en');
                        });
                    });
                });

                describe('and use default as main locale', function () {
                    beforeEach(function () {
                        config.useDefaultAsMainLocale = true;
                    });

                    describe('and main locale is in path', function () {
                        beforeEach(function () {
                            changeRoute('/en/some/path');
                        });

                        it('should return default locale', function () {
                            i18n.getInternalLocale().then(function (l) {
                                locale = l
                            });
                            $rootScope.$digest();

                            expect(locale).toEqual('default');
                        });
                    });

                    describe('locale is not in path', function () {
                        beforeEach(function () {
                            changeRoute('/some/path');
                        });

                        it('should return default locale', function () {
                            i18n.getInternalLocale().then(function (l) {
                                locale = l
                            });
                            $rootScope.$digest();

                            expect(locale).toEqual('default');
                        });
                    });

                    describe('locale is in path', function () {
                        beforeEach(function () {
                            changeRoute('/nl/some/path');
                        });

                        it('should return locale', function () {
                            i18n.getInternalLocale().then(function (l) {
                                locale = l
                            });
                            $rootScope.$digest();

                            expect(locale).toEqual('nl');
                        });
                    });

                    it('on route change should return new locale', function () {
                        changeRoute('/nl/some/path');
                        i18n.getInternalLocale().then(function (l) {
                            locale = l
                        });
                        $rootScope.$digest();
                        changeRoute('/fr/some/path');
                        i18n.getInternalLocale().then(function (l) {
                            locale = l
                        });
                        $rootScope.$digest();

                        expect(locale).toEqual('fr');
                    });
                });
            });
        });

        describe('get external locale', function () {
            var locale, rejected;

            function changeRoute(route) {
                $location.path(route);
                $rootScope.$broadcast("$routeChangeStart");
            }

            function getExternalLocale() {
                locale = undefined;
                rejected = undefined;

                i18n.getExternalLocale().then(function (l) {
                    locale = l
                }, function () {
                    rejected = true;
                });
                $rootScope.$digest();
            }

            describe('when no multilanguage', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve([]);
                    i18n.getSupportedLanguages = function () {
                        return deferred.promise;
                    }
                }));

                it('should be rejected', function () {
                    getExternalLocale();

                    expect(locale).toEqual(undefined);
                    expect(rejected).toEqual(true);
                });
            });

            describe('with multilanguage', function () {
                beforeEach(inject(function ($q) {
                    var deferred = $q.defer();
                    deferred.resolve(['en', 'nl', 'fr']);
                    i18n.getSupportedLanguages = function () {
                        return deferred.promise;
                    }
                }));

                it('and locale is not in path should be rejected', function () {
                    changeRoute('/some/path');
                    getExternalLocale();

                    expect(locale).toEqual(undefined);
                    expect(rejected).toEqual(true);
                });

                it('and locale is in path should return locale', function () {
                    changeRoute('/en/some/path');
                    getExternalLocale();

                    expect(locale).toEqual('en');
                    expect(rejected).toBeUndefined();
                });

                it('on route change should return new locale', function () {
                    changeRoute('/nl/some/path');
                    getExternalLocale();
                    changeRoute('/fr/some/path');
                    getExternalLocale();

                    expect(locale).toEqual('fr');
                    expect(rejected).toBeUndefined();
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

        describe('open dialog modal', function () {
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
        var $rootScope, registry, dispatcher, local, session, $location, window, i18n;
        var code = 'message.code';
        var translation = 'message translation';
        var config;

        beforeEach(inject(function ($controller, topicRegistryMock, topicMessageDispatcherMock, localStorage, sessionStorage, _$rootScope_, _$location_, _config_, $window, _i18n_) {
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

            i18n = _i18n_;

            $controller(I18nSupportController);
        }));

        beforeEach(inject(function ($q, publicConfigReader) {
            var deferred = $q.defer();
            deferred.reject();
            publicConfigReader.andReturn(deferred.promise);
        }));

        function goToPath(path) {
            $location.path(path);
            $rootScope.$broadcast('$routeChangeStart', {params: {}});
            $rootScope.$digest();
        }

        it('no i18n.locale notification should be raised yet', function () {
            expect(dispatcher.persistent['i18n.locale']).toBeUndefined();
        });

        describe('when locale is remembered', function () {
            beforeEach(inject(function ($controller) {
                config.supportedLanguages = ['en'];
                local.locale = 'en';

                $controller(I18nSupportController);
                $rootScope.$digest();
            }));

            it('raise i18n.locale notification', function () {
                expect(dispatcher.persistent['i18n.locale']).toEqual('en');
            });
        });

        [
            {name: 'undefined', value: undefined},
            {name: 'empty', value: []}
        ].forEach(function (lang) {
                describe('when supportedLanguages is ' + lang.name, function () {
                    beforeEach(function () {
                        config.supportedLanguages = lang.value;
                    });

                    it('localePrefix is empty string', function () {
                        $rootScope.localePrefix = 'foo';

                        goToPath('/foo/bar');

                        expect($rootScope.localePrefix).toEqual('');
                    });

                    it('locale is empty string', function () {
                        $rootScope.locale = 'foo';

                        goToPath('/foo/bar');

                        expect($rootScope.locale).toEqual('');
                    });

                    it('main locale is empty string', function () {
                        goToPath('/foo/bar');

                        expect($rootScope.mainLocale).toEqual('');
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

                    it('with more than one path param, do not remove trailing slash', inject(function () {
                        goToPath('/foo/bar');

                        expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
                    }));

                    describe('and default locale is remembered', function () {
                        beforeEach(function () {
                            local.locale = 'default';
                            $rootScope.locale = 'previous';
                            $rootScope.localePrefix = '/previous';

                            goToPath('/foo/bar');
                        });

                        it('update unlocalized path', inject(function () {
                            expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
                        }));

                        it('locale is empty', function () {
                            expect($rootScope.locale).toEqual('');
                        });

                        it('locale prefix is empty', function () {
                            expect($rootScope.localePrefix).toEqual('');
                        });
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

                it('expose main locale on rootScope', function () {
                    expect($rootScope.mainLocale).toEqual(locale);
                });

                it('remember locale', function () {
                    expect(local.locale).toEqual(locale);
                });

                it('expose unlocalized path on scope', function () {
                    expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
                });

                it('broadcast locale', function () {
                    expect(dispatcher.persistent['i18n.locale']).toEqual(locale);
                });
            });

            it('when previously remembered do not broadcast again', function () {
                local.locale = locale;
                goToPath('/' + locale + '/foo/bar');

                expect(dispatcher.persistent['i18n.locale']).toBeUndefined();
            });

            describe('and use default locale as main locale', function () {
                beforeEach(function () {
                    config.useDefaultAsMainLocale = true;

                    goToPath('/' + locale + '/foo/bar');
                });

                it('expose locale on rootScope', function () {
                    expect($rootScope.locale).toEqual(locale);
                });

                it('expose localePrefix on rootScope', function () {
                    expect($rootScope.localePrefix).toEqual('/' + locale);
                });

                it('expose main locale on rootScope', function () {
                    expect($rootScope.mainLocale).toEqual(locale);
                });

                it('remember default locale', function () {
                    expect(local.locale).toEqual('default');
                });

                it('broadcast default locale', function () {
                    expect(dispatcher.persistent['i18n.locale']).toEqual('default');
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


                it('with more than one path param, do not remove trailing slash', function () {
                    goToPath('/foo/bar/');

                    expect($rootScope.unlocalizedPath).toEqual('/foo/bar/');
                });

                it('redirect to main locale', function () {
                    goToPath('/foo/bar');

                    expect($location.path()).toEqual('/lang/foo/bar');
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

                        it('and when no browser user language or browser language, fall back to main locale', function () {
                            window.navigator.language = undefined;
                            window.navigator.userLanguage = undefined;

                            goToPath('/');

                            expect($location.path()).toEqual('/lang/');
                        });

                        describe('and browser user language is supported', function () {
                            beforeEach(function () {
                                window.navigator.userLanguage = 'en_BE';
                            });

                            it('fallback to browser locale', function () {
                                goToPath('/');

                                expect($location.path()).toEqual('/en/');
                                expect(dispatcher.persistent['i18n.locale']).toEqual('en');
                            });
                        });

                        describe('and browser user language is not supported', function () {
                            beforeEach(function () {
                                window.navigator.userLanguage = 'un_SU';
                            });

                            it('fall back to main locale', inject(function () {
                                goToPath('/');

                                expect($location.path()).toEqual('/lang/');
                            }));
                        });

                        describe('and no browser user language with browser language', function () {
                            beforeEach(function () {
                                window.navigator.language = 'en_BE';
                                window.navigator.userLanguage = undefined;
                            });

                            it('with fallback to browser locale', function () {
                                goToPath('/');

                                expect($location.path()).toEqual('/en/');
                                expect(dispatcher.persistent['i18n.locale']).toEqual('en');
                            });
                        });
                    });

                    describe('without fallback to browser locale', function () {
                        beforeEach(function () {
                            config.fallbackToBrowserLocale = false;
                        });

                        describe('and browser user language is supported', function () {
                            beforeEach(function () {
                                window.navigator.userLanguage = 'en_BE';
                            });

                            it('fall back to first supported locale', function () {
                                goToPath('/');

                                expect($location.path()).toEqual('/lang/');
                            });
                        });

                        describe('and browser language is supported', function () {
                            beforeEach(function () {
                                window.navigator.language = 'en_BE';
                            });

                            it('fall back to first supported locale', function () {
                                goToPath('/');

                                expect($location.path()).toEqual('/lang/');
                            });
                        });
                    });
                });

                describe('and no fallback to default locale', function () {
                    beforeEach(function () {
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
        var rendererOpenCalled, rendererArgs, editMode;

        beforeEach(inject(function (_$rootScope_, _i18n_, topicRegistryMock, topicMessageDispatcherMock,
                                    activeUserHasPermissionHelper, _$compile_, _$q_, i18nRendererInstaller, _editMode_) {
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
            editMode = _editMode_;

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

            it('install editMode event binder', function () {
                expect(editMode.bindEvent).toHaveBeenCalledWith({
                    scope: scope,
                    element: element,
                    permission: 'i18n.message.add',
                    onClick: scope.open
                });
            });

            describe('and element is clicked', function () {
                beforeEach(function () {
                    editMode.bindEvent.calls[0].args[0].onClick();
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

                it('notification is sent', function () {
                    var promise = rendererArgs.submit(link);
                    $rootScope.$digest();

                    expect(topics['link.updated']).toEqual({
                        code: 'code',
                        translation: JSON.stringify(link)
                    });
                });
            });
        });

        describe('when not translatable', function () {
            beforeEach(function () {
                createElement('<bin-link code="code" read-only></bin-link>');
            });

            it('editMode event binder is not installed', function () {
                expect(editMode.bindEvent).not.toHaveBeenCalled();
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
        var directive, $rootScope, scope, resolver, registry, dispatcher, topics, locale;
        var attrs, rendererOpenCalled, rendererArgs, editMode;

        beforeEach(inject(function (activeUserHasPermission, activeUserHasPermissionHelper, topicMessageDispatcherMock,
                                    topicMessageDispatcher, topicRegistryMock, ngRegisterTopicHandler, _$rootScope_, $q,
                                    i18nRendererTemplate) {
            attrs = {};
            $rootScope = _$rootScope_;
            scope = $rootScope.$new();
            scope.$apply = function (arg) {
            };
            scope.$on = function (event, callback) {
                scope.on[event] = callback;
            };
            scope.on = {};
            scope.$parent = [];

            resolver = {
                resolve: function (args) {
                    var deferred = $q.defer();
                    resolver.args = args;
                    deferred.resolve(resolver.resolverResponse);
                    return deferred.promise;
                },
                resolverResponse: {
                    translation: 'translation',
                    code: 'code',
                    default: 'default',
                    locale: 'locale'
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
            editMode = jasmine.createSpyObj('editMode', ['bindEvent']);

            directive = i18nDirectiveFactory($rootScope, resolver, renderer, ngRegisterTopicHandler, editMode, dispatcher, localeResolver, i18nRendererTemplate);
        }));

        it('restricted to', function () {
            expect(directive.restrict).toEqual(['E', 'A']);
        });

        it('scope', function () {
            expect(directive.scope).toEqual(true);
        });

        describe('when linked', function () {
            var element = {};

            describe('and locale is still undefined', function () {
                beforeEach(function () {
                    attrs = {
                        code: 'code'
                    };
                    locale = undefined;

                    directive.link(scope, element, attrs);
                });

                describe('and attribute watch is triggered', function () {
                    beforeEach(function () {
                        scope.$digest();
                    });

                    it('should do nothing', function () {
                        expect(resolver.args).toBeUndefined();
                    });
                });
            });

            describe('and element is read-only', function () {
                beforeEach(function () {
                    attrs = {
                        code: 'code',
                        default: 'default',
                        readOnly: ''
                    };

                    directive.link(scope, element, attrs);
                });

                it('editMode event binder is not installed', function () {
                    expect(editMode.bindEvent).not.toHaveBeenCalled();
                });
            });

            describe('and element is not read-only', function () {
                beforeEach(function () {
                    attrs = {
                        code: 'code',
                        default: 'default'
                    };
                    scope.var = 'var';
                    locale = 'locale';

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
                            default: 'default',
                            locale: 'locale',
                            useExtendedResponse: true
                        });
                    });

                    it('with default locale', function () {
                        attrs.noLocale = '';
                        directive.link(scope, element, attrs);
                        scope.$digest();

                        expect(resolver.args).toEqual({
                            code: 'code',
                            default: 'default',
                            locale: 'default',
                            useExtendedResponse: true
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
                                default: 'default',
                                locale: 'locale',
                                useExtendedResponse: true
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
                                default: 'changed',
                                locale: 'locale',
                                useExtendedResponse: true
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
                                default: 'default',
                                locale: 'en',
                                useExtendedResponse: true
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

                    describe('and response does not match actual context', function () {
                        beforeEach(function () {
                            resolver.resolverResponse.code = 'other';

                            directive.link(scope, element, attrs);
                            scope.$digest();
                        });

                        it('do not put translation on scope', function () {
                            expect(scope.var).toBeUndefined();
                        });
                    });
                });

                it('install editMode event binder', function () {
                    expect(editMode.bindEvent).toHaveBeenCalledWith({
                        scope: scope,
                        element: element,
                        permission: 'i18n.message.add',
                        onClick: scope.open
                    });
                });

                it('linker registers an open function', function () {
                    attrs = {
                        code: 'code',
                        editor: 'editor'
                    };
                    directive.link(scope, null, attrs);
                    scope.var = 'var';
                    scope.open();
                    expect(rendererArgs.code).toEqual('code');
                    expect(rendererArgs.translation).toEqual('var');
                    expect(rendererArgs.editor).toEqual('editor');
                    expect(rendererArgs.submit).toEqual(jasmine.any(Function));
                    expect(rendererArgs.template).toEqual(jasmine.any(String));
                });

                describe('when element is a link', function () {
                    beforeEach(function () {
                        attrs.href = '#!/path/';
                        directive.link(scope, null, attrs);
                        scope.open();
                    });

                    it('pass href to renderer', function () {
                        expect(rendererArgs.href).toEqual('#!/path/');
                    });
                });

                describe('with main locale', function () {
                    beforeEach(function () {
                        $rootScope.mainLocale = 'main';
                    });

                    describe('when no multilingualism is supported', function () {
                        beforeEach(function () {
                            attrs = {
                                noLocale: ''
                            };
                        });

                        describe('and locale is default', function () {
                            beforeEach(function () {
                                locale = 'default';
                            });

                            it('should be editable', function () {
                                directive.link(scope, null, attrs);

                                expect(scope.isTranslatable()).toBeTruthy();
                            });
                        });

                        describe('or locale is main locale', function () {
                            beforeEach(function () {
                                locale = 'main';
                            });

                            it('should be editable', function () {
                                directive.link(scope, null, attrs);

                                expect(scope.isTranslatable()).toBeTruthy();
                            });
                        });

                        describe('and locale is not default and not main locale', function () {
                            beforeEach(function () {
                                locale = 'unknown';
                            });

                            it('should not be editable', function () {
                                directive.link(scope, null, attrs);

                                expect(scope.isTranslatable()).toBeFalsy();
                            });
                        });
                    });

                    describe('when multilingualism is supported', function () {
                        beforeEach(function () {
                            attrs = {};
                        });

                        ['default', 'main', 'unknown'].forEach(function (value) {
                            describe('and locale is ' + value, function () {
                                beforeEach(function () {
                                    locale = value;
                                });

                                it('should be editable', function () {
                                    directive.link(scope, null, attrs);

                                    expect(scope.isTranslatable()).toBeTruthy();
                                });
                            });
                        });
                    });
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

                            it('update translation', function () {
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

                            it('translation should not be altered', function () {
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
        });
    });

    describe('i18n language switcher directive', function () {
        var $rootScope, i18n, editMode, editModeRenderer, publicConfigWriter, directive, scope, element, config, $location, route, sessionStorage, activeUserHasPermission;

        beforeEach(inject(function (_$rootScope_, _i18n_, _config_, publicConfigReader, _publicConfigWriter_, $q, _$location_, _sessionStorage_) {
            var reader = $q.defer();
            reader.reject();
            publicConfigReader.andReturn(reader.promise);

            publicConfigWriter = _publicConfigWriter_;
            var writer = $q.defer();
            writer.resolve('["nl","en"]');
            publicConfigWriter.andReturn(writer.promise);

            $rootScope = _$rootScope_;
            scope = $rootScope.$new();
            element = {};
            i18n = _i18n_;
            config = _config_;
            $location = _$location_;
            editMode = jasmine.createSpyObj('editMode', ['bindEvent']);
            editModeRenderer = jasmine.createSpyObj('editModeRenderer', ['open', 'close']);
            route = jasmine.createSpyObj('$route', ['reload']);
            sessionStorage = _sessionStorage_;
            activeUserHasPermission = jasmine.createSpy('activeUserHasPermission');

            directive = I18nLanguageSwitcherDirective($rootScope, config, i18n, editMode, editModeRenderer, $location, route, activeUserHasPermission);
        }));

        describe('on link', function () {
            var dutch = {name: 'Dutch', code: 'nl'},
                english = {name: 'English', code: 'en'},
                french = {name: 'French', code: 'fr'},
                chinese = {name: 'Chinese', code: 'ch'},
                arabic = {name: 'Arabic', code: 'ar'};

            beforeEach(function () {
                config.languages = [dutch, french, english, chinese, arabic];
            });

            describe('when no supported languages', function () {
                beforeEach(function () {
                    config.supportedLanguages = [];

                    directive.link(scope, element);
                    scope.$digest();
                });

                it('supported languages on scope are empty', function () {
                    expect(scope.supportedLanguages).toEqual([]);
                });

                describe('no active language on scope', function () {
                    beforeEach(function () {
                        sessionStorage.locale = 'default';
                        scope.$digest();
                    });

                    it('initial', function () {
                        expect(scope.activeLanguage).toBeUndefined();
                    });
                });

                it('no active language name', function () {
                    $rootScope.locale = 'default';

                    expect(scope.getActiveLanguageName()).toBeUndefined();
                });
            });

            describe('when supported languages', function () {
                beforeEach(function () {
                    config.supportedLanguages = ['en', 'nl'];

                    directive.link(scope, element);
                    scope.$digest();
                });

                it('put supported languages on scope ordered by name', function () {
                    expect(scope.supportedLanguages).toEqual([dutch, english]);
                });

                it('install editMode event binder', function () {
                    expect(editMode.bindEvent).toHaveBeenCalledWith({
                        scope: scope,
                        element: element,
                        permission: 'config.store',
                        onClick: jasmine.any(Function)
                    });
                });

                describe('editMode event is triggered', function () {
                    beforeEach(function () {
                        editMode.bindEvent.calls[0].args[0].onClick();
                    });

                    describe('when user has no permission', function () {
                        beforeEach(function () {
                            activeUserHasPermission.calls[0].args[0].no();
                        });

                        it('editMode renderer is opened', function () {
                            expect(editModeRenderer.open).toHaveBeenCalledWith({
                                template: jasmine.any(String),
                                scope: jasmine.any(Object)
                            });
                        });

                        describe('with renderer scope', function () {
                            var rendererScope;

                            beforeEach(function () {
                                rendererScope = editModeRenderer.open.calls[0].args[0].scope;
                                scope.$digest();
                            });

                            it('on close', function () {
                                rendererScope.close();

                                expect(editModeRenderer.close).toHaveBeenCalled();
                            });
                        });
                    });


                    describe('and user has permission', function () {
                        beforeEach(function () {
                            activeUserHasPermission.calls[0].args[0].yes();
                        });

                        it('has i18n.config.update permission', function () {
                            expect(activeUserHasPermission.calls[0].args[1]).toEqual('i18n.config.update');
                        });

                        it('editMode renderer is opened', function () {
                            expect(editModeRenderer.open).toHaveBeenCalledWith({
                                template: jasmine.any(String),
                                scope: jasmine.any(Object)
                            });
                        });

                        describe('with renderer scope', function () {
                            var rendererScope;

                            beforeEach(function () {
                                rendererScope = editModeRenderer.open.calls[0].args[0].scope;
                                rendererScope.$digest();
                            });

                            it('copy supported languages to child scope ordered by main language and name', function () {
                                expect(rendererScope.languages).toEqual([english, dutch]);
                            });

                            it('languages that can be added are available on child scope', function () {
                                expect(rendererScope.availableLanguages).toEqual([arabic, chinese, french]);
                            });

                            it('set selected language to first one', function () {
                                expect(rendererScope.selectedLanguage).toEqual(arabic);
                            });

                            describe('on save', function () {
                                beforeEach(function () {
                                    $rootScope.unlocalizedPath = '/foo/bar';
                                });

                                describe('with no supported languages', function () {
                                    beforeEach(function () {
                                        rendererScope.remove(dutch);
                                        rendererScope.remove(english);
                                        rendererScope.save();
                                        publicConfigWriter.calls[0].args[1].success();
                                        scope.$digest();
                                    });

                                    it('write to public config', function () {
                                        expect(publicConfigWriter.calls[0].args[0]).toEqual({
                                            key: 'supportedLanguages',
                                            value: []
                                        });
                                    });

                                    it('update supported languages on scope', function () {
                                        expect(scope.supportedLanguages).toEqual([]);
                                    });

                                    it('redirect to unlocalized path', function () {
                                        expect($location.path()).toEqual('/foo/bar');
                                    });
                                });

                                describe('with supported languages', function () {
                                    beforeEach(function () {
                                        $location.path('/en/foo/bar');
                                        rendererScope.add(chinese);
                                        rendererScope.save();
                                        publicConfigWriter.calls[0].args[1].success();
                                        scope.$digest();
                                    });

                                    it('write to public config', function () {
                                        expect(publicConfigWriter.calls[0].args[0]).toEqual({
                                            key: 'supportedLanguages',
                                            value: ['en', 'ch', 'nl']
                                        });
                                    });

                                    it('editMode renderer is closed', function () {
                                        expect(editModeRenderer.close).toHaveBeenCalled();
                                    });

                                    it('update supported languages on scope ordered by name', function () {
                                        expect(scope.supportedLanguages).toEqual([chinese, dutch, english]);
                                    });

                                    it('reload route', function () {
                                        expect(route.reload).toHaveBeenCalled();
                                    });

                                    describe('and main locale changes', function () {
                                        beforeEach(function () {
                                            rendererScope.remove(dutch);
                                            rendererScope.remove(chinese);
                                            rendererScope.save();
                                            publicConfigWriter.calls[1].args[1].success();
                                            scope.$digest();
                                        });

                                        it('update supported languages on scope', function () {
                                            expect(scope.supportedLanguages).toEqual([english]);
                                        });

                                        it('redirect to new main language', function () {
                                            expect($location.path()).toEqual('/en/foo/bar');
                                        });
                                    });
                                });
                            });

                            describe('on remove', function () {
                                beforeEach(function () {
                                    rendererScope.remove(dutch);
                                });

                                it('remove language from supportedLanguages', function () {
                                    expect(rendererScope.languages).toEqual([english]);
                                });

                                it('add to languages', function () {
                                    expect(rendererScope.availableLanguages).toEqual([arabic, chinese, dutch, french]);
                                });

                                it('update selected language', function () {
                                    expect(rendererScope.selectedLanguage).toEqual(arabic);
                                });
                            });

                            describe('on add', function () {
                                beforeEach(function () {
                                    rendererScope.add(arabic);
                                });

                                it('add to supported languages ordered by main language', function () {
                                    expect(rendererScope.languages).toEqual([english, arabic, dutch]);
                                });

                                it('remove from languages', function () {
                                    expect(rendererScope.availableLanguages).toEqual([chinese, french]);
                                });

                                it('update selected language', function () {
                                    expect(rendererScope.selectedLanguage).toEqual(chinese);
                                });
                            });

                            it('on close', function () {
                                rendererScope.close();

                                expect(editModeRenderer.close).toHaveBeenCalled();
                            });
                        });
                    });
                });

                it('get active language name', function () {
                    $rootScope.locale = 'nl';

                    expect(scope.getActiveLanguageName()).toEqual('Dutch');
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

        beforeEach(inject(function ($rootScope, $controller, topicMessageDispatcherMock, localStorage, publicConfigReader, $q, config) {
            config.supportedLanguages = ['lang'];
            scope = $rootScope.$new();
            params = {};
            local = localStorage;
            topics = topicMessageDispatcherMock;

            var reader = $q.defer();
            reader.reject();
            publicConfigReader.andReturn(reader.promise);

            ctrl = $controller(SelectLocaleController, {$scope: scope, $routeParams: params});
        }));

        describe('when selecting a locale', function () {
            beforeEach(function () {
                locale = 'lang';
                scope.select(locale);
                scope.$digest();
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
                    scope.$digest();
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
                    scope.$digest();
                });

                it('then expose locale on scope', function () {
                    expect(scope.locale).toEqual(locale);
                });
            });
        });
    });

    describe('locale resolution', function () {
        var resolve, swap, localStorage, sessionStorage;

        beforeEach(inject(function (localeResolver, localeSwapper, _localStorage_, _sessionStorage_) {
            resolve = localeResolver;
            swap = localeSwapper;
            localStorage = _localStorage_;
            sessionStorage = _sessionStorage_;
        }));

        it('starts out undefined', function () {
            expect(resolve()).toEqual(undefined);
        });

        describe('when locale is specified in local storage', function () {
            beforeEach(function () {
                localStorage.locale = 'from-local-storage';
            });

            it('then resolves from local storage', function () {
                expect(resolve()).toEqual('from-local-storage');
            });

            describe('and locale is specified in session storage', function () {
                beforeEach(function () {
                    sessionStorage.locale = 'from-session-storage';
                });

                it('then resolves from session storage', function () {
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

            describe('and resolving from local storage', function () {
                beforeEach(function () {
                    resolve();
                });

                it('then local storage locale is promoted to session storage locale', inject(function (sessionStorage, localStorage) {
                    expect(sessionStorage.locale).toEqual(localStorage.locale);
                }));
            });
        });

        describe('when swapped locale', function () {
            var topics;

            beforeEach(inject(function (topicMessageDispatcherMock) {
                topics = topicMessageDispatcherMock;

                swap('swapped-locale');
            }));

            it('then locale is saved in local storage', function () {
                expect(localStorage.locale).toEqual('swapped-locale');
            });

            it('then locale is saved in session storage', function () {
                expect(sessionStorage.locale).toEqual('swapped-locale');
            });

            it('then broadcast the swap', function () {
                expect(topics.persistent['i18n.locale']).toEqual('swapped-locale');
            });
        });
    });

    describe('i18nLocation', function () {
        var location, target, session, i18n, $rootScope;

        beforeEach(inject(function (i18nLocation, $location, sessionStorage, _i18n_, _$rootScope_) {
            location = i18nLocation;
            target = $location;
            session = sessionStorage;
            i18n = _i18n_;
            $rootScope = _$rootScope_;
        }));

        it('search params fall through to $location', function () {
            location.search({a: 'b'});
            expect(target.search()).toEqual({a: 'b'});
        });

        it('path with no locale', function () {
            location.path('/');
            expect(target.path()).toEqual('/');
        });

        it('path with locale', function () {
            session.locale = 'en';
            location.path('/');
            expect(target.path()).toEqual('/en/');
        });

        it('path with default locale', function () {
            session.locale = 'default';
            location.path('/');
            expect(target.path()).toEqual('/');
        });

        describe('get unlocalized path', function () {
            beforeEach(inject(function ($q) {
                var deferred = $q.defer();
                deferred.resolve(['en', 'nl', 'fr']);
                i18n.getSupportedLanguages = function () {
                    return deferred.promise;
                }
            }));

            describe('and locale is in path', function () {
                beforeEach(function () {
                    target.path('/en/path');
                });

                it('return unlocalized path', function () {
                    var path;
                    location.unlocalizedPath().then(function (p) {
                        path = p;
                    });
                    $rootScope.$digest();

                    expect(path).toEqual('/path');
                });
            });

            describe('and locale is not in path', function () {
                beforeEach(function () {
                    target.path('/some/path');
                });

                it('return unlocalized path', function () {
                    var path;
                    location.unlocalizedPath().then(function (p) {
                        path = p;
                    });
                    $rootScope.$digest();

                    expect(path).toEqual('/some/path');
                });
            });

            describe('with one path param, remove trailing slash', function () {
                beforeEach(function () {
                    target.path('/path/');
                });

                it('return unlocalized path', function () {
                    var path;
                    location.unlocalizedPath().then(function (p) {
                        path = p;
                    });
                    $rootScope.$digest();

                    expect(path).toEqual('/path');
                });
            });
        });
    });

    describe('toLanguage filter', function () {
        var config, filter;

        beforeEach(inject(function (_config_, toLanguageNameFilter) {
            config = _config_;
            filter = toLanguageNameFilter;
        }));

        describe('with languages', function () {
            beforeEach(function () {
                config.languages = [
                    {code: 'en', name: 'English'}
                ];
            });

            it('should convert to language name', function () {
                expect(filter('en')).toEqual('English');
            });

            it('when unknown', function () {
                expect(filter('unknown')).toEqual('');
            });
        });

        it('no languages in config', function () {
            expect(filter('en')).toEqual('');
        });
    });
});
