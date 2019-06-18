'use strict';

const uuid      = require('uuid');
const jwtokens  = require('./tokens');

// TODO: при signout - удалять refresh_token и в черный список accees_token
exports.single = async ctx => {
    const access_token  = ctx.headers['x-access-token'] || ctx.query.access_token || ctx.cookies.get('x-access-token') || (ctx.request.body && ctx.request.body.access_token);
    const refresh_token = ctx.headers['x-refresh-token'] || ctx.query.refresh_token || ctx.cookies.get('x-refresh-token') || (ctx.request.body && ctx.request.body.refresh_token);

	if (!access_token || !refresh_token) return ctx.throw(400);

	const Url = (new URL(ctx.href));

	try {
		const verifyOpts = {
			subject: String(ctx.state.user._id),
			audience: Url.origin,
			issuer: Url.origin
		};

		await Promise.all([
			jwtokens.addTokenToBlackList(access_token, verifyOpts),
			jwtokens.addTokenToBlackList(refresh_token, verifyOpts)
		]);
	} catch (err) {
		throw err;
	}
	ctx.state.user.refresh_token = ctx.state.user.refresh_token.filter(token => refresh_token !== token);

	await ctx.state.user.save();

	if (!ctx.userAgent.isBot) {
		await jwtokens.clearTokensCookies(ctx);
	}

	await jwtokens.removeExpiredBlackTokens();

	ctx.status = 200;
};

// TODO: при signout all - инвалидировать token-ы и удалять refresh_token-ы
exports.all = async ctx => {
	const Url = (new URL(ctx.href));

	if (Array.isArray(ctx.state.user.refresh_token) && ctx.state.user.refresh_token.length) {
		const rTokens = ctx.state.user.refresh_token;
		const verifyOpts = {
			subject: String(ctx.state.user._id),
			audience: Url.origin,
			issuer: Url.origin
		};

		await Promise.all(rTokens.map(token => {
			return jwtokens.addTokenToBlackList(token, verifyOpts);
		}));
	}

	ctx.state.user.refresh_token = [];
	ctx.state.user.token_uuid    = uuid();

	await ctx.state.user.save();

	if (!ctx.userAgent.isBot) {
		await jwtokens.clearTokensCookies(ctx);
	}

	await jwtokens.removeExpiredBlackTokens();

	ctx.status = 200;
};
