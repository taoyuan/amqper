"use strict";

const amqper = require('../..');

const client = amqper.connect('amqp://guest:guest@localhost:5672');

client.route('test.a', {}, function (message) {
  console.log(message.payload);
});
