"use strict";

var debug = require('debug')('amqper:client');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
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

  this.__amqper__ = true;

  this.options = options = options || {};

  this.name = options.name;
  this.label = options.label || (options.name ? '#' + options.name : '');
  this.codec = codecs.byName(this.options.format || 'json');

  this.conn = null;
  this.channel = null;
  this.connected = false;
  this.routers = [];
  this.$promise = null;
}

util.inherits(Client, EventEmitter);

Client.prototype.format = function (fmt) {
  this.options.format = fmt;
  this.codec = codecs.byName(fmt || 'json');
};

Client.prototype.ready = function (done) {
  return this.$promise.then(function () {
    if (done) done();
  }, function (err) {
    if (done) return done(err);
    return err;
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
  var that = this;
  return this.$promise.then(function () {
    var channel = that.channel;
    var codec = that.codec;
    return when.try(function () {
      content = bufferify(codec.encode(content));
      return channel.publish(exchange, routingKey, content);
    });
  });
};

/**
 *
 * @param {String} route
 * @param {Object|Function} [options]
 * @param {Function} [handler]
 * @returns {Promise}
 */
Client.prototype.route = function (route, options, handler) {
  if (typeof options === 'function') {
    handler = options;
    options = null;
  }
  var that = this;
  return this.$promise.then(function () {
    var codec = that.codec;
    var router = that.context.route(route, options, function (message) {
      when.try(function () {
        message.payload = codec.decode(message.content);
        return handler(message);
      }).done(function () {
        return message.ack();
      }, function (err) {
        debug('error', 'Error thrown in routing handler, not acking message. Error: ', err.stack);
        that.emit('error', err);
      });
    });
    that.routers.push(router);
    return router.$promise;
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
    return when.all(when.map(that.routers, function (router) {
      return router.connection.then(function (conn) {
        if (conn === that.conn) return;
        return close_connection(conn);
      });
    }));
  }).then(function () {
    that.routers = [];
    that.closed = true;
    that.closing = false;
    if (cb) cb();
  });
};

function close_connection(conn) {
  if (!conn || conn.cloing || conn.closed) return when.resolve();
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
