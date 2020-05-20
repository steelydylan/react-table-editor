# react-table-editor

forked from https://github.com/appleple/a-table.js

## usage

```ts
import * as React from 'react';
import { TableEditor } from 'react-table-editor'
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
    icon: <span>ボタン</span>
  },
  {
    tag: 'a',
    className: 'test',
    icon: <span>リンク</span>
  }
]

render(<TableEditor 
  html={html} 
  btns={btns}
  onChange={html => console.log(html)}
/>, document.getElementById('main'));
```