"use strict";

const createError = require('create-error');
const HttpTransportError = require('./httpTransportError');

const ServiceError = createError(HttpTransportError, 'ServiceError', { responseCode: 500 });

module.exports = ServiceError;