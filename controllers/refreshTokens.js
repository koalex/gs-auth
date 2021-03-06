'use strict';

const jwtokens = require('./tokens');

module.exports = async ctx => {
	const tokens = await jwtokens.refreshTokens(ctx);

	if (!ctx.userAgent.isBot) {
		await jwtokens.setTokensCookies(ctx, tokens);
	}

	if (!tokens) return;

	ctx.type = 'json';
	ctx.body = tokens;
};
