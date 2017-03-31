/*
 * WebSSH2 - Web to SSH2 gateway
 * Bill Church - https://github.com/billchurch - April 2016
 *
 */
const express = require('express'),
  app = express(),
  cookieParser = require('cookie-parser'),
  bodyParser = require("body-parser");  
  server = require('http').Server(app),
  io = require('socket.io')(server),
  path = require('path'),
  basicAuth = require('basic-auth'),
  ssh = require('ssh2').Client,
  readConfig = require('read-config'),
  TextDecoder = require('text-encoding').TextDecoder,
  config = readConfig(__dirname + '/shell-config.json'),
  myError = " - ";

let termCols, termRows;

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

function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
}

server.listen({
    host: config.listen.ip,
    port: config.listen.port
}).on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
        config.listen.port++;
        console.log('Address in use, retrying on port ' + config.listen.port);
        setTimeout(function() {
            server.listen(config.listen.port);
        }, 250);
    }
});

app.use(bodyParser.urlencoded({ extended: false }));  

app.use(express.static(__dirname + '/server/public')).use(function(req, res, next) {
    var myAuth = basicAuth(req);
    if (myAuth === undefined) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="WebSSH"');
        res.end('Username and password required for web SSH service.');
    } else if (myAuth.name === "") {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="WebSSH"');
        res.end('Username and password required for web SSH service.');
    } else {
        config.user.name = myAuth.name;
        config.user.password = myAuth.pass;
        next();
    }
}).use(cookieParser()).get('/ssh/host/:host?', function(req, res) {
    res.sendFile(path.join(__dirname + '/server/public/index.html'));
    config.ssh.host = req.params.host;
    if (typeof req.query.port !== 'undefined' && req.query.port !== null) {
        config.ssh.port = req.query.port;
    }
    if (typeof req.query.header !== 'undefined' && req.query.header !== null) {
        config.header.text = req.query.header;
    }
    if (typeof req.query.headerBackground !== 'undefined' && req.query.headerBackground !== null) {
        config.header.background = req.query.headerBackground;
    }
    console.log('webssh2 Login: user=' + config.user.name + ' from=' + req.ip + ' host=' + config.ssh.host + ' port=' + config.ssh.port + ' sessionID=' + req.headers.sessionid + ' allowreplay=' + req.headers.allowreplay);
    console.log('Headers: ' + JSON.stringify(req.headers));
    config.options.allowreplay = req.headers.allowreplay;
}).use('/style', express.static(__dirname + '/server/public')).use('/src', express.static(__dirname + '/node_modules/xterm/dist')).use('/addons', express.static(__dirname + '/node_modules/xterm/dist/addons'));

io.on('connection', function(socket) {
    var conn = new ssh();
    socket.on('geometry', function(cols, rows) {
        termCols = cols;
        termRows = rows;
    });

    conn.on('banner', function(d) {
        //need to convert to cr/lf for proper formatting
        d = d.replace(/\r?\n/g, "\r\n");
        socket.emit('data', d.toString('binary'));
    }).on('ready', function() {
        socket.emit('title', 'ssh://' + config.ssh.host);
        socket.emit('headerBackground', config.header.background);
        socket.emit('header', config.header.text);
        socket.emit('footer', 'ssh://' + config.user.name + '@' + config.ssh.host + ':' + config.ssh.port);
        socket.emit('status', 'SSH CONNECTION ESTABLISHED');
        socket.emit('statusBackground', config.statusBackground);
        socket.emit('allowreplay', config.options.allowreplay);

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
        socket.emit('status', 'SSH CONNECTION CLOSED BY HOST' + myError);
        socket.emit('statusBackground', 'red');
        socket.disconnect();
    }).on('close', function() {
        socket.emit('status', 'SSH CONNECTION CLOSE' + myError);
        socket.emit('statusBackground', 'red');
        socket.disconnect();
    }).on('error', function(err) {
        myError = myError + err;
        socket.emit('status', 'SSH CONNECTION ERROR' + myError);
        socket.emit('statusBackground', 'red');
        console.log('on.error' + myError);
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


app.get('/list', function(req, res, next) {
    var conn = new ssh();
    var ret = { dir: { data: "" }, file: { data: "" } };

    conn.on('ready', function() {

        var cnt = 2;
        var cmd = 'find ' + req.query.path + ' -maxdepth 1 -type ';

        conn.exec(cmd + 'd', function(err, stream) {
            if (err) throw err;
            stream.on('close', function(code, signal) {
                if (!--cnt) {
                    conn.end();
                    res.json(ret);
                }
            })
            .on('data', function(data) {
                ret.dir.data += data.toString();
            })
            .stderr.on('data', function(data) {
                ret.dir.err = 1
            });
        });

        conn.exec(cmd + 'f', function(err, stream) {
            if (err) throw err;
            stream.on('close', function(code, signal) {
                if (!--cnt) {
                    conn.end();
                    res.json(ret);
                }
            })
            .on('data', function(data) {
                ret.file.data += data.toString();
            })
            .stderr.on('data', function(data) {
                ret.file.err = 1
            });
        });

    })
    .connect({
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.user.name,
        password: config.user.password
    });
});


app.get('/file', function(req, res, next) {
    var conn = new ssh();
    var ret = { data: "", err: 0 };

    conn.on('ready', function() {

        conn.sftp(function(err, sftp) {
            if (err) {
                ret.err = 1;
                return;
            }
            var stream = sftp.createReadStream(req.query.path);
            stream.on('close', function(code, signal) {
                conn.end();
                res.json(ret);
            })
            .on('data', function(data) {
                ret.data += data.toString();
            })
        });

    })
    .connect({
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.user.name,
        password: config.user.password
    });
});


app.post('/file', function(req, res, next) {
    var conn = new ssh();
    var ret = { data: "", err: 0 };

    conn.on('ready', function() {

        conn.sftp(function(err, sftp) {
            if (err) {
                ret.err = 1;
                return;
            }
            var Readable = require('stream').Readable;
            var readStream = new Readable();
            readStream._read = function noop() {};
            readStream.push(req.body.value);
            readStream.push(null);

            var writeStream = sftp.createWriteStream(req.query.path);
            var stream = readStream.pipe(writeStream);

            stream.on('finish', function(code, signal) {
                conn.end();
                res.json(ret);
            })
        });
    })
    .connect({
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.user.name,
        password: config.user.password
    });
});