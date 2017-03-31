import React from 'react';
import { Tabs, Icon } from 'antd';
import { getFileName } from '../../utils';

const TabPane = Tabs.TabPane;

import Editor from '../editor';

import './index.css';

export default class Tabbar extends React.Component {

  render() {
    var props = this.props;
    const tabPanes = props.files.map((file, index) => {
      const name = getFileName(file.path);
      return (
        <TabPane tab={<span>{name} <Icon type="close" onClick={() => props.closeFile(file.path, 'editor-' + index)} /></span>} key={index}>
          <Editor id={"editor-"+index} value={file.value} language={file.language} path={file.path} />
        </TabPane>
      )
    });

    return (
      <Tabs activeKey={props.activeKey.toString()} animated={false} onTabClick={(key) => this.props.changeActiveKey(key)}>
        {tabPanes}
      </Tabs>
    );
  }
};
