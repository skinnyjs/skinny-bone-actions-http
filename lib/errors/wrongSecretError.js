"use strict";

const createError = require('create-error');

const HttpTransportError = require('./httpTransportError');

const WrongSecretError = createError(HttpTransportError, 'WrongSecretError', { responseCode: 401 });

module.exports = WrongSecretError;