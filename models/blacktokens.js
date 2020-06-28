'use strict';

const mongoose = require('gen-server/lib/mongoose');

const blackTokenSchema = new mongoose.Schema({
		token: { type: String },
		creation_date: {
			type: Date,
			default: Date.now,
			expires: 30 // Через 30 сек. монга должна удалить документ, но по факуту время через которое докумен удалится будет больше!
		}
	},
	{ versionKey: false });

blackTokenSchema.path('token').validate(function (v) {
	if (!v || String(v).trim() === '') this.invalidate('token', 'auth.TOKEN_REQUIRED');
}, null);

module.exports = mongoose.model('BlackToken', blackTokenSchema);
