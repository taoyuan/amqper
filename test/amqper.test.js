'use strict';


var t = require('chai').assert;
var amqper = require('../');

describe('amqper', function () {

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
        client.route('test1.:arg', {queue: 'this_is_queue_name_1'}, function (message) {
          console.log(message.payload);
          t.deepEqual(message.payload, data);
          client.close(function () {
            t.lengthOf(client.svcs_container.routes, 0);
            done();
          });
        });
        client.publish('amq.topic', 'test1.a', data);
      });
    });

    it('should publish and received in route with msgpack format', function (done) {
      var data = {
        hello: 'world'
      };

      var client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function () {
        client.format('msgpack');
        client.route('test2.:arg', {queue: 'this_is_queue_name_2'}, function (message) {
          console.log(message.payload);
          t.deepEqual(message.payload, data);
          client.close(function () {
            t.lengthOf(client.svcs_container.routes, 0);
            done();
          });
        });
        client.publish('amq.topic', 'test2.a', data);
      });
    });
  });
});
