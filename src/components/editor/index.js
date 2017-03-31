import React from 'react';
import reqwest from 'reqwest';

import { message } from 'antd';

import './index.css';

export default class Editor extends React.Component {

  constructor(props) {
    super(props);
  }

  save = (id, path) => () => {
    reqwest({
      url: '/file?path=' + encodeURIComponent(path),
      method: 'post',
      data: { value: _editors[id].getValue() },
      success: (resp) => {
        if (!resp.err) {
          message.info('文件已保存');
        }
      }
    });
  }

  componentDidMount() {
    const { id, value, language, path } = this.props;
    createEditor(id, value, language, this.save(id, path));
  }

  render() {
    return (
      <div id={this.props.id} className="editor-container"></div>
    );
  }
};
