"use strict";

const chai = require('chai');
const sinon = require('sinon');

chai.use(require('sinon-chai'));

require('mocha-sinon');

process.env.NODE_ENV = 'testing';