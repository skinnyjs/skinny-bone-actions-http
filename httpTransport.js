"use strict";

var http = require('http');
var url = require('url');
var util = require('util');
var qs = require('qs');

var co = require('co');
var coBody = require('co-body');
var bluebird = require('bluebird');

var createError = require('create-error');

function HttpTransport(skinny, options) {
    this.skinny = skinny;
    this.options = options;

    this.server = this._createServer();

    if (options.connectionTimeout) {
        this.server.timeout = options.connectionTimeout;
    }
}

var HttpTransportError = createError('HttpTransportError', { responseCode: 500 });
var ServiceError = createError(HttpTransportError, 'ServiceError', { responseCode: 500 });
var WrongSecretError = createError(HttpTransportError, 'WrongSecretError', { responseCode: 401 });
var BadRequestError = createError(HttpTransportError, 'InvalidRequestError', { responseCode: 400 });
var ActionNotPresent = createError(BadRequestError, 'ActionNotPresent', { responseCode: 404 });

HttpTransport.prototype.ERRORS = {
    HttpTransportError: HttpTransportError,
    ServiceError:       ServiceError,
    WrongSecretError:   WrongSecretError,
    BadRequestError:    BadRequestError,
    ActionNotPresent:   ActionNotPresent
};

HttpTransport.prototype.listen = function listen() {
    return this.server.listenAsync(this.options.port, this.options.host);
};

HttpTransport.prototype.close = function close() {
    return this.server.closeAsync();
};

HttpTransport.prototype._handleRequest = function _handleRequest(req, res) {
    return co(function *() {
        try {
            // Authenticate
            var token = (req.headers.authorization || '').split(/\s+/).pop() || '';
            var auth = new Buffer(token, 'base64').toString();
            var requestSecret = auth.split(/:/).shift() || '';

            if (this.options.secret !== undefined && requestSecret !== this.options.secret) {
                throw new WrongSecretError('Wrong secret!');
            }

            // Get params
            var parsedUrl = url.parse(req.url);

            var actionName = parsedUrl.pathname.substring(1);

            if (!this.skinny.actions[actionName]) {
                throw new ActionNotPresent('Action "' + actionName + '" not present!');
            }

            var params = qs.parse(parsedUrl.query);

            if (req.method == "POST") {
                var bodyParams = yield coBody.json(req);
                params = util._extend(bodyParams, params);
            }

            // Run action
            var actionSkinny = this.skinny.newSkinny();

            actionSkinny.httpRequest = req;
            actionSkinny.httpResponse = res;

            var actionResponse = yield this.skinny.actions[actionName](params, actionSkinny);

            if (!res.headersSent) {
                if (!res.getHeader('Content-Type')) {
                    res.setHeader('Content-Type', 'application/json');
                }

                res.writeHead(res.statusCode || 200);

                var response = { status: 'success' };
                if (actionResponse !== undefined) {
                    response.data = actionResponse;
                }

                res.write(JSON.stringify(response));
            }

            res.end();
        } catch (e) {
            this.skinny.emit('warning', e);

            if (e instanceof this.skinny.actions.ERRORS.ActionsError) {
                e = new BadRequestError(e.name + ': ' + e.message);
            } else if (!(e instanceof HttpTransportError)) {
                e = new ServiceError(e.name + ': ' + e.message);
            }

            var status = e.responseCode >= 400 && e.responseCode <= 499 ? 'error' : 'fail';
            var response = JSON.stringify({ status: status, errorCode: e.name, errorMessage: e.message });

            console.dir(this.skinny.actions.ERRORS);
            res.writeHead(e.responseCode, { 'Content-Type': 'application/json' });
            res.end(response);
        }
    }.bind(this)).catch(function(error) {
        this.skinny.emit('error', error);
        
        return error;
    }.bind(this));
};

HttpTransport.prototype._createServer = function _createServer() {
    var server = http.createServer(this._handleRequest.bind(this));

    bluebird.promisifyAll(server);

    return server;
};

module.exports = HttpTransport;