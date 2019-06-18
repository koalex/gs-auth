'use strict';

const Router         = require('gen-server/lib/router');
const router         = new Router();
const ApiV1          = new Router({ prefix: '/api/v1' });
const signin         = require('./controllers/signin');
const signup         = require('./controllers/signup');
const forgotPassword = require('./controllers/forgotPassword/index');
const resetPassword  = require('./controllers/resetPassword');
const signout        = require('./controllers/signout');
const refreshTokens  = require('./controllers/refreshTokens');
const passport       = require('./middlewares/passport');
const bodyParser     = require('gen-server/middlewares/bodyParser');

const bodyParserOpts = { formLimit: '28kb', jsonLimit: '28kb', textLimit: '28kb' };

router.get('/signin', ctx => ctx.body = 'SIGNIN HTML PAGE');
router.get('/signup', ctx => ctx.body = 'SIGNUP HTML PAGE');
router.get('/forgot-password', ctx => ctx.body = 'FORGOT PASSWORD HTML PAGE');
router.get('/users/:userId/password-reset/:token', resetPassword.get);

// router.get('/signout', passport.authenticate('jwt', {session: false}), signout.single);
// router.get('/signout-all', passport.authenticate('jwt', {session: false}), signout.all);
ApiV1.post('/signout', bodyParser(bodyParserOpts), passport.authenticate('jwt', {session: false}), signout.single);
ApiV1.post('/signout-all', bodyParser(bodyParserOpts), passport.authenticate('jwt', {session: false}), signout.all);
ApiV1.post('/signin', bodyParser(bodyParserOpts), passport.authenticate('local', {session: false}), signin);
ApiV1.post('/signup', bodyParser(bodyParserOpts), signup);
ApiV1.post('/forgot-password', bodyParser(bodyParserOpts), forgotPassword);
ApiV1.post('/users/:userId/password-reset/:token', bodyParser(bodyParserOpts), resetPassword.post);
ApiV1.post('/auth/refresh-tokens', bodyParser(bodyParserOpts), refreshTokens);
ApiV1.get('/me', passport.authenticate('jwt', {session: false}), async ctx => { ctx.body = ctx.state.user; });

module.exports = [router, ApiV1];
