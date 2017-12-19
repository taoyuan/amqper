"use strict";

const debug = require('debug')('amqper:connect');
const PromiseA = require('bluebird');
const amqp = require('./amqp');
const routify = require('./routify');
const Client = require('./client');

module.exports = function (options) {
  if (typeof options === 'string') {
    options = {url: options};
  }
  options = options || {};

  const client = new Client(options);

  client.$promise = PromiseA.try(function () {
    const url = options.url;

    if (!url) {
      throw new Error('AMQPFacet - `url` is required');
    }

    debug('Configuration for AMQPer using URL: ' + url);

    //const closeErr = new Error('AMQP connection closed by remote host (AMQP server).');
    const routerErr = new Error('Error in router acting on AMQP connection.');

    const open = PromiseA.resolve(amqp.connect(url));

    client.context = routify.createContext({
      connection: open
    });

    const setup = open.then(function (conn) {
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
      return PromiseA.resolve(conn.createChannel()).then(function (channel) {
        client.channel = channel;
        debug('channel created');
        return conn;
      });
    });
  });

  return client;
};
