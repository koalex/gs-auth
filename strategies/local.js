'use strict';

const LocalStrategy = require('passport-local').Strategy;
const User          = require('gs-users/models/user');
const isEmail       = require('gen-server/utils/isEmail');

const loginField = 'login';
const passwordField = 'password';

const loginErrorObject = { // У меня работает если объект имею такую структуру!
    errors: {
        login: {
            properties: {
                field: loginField,
                message: ''
            }
        }
    }
};

const passwordErrorObject = { // Костыль с дубливоранием обекта! (надо меня создавать общий и менять имя ключа)
    errors: {
        password: {
            properties: {
                field: passwordField,
                message: ''
            }
        }
    }
};

module.exports = new LocalStrategy({
    usernameField: loginField,
    passwordField: passwordField,
    session: false
},
function (login, password, done) {
    User.findOne({ [isEmail(login) ? 'email' : 'login']: String(login) }, function (err, user) {
        if (err) return done(err);

        if (!user) {
            loginErrorObject.errors.login.properties.message = 'user.USER_NOT_FOUND';
            throw loginErrorObject;
        }

        if (!user.active) {
            loginErrorObject.errors.login.properties.message = 'user.USER_NOT_ACTIVATED';
            throw loginErrorObject;
        }

        if (user.locked) {
            user.incSigninAttempts(false, (err, user) => {
                if (err && __DEV__) console.log(err);
                loginErrorObject.errors.login.properties.message = 'user.USER_BLOCKED';
                throw loginErrorObject;
            });

            return;
        }

        if (!user.checkPassword(password)) {
            user.incSigninAttempts(false, (err, user) => {
                if (err) console.error(err);

                if (user.locked) {
                    loginErrorObject.errors.login.properties.message = 'user.USER_BLOCKED';
                    throw loginErrorObject;
                } else {
                    passwordErrorObject.errors.password.properties.message = 'user.WRONG_PASSWORD';
                    throw passwordErrorObject;
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
