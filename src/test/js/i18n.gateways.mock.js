angular.module('i18n.gateways', [])
    .factory('i18nMessageReader', function() {
        return jasmine.createSpy('i18nMessageReaderSpy');
    })
    .factory('i18nMessageWriter', function() {
        return jasmine.createSpy('i18nMessageWriterSpy');
    });