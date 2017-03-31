import React from 'react';

import './index.css';


// replay password to server, requires
function replayCredentials() {
    socket.emit('control', 'replayCredentials');
    console.log("replaying credentials");
    return false;
}

// document.getElementById('credentials').style.display = 'none';

function initTerminal() {
  var terminalContainer = document.getElementById('terminal-container'),
      term = new Terminal({
          cursorBlink: true
      }),
      socket,
      termid;
  term.open(terminalContainer);
  term.fit();

  if (document.location.pathname) {
      var parts = document.location.pathname.split('/'),
          base = parts.slice(0, parts.length - 1).join('/') + '/',
          resource = base.substring(1) + 'socket.io';
      socket = io.connect(null, {
          resource: resource
      });
  } else {
      socket = io.connect();
  }

  socket.on('connect', function() {
      socket.emit('geometry', term.cols, term.rows);
      term.on('data', function(data) {
          socket.emit('data', data);
      });
      socket.on('title', function(data) {
          document.title = data;
      }).on('status', function(data) {
          document.getElementById('status').innerHTML = data;
      }).on('headerBackground', function(data) {
          document.getElementById('header').style.backgroundColor = data;
      }).on('header', function(data) {
          document.getElementById('header').innerHTML = data;
      }).on('footer', function(data) {
          // sessionFooter = data;
          document.getElementById('footer').innerHTML = data;
      }).on('statusBackground', function(data) {
          document.getElementById('status').style.backgroundColor = data;
      }).on('allowreplay', function(data) {
          if (data == 'true') {
              console.log('allowreplay: ' + data);
              // document.getElementById('credentials').style.display = 'inline';
          } else {
              // document.getElementById('credentials').style.display = 'none';
          }
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


export default class QTerminal extends React.Component {

  componentDidMount() {
    initTerminal();
  }

  render() {
    return (
      <div className="box">
        <div id="header"></div>
      <div id="terminal-container" className="terminal"></div>
        <div id="bottomdiv">
          <div id="status"></div>
          <div id="footer"></div>
        {/* <div id="credentials"><a className="credentials" href="javascript:void(0);" onclick="replayCredentials()">CREDENTIALS</a></div> */}
        </div>
      </div>
    );
  }
};
