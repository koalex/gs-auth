// const path = require('path');
// process.env.MODULES = path.join(__dirname, '../');
// const server  = require('gen-server/bin/server.js');
// const request = require('supertest')(server);
// const config = require('gen-server/lib/config');
//
// if (config.protocol === 'https' || config.protocol === 'http2' || config.protocol === 'http/2') {
//     process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// }
//
// describe('GS-AUTH-MODULE', () => {
//     before(done => {
//         server.listen({port: config.port}, done);
//     });
//
// 	after(done => {
// 		server.close(done);
// 	});
//
//     describe('SMOKE test #request module routes', () => {
//         it('should return status 200 for request /some-route', function (done) {
//             this.slow(200);
//             request
//                 .get('/some-route')
//                 .expect(200)
//                 .end(done);
//         });
//     });
// });
