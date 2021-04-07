import * as React from 'react';
import { TableEditor } from './'
import { render } from 'react-dom'

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

render(
  <TableEditor html={html} btns={btns} onChange={html => console.log(html)} />,
  document.getElementById('main')
)
