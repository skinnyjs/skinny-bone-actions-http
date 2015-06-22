"use strict";

const fetch = require('node-fetch');
const Agent = require('agentkeepalive');

class Client {
    constructor(server, secret) {
        this.server = server;
        this.secret = secret;

        this.agent = new Agent({
            maxSockets: 100,
            maxFreeSockets: 10,
            timeout: 60000,
            keepAliveTimeout: 30000 // free socket keepalive for 30 seconds
        });
    }

    *run(action, params) {
        let headers;

        if (this.secret) {
            headers = {
                Authorization: 'Basic ' + (new Buffer(this.secret + ':').toString('base64'))
            }
        }

        var response = yield fetch(`http://${this.server}/${action}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
            agent: this.agent
        });

        return yield response.json();
    }
}

module.exports = Client;