'use strict';

const uuid      = require('uuid');
const BlackList = require('../models/blacktokens');

// TODO: при signout - удалять refresh_token и в черный список accees_token
exports.single = async ctx => {
    let access_token  = ctx.headers['x-access-token'] || ctx.query.access_token || ctx.cookies.get('x-access-token') || (ctx.request.body && ctx.request.body.access_token);
    let refresh_token = ctx.headers['x-refresh-token'] || ctx.query.refresh_token || ctx.cookies.get('x-refresh-token') || (ctx.request.body && ctx.request.body.refresh_token);

	if (!access_token || !refresh_token) return ctx.throw(400);

	let blackAccessToken = new BlackList({ token: access_token });

	await blackAccessToken.save();

	ctx.state.user.refresh_token = ctx.state.user.refresh_token.filter(token => refresh_token !== token);

	await ctx.state.user.save();

    ctx.cookies.set('x-access-token', null);
    ctx.cookies.set('x-refresh-token', null);

	ctx.status = 200;
};

// TODO: при signout all - инвалидировать token-ы и удалять refresh_token-ы
exports.all = async ctx => {
	let access_token = ctx.headers['x-access-token'] || ctx.query.access_token || ctx.cookies.get('x-access-token') || (ctx.request.body && ctx.request.body.access_token);

	if (!access_token) return ctx.throw(400);

	let blackAccessToken = new BlackList({ token: access_token });

	await blackAccessToken.save();

	ctx.state.user.refresh_token = [];
	ctx.state.user.token_uuid    = uuid();

	await ctx.state.user.save();

    ctx.cookies.set('x-access-token', null);
    ctx.cookies.set('x-refresh-token', null);

	ctx.status = 200;
};
