const Server = require('./lib/server');
const Client = require('./lib/client');

module.exports = function attachHttpTransport(skinny, options) {
    "use strict";

    skinny.actionsHttpServer = new Server(skinny, options);

    skinny.on('*initialize', function *initializeActionsHttpServer() {
        yield skinny.actionsHttpServer.listen();
    });

    skinny.on('*shutdown', function *shutdownActionsHttpServer() {
        yield skinny.actionsHttpServer.close();
    });
};