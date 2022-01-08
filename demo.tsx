import * as React from 'react';
import { TableEditor } from './src'
import { render } from 'react-dom'
import { TableContext } from './src';

const html = `<table>
  <tr>
    <th>test</th>
    <th>test</th>
    <th>test</th>
  </tr>
  <tr>
    <td>test</td>
    <td>test</td>
    <td>test</td>
  </tr>
  <tr>
    <td>test</td>
    <td>test</td>
    <td>test</td>
  </tr>
</table>`

const btns = [
  {
    tag: 'strong',
    className: 'hoge',
    icon: <span>ボタン</span>,
    tooltip: '強調',
  },
  {
    tag: 'a',
    className: 'test',
    icon: <span>リンク</span>,
    tooltip: 'リンク',
  },
]

const TableEditorInner = () => {
  const { mergeCells } = React.useContext(TableContext)
  return (<div>
    <button onClick={mergeCells}>マージ</button>
  </div>)
}

render(
  <TableEditor 
    html={html} 
    btns={btns} 
    onChange={html => console.log(html)}
    // showBtnList={false}
  >
    <TableEditorInner />
  </TableEditor>,
  document.getElementById('main')
)
