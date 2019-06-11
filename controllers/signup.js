'use strict';

const uuid                      = require('uuid');
const disposable                = require('disposable-email');
const disposable2               = require('disposable-email-domains');
const wildcards					= require('disposable-email-domains/wildcard.json');
const { sendActivationOnEmail } = require('gs-users/controllers/userActivation/index');
const User                      = require('gs-users/models/user');

module.exports = async ctx => {
	await new Promise(resolve => { setTimeout(resolve, 500) }); // Anti-Bruteforce

    // TODO: проверить как работает каждый disposable
	let disposableEmail = 'string' === typeof ctx.request.body.email && (!disposable.validate(ctx.request.body.email) || disposable2.some(domain => ctx.request.body.email.includes(domain)) || wildcards.some(domain => ctx.request.body.email.includes(domain)));

	if (disposableEmail) {
		return ctx.throw(400, JSON.stringify({
            field: 'email',
            message: ctx.i18n.__('user.EMAIL_DENIED')
        }));
	}

	let emailExist = await User.findOne({ email: String(ctx.request.body.email) }).lean().exec();

	if (!!emailExist) {
		return ctx.throw(400, JSON.stringify({
            field: 'email',
            message: ctx.i18n.__('user.EMAIL_ALREADY_TAKEN')
        }));
	}

	let user = new User(ctx.request.body);
		user.active           = false;
		user.last_ip_address  = ctx.request.ip;
		user.activation_token = uuid.v4();
		user.token_uuid       = uuid();

	await user.save();

	await sendActivationOnEmail(user, {
        host: (new URL(ctx.href)).origin,
        subject: ctx.i18n.__('userActivation.emailV2.SUBJECT'),
        headerText: ctx.i18n.__('userActivation.emailV2.HEADER_TEXT'),
        topText: ctx.i18n.__('userActivation.emailV2.TOP_TEXT'),
        buttonText: ctx.i18n.__('userActivation.emailV2.BUTTON_TEXT'),
        underButtonText: ctx.i18n.__('userActivation.emailV2.UNDER_BUTTON_TEXT'),
        footerText: ctx.i18n.__('userActivation.emailV2.FOOTER_TEXT'),
        footerLinkText: ctx.i18n.__('userActivation.emailV2.FOOTER_LINK_TEXT'),
        footerText2: ctx.i18n.__('userActivation.emailV2.FOOTER_TEXT_2'),
        footerLinkText2: ctx.i18n.__('userActivation.emailV2.FOOTER_LINK_TEXT_2')
	});

	ctx.status = 200; // TODO: если выставлять 201 то отправлять ответом в Location новый ресурс
};
