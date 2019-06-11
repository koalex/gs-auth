'use strict';

const config    = require('config');
const jwt       = require('jsonwebtoken');
const genTokens = require('./generateTokens');
const User      = require('gs-users/models/user');
const isOid     = require('gen-server/utils/isObjectId');

module.exports = async ctx => {
	let refreshToken = ctx.request.body.refresh_token || ctx.query.refresh_token || ctx.headers['x-refresh-token'];
	let payload;
	let userId;

	try {
		payload = jwt.decode(refreshToken, { complete: true }).payload;
		userId  = payload.user_id;
	} catch (err) {
		return ctx.throw(500);
	}

	if (!isOid(userId)) {
		return ctx.throw(500);
	}

	try {
		userId = jwt.verify(refreshToken, Array.isArray(config.secret) ? config.secret[0] : config.secret).user_id;
	} catch (err) {
		let user = await User.findOne({ _id: userId });

		if (Array.isArray(user.refresh_token)) {
			user.refresh_token = user.refresh_token.filter(token => refreshToken !== token);
			await user.save();
		} else if (user.refresh_token == refreshToken) {
			user.refresh_token = [];
		}

		return ctx.throw(401);
	}


	let user = await User.findOne({ _id: userId });

	if ((user.max_auth_devices == 1) && (user.refresh_token[0] != refreshToken)) {
		return ctx.throw(401);
	}

	let tokens = genTokens(user);

	if (!user.refresh_token) user.refresh_token = [];

	if (user.max_auth_devices == 1) {
		user.refresh_token = [tokens.refresh_token];
	} else {
		user.refresh_token.push(tokens.refresh_token);

		if (user.refresh_token.length > user.max_auth_devices) {
			// TODO: может если превышено, то еще и всех авторизованных ранее выбрасывать (менять token_uuid) или блокировать пользователя с возможностью разблокировки только через email ???
			user.refresh_token = [tokens.refresh_token];
		}
	}

	user.last_activity   = Date.now();
	user.last_ip_address = ctx.request.ip;

	await user.save();

	ctx.body = tokens;
};
