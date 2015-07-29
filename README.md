# amqper 
[![NPM version][npm-image]][npm-url] 
[![Build Status][circleci-image]][circleci-url] 
[![Dependency Status][daviddm-image]][daviddm-url]

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


[npm-image]: https://badge.fury.io/js/amqper.svg
[npm-url]: https://npmjs.org/package/amqper
[circleci-image]: https://circleci.com/gh/taoyuan/amqper.svg?style=shield
[circleci-url]: https://circleci.com/gh/taoyuan/amqper
[daviddm-image]: https://david-dm.org/taoyuan/amqper.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/taoyuan/amqper
