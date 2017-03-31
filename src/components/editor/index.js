import React from 'react';

import './index.css';

export default class Editor extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const { id, value, language } = this.props;
    createEditor(id, value, language);
  }

  render() {
    return (
      <div id={this.props.id} className="editor-container"></div>
    );
  }
};
