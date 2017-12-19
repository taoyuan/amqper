'use strict';

const assert = require('chai').assert;
const amqper = require('..');

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
      const client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function (conn) {
        assert.ok(conn);
        client.close(done);
      });
    });
  });

  describe('pubsub', function () {
    it('should publish and received in route', function (done) {
      const data = {
        foo: 'bar1'
      };

      const client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function () {
        client.route('test1.:arg', {queue: randomQueue()}, function (message) {
          assert.deepEqual(message.payload, data);
          delayCloseClient(client, done);
        }).then(function () {
          client.publish('amq.topic', 'test1.a', data);
        });
      });


    });

    it('should publish and received in route with msgpack format', function (done) {
      const data = {
        hello: 'world'
      };

      const client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function () {
        client.format('msgpack');
        client.route('test2.:arg', {queue: randomQueue()}, function (message) {
          assert.deepEqual(message.payload, data);
          delayCloseClient(client, done);
        }).then(function () {
          client.publish('amq.topic', 'test2.a', data);
        });
      });
    });

    it('should handle the error in handler', function (done) {
      const data = {
        hello: 'world'
      };

      const client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function () {
        client.route('test2.:arg', {queue: randomQueue()}, function () {
          throw new Error('boom');
        }).then(function () {
          client.publish('amq.topic', 'test2.a', data);
        });
      });
      client.on('error', function (err) {
        assert.equal(err.message, 'boom');
        delayCloseClient(client, done);
      });
    });
  });

});
