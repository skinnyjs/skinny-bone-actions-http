"use strict";

const createError = require('create-error');
const HttpTransportError = require('./httpTransportError');
const BadRequestError = createError(HttpTransportError, 'InvalidRequestError', { responseCode: 400 });

module.exports = BadRequestError;