'use strict';

var debug = require('debug')('amqper:router');
var crypto = require('crypto');
var amqp = require('../amqp');
var when = require('when');
var _ = require('lodash');
var Message = require('./message');

module.exports = Router;

var defaults = {
  middleware: [],
  amqpUrl: 'amqp://guest:guest@localhost:5672',
  exchange: 'amq.topic',
  queue: 'amqper', // todo routeToQueueName(route)
  queueOpts: {durable: true, autoDelete: false, messageTtl: 30000, expires: 3600000},
  autoAck: false,
  errorHandler: function(err) {
    console.error(err);
  }
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
  this.options = options = _.defaults(options, defaults);
  this.options.route = route;
  this.options.handler = handler;
  this.message = new Message(route);

  var that = this;

  function consumerTag() {
    return crypto.randomBytes(5).readUInt32BE(0).toString(16);
  }

  function subscribe(ch) {
    debug('subscribe', that.options.queue, that.options.exchange, that.options.route);

    // callback which is invoked each time a message matches the configured route.
    function handleMessage(data) {

      var message = _.assign(that.message, data);

      message.parseRoutingKey();

      message.channel = ch;
      message.ack = ack;

      // Ack method for the msg
      function ack() {
        ch.ack(data);
      }

      (function handle(message) {
        // cater for pipeline returning an array if the array of functions passed was empty!?
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
      })(message);//, that.options.errorHandler);
    }

    var routingKey = that.options.route.replace(/:[a-zA-Z0-9]+/g, '*');
    debug('routingKey', routingKey);

    return when.all([
      ch.assertExchange(that.options.exchange, 'topic'),
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

    var open = this.connection = options.connection || amqp.connect(options.url);

    this.$promise = open.then(function(conn) {
      conn.on('error', that.cleanup);
      var ok = conn.createChannel();
      return ok.then(subscribe).then(function () {
        return ok;
      });
    });
    return this.$promise;
  };

  this.close = function close() {
    return this.connection.then(function(conn) {
      return conn.close();
    });
  };

  this.cleanup = function(err) {
    console.error('Exiting due to connection error: ', err);
    process.exit(-1);
  };

}
