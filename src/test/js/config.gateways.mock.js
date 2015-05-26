angular.module('config.gateways', [])
    .factory('publicConfigReader', function () {
        return jasmine.createSpy('publicConfigReader');
    })
    .factory('publicConfigWriter', function () {
        return jasmine.createSpy('publicConfigWriter');
    });