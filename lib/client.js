"use strict";

const debug = require('debug')('amqper:client');
const deprecate = require('depd')('amqper');
const EventEmitter = require('events').EventEmitter;
const PromiseA = require('bluebird');
const codecs = require('./codecs');

class Client extends EventEmitter {
  constructor(options) {
    super();
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


  format(fmt) {
    this.options.format = fmt;
    this.codec = codecs.byName(fmt || 'json');
  };

  ready(done) {
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
   * @returns {*|PromiseA}
   */
  publish(exchange, routingKey, content) {
    const that = this;
    return this.$promise.then(function () {
      const channel = that.channel;
      const codec = that.codec;
      return PromiseA.try(function () {
        content = bufferify(codec.encode(content));
        return channel.publish(exchange, routingKey, content);
      });
    });
  };

  /**
   *
   * @param {String} route
   * @param {Object|Function} [options]
   * @param {Function} [handler] function (err, message)
   * @returns {*|PromiseA}
   */
  route(route, options, handler) {
    if (typeof options === 'function') {
      handler = options;
      options = null;
    }

    if (handler && handler.length > 1) {
      deprecate('route handler signature changed from route(err, message) to route(message)');
    }

    function fn(message) {
      if (!handler) return;
      if (handler.length > 1) {
        handler(null, message);
      } else {
        handler(message);
      }
    }

    const that = this;
    return this.$promise.then(function () {
      const codec = that.codec;
      const router = that.context.route(route, options, function (message) {
        PromiseA.try(function () {
          message.payload = codec.decode(message.content);
          return fn(message);
        }).then(function () {
          return message.ack();
        }).catch(function (err) {
          debug('error', 'Error thrown in routing handler, not acking message. Error: ', err.stack);
          that.emit('error', err);
        });
      });
      that.routers.push(router);
      return router.$promise;
    });
  };

  /**
   *
   * @param {String} route
   * @param {Object|Function} [options]
   * @param {Function} [handler] function (err, message)
   * @returns {*|PromiseA}
   */
  subscribe(route, options, handler) {
    return this.route(...arguments);
  }

  close(cb) {
    if (this.closing || this.closed) {
      if (cb) cb();
      return PromiseA.resolve();
    }
    return this.$promise.finally(() => {
      this.closing = true;
      const that = this;
      return close_connection(this.conn).then(function () {
        return PromiseA.all(PromiseA.map(that.routers, function (router) {
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
    });
  };
}

// Do the tedious string-or-buffer conversion. If I was using byte
// streams, this would be done automatically; however I'm using
// streams in object mode.
function bufferify(chunk, encoding) {
  return (typeof chunk === 'string') ? new Buffer(chunk, encoding || 'utf8') : chunk;
}

function close_connection(conn) {
  if (!conn || conn.cloing || conn.closed) return PromiseA.resolve();
  return PromiseA.try(function () {
    return new PromiseA(function (resolve) {
      conn.once('close', function () {
        resolve();
      });
      conn.close();
    });
  }).catch(function (err) {
    console.error(err.stack);
  });
}

module.exports = Client;
