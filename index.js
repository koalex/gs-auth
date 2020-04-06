require('./socket');
const routers = require('./router');

module.exports = app => {
    routers.forEach(router => {
        app.use(router.routes());
    });
};
