"use strict";

var debug = require('debug')('amqper:client');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var codecs = require('./codecs');

module.exports = Client;

// Do the tedious string-or-buffer conversion. If I was using byte
// streams, this would be done automatically; however I'm using
// streams in object mode.
function bufferify(chunk, encoding) {
  return (typeof chunk === 'string') ? new Buffer(chunk, encoding || 'utf8') : chunk;
}

function Client(options) {
  if (!(this instanceof Client)) {
    return new Client(options);
  }

  EventEmitter.call(this);

  this.options = options = options || {};

  this.name = options.name;
  this.label = options.label || (options.name ? '#' + options.name : '');
  this.codec = codecs.byName(this.options.format || 'json');

  this.conn = null;
  this.channel = null;
  this.svcs_container = null;
  this.connected = false;
  this.$promise = null;
}

util.inherits(Client, EventEmitter);

Client.prototype.format = function (fmt) {
  this.options.format = fmt;
  this.codec = codecs.byName(fmt || 'json');
};

Client.prototype.ready = function (done) {
  this.$promose.then(function () {
    done();
  }, function (err) {
    done(err);
  });
};

/**
 *
 * @param {String} exchange
 * @param {String} routingKey
 * @param {Object|String|Number} content
 * @returns {*|Promise}
 */
Client.prototype.publish = function (exchange, routingKey, content) {
  var channel = this.channel;
  var codec = this.codec;
  return when.try(function () {
    content = bufferify(codec.encode(content));
    channel.publish(exchange, routingKey, content);
  });
};

/**
 *
 * @param {String} route
 * @param {Object|Function} [options]
 * @param {Function} [handler]
 * @returns {*}
 */
Client.prototype.route = function (route, options, handler) {
  if (typeof options === 'function') {
    handler = options;
    options = null;
  }
  var codec = this.codec;
  return this.svcs_container.route(route, options, function (message) {
    when.try(function () {
      message.payload = codec.decode(message.content);
      return handler(message);
    }).done(function () {
      message.ack();
    }, function (err) {
      debug('error', 'Error thrown in routing handler, not acking message. Error: ', err.stack);
    });
  });
};

Client.prototype.subscribe = Client.prototype.route;

Client.prototype.close = function (cb) {
  if (this.closing || this.closed) {
    if (cb) cb();
    return when.resolve();
  }
  this.closing = true;
  var that = this;
  return close_connection(this.conn).then(function () {
    return when.all(when.map(that.svcs_container.routes, function (route) {
      return route.connection.then(close_connection);
    }));
  }).then(function () {
    that.svcs_container.routes = [];
    that.closed = true;
    that.closing = false;
    cb();
  });
};

function close_connection(conn) {
  if (!conn) return when.resolve();
  return when.try(function () {
    var d = when.defer();
    conn.once('close', function () {
      d.resolve();
    });
    conn.close();
    return d.promise;
  }).catch(function (err) {
    console.error(err.stack);
  });
}
