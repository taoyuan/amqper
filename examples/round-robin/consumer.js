"use strict";

var amqper = require('../../');

var client = amqper.connect('amqp://guest:guest@localhost:5672');

client.$promise.then(function () {
  console.log('ready');
  client.route('test.a', {}, function (message) {
    console.log(message.payload);
  });
});
