"use strict";

// patch the amqp lib for connection close

module.exports = require('amqplib');

var Connection = require('amqplib/lib/connection').Connection;

var close = Connection.prototype.close;

Connection.prototype.close = function (cb) {
  if (this.closing || this.closed) return cb && cb();
  this.closing = true;
  this.once('close', function () {
    this.closed = true;
    this.cloing = false;
  });
  close.call(this, cb);
};
