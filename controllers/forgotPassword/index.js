'use strict';

const crypto        = require('crypto');
const mailer        = require('gen-server/lib/nodemailer');
const User          = require('gs-users/models/user');
const isEmail       = require('gen-server/utils/isEmail');
const emailTemplate = require('./emailTemplate');

module.exports = async ctx => {
	if (!isEmail(ctx.request.body.email)) {
		return ctx.throw(400, JSON.stringify({
            field: 'email',
            message: ctx.i18n.__('user.WRONG_EMAIL')
        }));
	}

	await new Promise(resolve => { setTimeout(resolve, 1000) }); // Secure

	let user = await User.findOne({ email: String(ctx.request.body.email) });

	if (!user) {
		return ctx.throw(400, JSON.stringify({
            field: 'email',
            message: ctx.i18n.__('user.USER_NOT_FOUND')
        }));
	}

	if (!user.active) {
		return ctx.throw(403, JSON.stringify({ // TODO: на клиенте проверять статус и выводить просьбу отправить письмо еще раз
            field: 'email',
            message: ctx.i18n.__('user.USER_NOT_ACTIVATED')
        }));
	}

	let token = await new Promise((resolve, reject) => {
		crypto.randomBytes(20, (err, buf) => {
			if (err) return reject(err);
			resolve(buf.toString('hex'));
		});
	});

	user.password_reset_token      = token;
	user.password_reset_expiration = Date.now() + 3600000; // 1 hour

	await user.save();

	await mailer['no-reply'].sendMail({ // FIXME: поменять шаблон как на авторизации
		to: ctx.request.body.email,
		subject: ctx.i18n.__('auth.password_change_mail.SUBJECT'),
		html: emailTemplate({
			path: '/users/' + user._id + '/password-reset/' + token,
			email: ctx.request.body.email,
			reportToSupport: ctx.i18n.__('auth.password_change_mail.REPORT_TO_SUPPORT'),
			bottomText: ctx.i18n.__('auth.password_change_mail.BOTTOM_TEXT'),
			resetPassword: ctx.i18n.__('auth.password_change_mail.RESET_PASSWORD'),
			forConfirmClick: ctx.i18n.__('auth.password_change_mail.FOR_CONFIRM_CLICK')
		})
	});

	ctx.status = 200;
};
