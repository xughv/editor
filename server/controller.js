const path = require('path');
const ssh = require('ssh2').Client;

exports.index = function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
    req.session.ssh.host = req.params.host;
    req.session.ssh.port = req.query.port || 22;
}


exports.list = function(req, res, next) {
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
        host: req.session.ssh.host,
        port: req.session.ssh.port,
        username: req.session.ssh.username,
        password: req.session.ssh.password
    });
}


exports.readFile = function(req, res, next) {
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
        host: req.session.ssh.host,
        port: req.session.ssh.port,
        username: req.session.ssh.username,
        password: req.session.ssh.password
    });
}


exports.writeFile = function(req, res, next) {
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
        host: req.session.ssh.host,
        port: req.session.ssh.port,
        username: req.session.ssh.username,
        password: req.session.ssh.password
    });
}