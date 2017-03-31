import React from 'react';
import { Tabs, Icon } from 'antd';
const TabPane = Tabs.TabPane;

import Editor from '../editor';

import './index.css';

export default class Tabbar extends React.Component {

  render() {

    const value1 = [
      'function x() {',
      '\tconsole.log("Hello world!");',
      '}'
    ].join('\n');

    const value2 = [
      'body {',
      '\theight: 100%;',
      '}'
    ].join('\n');

    return (
      <Tabs defaultActiveKey="1" animated={false}>
        <TabPane tab={<span>test.js <Icon type="close" /></span>} key="1">
          <Editor id="editor-1" value={value1} language="javascript"/>
        </TabPane>
        <TabPane tab={<span>test.css <Icon type="close" /></span>} key="2">
          <Editor id="editor-2" value={value2} language="css"/>
        </TabPane>
      </Tabs>
    );
  }
};
