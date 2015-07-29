"use strict";

var amqper = require('../../');

var client = amqper.connect('amqp://guest:guest@localhost:5672');

client.$promise.then(function () {
  for (var i = 0; i < 10; i++) {
    client.publish('amq.topic', 'test.a', i);
  }
});
