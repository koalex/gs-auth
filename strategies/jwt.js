'use strict';

const config      = require('config');
const User        = require('gs-users/models/user');
const JwtStrategy = require('passport-jwt').Strategy;
const isOid       = require('gen-server/utils/isObjectId');

const opts = {};
      opts.secretOrKey = Array.isArray(config.secret) ? config.secret[0] : config.secret;
      opts.ignoreExpiration = false;
      opts.jwtFromRequest = req => {
          let token = req.headers['x-access-token'] || req.query.access_token || req.cookies.get('x-access-token') || (req.body && req.body.access_token);
          return token;
      };
      // opts.jwtFromRequest = ExtractJwt.fromHeader('x-access-token');
      // opts.issuer         = 'accounts.site.com';
      // opts.audience       = 'site.com';

module.exports = new JwtStrategy(opts, (jwt_payload, done) => {
    let userId = jwt_payload.user_id;

    if (!isOid(userId)) {
        return done(null, false, { message: 'httpErrors.500' });
    }

    User.findOne({ _id: userId, active: true }, (err, user) => {
        if (err) return done(err, false);

        if (user && user.locked) {
            user.incSigninAttempts(false, err => { if (err) console.log(err); });  // BLOCK FOR ALL SESSIONS
            return done(null, false, { message: 'user.ACCOUNT_BLOCKED' });
        }

        if (user) {
            done(null, user);
        } else {
            done(null, false);
            // or you could create a new account
        }
    });
});
