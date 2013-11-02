angular.module('i18n.in.memory', [])
    .factory('i18nInMemoryMessageRepository', function () {
        return [];
    })
    .factory('i18nMessageReader', ['i18nInMemoryMessageRepository', I18nMessageReaderFactory])
    .factory('i18nMessageWriter', ['i18nInMemoryMessageRepository', I18nMessageWriterFactory]);

function I18nMessageReaderFactory(i18nInMemoryMessageRepository) {
    return function (ctx, onSuccess, onError) {
        var translation = i18nInMemoryMessageRepository.reduce(function(r, it) {
            return it.key == ctx.code ? it.message : r;
        }, '');
        translation ? onSuccess(translation) : onError();
    }
}

function I18nMessageWriterFactory(i18nInMemoryMessageRepository) {
    return function (ctx, onSuccess, onError) {
        i18nInMemoryMessageRepository.push(ctx);
        if(onSuccess) onSuccess();
//        onError();
    }
}