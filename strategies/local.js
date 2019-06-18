'use strict';

const LocalStrategy = require('passport-local').Strategy;
const User          = require('gs-users/models/user');
const isEmail       = require('gen-server/utils/isEmail');

module.exports = new LocalStrategy({
    usernameField: 'login',
    passwordField: 'password',
    session: false
},
function (login, password, done) {
    User.findOne({ [isEmail(login) ? 'email' : 'login']: String(login) }, function (err, user) {
        if (err) return done(err);

        if (!user) return done(null, false, { field: 'login', message: 'user.USER_NOT_FOUND' });

        if (!user.active) return done(null, false, { field: 'login', message: 'user.USER_NOT_ACTIVATED' });

        if (user.locked) {
            user.incSigninAttempts(false, (err, user) => {
                if (err && __DEV__) console.log(err);
                done(null, false, { field: 'login', message: 'user.USER_BLOCKED' });
            });

            return;
        }

        if (!user.checkPassword(password)) {
            user.incSigninAttempts(false, (err, user) => {
                if (err) console.error(err);

                if (user.locked) {
                    done(null, false, { field: 'login', message: 'user.USER_BLOCKED' });
                } else {
                    done(null, false, { field: 'password', message: 'user.WRONG_PASSWORD' });
                }
            });

            return;
        }

        user.incSigninAttempts(true, (err, user) => {
            if (err) console.log(err);

            done(null, user);
        });

    });
});
