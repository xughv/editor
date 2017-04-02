import React from 'react';
import { Tree } from 'antd';
import reqwest from 'reqwest';
import { getFileName } from '../../utils';
const TreeNode = Tree.TreeNode;

import './index.css';


export default class FileExplorer extends React.Component {

  state = {
    // { name: 'pNode 01', key: '0-0' },
    // { name: 'pNode 02', key: '0-1' },
    // { name: 'pNode 03', key: '0-2', isLeaf: true }
    treeData: [],
  }

  fileTable = {};

  componentDidMount() {
    this.init(this.props.root);
  }

  onSelect = (selectedKeys) => {
    const key = selectedKeys[0];
    if (!key) return;
    const info = this.fileTable[key];
    if (!info.isFile) return;
    this.props.openFile(info.path);
  }

  onLoadData = (treeNode) => {
    return new Promise((resolve) => {
      const treeData = [...this.state.treeData];
      const key = treeNode.props.eventKey;

      reqwest('/list?path=' + encodeURIComponent(this.fileTable[key].path), (resp) => {

        const chirdren = this.parse(resp, key);

        const loop = (data) => {
          data.forEach((item) => {
            if (key.indexOf(item.key) === 0) {
              if (key === item.key) {
                item.children = chirdren;
                return;
              }
              else if (item.children) loop(item.children);
            }
          });
        };
        loop(treeData);

        this.setState({ treeData });
        resolve();
      });
    });
  }

  init = (root) => {
    const rootNode = {
      name: getFileName(root),
      key: '0-0'
    }
    this.fileTable['0-0'] = { path: root, isFile: false };
    this.setState({ treeData: [ rootNode ] });
  }

  parse = (data, parentKey) => {
    const res = [];
    let cnt = 0;
    if (data.dir && !data.dir.err) {
      let arr = data.dir.data.split('\n');
      // 排除本目录
      for (let i = 1; i < arr.length; ++i) {
        if (!arr[i]) continue;
        const key = `${parentKey}-${cnt++}`;
        res.push({
          name: getFileName(arr[i]),
          key
        });
        this.fileTable[key] = { path: arr[i], isFile: false };
      }
    }

    if (data.file && !data.file.err) {
      let arr = data.file.data.split('\n');
      for (let i = 0; i < arr.length; ++i) {
        if (!arr[i]) continue;
        const key = `${parentKey}-${cnt++}`;
        res.push({
          name: getFileName(arr[i]),
          key,
          isLeaf: true
        });
        this.fileTable[key] = { path: arr[i], isFile: true };
      }
    }

    return res;
  }

  render() {

    const loop = data => data.map((item) => {
      if (item.children) {
        return <TreeNode title={item.name} key={item.key}>{loop(item.children)}</TreeNode>;
      }
      return <TreeNode title={item.name} key={item.key} isLeaf={item.isLeaf} />;
    });

    const treeNodes = loop(this.state.treeData);

    return (
      <Tree onSelect={this.onSelect} loadData={this.onLoadData}>
        {treeNodes}
      </Tree>
    );
  }
}
