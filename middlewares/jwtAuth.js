'use strict';

const config    = require('gen-server/lib/config');
const passport  = require('koa-passport');
const jwt       = require('jsonwebtoken');
const BlackList = require('../models/blacktokens');

passport.use('jwt', require('../strategies/jwt'));

module.exports = async (ctx, next) => {
    await passport.authenticate('jwt', async (err, user, info, status) => {
        if (err) return ctx.throw(err);

        if (user) {
            if (user.locked) return ctx.throw(403, ctx.i18n.__('user.USER_BLOCKED'));

            let token  = ctx.headers['x-access-token'] || ctx.query.access_token || ctx.cookies.get('x-access-token') || (ctx.request.body && ctx.request.body.access_token);
            let denied = await BlackList.findOne({ token }).lean().exec();

            let payload;

            try {
                payload = jwt.verify(token, Array.isArray(config.secret) ? config.secret[0] : config.secret);
            } catch (err) {
                return ctx.throw(401);
            }

            if (payload.token_uuid !== user.token_uuid) return ctx.throw(401);

            if (!denied) {
                user.last_activity   = Date.now();
                user.last_ip_address = ctx.request.ip;

                await user.save();

                ctx.state.user = user;
            } else {
                return ctx.throw(401);
            }
        } else {
            return ctx.throw(401);
        }

        await next();

    })(ctx, next);
};
