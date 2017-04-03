import React from 'react';
import { Tree } from 'antd';
import reqwest from 'reqwest';
import { getFileName } from '../../utils';
const TreeNode = Tree.TreeNode;

import './index.css';

export default class FileExplorer extends React.Component {

  socket = null;
  tasks = [];

  state = {
    // { name: 'pNode 01', key: '0-0' },
    // { name: 'pNode 02', key: '0-1' },
    // { name: 'pNode 03', key: '0-2', isLeaf: true }
    treeData: [],
  }

  // 结点信息表
  infoTable = {
    keyMap: {},
    pathMap: {},
    set(key, path, info) {
      if (!key || !path) return;

      // 解除原有关联
      let preKeyMapInfo = this.keyMap[key];
      if (preKeyMapInfo && preKeyMapInfo.path !== path) {
        this.pathMap[preKeyMapInfo.path] = null;
      }
      let prePathMapInfo = this.pathMap[path];
      if (prePathMapInfo && prePathMapInfo.key !== key) {
        this.keyMap[prePathMapInfo.key] = null;
      }

      info.key = key, info.path = path;
      this.keyMap[key] = this.pathMap[path] = info;
    },
    getByKey(key) {
      return this.keyMap[key];
    },
    getByPath(path) {
      return this.pathMap[path];
    }
  }

  constructor(props) {
    super(props);
    this.initSocket();
  }

  componentDidMount() {
    this.initRoot(this.props.root);
  }

  onSelect = (selectedKeys) => {
    const key = selectedKeys[0];
    if (!key) return;
    const info = this.infoTable.getByKey(key);
    if (!info.isFile) return;
    this.props.openFile(info.path);
  }

  // 展开结点加载数据
  onLoadData = (treeNode) => {
    const key = treeNode.props.eventKey;
    const path = this.infoTable.getByKey(key).path;

    return new Promise((resolve) => {
      if (!this.tasks[path]) {
        this.socket.emit('list', path);
        this.tasks[path] = { cb: resolve };
      }
    });
  }

  // 初始化根节点
  initRoot = (root) => {
    const rootNode = {
      name: getFileName(root),
      key: '0-0'
    }
    this.infoTable.set('0-0', root, { isFile: false });
    this.setState({ treeData: [ rootNode ] });
  }

  // 初始化 Socket
  initSocket() {
    if (document.location.pathname) {
      const parts = document.location.pathname.split('/');
      const base = parts.slice(0, parts.length - 1).join('/') + '/';
      const resource = base.substring(1) + 'socket.io';
      this.socket = io.connect('/file', { resource: resource });
    } else {
      this.socket = io.connect('/file');
    }

    const socket = this.socket;
    socket.on('connect', () => {

      // 获取某个路径下文件列表
      socket.on('list', (data) => {
        const path = data.path;
        // 请求过程中key可能改变, 所以用path重新获取
        const key = this.infoTable.getByPath(path).key;
        const children = this.parse(key, data);
        this.appendData(key, children);

        if (this.tasks[path]) {
          this.tasks[path].cb();
        }
        this.tasks[path] = null;
      });

    });
  }

  // 将响应结果转换为树结点格式
  parse = (parentKey, data) => {
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
        this.infoTable.set(key, arr[i], { isFile: false });
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
        this.infoTable.set(key, arr[i], { isFile: true });
      }
    }

    return res;
  }

  // 在key为nodeKey的结点添加children数据
  appendData = (nodeKey, chirdren) => {
    const treeData = [...this.state.treeData];

    const loop = (node) => {
      node.forEach((item) => {
        // 确定key所在分支
        if (nodeKey.indexOf(item.key) === 0) {
          if (nodeKey === item.key) {
            if (!item.children) {
              item.children = chirdren;
            } else {
              // 合并item子节点的children, 使跨级数据不会被消除
              for (let key in chirdren) {
                if (chirdren.hasOwnProperty(key) &&
                    item.children[key] &&
                    item.children[key].children) {
                  chirdren[key].children = item.children[key].children;
                }
              }
            }
            return;
          }
          else if (item.children) loop(item.children);
        }
      });
    };

    loop(treeData);

    this.setState({ treeData });
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
