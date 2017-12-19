'use strict';

const debug = require('debug')('amqper:router');
const crypto = require('crypto');
const amqp = require('../amqp');
const PromiseA = require('bluebird');
const _ = require('lodash');
const Parser = require('./parser');

module.exports = Router;

const defaults = {
  url: 'amqp://guest:guest@localhost:5672',
  exchange: 'amq.topic',
  exchangeType: 'topic',
  queue: 'amqper', // todo routeToQueueName(route)
  queueOpts: {durable: true, autoDelete: false, messageTtl: 30000, expires: 3600000},
  autoAck: false
};

/**
 *
 * Router which filters messages which pass through an exchange based on routing key.
 *
 * @param {String} route
 * @param {Object} options
 * @param {Function} handler
 * @constructor
 */
function Router(route, options, handler) {
  this.options = options = _.defaultsDeep(options, defaults);
  this.options.route = route;
  this.options.handler = handler;
  this.parser = new Parser(route);

  const that = this;

  function consumerTag() {
    return crypto.randomBytes(5).readUInt32BE(0).toString(16);
  }

  function subscribe(ch) {
    debug('subscribe', that.options.queue, that.options.exchange, that.options.route);

    // callback which is invoked each time a message matches the configured route.
    function handleMessage(data) {

      const message = data;

      message.params = that.parser.parse(data);
      message.channel = ch;
      message.ack = ack;

      // Ack method for the msg
      function ack() {
        debug('ack delivery', data.fields.deliveryTag);
        ch.ack(data);
      }

      if (Array.isArray(message)) {
        that.options.handler(message[0]);
      }
      else {
        that.options.handler(message);
      }
      debug('queue', that.options.queue);
      if (that.options.autoAck) {
        debug('autoAck', 'true');
        ack();
      }
    }

    const routingKey = that.options.route.replace(/:[a-zA-Z0-9]+/g, '*');
    debug('routingKey', routingKey);

    return PromiseA.all([
      ch.assertExchange(that.options.exchange, that.options.exchangeType),
      ch.assertQueue(that.options.queue, that.options.queueOpts),
      ch.bindQueue(that.options.queue, that.options.exchange, routingKey),
      ch.consume(that.options.queue, handleMessage, {consumerTag: that.consumerTag})
    ]);
  }

  /**
   * Initialise the route.
   *
   * @returns {Object}
   */
  this.init = function init() {
    debug('init', options.url, that.route);
    this.consumerTag = consumerTag();

    const open = this.connection = options.connection || amqp.connect(options.url);

    this.$promise = open.then(function (conn) {
      conn.on('error', that.cleanup);
      const ok = conn.createChannel();
      return ok.then(subscribe).then(function () {
        return ok;
      });
    });
    return this.$promise;
  };

  this.close = function close() {
    return this.connection.then(function (conn) {
      return conn.close();
    });
  };

  this.cleanup = function (err) {
    console.error('Exiting due to connection error: ', err);
    process.exit(-1);
  };

}
