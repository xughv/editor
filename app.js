const http = require('http');
const path = require('path');
const express = require('express');
const session = require("express-session");
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const basicAuth = require('basic-auth');

const config = require('read-config')(__dirname + '/config.json');
const router = require('./server/router');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(cookieParser('QC_Editor'));
const sessionMiddleware = session({
    // store: new RedisStore({}),
    secret: 'QC_Editor',
    resave: true,
    saveUninitialized: true
});

// session 共享
app.use(sessionMiddleware);
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

// webpack dev
if (process.env.NODE_ENV === 'development') {
    const webpack = require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpackDevConfig = require('./webpack.dev.config.js');
    const compiler = webpack(webpackDevConfig);
    app.use(webpackDevMiddleware(compiler, {
        publicPath: webpackDevConfig.output.publicPath,
        noInfo: true,
        stats: {
            colors: true
        }
    }));
}

app.use(bodyParser.urlencoded({ extended: false }));  
app.use(express.static(__dirname + '/server/public'));

app.use(function(req, res, next) {
    var auth = basicAuth(req);
    // var auth = null;
    // [TODO]
    // 用户验证
    if (!auth || auth.name.trim() === "") {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="WebSSH"');
        res.end('Username and password required for web SSH service.');
    } else {
        if (!req.session.ssh) req.session.ssh = {};
        req.session.ssh.username = auth.name;
        req.session.ssh.password = auth.pass;
        next();
    }
});

app.use(router);

// server listen
server.listen({
    host: config.host,
    port: config.port
}).on('listening', function() {
    console.log(`Listening on ${config.host}:${config.port}`);
}).on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
        console.error('Address in use');
        process.exit(1);
    }
});

// socket.io connection
const connection = require('./server/shell').connection;
io.on('connection', connection);
