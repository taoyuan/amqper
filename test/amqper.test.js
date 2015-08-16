'use strict';

var t = require('chai').assert;
var amqper = require('../');

function randomQueue() {
  return require('uuid').v4();
}

function delayCloseClient(client, done) {
  setTimeout(function () {
    client.close(done);
  }, 100);
}

describe('amqper', function () {
  this.timeout(10000);

  describe('connect', function () {
    it('should connect to rabbit server', function (done) {
      var client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function (conn) {
        t.ok(conn);
        client.close(done);
      });
    });
  });

  describe('pubsub', function () {
    it('should publish and received in route', function (done) {
      var data = {
        foo: 'bar1'
      };

      var client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function () {
        client.route('test1.:arg', {queue: randomQueue()}, function (message) {
          t.deepEqual(message.payload, data);
          delayCloseClient(client, done);
        }).then(function () {
          client.publish('amq.topic', 'test1.a', data);
        });
      });


    });

    it('should publish and received in route with msgpack format', function (done) {
      var data = {
        hello: 'world'
      };

      var client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function () {
        client.format('msgpack');
        client.route('test2.:arg', {queue: randomQueue()}, function (message) {
          t.deepEqual(message.payload, data);
          delayCloseClient(client, done);
        }).then(function () {
          client.publish('amq.topic', 'test2.a', data);
        });
      });
    });

    it('should handle the error in handler', function (done) {
      var data = {
        hello: 'world'
      };

      var client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function () {
        client.route('test2.:arg', {queue: randomQueue()}, function () {
          throw new Error('boom');
        }).then(function () {
          client.publish('amq.topic', 'test2.a', data);
        });
      });
      client.on('error', function (err) {
        t.equal(err.message, 'boom');
        delayCloseClient(client, done);
      });
    });
  });

});
