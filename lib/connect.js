"use strict";

var debug = require('debug')('amqper:connect');
var Promise = require('bluebird');
var amqp = require('./amqp');
var routify = require('./routify');
var Client = require('./client');

module.exports = function (options) {
  if (typeof options === 'string') {
    options = {url: options};
  }
  options = options || {};

  var client = new Client(options);

  client.$promise = Promise.try(function () {
    var url = options.url;

    if (!url) {
      throw new Error('AMQPFacet - `url` is required');
    }

    debug('Configuration for AMQPer using URL: ' + url);

    //var closeErr = new Error('AMQP connection closed by remote host (AMQP server).');
    var routerErr = new Error('Error in router acting on AMQP connection.');

    var open = Promise.resolve(amqp.connect(url));

    client.context = routify.createContext({
      connection: open
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
      return Promise.resolve(conn.createChannel()).then(function (channel) {
        client.channel = channel;
        debug('channel created');
        return conn;
      });
    });
  });

  return client;
};
