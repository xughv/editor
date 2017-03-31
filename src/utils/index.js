export function getFileName(path) {
  const pos = path.lastIndexOf('/');
  return pos < 0 ? "" : path.substr(pos+1);
}