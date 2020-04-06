const Socket   = require('gen-server/lib/socket');
const socketMW = require('./middlewares/socketAuth');

Socket.io.use(socketMW.allowIfUserNotFound);
