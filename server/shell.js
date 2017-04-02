const path = require('path');
const ssh = require('ssh2').Client;
const TextDecoder = require('text-encoding').TextDecoder;
const config = require('read-config')(path.resolve(__dirname, '../config.json'));

exports.connection = function(socket) {
    var conn = new ssh();

    let termCols, termRows;
    
    socket.on('size', function(cols, rows) {
        termCols = cols;
        termRows = rows;
    });

    // ssh 连接相关配置
    config.ssh = socket.request.session.ssh;

    conn.on('banner', function(d) {
        //need to convert to cr/lf for proper formatting
        d = d.replace(/\r?\n/g, '\r\n');
        socket.emit('data', d.toString('binary'));
    }).on('ready', function() {
        socket.emit('footer', 'ssh://' + config.ssh.username + '@' + config.ssh.host + ':' + config.ssh.port);
        socket.emit('status', 'SSH CONNECTION ESTABLISHED');
        socket.emit('statusBackground', config.statusBackground);

        conn.shell({
            term: "xterm-color",
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
                        stream.write(config.ssh.password + '\n');
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
        console.error('Error: ' + err);
    }).on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
        console.log('Connection :: keyboard-interactive');
        finish([config.ssh.password]);
    }).connect({
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.ssh.username,
        password: config.ssh.password,
        tryKeyboard: true,
        // some cisco routers need the these cipher strings
        algorithms: {
            'cipher': ['aes128-cbc', '3des-cbc', 'aes256-cbc'],
            'hmac': ['hmac-sha1', 'hmac-sha1-96', 'hmac-md5-96']
        }
    });
}
