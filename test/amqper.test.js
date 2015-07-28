'use strict';


var t = require('chai').assert;
var amqper = require('../');

describe('amqper', function () {

  describe('connect', function () {
    this.timeout(10000);

    it('should connect to rabbit server', function (done) {
      var client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function (conn) {
        t.ok(conn);
        done();
      });
    });
  });

  describe('pubsub', function () {
    this.timeout(10000);

    it('should publish and received in route', function (done) {
      var data = {
        foo: 'bar'
      };

      var client = amqper.connect('amqp://guest:guest@localhost:5672');
      client.$promise.then(function (conn) {
        client.route('test.:arg', {queue: 'this_is_queue_name'}, function (message) {
          console.log(message.payload);
          t.deepEqual(message.payload, data);
          done();
        });
        setTimeout(function () {
          client.publish('amq.topic', 'test.a', data);
        }, 500); // delay some time to publish
      });
    });
  });
});
