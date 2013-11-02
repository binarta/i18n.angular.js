angular.module('angular.usecase.adapter', [])
    .factory('usecaseAdapterFactory', function() {
        var spy = jasmine.createSpy('usecaseAdapterFactorySpy');
        spy.andReturn('presenter');
        return  spy;
    });