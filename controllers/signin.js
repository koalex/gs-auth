'use strict';

const passport  = require('koa-passport');
const genTokens = require('./generateTokens');

passport.use('local', require('../strategies/local'));

// TODO: при смене user.max_auth_devices на 1 инвалидировать все токены (менять token_uuid) и оставлять только 1 refresh_token
module.exports = async ctx => {
	await new Promise(resolve => { setTimeout(resolve, 500) }); // Anti-brutforce secure

	await passport.authenticate('local', async (err, user, info, status) => {
		if (err) return ctx.throw(err);

		if (!user) {
			// TODO: check
			return ctx.throw(400, info ? (info.field && !Array.isArray(info)) ? JSON.stringify([info]) : info.message ? info.message: null : null);
        }

		ctx.state.user = user;

		let tokens = genTokens(user);

		if (!user.refresh_token) user.refresh_token = [];

		if (user.max_auth_devices == 1) {
			user.refresh_token = [tokens.refresh_token];
		} else {
			user.refresh_token.push(tokens.refresh_token);
		}

		user.last_activity   = Date.now();
		user.last_ip_address = ctx.request.ip;

		await user.save();

		let origin = (new URL(ctx.href)).origin;

        ctx.cookies.set('x-access-token',  tokens.access_token,  { signed: true, secure: ctx.secure, httpOnly: true, domain: origin }); // FIXME: для DEV origin
        ctx.cookies.set('x-refresh-token', tokens.refresh_token, { signed: true, secure: ctx.secure, httpOnly: true, domain: origin }); // FIXME: для DEV origin

		ctx.type = 'json';
		ctx.body = tokens;

	})(ctx);
};
