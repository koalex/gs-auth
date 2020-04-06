'use strict';

const moment = require('moment');
const User   = require('gs-users/models/user');
const isOid  = require('gen-server/utils/isObjectId');

exports.get = async ctx => {
	if (!isOid(ctx.params.userId)) return ctx.throw(404);

	const user = await User.findOne({ _id: String(ctx.params.userId), active: true, password_reset_token: String(ctx.params.token) });

	if (!user) return ctx.throw(404);

	if (moment(user.password_reset_expiration).valueOf() - moment(Date.now()).valueOf() < 0) {
		return ctx.throw(404);
	}

	ctx.body = 'CHANGE PASSWORD HTML PAGE';
};

exports.post = async ctx => {
	if (!isOid(ctx.params.userId)) {
		return ctx.throw(404, JSON.stringify({
            field: 'password',
            message: ctx.i18n.__('httpErrors.404')
        }));
	}

	const user = await User.findOne({ _id: String(ctx.params.userId), active: true, password_reset_token: String(ctx.params.token) });

	if (!user) return ctx.throw(400);

	if (moment(user.password_reset_expiration).valueOf() - moment(Date.now()).valueOf() < 0) {
		return ctx.throw(400);
	}

	// await User.updateMany({ _id: ctx.params.userId, active: true, password_reset_token: ctx.params.token }, { active: true, $unset: { password_reset_token: 1 }});

	user.password                  = String(ctx.request.body.password);
	user.password_reset_token      = undefined;
	user.password_reset_expiration = undefined;

	await user.save();

	ctx.status = 200;
};
