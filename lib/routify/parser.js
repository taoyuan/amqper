'use strict';

const debug = require('debug')('amqper:parser');
const _ = require('lodash');
const Houkou = require('houkou');

module.exports = Parser;

function Parser(pattern) {
  if (!(this instanceof Parser)) return new Parser(pattern);
  debug('pattern', pattern);

  this.route = new Houkou(
    pattern
      .replace(/\$/, "\\$") // escape $ in the route because it is used in MQTT
      .replace(/_/g, "\\_"), // escape _ because it is used a delimiter in routing keys
    configureRouter(pattern));

  function configureRouter(route) {

    const params = route.match(/\:([a-zA-Z0-9]+)/g);
    const requirements = {};

    if (Array.isArray(params)) {
      params.forEach(function cleanParams(param) {
        const sparam = param.replace(/:/, '');
        requirements[sparam] = "[a-zA-Z0-9]+";
      });
    }
    debug('requirements', requirements);
    return requirements;
  }
}

Parser.prototype.parse = function (data) {
  const routingKey = data.fields.routingKey;
  debug('pattern', this.route.pattern);
  debug('routingKey', routingKey);

  let result = {};
  if (routingKey) {
    result = this.route.match(routingKey);
    debug('params', this.params);
  }
  return result;
};
