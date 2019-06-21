const config    = require('gen-server/lib/config');
const jwt       = require('jsonwebtoken');
const User      = require('gs-users/models/user');
const BlackList = require('../models/blacktokens');
const isOid     = require('gen-server/utils/isObjectId');

exports.createTokens             = createTokens;
exports.refreshTokens            = refreshTokens;
exports.setTokensCookies         = setTokensCookies;
exports.clearTokensCookies       = clearTokensCookies;
exports.removeExpiredBlackTokens = removeExpiredBlackTokens;
exports.addTokenToBlackList      = addTokenToBlackList;

function createTokens (ctx, user, opts = {}) {
    if (arguments.length !== 3) throw new Error('Argument mismatch.');

    const accessTokenExpiresIn = 60 * 30; // 30 min in seconds
    const access_token = jwt.sign({ token_uuid: user.token_uuid }, config.secret, {
        subject: String(user._id),
        algorithm: 'HS512',
        expiresIn: accessTokenExpiresIn,
        audience: opts.audience, // сервис, который будет принимать этот токен
        issuer: opts.issuer
    });

    const refreshTokenExpiresIn = 86400 * 60; // 60 days
    const refresh_token = jwt.sign({ token_uuid: user.token_uuid }, config.secret, {
        algorithm: 'HS512',
        subject: String(user._id),
        expiresIn: refreshTokenExpiresIn,
        audience: opts.audience,
        issuer: opts.issuer
    });

    return {
        access_token,
        refresh_token,
        access_token_expires: Date.now() + (accessTokenExpiresIn * 1000),
        refresh_token_expires: Date.now() + (refreshTokenExpiresIn * 1000)
    }
}

async function refreshTokens (ctx) {
    const refreshToken = ctx.headers['x-refresh-token'] || ctx.query.access_token || ctx.cookies.get('x-refresh-token') || (ctx.request.body && ctx.request.body.refresh_token);
    const Url = (new URL(ctx.href));
    let userId, tokenUuid;

    try {
        const payload = jwt.verify(refreshToken, config.secret, {
            subject: String(ctx.state.user._id),
            audience: [Url.origin],
            issuer: [Url.origin]
        });

        userId    = payload.sub;
        tokenUuid = payload.token_uuid;

        if (!isOid(userId)) return ctx.throw(401);
    } catch (err) {

        if ('TokenExpiredError' === err.name) {
            await User.update( // удалить этот токен у всех пользователей т.к. он истёк (в теории он должен быть только у одного)
                {refresh_token: {$in: [String(refreshToken)]}},
                {$pull: {refresh_token: String(refreshToken)}},
                {multi: true}
            );
        }

        return ctx.throw(401);
    }

    const user = await User.findOne({ _id: userId });

    if (tokenUuid !== user.token_uuid) return ctx.throw(401);

    if ((Number(user.max_auth_devices) === 1) && (user.refresh_token[0] !== refreshToken)) {
        return ctx.throw(401);
    }

    await User.update(
        {refresh_token: {$in: [String(refreshToken)]}},
        {$pull: {refresh_token: String(refreshToken)}},
        {multi: true}
    );

    if (Array.isArray(user.refresh_token)) {
        user.refresh_token = user.refresh_token.filter(token => token !== refreshToken)
    }

    const tokens = createTokens(ctx, user, {issuer: Url.origin, audience: Url.origin});

    if (!user.refresh_token || !Array.isArray(user.refresh_token)) user.refresh_token = [];

    if (user.max_auth_devices == 1) {
        user.refresh_token = [tokens.refresh_token];
    } else {
        user.refresh_token.push(tokens.refresh_token);

        if (user.refresh_token.length > user.max_auth_devices) {
            /*
            * TODO: может если превышено, то еще и всех авторизованных ранее выбрасывать (менять token_uuid)
            *       или блокировать пользователя с возможностью разблокировки только через email ???
            * */
            user.refresh_token = [tokens.refresh_token];
        }
    }

    user.last_activity   = Date.now();
    user.last_ip_address = ctx.request.ip;

    await user.save();

    return tokens;
}

function setTokensCookies (ctx, tokens) {
    if (!tokens) throw new Error('Tokens required.');
    const Url = (new URL(ctx.href));

    const cookiesOpts = {
        signed: true,
        secure: ctx.secure,
        httpOnly: true,
        domain: Url.hostname,
        sameSite: 'strict'
    };

    ctx.cookies.set('x-access-token',  tokens.access_token, {
        ...cookiesOpts,
        // expires: new Date(tokens.access_token_expires)
    });
    ctx.cookies.set('x-refresh-token', tokens.refresh_token, {
        ...cookiesOpts,
        expires: new Date(tokens.refresh_token_expires)
    });
}

function clearTokensCookies (ctx) {
    ctx.cookies.set('x-access-token', null);
    ctx.cookies.set('x-refresh-token', null);
    ctx.cookies.set('x-access-token.sig', null);
    ctx.cookies.set('x-refresh-token.sig', null);
}

async function removeExpiredBlackTokens () {
    await BlackList.deleteMany({expires: {$lte: new Date()}}).lean().exec();
}

async function addTokenToBlackList (token, opts = {}, force) {
    const verifyOpts = {
        algorithms: ['HS512'],
        ignoreExpiration: Boolean(force)
    };

    if (!force) {
        verifyOpts.subject  = opts.subject;
        verifyOpts.audience = opts.audience;
        verifyOpts.issuer   = opts.issuer;
    }

    const expires = jwt.verify(token, config.secret, verifyOpts).exp;

    const blackToken = new BlackList({
        token: token,
        expires: new Date(expires * 1000)
    });

    await blackToken.save();
}