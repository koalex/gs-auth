const passport  = require('koa-passport');

passport.use('local', require('../strategies/local'));
passport.use('jwt',   require('../strategies/jwt'));

module.exports = {
    initialize: function () {
      return passport.initialize();
    },
    authenticate: (strategy, opts) => {
        return async (ctx, next) => {
            await passport.authenticate(strategy, opts, async (err, user, info) => {
                if (err) return ctx.throw(err);

                if (!user) {
                    // TODO: check
                    return ctx.throw('local' === strategy ? 400 : 401, info ? (info.field && !Array.isArray(info)) ? JSON.stringify([info]) : info.message ? info.message: null : null);
                }

                ctx.state.user = user;

                await next();
            })(ctx, next);
        }
    }
};