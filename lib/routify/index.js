"use strict";

const Context = require('./context');

exports.createContext = settings => new Context(settings);
