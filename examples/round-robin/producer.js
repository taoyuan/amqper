"use strict";

const PromiseA = require('bluebird');
const amqper = require('../..');

const client = amqper.connect('amqp://guest:guest@localhost:5672');

function publish(i) {
  client.publish('amq.topic', 'test.a', i).then(() => {
    console.log('published ' + i);
  });
}

let i = 0;

(async () => {
  while (true) {
    await PromiseA.delay(1000);
    publish(i++);
  }
})();
