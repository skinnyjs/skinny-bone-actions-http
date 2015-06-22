"use strict";

const chai = require('chai');
const sinon = require('sinon');

chai.use(require('sinon-chai'));

require('mocha-sinon');

process.env.NODE_ENV = 'testing';


const expect = chai.expect;
const co = require('co');

const skinny = require('skinny');
const Client = require('./client');
const Server = require('./server');

describe('Http transport client', function() {
    let server;
    let client;
    let host = '127.0.0.1';
    let port = 1234;
    let secret = '123';

    before(co.wrap(function *() {
        client = new Client(`${host}:${port}`, secret);

        server = new Server(skinny, {
            secret,
            host,
            port
        });

        yield server.listen();
    }));

    after(co.wrap(function* () {
        yield server.close();
    }));

    beforeEach(function () {
        skinny.actions = {
            test: this.sinon.stub().returns(Promise.resolve({ok: true}))
        }
    });

    it('should run remote actions by http', co.wrap(function *() {
        let params = {
            number: 1,
            string: '2',
            object: {
                number: 1,
                string: '2'
            }
        };

        let response = yield client.run('test', params);

        expect(response).to.be.deep.equal({
            status: 'success',
            data: {
                ok: true
            }
        });

        expect(skinny.actions.test).to.be.calledWith(params);
    }));
});