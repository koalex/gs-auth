'use strict';

const jwtokens = require('./tokens');

// TODO: при смене user.max_auth_devices на 1 инвалидировать все токены (менять token_uuid) и оставлять только 1 refresh_token
module.exports = async ctx => {
	await new Promise(resolve => { setTimeout(resolve, 500) }); // Anti-brutforce secure

	const Url = (new URL(ctx.href));

	const tokens = jwtokens.createTokens(ctx, ctx.state.user, {issuer: Url.origin, audience: Url.origin});

	if (!ctx.state.user.refresh_token) ctx.state.user.refresh_token = [];

	if (ctx.state.user.max_auth_devices == 1) {
		ctx.state.user.refresh_token = [tokens.refresh_token];
	} else {
		ctx.state.user.refresh_token.push(tokens.refresh_token);
	}

	ctx.state.user.last_activity   = Date.now();
	ctx.state.user.last_ip_address = ctx.request.ip;

	await ctx.state.user.save();

	if (!ctx.userAgent.isBot) {
		await jwtokens.setTokensCookies(ctx, tokens);
	}

	ctx.type = 'json';
	ctx.body = tokens;
};
