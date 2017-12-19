"use strict";

const _ = require('lodash');
const Router = require('./router');

class Context {
  constructor(settings) {
    this._settings = settings || {};
  }

  route(route, options, handler) {
    if ('function' !== typeof handler) throw new Error('handler function required');
    options = _.defaults(options, this._settings);
    const router = new Router(route, options, handler);
    router.init();
    return router;
  }
}

module.exports = Context;
