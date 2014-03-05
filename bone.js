var HttpTransport = require('./httpTransport');

module.exports = function attachHttpTransport(skinny, options) {
    "use strict";

    skinny.httpTransport = new HttpTransport(skinny, options);

    skinny.on('*initialize', function *initializeHttpTransport() {
        yield skinny.httpTransport.listen();
    });

    skinny.on('*shutdown', function *shutdownHttpTransport() {
        yield skinny.httpTransport.close();
    });
};