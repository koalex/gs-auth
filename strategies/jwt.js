'use strict';

const config      = require('config');
const User        = require('gs-users/models/user');
const BlackList   = require('../models/blacktokens');
const verify      = require('../controllers/tokens').verify;
const JwtStrategy = require('passport-jwt').Strategy;
const isOid       = require('gen-server/utils/isObjectId');

const opts = {};
      opts.passReqToCallback = true;
      opts.secretOrKey = config.secret;
      opts.ignoreExpiration = false;
      opts.jwtFromRequest = req => {
          const token = req.query.access_token || (req.body && req.body.access_token) || req.headers['x-access-token'] || req.cookies.get('x-access-token');
          return token;
      };

module.exports = new JwtStrategy(opts, async (req, jwtPayload, done) => {
    const token     = req.query.access_token || (req.body && req.body.access_token) || req.headers['x-access-token'] || req.cookies.get('x-access-token');
    const denied    = await BlackList.findOne({ token }).lean().exec();
    const userId    = String(jwtPayload.sub);
    const tokenUuid = String(jwtPayload.token_uuid);

    if (!isOid(userId) || denied) return done(null, false);
    const origin = (new URL(req.href)).origin;

    try {
        verify(token, {
            subject: String(userId),
            audience: origin,
            issuer: origin
        });

        const user = await User.findOne({ _id: userId, active: true });

        if (user && user.token_uuid !== tokenUuid) {
            return done(null, false);
        }

        if (user && user.locked) {
            // await user.incSigninAttempts(false);  // BLOCK FOR ALL SESSIONS TODO: подобрать кейс иначе не нужно
            return done(null, false, { message: 'user.ACCOUNT_BLOCKED' });
        }
        if (user) {
            user.last_activity   = Date.now();
            user.last_ip_address = req.ip;
            await user.save();
            done(null, user);
        } else {
            done(null, false);
        }
    } catch (err) {
        return done(err, false);
    }
});
