# amqper 

[![NPM Version](https://img.shields.io/npm/v/amqper.svg?style=flat)](https://www.npmjs.org/package/amqper)
[![Build Status](http://img.shields.io/travis/taoyuan/amqper.svg?style=flat)](https://travis-ci.org/taoyuan/amqper)
[![Coverage](https://coveralls.io/repos/taoyuan/amqper/badge.svg?branch=master)](https://coveralls.io/r/taoyuan/amqper)
[![Quality](https://codeclimate.com/github/taoyuan/amqper/badges/gpa.svg)](https://codeclimate.com/github/taoyuan/amqper)
[![Dependencies](https://img.shields.io/david/taoyuan/amqper.svg?style=flat)](https://david-dm.org/taoyuan/amqper)

> A simple and elegant AMQP client for node based on amqplib.

## Install

```sh
$ npm install --save amqper
```

## Usage

### round-robin

Run multiple consumer.js for round-robin shared.

__consumer.js__

```js
var amqper = require('amqper');

var client = amqper.connect('amqp://guest:guest@localhost:5672');

client.$promise.then(function () {
  console.log('ready');
  client.route('test.a', function (message) {
    console.log(message.payload);
  });
});

```

__producer.js__

```js
var amqper = require('amqper');

var client = amqper.connect('amqp://guest:guest@localhost:5672');

client.$promise.then(function () {
  for (var i = 0; i < 10; i++) {
    client.publish('amq.topic', 'test.a', i);
  }
});

```

## License

MIT © [Tao Yuan]()
