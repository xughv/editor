import React from 'react';
import ReactDOM from 'react-dom';
import reqwest from 'reqwest';

import { Layout, message } from 'antd';
const { Header, Footer, Sider, Content } = Layout;

import './main.css';

import FileExplorer from './components/file-explorer';
import Tabbar from './components/tabbar';
import Term from './components/term';

export default class App extends React.Component {
  
  state = {
    activeKey: 0,
    files: []
  }

  // 点击Tab关闭时屏蔽点击事件
  closing = false;

  componentDidMount() { }

  changeActiveKey = (activeKey) => this.closing ? this.closing = false : this.setState({ activeKey });

  openFile = (path) => {

    const files = this.state.files;

    for (let i = 0; i < files.length; ++i) {
      if (files[i].path === path) {
        this.setState({ activeKey: i});
        return;
      }
    }

    reqwest('/file?path=' + encodeURIComponent(path), (resp) => {

      if (resp.err) {
        message.error('打开文件失败');
        return;
      }

      const file = { path, value: resp.data, language: 'javascript' }

      this.setState({
        files: [...files, file],
        activeKey: files.length
      });
    });

  }

  closeFile = (path, id) => {
    this.closing = true;
    reqwest({
      url: '/file?path=' + encodeURIComponent(path),
      method: 'post',
      data: { value: _editors[id].getValue() },
      success: (resp) => {
        if (!resp.err) {
          // message.info('文件已保存');
          const files = this.state.files.filter((file) => file.path !== path);
          this.setState({ files, activeKey: files.length-1 });
        }
      }
    });
  }

  render() {
    return (
      <Layout style={{ height: '100%' }}>
        <Sider id="file-explorer-tree">
          <FileExplorer root={this.props.root} openFile={this.openFile} />
        </Sider>
        <Layout style={{ overflow: 'hidden' }}>
          <Content>
            <Tabbar 
              files={this.state.files}
              activeKey={this.state.activeKey}
              changeActiveKey={this.changeActiveKey}
              closeFile={this.closeFile}  />
          </Content>
          <Footer>
            <Term />
          </Footer>
        </Layout>
      </Layout>
    );
  }
};

ReactDOM.render(<App root="/data" />, document.getElementById('container'));
