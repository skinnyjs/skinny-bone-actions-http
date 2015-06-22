"use strict";

const http = require('http');
const url = require('url');
const util = require('util');
const qs = require('qs');

const co = require('co');
const coBody = require('co-body');
const bluebird = require('bluebird');

const ActionError = require('skinny-bone-actions/lib/errors/actionError');
const WrongSecretError = require('./errors/wrongSecretError');
const BadRequestError = require('./errors/badRequestError');
const ServiceError = require('./errors/serviceError');
const HttpTransportError = require('./errors/httpTransportError');
const ActionNotPresentError = require('./errors/actionNotPresentError');

class Server {
    constructor(skinny, options) {
        this.skinny = skinny;
        this.options = options;

        this.server = this._createServer();

        if (options.connectionTimeout) {
            this.server.timeout = options.connectionTimeout;
        }
    }

    listen() {
        return this.server.listenAsync(this.options.port, this.options.host);
    }

    close() {
        if (this.server.address()) {
            return this.server.closeAsync();
        } else {
            return Promise.resolve();
        }
    }

    _handleRequest(req, res) {
        return co(function *() {
            try {
                // Authenticate
                if (this.options.secret !== undefined) {
                    var token = (req.headers.authorization || '').split(/\s+/).pop() || '';
                    var auth = new Buffer(token, 'base64').toString();
                    var requestSecret = auth.split(/:/).shift() || '';

                    if (requestSecret !== this.options.secret) {
                        throw new WrongSecretError('Wrong secret!');
                    }
                }

                // Get params
                var parsedUrl = url.parse(req.url);

                var actionName = parsedUrl.pathname.substring(1);

                if (!this.skinny.actions[actionName]) {
                    throw new ActionNotPresentError('Action "' + actionName + '" not present!');
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

                if (e instanceof ActionError) {
                    e = new BadRequestError(e.name + ': ' + e.message);
                } else if (!(e instanceof HttpTransportError)) {
                    e = new ServiceError(e.name + ': ' + e.message);
                }

                var status = e.responseCode >= 400 && e.responseCode <= 499 ? 'error' : 'fail';
                var response = JSON.stringify({ status: status, errorCode: e.name, errorMessage: e.message });

                res.writeHead(e.responseCode, { 'Content-Type': 'application/json' });
                res.end(response);
            }
        }.bind(this)).catch(function(error) {
            this.skinny.emit('error', error);

            return error;
        }.bind(this));
    }

    _createServer() {
        var server = http.createServer(this._handleRequest.bind(this));

        bluebird.promisifyAll(server);

        return server;
    }
}

module.exports = Server;