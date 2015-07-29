'use strict';

var debug = require('debug')('amqper:message');
var Houkou = require('houkou');

exports = module.exports = function Message(pattern) {

  debug('pattern', pattern);
  this.params = [];
  var route = this.route = new Houkou(
    pattern
      .replace(/\$/, "\\$") // escape $ in the route because it is used in MQTT
      .replace(/_/g, "\\_"), // escape _ because it is used a delimiter in routing keys
    configureRouter(pattern));

  function configureRouter(route) {

    var params = route.match(/\:([a-zA-Z0-9]+)/g);
    var requirements = {};

    if (Array.isArray(params)) {
      params.forEach(function cleanParams(param) {
        var sparam = param.replace(/:/, '');
        requirements[sparam] = "[a-zA-Z0-9]+";
      });
    }
    debug('requirements', requirements);
    return requirements;
  }

  this.parseRoutingKey = function(){
    var routingKey = this.fields.routingKey;
    debug('pattern', route.pattern);
    debug('routingKey', routingKey);

    if(routingKey) {
      this.params = route.match(routingKey);
      debug('params', this.params);
    }
  };
};
