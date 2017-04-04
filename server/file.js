const path = require('path');
const ssh = require('ssh2').Client;
const TextDecoder = require('text-encoding').TextDecoder;
const config = require('read-config')(path.resolve(__dirname, '../config.json'));

exports.connection = function(socket) {

    // ssh 连接相关配置
    config.ssh = socket.request.session.ssh;

    // 获取 path 目录文件列表
    socket.on('list', function(path) {
        var conn = new ssh();

        var ret = { path, dir: { data: "" }, file: { data: "" } };

        conn.on('ready', function() {

            var taskCnt = 2;
            var cmd = 'find ' + path + ' -maxdepth 1 -type ';

            conn.exec(cmd + 'd', function(err, stream) {
                if (err) throw err;
                stream.on('close', function(code, signal) {
                    if (!--taskCnt) {
                        conn.end();
                        socket.emit('list', ret);
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
                    if (!--taskCnt) {
                        conn.end();
                        socket.emit('list', ret);
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
            username: config.ssh.username,
            password: config.ssh.password
        });
    });
    
}
