"use strict";

var debug = require('debug')('amqper:connect');
var _ = require('lodash');
var when = require('when');
var amqp = require('./amqp');
var routify = require('./routify');
var Client = require('./client');

module.exports = function (options) {
  if (typeof options === 'string') {
    options = {url: options};
  }
  options = options || {};

  var client = new Client(options);

  client.$promise = when.try(function () {
    var url = options.url;

    if (!url) {
      throw new Error('AMQPFacet - `url` is required');
    }

    debug('Configuration for AMQPer using URL: ' + url);

    //var closeErr = new Error('AMQP connection closed by remote host (AMQP server).');
    var routerErr = new Error('Error in router acting on AMQP connection.');

    var open = when(amqp.connect(url));

    client.context = routify.createContext({
      connection: open,
      errorHandler: client.emit.bind(client, 'error', routerErr)
    });

    var setup = open.then(function (conn) {
      debug('connected');
      client.conn = conn;
      client.connected = true;

      conn.on('close', function () {
        client.connected = false;
        client.emit('close');
      });

      conn.on('error', client.emit.bind(client, 'error'));

      return conn;
    });

    return setup.then(function (conn) {
      // now we're set up, get a channel for publishes
      return when(conn.createChannel()).then(function (channel) {
        client.channel = channel;
        debug('channel created');
        return conn;
      });
    });
  });

  return client;
};
