import React from 'react';

import './index.css';

export default class Term extends React.Component {

  componentDidMount() {
    this.init();
  }

  init = () => {
    const terminalContainer = document.getElementById('terminal-container');
    const term = new Terminal({ cursorBlink: true });
    var socket;

    term.open(terminalContainer);
    term.fit();

    if (document.location.pathname) {
        var parts = document.location.pathname.split('/'),
            base = parts.slice(0, parts.length - 1).join('/') + '/',
            resource = base.substring(1) + 'socket.io';
        socket = io.connect('/shell', { resource: resource });
    } else {
        socket = io.connect('/shell');
    }

    socket.on('connect', function() {

        socket.emit('size', term.cols, term.rows);

        term.on('data', function(data) {
            socket.emit('data', data);
        });

        socket.on('title', function(data) {
            document.title = data;
        }).on('status', function(data) {
            document.getElementById('status').innerHTML = data;
        }).on('footer', function(data) {
            document.getElementById('footer').innerHTML = data;
        }).on('statusBackground', function(data) {
            document.getElementById('status').style.backgroundColor = data;
        }).on('data', function(data) {
            term.write(data);
        }).on('disconnect', function(err) {
            document.getElementById('status').style.backgroundColor = 'red';
            document.getElementById('status').innerHTML = 'WEBSOCKET SERVER DISCONNECTED' + err;
            socket.io.reconnection(false);
        }).on('error', function(err) {
            document.getElementById('status').style.backgroundColor = 'red';
            document.getElementById('status').innerHTML = 'ERROR ' + err;
        });

    });

  }

  render() {
    return (
      <div className="box">
        <div id="header"></div>
        <div id="terminal-container" className="terminal"></div>
        <div id="bottomdiv">
          <div id="status"></div>
          <div id="footer"></div>
        </div>
      </div>
    );
  }
};
