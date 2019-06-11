'use strict';

const config = require('gen-server/lib/config');
const jwt    = require('jsonwebtoken');

module.exports = function (user) {
	if (!user) throw new Error('User required.');

	let expires_in = 60 * 30; // 30 min in seconds

	let access_token = jwt.sign({ user_id: user._id, token_uuid: user.token_uuid }, Array.isArray(config.secret) ? config.secret[0] : config.secret, {
		algorithm: 'HS512',
		expiresIn: expires_in
	});

	let refresh_token = jwt.sign({ user_id: user._id, token_uuid: user.token_uuid }, Array.isArray(config.secret) ? config.secret[0] : config.secret, {
		algorithm: 'HS512',
		expiresIn: 86400 * 60 // 60 days
	});

	return { access_token, refresh_token, expires_in: Date.now() + (expires_in * 1000) }
};
