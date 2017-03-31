import React from 'react';
import ReactDOM from 'react-dom';

import { Layout } from 'antd';
const { Header, Footer, Sider, Content } = Layout;

import './main.css';

import FileExpoler from './components/file-expoler';
import Tabbar from './components/tabbar';
import QTerminal from './components/qterminal';

ReactDOM.render(
  <Layout style={{ height: '100%' }}>
    <Sider>
      <FileExpoler />
    </Sider>
    <Layout  style={{ overflow: 'hidden' }}>
      <Content>
        <Tabbar />
      </Content>
      <Footer>
        <QTerminal />
      </Footer>
    </Layout>
  </Layout>
, document.getElementById('container'));
