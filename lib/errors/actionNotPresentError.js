"use strict";

const createError = require('create-error');

const BadRequestError = require('./badRequestError');

const ActionNotPresentError = createError(BadRequestError, 'ActionNotPresent', { responseCode: 404 });

module.exports = ActionNotPresentError;