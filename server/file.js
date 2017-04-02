const path = require('path');
const ssh = require('ssh2').Client;
const TextDecoder = require('text-encoding').TextDecoder;
const config = require('read-config')(path.resolve(__dirname, '../config.json'));

exports.connection = function(socket) {
    var conn = new ssh();

    // ssh 连接相关配置
    config.ssh = socket.request.session.ssh;

    conn.on('banner', function(d) {
        //need to convert to cr/lf for proper formatting
        d = d.replace(/\r?\n/g, '\r\n');
        socket.emit('data', d.toString('binary'));
    }).on('ready', function() {
      
        // TODO

    }).on('end', function() {
        socket.disconnect();
    }).on('close', function() {
        socket.disconnect();
    }).on('error', function(err) {
        console.error('Error: ' + err);
    }).connect({
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.ssh.username,
        password: config.ssh.password
    });
}
