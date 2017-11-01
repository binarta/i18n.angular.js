describe('i18n', function () {
    var cache, binarta;

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

    beforeEach(inject(function ($cacheFactory, _binarta_) {
        cache = $cacheFactory.get('i18n');
        binarta = _binarta_;
        binarta.application.gateway.now = moment(new Date());
        triggerBinartaSchedule();
    }));

    afterEach(function () {
        sessionStorage.clear();
        if (binarta.application.gateway.clear)
            binarta.application.gateway.clear();
    });

    function triggerBinartaSchedule() {
        binarta.application.adhesiveReading.read();
    }

    describe('on module loaded', function () {
        it('cache for i18n is created', inject(function ($cacheFactory) {
            expect($cacheFactory.get('i18n')).toBeDefined();
        }))
    });

    describe('i18n service', function () {
        var $rootScope, config, i18n, localStorage, publicConfigReader, publicConfigWriter, $location, $httpBackend, i18nMessageReader,
            now;

        beforeEach(inject(function (_i18n_, _config_, _$rootScope_, _localStorage_, _publicConfigReader_, _publicConfigWriter_, _$location_, _$httpBackend_, _i18nMessageReader_) {
            now = new Date();
            $rootScope = _$rootScope_;
            config = _config_;
            i18n = _i18n_;
            localStorage = _localStorage_;
            publicConfigReader = _publicConfigReader_;
            publicConfigWriter = _publicConfigWriter_;
            $location = _$location_;
            $httpBackend = _$httpBackend_;
            i18nMessageReader = _i18nMessageReader_;
            i18n.timeline = [now];
        }));

        it('i18n service should be defined', function () {
            expect(i18n).toBeDefined();
        });

        describe('on translate', function () {
            var $rootScope, writer, context, usecaseAdapter, topics;

            beforeEach(inject(function (_$rootScope_, i18nMessageWriter, usecaseAdapterFactory, $q, topicMessageDispatcherMock) {
                $rootScope = _$rootScope_;
                writer = i18nMessageWriter;
                usecaseAdapter = usecaseAdapterFactory;
                context = {
                    code: 'code',
                    translation: 'translation'
                };
                topics = topicMessageDispatcherMock;
            }));

            function expectContextEquals(ctx) {
                expect(writer.calls.first().args[0]).toEqual(ctx);
            }

            function expectTopicsMessageDispatcherToFire() {
                it('raises i18n.updated notification', function () {
                    i18n.translate(context);
                    $rootScope.$digest();
                    usecaseAdapter.calls.first().args[1]();

                    expect(topics['i18n.updated']).toEqual({
                        code: 'code',
                        translation: 'translation'
                    });
                });
            }

            describe('with default locale and no supported languages', function () {
                beforeEach(inject(function ($q) {
                    binarta.application.gateway.updateApplicationProfile({supportedLanguages: []});
                    binarta.application.refresh();
                    binarta.application.setLocaleForPresentation(undefined);
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

                    expect(usecaseAdapter.calls.first().args[0]).toEqual(context);
                });

                describe('on success', function () {
                    it('with default namespace', function () {
                        i18n.translate(context);
                        $rootScope.$digest();
                        usecaseAdapter.calls.first().args[1]();

                        expect(cache.get('default:default:code')).toBeUndefined();
                        var translation = JSON.parse(sessionStorage.getItem('binarta:i18n:default:default:code'));
                        expect(moment(translation.timestamp, 'YYYYMMDDHHmmssSSSZ').toDate()).toEqual(now);
                        expect(translation.value).toEqual('translation');
                    });

                    it('with namespace', function () {
                        config.namespace = 'N';

                        i18n.translate(context);
                        $rootScope.$digest();
                        usecaseAdapter.calls.first().args[1]();

                        var translation = JSON.parse(sessionStorage.getItem('binarta:i18n:N:default:code'));
                        expect(moment(translation.timestamp, 'YYYYMMDDHHmmssSSSZ').toDate()).toEqual(now);
                        expect(translation.value).toEqual('translation');
                    });
                });
            });

            describe('with default locale and a single supported language', function () {

                beforeEach(inject(function ($q) {
                    binarta.application.gateway.updateApplicationProfile({supportedLanguages: ['en']});
                    binarta.application.refresh();
                    binarta.application.setLocaleForPresentation('en');
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

                    expect(usecaseAdapter.calls.first().args[0]).toEqual(context);
                });

                describe('on success', function () {
                    it('with default namespace', function () {
                        i18n.translate(context);
                        $rootScope.$digest();
                        usecaseAdapter.calls.first().args[1]();

                        var translation = JSON.parse(sessionStorage.getItem('binarta:i18n:default:en:code'));
                        expect(moment(translation.timestamp, 'YYYYMMDDHHmmssSSSZ').toDate()).toEqual(now);
                        expect(translation.value).toEqual('translation');
                    });

                    it('with namespace', function () {
                        config.namespace = 'N';

                        i18n.translate(context);
                        $rootScope.$digest();
                        usecaseAdapter.calls.first().args[1]();

                        var translation = JSON.parse(sessionStorage.getItem('binarta:i18n:N:en:code'));
                        expect(moment(translation.timestamp, 'YYYYMMDDHHmmssSSSZ').toDate()).toEqual(now);
                        expect(translation.value).toEqual('translation');
                    });

                    expectTopicsMessageDispatcherToFire();
                });
            });

            describe('with locale and multiple supported languages', function () {
                beforeEach(inject(function ($q) {
                    binarta.application.gateway.updateApplicationProfile({supportedLanguages: ['en', 'L']});
                    binarta.application.refresh();
                    binarta.application.setLocaleForPresentation('L');
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

                describe('on success', function () {
                    it('translation is available', function () {
                        localStorage.locale = 'L';

                        i18n.translate(context);
                        $rootScope.$digest();
                        usecaseAdapter.calls.first().args[1]();

                        var translation = JSON.parse(sessionStorage.getItem('binarta:i18n:default:L:code'));
                        expect(moment(translation.timestamp, 'YYYYMMDDHHmmssSSSZ').toDate()).toEqual(now);
                        expect(translation.value).toEqual('translation');
                    });

                    expectTopicsMessageDispatcherToFire();
                });

                it('with custom locale on context', function () {
                    context.locale = 'custom';

                    i18n.translate(context);
                    $rootScope.$digest();
                    usecaseAdapter.calls.first().args[1]();

                    var translation = JSON.parse(sessionStorage.getItem('binarta:i18n:default:custom:code'));
                    expect(moment(translation.timestamp, 'YYYYMMDDHHmmssSSSZ').toDate()).toEqual(now);
                    expect(translation.value).toEqual('translation');
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
                reader.calls.first().args[1](translation);
                $rootScope.$digest();
            }

            function failed() {
                i18n.resolve(context).then(presenter);
                $rootScope.$digest();
                reader.calls.first().args[2]();
                $rootScope.$digest();
            }

            describe('no supported languages', function () {
                beforeEach(inject(function ($q) {
                    $location.path('/');
                    binarta.application.gateway.updateApplicationProfile({supportedLanguages: []});
                    binarta.application.refresh();
                    binarta.application.setLocaleForPresentation(undefined);
                }));

                function expectContextEquals(ctx) {
                    expect(reader.calls.first().args[0]).toEqual(ctx);
                }

                it('on resolve construct context', function () {
                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();
                    expectContextEquals({
                        useExtendedResponse: true,
                        code: code,
                        locale: 'default',
                        namespace: 'namespace',
                        section: '/'
                    });
                });

                describe('legacy support for simple message response', function () {
                    beforeEach(function () {
                        context.useExtendedResponse = false;
                    });

                    it('resolve to translation', inject(function () {
                        i18n.resolve(context).then(presenter);
                        $rootScope.$digest();
                        reader.calls.first().args[1](translation);
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
                            reader.calls.reset();
                            i18n.resolve(context, presenter);
                        });

                        it('then no gateway calls are done', function () {
                            expect(reader.calls.first()).toBeUndefined();
                            expect(receivedContext).toEqual({
                                translation: translation,
                                code: code,
                                default: undefined,
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
                        default: undefined,
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

                it('resolution prefers session storage', inject(function () {
                    sessionStorage.setItem('binarta:i18n:namespace:default:translation.code', JSON.stringify({
                        timestamp: moment(now).format('YYYYMMDDHHmmssSSSZ'),
                        value: 'from-session-storage'
                    }));

                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();

                    expect(receivedContext).toEqual({
                        translation: 'from-session-storage',
                        code: code,
                        default: undefined,
                        locale: 'default'
                    });
                    expect(cache.get('namespace:default:translation.code')).toEqual('from-session-storage');
                }));

                it('resolve when translation cache populated by adhesive reading then no gateway calls are done', function () {
                    binarta.application.gateway.addSectionData({
                        type: 'i18n', key: code, message: 'translation-from-section-data'
                    });
                    binarta.application.adhesiveReading.read('-');

                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();

                    expect(receivedContext).toEqual({
                        translation: 'translation-from-section-data',
                        code: code,
                        default: undefined,
                        locale: 'default'
                    });
                    expect(reader.calls.first()).toBeUndefined();
                });

                it('messages in session storage are preferred over translation cache populated by old adhesive reading', function () {
                    sessionStorage.setItem('binarta:i18n:namespace:default:translation.code', JSON.stringify({
                        timestamp: moment(now).format('YYYYMMDDHHmmssSSSZ'),
                        value: 'from-session-storage'
                    }));

                    binarta.application.gateway.addSectionData({
                        type: 'i18n', key: code, message: 'translation-from-section-data'
                    });
                    binarta.application.adhesiveReading.read('-');

                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();

                    expect(receivedContext).toEqual({
                        translation: 'from-session-storage',
                        code: code,
                        default: undefined,
                        locale: 'default'
                    });
                });

                it('messages in session storage are removed when translation cache populated by newer adhesive reading', function () {
                    sessionStorage.setItem('binarta:i18n:namespace:default:translation.code', JSON.stringify({
                        timestamp: moment(now).format('YYYYMMDDHHmmssSSSZ'),
                        value: 'from-session-storage'
                    }));

                    binarta.application.gateway.now = moment(now).add(1, 'm');
                    binarta.application.gateway.addSectionData({
                        type: 'i18n', key: code, message: 'translation-from-section-data'
                    });
                    binarta.application.adhesiveReading.read('-');

                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();

                    expect(receivedContext).toEqual({
                        translation: 'translation-from-section-data',
                        code: code,
                        default: undefined,
                        locale: 'default'
                    });
                });

                it('resolve when translation cache populated by adhesive reading with unknown translation code', function () {
                    binarta.application.gateway.addSectionData({
                        type: 'i18n', key: code, message: unknownCode
                    });
                    binarta.application.adhesiveReading.read('-');

                    context.default = defaultTranslation;
                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();

                    expect(receivedContext).toEqual({
                        translation: defaultTranslation,
                        code: code,
                        default: defaultTranslation,
                        locale: 'default'
                    });
                });

                it('resolve defers execution while adhesive reading in progress and then no gateway calls are done', function () {
                    binarta.application.gateway = new DeferringApplicationGateway();
                    binarta.application.gateway.addSectionData({
                        type: 'i18n', key: code, message: 'translation-from-section-data'
                    });
                    binarta.application.adhesiveReading.read('-');

                    i18n.resolve(context).then(presenter);
                    $rootScope.$digest();
                    binarta.application.gateway.continue();
                    $rootScope.$digest();

                    expect(receivedContext).toEqual({
                        translation: 'translation-from-section-data',
                        code: code,
                        default: undefined,
                        locale: 'default'
                    });
                    expect(reader.calls.first()).toBeUndefined();
                });

                describe('resolution without fallback to default available', function () {
                    beforeEach(function () {
                        context.code = code;
                    });

                    it('resolves to empty message', function () {
                        i18n.resolve(context).then(presenter);
                        $rootScope.$digest();
                        reader.calls.first().args[2]();
                        $rootScope.$digest();

                        expect(receivedContext.translation).toEqual(' ');
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
                                    default: undefined,
                                    locale: 'default'
                                });
                                expect(cache.get('namespace:default:translation.code')).toEqual('translation from app metadata');
                            });

                            it('when unknown to adhesive reading but known to metadata', function () {
                                binarta.application.gateway.addSectionData({
                                    type: 'i18n', key: code, message: '???' + code + '???'
                                });
                                binarta.application.adhesiveReading.read('-');

                                i18n.resolve(context).then(presenter);
                                $rootScope.$digest();
                                $httpBackend.flush();

                                expect(receivedContext).toEqual({
                                    translation: 'translation from app metadata',
                                    code: code,
                                    default: undefined,
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
                                    default: undefined,
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

                            it('resolves to empty message', function () {
                                i18n.resolve(context).then(presenter);
                                resolveTo(unknownCode);
                                $httpBackend.flush();

                                expect(receivedContext.translation).toEqual(' ');
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

                    it('it is utterly ignored', function () {
                        resolveTo(translation);
                        $rootScope.$digest();
                        expectContextEquals({
                            useExtendedResponse: true,
                            code: code,
                            locale: 'default',
                            namespace: 'namespace',
                            section: '/'
                        });
                        expect(receivedContext).toEqual({
                            translation: translation,
                            code: code,
                            default: undefined,
                            locale: 'default'
                        });
                    });
                });
            });

            describe('with supported languages', function () {
                beforeEach(inject(function ($q) {
                    binarta.application.profile().supportedLanguages = ['L'];
                    binarta.application.setLocaleForPresentation('L');
                    binarta.application.refreshEvents();
                    $location.path('/L/');
                }));

                it('resolve to translation', inject(function () {
                    resolveTo(translation);
                    expect(receivedContext).toEqual({
                        translation: translation,
                        code: code,
                        default: undefined,
                        locale: 'L'
                    });
                    expect(cache.get('namespace:L:translation.code')).toEqual(translation);
                }));

                it('resolve to default', inject(function () {
                    context.default = defaultTranslation;
                    resolveTo(unknownCode);
                    expect(receivedContext).toEqual({
                        translation: defaultTranslation,
                        code: code,
                        default: defaultTranslation,
                        locale: 'L'
                    });
                    expect(cache.get('namespace:L:translation.code')).toEqual(defaultTranslation);
                }));
            });
        });

        describe('on observe', function () {
            var actual;

            beforeEach(function () {
                config.namespace = 'namespace';
                binarta.application.gateway.updateApplicationProfile({supportedLanguages: []});
                binarta.application.refresh();
                binarta.application.setLocaleForPresentation(undefined);
            });

            it('observing an unknown code resolves to empty message', function () {
                i18n.observe('code', function (m) {
                    actual = m;
                });
                i18nMessageReader.calls.first().args[1]('???code???');
                expect(actual).toEqual(' ');
            });

            describe('with default parameters', function () {
                beforeEach(function () {
                    binarta.application.gateway.addSectionData({
                        type: 'i18n', key: 'code', message: 'message'
                    });
                    binarta.application.adhesiveReading.read();
                    i18n.observe('code', function (m) {
                        actual = m;
                    });
                    $rootScope.$digest();
                });

                it('message is resolved', function () {
                    expect(actual).toEqual('message');
                });

                describe('on translate', function () {
                    beforeEach(inject(function (usecaseAdapterFactory) {
                        i18n.translate({code: 'code', translation: 'updated'});
                        $rootScope.$digest();
                        usecaseAdapterFactory.calls.first().args[1]();
                    }));

                    it('observer is updated', function () {
                        expect(actual).toEqual('updated');
                    });
                });

                it('when change in adhesive reading data', function () {
                    binarta.application.gateway.addSectionData({
                        type: 'i18n', key: 'code', message: 'x'
                    });
                    binarta.application.adhesiveReading.read();
                    expect(actual).toEqual('x');
                });

                describe('when adhesive reading data is changed with an unknown code', function () {
                    beforeEach(function () {
                        binarta.application.gateway.addSectionData({
                            type: 'i18n', key: 'code', message: '???code???'
                        });
                        binarta.application.adhesiveReading.read();
                    });

                    it('resolved to empty message', function () {
                        expect(actual).toEqual(' ');
                    });
                });

                describe('when newer message is available in session', function () {
                    beforeEach(function () {
                        sessionStorage.clear();
                        sessionStorage.setItem('binarta:i18n:namespace:default:code', JSON.stringify({
                            timestamp: moment(now).format('YYYYMMDDHHmmssSSSZ'),
                            value: 'from-session-storage'
                        }));
                    });

                    it('when change in adhesive reading data', function () {
                        binarta.application.gateway.addSectionData({
                            type: 'i18n', key: 'code', message: 'x'
                        });
                        binarta.application.adhesiveReading.read();
                        expect(actual).toEqual('from-session-storage');
                    });
                });
            });

            describe('with custom arguments', function () {
                var actual;

                beforeEach(function () {
                    i18n.observe('code', function (m) {
                        actual = m;
                    }, {default: 'D'});

                    i18nMessageReader.calls.mostRecent().args[2]();
                });

                it('message is resolved to default value', function () {
                    expect(actual).toEqual('D');
                });

                describe('when change in adhesive reading data', function () {
                    beforeEach(function () {
                        binarta.application.gateway.addSectionData({
                            type: 'i18n', key: 'code', message: '???code???'
                        });
                        binarta.application.adhesiveReading.read();
                    });

                    it('resolved to default message', function () {
                        expect(actual).toEqual('D');
                    });
                });
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

            describe('no languages defined in application profile', function () {
                beforeEach(inject(function ($q) {
                    binarta.application.adhesiveReading.read('-');
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

            describe('languages defined in application profile', function () {
                beforeEach(inject(function ($q) {
                    binarta.application.adhesiveReading.read('-');
                    binarta.application.setProfile({
                        supportedLanguages: ['en']
                    });
                }));

                it('and no languages in local config', function () {
                    execute();
                    expect(languages).toEqual(['en']);
                    expect(config.supportedLanguages).toEqual(['en']);
                });

                it('and languages in local config', function () {
                    config.supportedLanguages = ['lang'];

                    execute();

                    expect(languages).toEqual(['en']);
                    expect(config.supportedLanguages).toEqual(['en']);
                });
            });
        });

        describe('update supported languages', function () {
            beforeEach(inject(function ($q) {
                var deferred = $q.defer();
                deferred.resolve({data: {value: '["en"]'}});
                publicConfigReader.and.returnValue(deferred.promise);

                i18n.getSupportedLanguages();
            }));

            [
                {name: 'empty', value: []},
                {name: '["nl", "en"]', value: ["nl", "en"]}
            ].forEach(function (lang) {
                describe('with languages equal to ' + lang.name, function () {
                    describe('without callback', function () {
                        var spy;

                        beforeEach(function () {
                            binarta.application.adhesiveReading.read('-');
                            i18n.updateSupportedLanguages(lang.value);

                            spy = jasmine.createSpyObj('spy', ['setPrimaryLanguage']);
                            binarta.application.eventRegistry.add(spy);
                        });

                        it('write to public config', function () {
                            expect(publicConfigWriter.calls.first().args[0]).toEqual({
                                key: 'supportedLanguages',
                                value: lang.value
                            });
                        });

                        describe('on success', function () {
                            beforeEach(function () {
                                $rootScope.unlocalizedPath = '/path';
                                publicConfigWriter.calls.first().args[1].success();
                            });

                            it('supported languages on config are updated', function () {
                                expect(config.supportedLanguages).toEqual(lang.value);
                            });

                            it('supported languages on binarta are updated', function () {
                                expect(binarta.application.supportedLanguages()).toEqual(lang.value);
                            });

                            it('binarta events are refreshed', function () {
                                expect(spy.setPrimaryLanguage).toHaveBeenCalledWith(lang.value[0]);
                            });

                            it('reader returns updated languages', function () {
                                var supportedLanguages = [];
                                i18n.getSupportedLanguages().then(function (languages) {
                                    supportedLanguages = languages;
                                });
                                $rootScope.$digest();
                                expect(supportedLanguages).toEqual(lang.value);
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
                                publicConfigWriter.calls.first().args[1].success();
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
                publicConfigReader.and.returnValue(deferred.promise);
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
                    binarta.application.adhesiveReading.read('-');
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
                $rootScope.$broadcast("$routeChangeStart", {params: {}});
            }

            beforeEach(function () {
                locale = undefined;
                binarta.application.adhesiveReading.read('-');
            });

            describe('when no multilanguage', function () {
                beforeEach(inject(function ($q) {
                    binarta.application.setLocaleForPresentation(undefined);
                    binarta.application.refreshEvents();
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
                beforeEach(function () {
                    binarta.application.setProfile({
                        supportedLanguages: ['en', 'nl', 'fr']
                    });
                    binarta.application.setLocaleForPresentation('en');
                });

                it('should return locale', function () {
                    i18n.getInternalLocale().then(function (l) {
                        locale = l
                    });
                    $rootScope.$digest();
                    expect(locale).toEqual('default');
                });
            });
        });

        describe('get external locale', function () {
            var locale, rejected;

            function changeRoute(route) {
                $location.path(route);
                $rootScope.$broadcast("$routeChangeStart", {params: {}});
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
                beforeEach(function () {
                    binarta.application.profile().supportedLanguages = [];
                    binarta.application.setLocaleForPresentation(undefined);
                    binarta.application.refreshEvents();
                });

                it('should be rejected', function () {
                    getExternalLocale();
                    expect(locale).toEqual(undefined);
                    expect(rejected).toEqual(true);
                });
            });

            describe('with multilanguage', function () {
                beforeEach(inject(function ($q) {
                    binarta.application.profile().supportedLanguages = ['en', 'nl', 'fr'];
                    binarta.application.refreshEvents();
                }));

                it('and locale is in path should return locale', function () {
                    $location.path('/en/some/path');
                    binarta.application.setLocaleForPresentation('en');
                    getExternalLocale();
                    expect(locale).toEqual('en');
                    expect(rejected).toBeUndefined();
                });
            });
        });
    });

    describe('locale selection integration', function () {
        var $rootScope, registry, dispatcher, $location;

        beforeEach(inject(function (topicRegistryMock, topicMessageDispatcherMock, _$rootScope_, _$location_) {
            $rootScope = _$rootScope_;
            $location = _$location_;
            registry = topicRegistryMock;
            dispatcher = topicMessageDispatcherMock;
        }));

        it('no i18n.locale notification should be raised yet', function () {
            expect(dispatcher.persistent['i18n.locale']).toBeUndefined();
        });

        describe('without multi language support', function () {
            beforeEach(function () {
                $location.path('/foo/bar');
                binarta.application.profile().supportedLanguages = [];
                binarta.application.setLocaleForPresentation(undefined);
                binarta.application.refreshEvents();
            });

            it('locale is empty string', function () {
                expect($rootScope.locale).toEqual('');
            });

            it('localePrefix is empty string', function () {
                expect($rootScope.localePrefix).toEqual('');
            });

            it('main locale is empty string', function () {
                expect($rootScope.mainLocale).toEqual('');
            });

            it('expose unlocalized path on scope', function () {
                expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
            });

            it('raise i18n.locale notification', function () {
                expect(dispatcher.persistent['i18n.locale']).toEqual('default');
            });
        });

        describe('when locale is set', function () {
            beforeEach(inject(function (binarta) {
                $location.path('/en/foo/bar');
                binarta.application.setProfile({
                    supportedLanguages: ['en']
                });
                binarta.application.setLocaleForPresentation('en');
                binarta.application.refreshEvents();
            }));

            it('expose locale on rootScope', function () {
                expect($rootScope.locale).toEqual('en');
            });

            it('expose localePrefix on rootScope', function () {
                expect($rootScope.localePrefix).toEqual('/en');
            });

            it('expose main locale on rootScope', function () {
                expect($rootScope.mainLocale).toEqual('en');
            });

            it('expose unlocalized path on scope', function () {
                expect($rootScope.unlocalizedPath).toEqual('/foo/bar');
            });

            it('raise i18n.locale notification', function () {
                expect(dispatcher.persistent['i18n.locale']).toEqual('en');
            });
        });
    });

    describe('i18n directive', function () {
        var directive, $rootScope, scope, resolver, locale, attrs, rendererOpenCalled, rendererArgs, editMode, registry,
            topics, dispatcher;
        var i18nResolveDeferred;

        beforeEach(inject(function (activeUserHasPermission, activeUserHasPermissionHelper, _$rootScope_, $q,
                                    i18nRendererTemplate, topicRegistryMock, ngRegisterTopicHandler) {
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
                    i18nResolveDeferred = $q.defer();
                    resolver.args = args;
                    return i18nResolveDeferred.promise;
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
                },
                observes: {
                    installations: 0
                },
                observe: function (key, listener, args) {
                    resolver.observes.installations++;
                    resolver.observes.id = key;
                    resolver.observes.default = args ? args.default || undefined : undefined ;
                    resolver.observes.listener = listener;
                    return {
                        disconnect: function () {
                            resolver.observes.disconnect = key;
                        }
                    };
                }
            };

            registry = topicRegistryMock;

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

            directive = i18nDirectiveFactory($rootScope, resolver, renderer, editMode, localeResolver, i18nRendererTemplate, ngRegisterTopicHandler, binarta);
        }));

        it('restricted to', function () {
            expect(directive.restrict).toEqual('EA');
        });

        it('scope', function () {
            expect(directive.scope).toEqual(true);
        });

        describe('when linked', function () {
            var element = {};

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

                it('observes code', function () {
                    expect(resolver.observes.id).toEqual(attrs.code);
                });

                it('observes default', function () {
                    expect(resolver.observes.default).toEqual(attrs.default);
                });

                it('observed message changes are applied to scope', function () {
                    resolver.observes.listener('x');
                    expect(scope.var).toEqual('x');
                    expect(scope.$parent['var']).toEqual(undefined);
                });

                it('observed message changes with custom var are applied to scope and parent scope', function () {
                    attrs.var = 'var';
                    resolver.observes.listener('x');
                    expect(scope.var).toEqual('x');
                    expect(scope.$parent['var']).toEqual('x');
                });

                it('observed message is trimmed before being applied to scope and parent scope', function () {
                    attrs.var = 'var';
                    resolver.observes.listener(' x ');
                    expect(scope.var).toEqual('x');
                    expect(scope.$parent['var']).toEqual('x');
                });

                it('initialize var on scope', function () {
                    expect(scope.var).toBeUndefined();
                });

                it('directive reflects when edit mode disabled', function () {
                    registry['edit.mode'](false);
                    expect(scope.editing).toEqual(false);
                });

                it('directive reflects when edit mode enabled', function () {
                    registry['edit.mode'](true);
                    expect(scope.editing).toEqual(true);
                });

                it('empty messages are converted in edit mode', function () {
                    registry['edit.mode'](true);
                    resolver.observes.listener(' ');
                    expect(scope.var).toEqual('place your text here');
                });

                it('when edit mode is enabled then existing messages remain on the scope', function() {
                    resolver.observes.listener('x');
                    registry['edit.mode'](true);
                    expect(scope.var).toEqual('x');
                });

                it('when edit mode is enabled and no message was ever resolve then the scope is not touched', function() {
                    registry['edit.mode'](true);
                    expect(scope.var).toBeUndefined();
                });

                it('when edit mode is enabled and there is an existing empty messages on the scope then it shows a placeholder message', function() {
                    resolver.observes.listener(' ');
                    registry['edit.mode'](true);
                    expect(scope.var).toEqual('place your text here');
                });

                it('when edit mode is disabled then existing messages remain on the scope', function() {
                    resolver.observes.listener('x');
                    registry['edit.mode'](false);
                    expect(scope.var).toEqual('x');
                });

                it('when edit mode is disabled then existing messages remain on the scope', function() {
                    resolver.observes.listener('place your text here');
                    registry['edit.mode'](false);
                    expect(scope.var).toEqual('');
                });

                describe('and translation is updated', function () {
                    beforeEach(function () {
                        scope.open();
                        rendererArgs.submit();
                        scope.$digest();
                    });

                    it('message is translated', function () {
                        expect(scope.var).toEqual('success');
                    });

                    describe('and user not in edit mode', function () {
                        beforeEach(function () {
                            registry['edit.mode'](true);
                        });

                        it('message does not change', function () {
                            expect(scope.var).toEqual('success');
                        });
                    });
                });

                it('code changes are ignored when watch on code is disabled', function () {
                    attrs.code = 'changed';
                    scope.$digest();
                    expect(resolver.observes.id).toEqual('code');
                });

                describe('and watch on code is enabled', function () {
                    beforeEach(function () {
                        attrs.watchOnCode = '';
                        directive.link(scope, element, attrs);
                        scope.$digest();
                    });


                    describe('when code is changed', function () {
                        beforeEach(function () {
                            attrs.code = 'changed';
                            scope.$digest();
                        });

                        it('installs observer for the new code', function () {
                            expect(resolver.observes.id).toEqual('changed');
                        });

                        it('installs new default', function () {
                            expect(resolver.observes.default).toEqual(attrs.default);
                        });

                        it('disconnects observer for the old code', function () {
                            expect(resolver.observes.disconnect).toEqual('code');
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
                    describe('and href is used', function () {
                        beforeEach(function () {
                            attrs.href = '#!/path';
                            directive.link(scope, null, attrs);
                            scope.open();
                        });

                        it('pass path to renderer', function () {
                            expect(rendererArgs.path).toEqual('/path');
                        });
                    });

                    describe('and no locale for presentation', function () {
                        beforeEach(function () {
                            binarta.application.gateway.supportedLanguages = [];
                        });

                        describe('and bin-href directive is used', function () {
                            beforeEach(function () {
                                attrs.binHref = '/path';
                                directive.link(scope, null, attrs);
                                scope.open();
                            });

                            it('pass path to renderer', function () {
                                expect(rendererArgs.path).toEqual('/path');
                            });
                        });
                    });

                    describe('and with locale for presentation', function () {
                        beforeEach(function () {
                            binarta.application.gateway.supportedLanguages = ['en', 'nl'];
                            binarta.application.setLocaleForPresentation('en');
                        });

                        describe('and bin-href directive is used', function () {
                            beforeEach(function () {
                                attrs.binHref = '/path';
                                directive.link(scope, null, attrs);
                                scope.open();
                            });

                            it('pass path to renderer', function () {
                                expect(rendererArgs.path).toEqual('/en/path');
                            });
                        });
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
                        rendererArgs.submit('updated translation');
                        scope.$digest();
                    });

                    it('message is translated', function () {
                        expect(resolver.translateArgsSpy).toEqual({
                            code: 'code',
                            translation: 'updated translation'
                        });
                        expect(scope.var).toEqual('success');
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
        var $rootScope, i18n, editMode, editModeRenderer, publicConfigWriter, directive, scope, element, config,
            $location,
            sessionStorage, activeUserHasPermission, binarta, path;

        beforeEach(inject(function (_$rootScope_, _i18n_, _config_, publicConfigReader, _publicConfigWriter_, $q, _$location_, _sessionStorage_, _binarta_) {
            var reader = $q.defer();
            reader.reject();
            publicConfigReader.and.returnValue(reader.promise);

            publicConfigWriter = _publicConfigWriter_;
            var writer = $q.defer();
            writer.resolve('["nl","en"]');
            publicConfigWriter.and.returnValue(writer.promise);

            $rootScope = _$rootScope_;
            scope = $rootScope.$new();
            element = {};
            i18n = _i18n_;
            config = _config_;
            $location = _$location_;
            editMode = jasmine.createSpyObj('editMode', ['bindEvent']);
            editModeRenderer = jasmine.createSpyObj('editModeRenderer', ['open', 'close']);
            sessionStorage = _sessionStorage_;
            binarta = _binarta_;
            activeUserHasPermission = jasmine.createSpy('activeUserHasPermission');
            path = '/path';

            directive = I18nLanguageSwitcherDirective(config, i18n, editMode, editModeRenderer, activeUserHasPermission, binarta);
        }));

        describe('on link', function () {
            var dutch = {name: 'Dutch', code: 'nl', url: '/nl/'},
                english = {name: 'English', code: 'en', url: '/'},
                french = {name: 'French', code: 'fr', url: '/fr/'},
                chinese = {name: 'Chinese', code: 'ch', url: '/ch/'},
                arabic = {name: 'Arabic', code: 'ar', url: '/ar/'};

            beforeEach(function () {
                config.languages = [dutch, french, english, chinese, arabic];
                binarta.application.adhesiveReading.read('/');
            });

            describe('with no supported languages', function () {
                beforeEach(function () {
                    binarta.application.profile().supportedLanguages = [];

                    directive.link(scope, element);
                    scope.$digest();
                });

                it('supported languages on scope are empty', function () {
                    expect(scope.supportedLanguages).toEqual([]);
                });

                describe('on route changed', function () {
                    beforeEach(function () {
                        $location.path(path);
                        $rootScope.$broadcast('$routeChangeSuccess');
                    });

                    it('unlocalized path is available', function () {
                        expect(scope.unlocalizedPath).toEqual(path);
                    });
                });

                it('no active language name', function () {
                    expect(scope.getActiveLanguageName()).toBeUndefined();
                });

                it('no locale for presentation', function () {
                    expect(scope.locale).toBeUndefined();
                });
            });

            describe('with supported languages', function () {
                beforeEach(function () {
                    binarta.application.setProfile({
                        supportedLanguages: ['en', 'nl']
                    });
                    binarta.application.setLocaleForPresentation('en');
                    $location.path('/en/');

                    directive.link(scope, element);
                    scope.$digest();
                });

                it('put supported languages on scope ordered by name', function () {
                    expect(scope.supportedLanguages).toEqual([{
                        name: dutch.name,
                        code: dutch.code,
                        url: '/nl/'
                    }, {
                        name: english.name,
                        code: english.code,
                        url: '/'
                    }]);
                });

                it('install editMode event binder', function () {
                    expect(editMode.bindEvent).toHaveBeenCalledWith({
                        scope: scope,
                        element: element,
                        permission: 'config.store',
                        onClick: jasmine.any(Function)
                    });
                });

                describe('on route changed', function () {
                    beforeEach(function () {
                        $location.path('/nl' + path);
                        binarta.application.setLocaleForPresentation('nl');
                        binarta.application.refreshEvents();
                    });

                    it('unlocalized path is available', function () {
                        expect(scope.unlocalizedPath).toEqual(path);
                    });

                    it('locale for presenation is available', function () {
                        expect(scope.locale).toEqual('nl');
                    });

                    describe('editMode event is triggered', function () {
                        beforeEach(function () {
                            editMode.bindEvent.calls.first().args[0].onClick();
                        });

                        describe('when user has no permission', function () {
                            beforeEach(function () {
                                activeUserHasPermission.calls.first().args[0].no();
                            });

                            it('editMode renderer is opened', function () {
                                expect(editModeRenderer.open).toHaveBeenCalledWith({
                                    templateUrl: 'bin-i18n-language-switcher-unavailable.html',
                                    scope: jasmine.any(Object)
                                });
                            });

                            describe('with renderer scope', function () {
                                var rendererScope;

                                beforeEach(function () {
                                    rendererScope = editModeRenderer.open.calls.first().args[0].scope;
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
                                activeUserHasPermission.calls.first().args[0].yes();
                            });

                            it('has i18n.config.update permission', function () {
                                expect(activeUserHasPermission.calls.first().args[1]).toEqual('i18n.config.update');
                            });

                            it('editMode renderer is opened', function () {
                                expect(editModeRenderer.open).toHaveBeenCalledWith({
                                    templateUrl: 'bin-i18n-language-switcher.html',
                                    scope: jasmine.any(Object)
                                });
                            });

                            describe('with renderer scope', function () {
                                var rendererScope;

                                beforeEach(function () {
                                    rendererScope = editModeRenderer.open.calls.first().args[0].scope;
                                    rendererScope.$digest();
                                });

                                var toNormalizedLocale = function (it) {
                                    return {name: it.name, code: it.code}
                                };

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
                                    describe('with no supported languages', function () {
                                        beforeEach(function () {
                                            rendererScope.remove(dutch);
                                            rendererScope.remove(english);
                                            rendererScope.save();
                                            publicConfigWriter.calls.first().args[1].success();
                                            scope.$digest();
                                        });

                                        it('write to public config', function () {
                                            expect(publicConfigWriter.calls.first().args[0]).toEqual({
                                                key: 'supportedLanguages',
                                                value: []
                                            });
                                        });

                                        it('update supported languages on scope', function () {
                                            expect(scope.supportedLanguages).toEqual([]);
                                        });
                                    });

                                    describe('with supported languages', function () {
                                        beforeEach(function () {
                                            $location.path('/en' + path);
                                            rendererScope.add(chinese);
                                            rendererScope.save();
                                            publicConfigWriter.calls.first().args[1].success();
                                            scope.$digest();
                                        });

                                        it('write to public config', function () {
                                            expect(publicConfigWriter.calls.first().args[0]).toEqual({
                                                key: 'supportedLanguages',
                                                value: ['en', 'ch', 'nl']
                                            });
                                        });

                                        it('editMode renderer is closed', function () {
                                            expect(editModeRenderer.close).toHaveBeenCalled();
                                        });

                                        it('update supported languages on scope ordered by name', function () {
                                            expect(
                                                scope.supportedLanguages.map(toNormalizedLocale)
                                            ).toEqual(
                                                [chinese, dutch, english].map(toNormalizedLocale)
                                            );
                                        });

                                        describe('and main locale changes', function () {
                                            beforeEach(function () {
                                                rendererScope.remove(english);
                                                rendererScope.save();
                                                publicConfigWriter.calls.mostRecent().args[1].success();
                                                scope.$digest();
                                            });

                                            it('update supported languages on scope', function () {
                                                expect(scope.supportedLanguages.map(toNormalizedLocale))
                                                    .toEqual([chinese, dutch].map(toNormalizedLocale));
                                            });
                                        });

                                        describe('and only one supported language', function () {
                                            beforeEach(function () {
                                                rendererScope.remove(dutch);
                                                rendererScope.remove(chinese);
                                                rendererScope.save();
                                                publicConfigWriter.calls.mostRecent().args[1].success();
                                                scope.$digest();
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
                                        expect(rendererScope.availableLanguages.map(toNormalizedLocale))
                                            .toEqual([arabic, chinese, dutch, french].map(toNormalizedLocale));
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
                                        expect(rendererScope.languages.map(toNormalizedLocale))
                                            .toEqual([english, arabic, dutch].map(toNormalizedLocale));
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
                });

                describe('on destroy', function () {
                    beforeEach(function () {
                        scope.locale = undefined;
                        scope.$destroy();
                    });

                    it('remove event from registry', function () {
                        binarta.application.refreshEvents();
                        expect(scope.locale).toBeUndefined();
                    });
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

        beforeEach(inject(function ($rootScope, $controller, topicMessageDispatcherMock, publicConfigReader, $q, config) {
            config.supportedLanguages = ['lang'];
            scope = $rootScope.$new();
            params = {};
            local = localStorage;
            topics = topicMessageDispatcherMock;

            var reader = $q.defer();
            reader.reject();
            publicConfigReader.and.returnValue(reader.promise);

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
            beforeEach(inject(function (binarta) {
                locale = 'lang';
                binarta.application.setLocale(locale);
            }));

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

    describe('i18nLocation', function () {
        var location, target, session, i18n, $rootScope;

        beforeEach(inject(function (i18nLocation, $location, _i18n_, _$rootScope_) {
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

        it('path with locale', inject(function ($routeParams) {
            $routeParams.locale = 'en';
            location.path('/');
            expect(target.path()).toEqual('/en/');
        }));

        it('path with default locale', function () {
            session.locale = 'default';
            location.path('/');
            expect(target.path()).toEqual('/');
        });

        it('path with argument returns $location', function () {
            expect(location.path('/')).toEqual(target);
        });

        describe('get unlocalized path', function () {
            beforeEach(function () {
                binarta.application.profile().supportedLanguages = ['en', 'nl', 'fr'];
                binarta.application.refreshEvents();
            });

            describe('and locale is in path', function () {
                beforeEach(function () {
                    target.path('/en/path');
                    binarta.application.setLocaleForPresentation('en');
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
                    binarta.application.setLocaleForPresentation('en');
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
        });

        it('url with no locale', function () {
            location.url('/');
            expect(target.url()).toEqual('/');
        });

        it('url with locale', inject(function ($routeParams) {
            $routeParams.locale = 'en';
            location.url('/');
            expect(target.url()).toEqual('/en/');
        }));

        it('url with default locale', function () {
            session.locale = 'default';
            location.url('/');
            expect(target.url()).toEqual('/');
        });

        it('path with argument returns $location', function () {
            expect(location.url('/')).toEqual(target);
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

    describe('i18nRoute filter', function () {
        var filter, $routeParams;

        beforeEach(inject(function (i18nRouteFilter, _$routeParams_) {
            filter = i18nRouteFilter;
            $routeParams = _$routeParams_;
        }));

        it('add hashbang to link', function () {
            expect(filter('/route')).toEqual('#!/route');
        });

        describe('with locale in routeParams', function () {
            beforeEach(function () {
                $routeParams.locale = 'l';
            });

            it('add locale before link', function () {
                expect(filter('/route')).toEqual('#!/l/route');
            });
        });
    });

    function DeferringApplicationGateway() {
        var delegate = new BinartaInMemoryGatewaysjs().application;
        var eventRegistry = new BinartaRX();

        this.addSectionData = delegate.addSectionData;

        this.continue = function () {
            eventRegistry.forEach(function (l) {
                l.notify('continue');
            })
        };

        this.fetchSectionData = function (request, response) {
            eventRegistry.add({
                continue: function () {
                    delegate.fetchSectionData(request, response);
                }
            });
        };

        this.fetchAdhesiveSnapshot = function (request, response) {
            eventRegistry.add({
                continue: function () {
                    delegate.fetchAdhesiveSnapshot(request, response);
                }
            });
        }
    }
});
