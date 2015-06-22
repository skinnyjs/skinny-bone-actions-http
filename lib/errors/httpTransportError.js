"use strict";

const createError = require('create-error');

const HttpTransportError = createError('HttpTransportError', { responseCode: 500 });

module.exports = HttpTransportError;