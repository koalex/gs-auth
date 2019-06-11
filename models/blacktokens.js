'use strict';

const mongoose = require('gen-server/lib/mongoose');

const blackTokenSchema = new mongoose.Schema({
		token: { type: String }
	},
	{ versionKey: false });

blackTokenSchema.path('token').validate(function (v) {
	if (!v || String(v).trim() === '') this.invalidate('token', 'auth.TOKEN_REQUIRED');
}, null);

module.exports = mongoose.model('BlackToken', blackTokenSchema);
