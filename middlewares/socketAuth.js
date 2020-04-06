const tokensCtrl = require('../controllers/tokens');
const isOid      = require('gen-server/utils/isObjectId');
const User       = require('gs-users/models/user');
const BlackList  = require('../models/blacktokens');

async function getUserFromSocket (socket) {
	try {
		if (!socket.handshake.headers.origin) return;
		const origin = (new URL(socket.handshake.headers.origin)).origin;
		const token  = tokensCtrl.jwtFromSocket(socket);
		const denied = await BlackList.findOne({ token }).lean().exec();

		if (denied) return;

		const jwtPayload = tokensCtrl.verify(token, {audience: origin, issuer: origin});
		const userId     = String(jwtPayload.sub);
		const tokenUuid  = String(jwtPayload.token_uuid);

		if (!isOid(userId)) return;

		const user = await User.findOne({ _id: userId, active: true });

		if (!user || (user && user.token_uuid !== tokenUuid) || (user && user.locked)) return;

		if (user) return user;
	} catch (err) {
		// TODO: log
	}
}

function createMiddleware (allow) {
	return async (socket, next) => {
		const user = await getUserFromSocket(socket);
		if (user) {
			user.last_activity   = Date.now();
			user.last_ip_address = socket.handshake.address; // TODO: socket.handshake.headers["x-forwarded-for"].split(",")[0];
			await user.save();
			socket.client.user = user;
			socket.join(String(user._id));
			return next();
		} else if (allow) {
			return next();
		} else {
			return next(new Error(socket.client.i18n.__('httpErrors.401')));
		}
	}
}

exports.allowIfUserNotFound = createMiddleware(true);
exports.auth = createMiddleware();
