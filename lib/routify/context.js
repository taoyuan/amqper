"use strict";

var _ = require('lodash');
var Router = require('./Router');

module.exports = function Context(settings) {
  if (!(this instanceof Context)) return new Context(settings);

  settings = settings || {};

  this.route = function (route, options, handler) {
    if ('function' != typeof handler) throw new Error('handler function required');
    options = _.defaults(options, settings);
    var router = new Router(route, options, handler);
    router.init();
    return router;
  };
}

