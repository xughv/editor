const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const path = require('path');
const basicAuth = require('basic-auth');
const readConfig = require('read-config');
const config = readConfig(__dirname + '/config.json');
const ssh = require('ssh2').Client;
const TextDecoder = require('text-encoding').TextDecoder;

let termCols, termRows;

const app = express();

// Dev
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

const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

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

app.use(bodyParser.urlencoded({ extended: false }));  

app.use(express.static(__dirname + '/server/public'));

const auth = function(req, res, next) {
    var auth = basicAuth(req);
    if (auth === undefined) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="WebSSH"');
        res.end('Username and password required for web SSH service.');
    } else if (auth.name.trim() === "") {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="WebSSH"');
        res.end('Username and password required for web SSH service.');
    } else {
        config.user.name = auth.name;
        config.user.password = auth.pass;
        next();
    }
}

app.use(cookieParser());

app.get('/ssh/:host?', auth, function(req, res) {
    res.sendFile(path.join(__dirname + '/server/public/index.html'));
    config.ssh.host = req.params.host;
    if (typeof req.query.port !== 'undefined' && req.query.port !== null) {
        config.ssh.port = req.query.port;
    }
    const shell = require('./server/shell')(server, config);
    console.log('SSH2 Login: ');
    console.log('user: ' + config.user.name);
    console.log(`from: ${req.ip}`);
    console.log(`to: ${config.ssh.host}`);
    console.log('sessionID: ' + req.headers.sessionid);
});

io.on('connection', function(socket) {

    var conn = new ssh();
    
    socket.on('size', function(cols, rows) {
        termCols = cols;
        termRows = rows;
    });

    conn.on('banner', function(d) {
        //need to convert to cr/lf for proper formatting
        d = d.replace(/\r?\n/g, '\r\n');
        socket.emit('data', d.toString('binary'));
    }).on('ready', function() {
        socket.emit('footer', 'ssh://' + config.user.name + '@' + config.ssh.host + ':' + config.ssh.port);
        socket.emit('status', 'SSH CONNECTION ESTABLISHED');
        socket.emit('statusBackground', config.statusBackground);

        conn.shell({
            term: config.ssh.term,
            cols: termCols,
            rows: termRows
        }, function(err, stream) {
            if (err) {
                console.log(err.message);
                myError = myError + err.message;
                return socket.emit('status', 'SSH EXEC ERROR: ' + err.message).emit('statusBackground', 'red');
            }
            socket.on('data', function(data) {
                stream.write(data);
            });
            socket.on('control', function(controlData) {
                switch (controlData) {
                    case 'replayCredentials':
                        stream.write(config.user.password + '\n');
                        /* falls through */
                    default:
                        console.log('controlData: ' + controlData);
                }
            });

            stream.on('data', function(data) {
                const decoder = new TextDecoder('utf-8');
                const chunk = decoder.decode(data);
                socket.emit('data', chunk);
            }).on('close', function(code, signal) {
                console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                conn.end();
                socket.disconnect();
            }).stderr.on('data', function(data) {
                console.log('STDERR: ' + data);
            });
        });
    }).on('end', function() {
        socket.emit('status', 'SSH CONNECTION CLOSED BY HOST');
        socket.emit('statusBackground', 'red');
        socket.disconnect();
    }).on('close', function() {
        socket.emit('status', 'SSH CONNECTION CLOSE');
        socket.emit('statusBackground', 'red');
        socket.disconnect();
    }).on('error', function(err) {
        socket.emit('status', 'SSH CONNECTION ERROR ' + err);
        socket.emit('statusBackground', 'red');
        console.log('on.error: ' + err);
    }).on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
        console.log('Connection :: keyboard-interactive');
        finish([config.user.password]);
    }).connect({
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.user.name,
        password: config.user.password,
        tryKeyboard: true,
        // some cisco routers need the these cipher strings
        algorithms: {
            'cipher': ['aes128-cbc', '3des-cbc', 'aes256-cbc'],
            'hmac': ['hmac-sha1', 'hmac-sha1-96', 'hmac-md5-96']
        }
    });
});