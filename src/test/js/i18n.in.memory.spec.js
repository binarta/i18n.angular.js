describe('i18n.in.memory', function () {
    var $httpBackend;

    beforeEach(module('i18n.in.memory'));
    beforeEach(inject(function ($injector) {
        $httpBackend = $injector.get('$httpBackend');
    }));
    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('gateways', function () {
        var reader, writer;
        var code = 'translation.code';
        var translation = 'translation message';
        var defaultTranslation = 'default translation';
        var receivedTranslation;
        var receivedSuccess;
        var receivedError;
        var onSuccess = function(translation) {
            receivedSuccess = true;
            receivedTranslation = translation;
        };
        var onError = function() {
            receivedError = true;
        };
        var context;

        beforeEach(inject(function(i18nMessageReader, i18nMessageWriter) {
            reader = i18nMessageReader;
            writer = i18nMessageWriter;
            receivedTranslation = '';
            receivedSuccess = true;
            receivedError = false;
            context = {};
        }));

//        it('pass translation to on success handler', function() {
//            $httpBackend.when('GET', /.*/).respond(200, translation);
//            reader(context, onSuccess);
//            $httpBackend.flush();
//            expect(receivedTranslation).toEqual(translation);
//        });
        it('read non existing message triggers error', function() {
            context.default = defaultTranslation;
            reader(context, onSuccess, onError);
            expect(receivedError).toEqual(true);
        });

        it('writer triggers on success handler', function() {
            writer({key:'code', message:'translation'}, onSuccess);
            expect(receivedSuccess).toEqual(true);
        });

        it('read an existing message', function() {
            writer({key:'code', message:'translation'});
            reader({code:'code'}, onSuccess);
            expect(receivedTranslation).toEqual('translation');
        });
    });
});