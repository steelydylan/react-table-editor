import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { shallowEqualObjects } from 'shallow-equal';
import clsx from 'clsx'
import produce from 'immer'
import * as util from './util'
import AlignCenter from './icons/AlignCenter'
import AlignLeft from './icons/AlignLeft'
import AlignRight from './icons/AlignRight'
import Merge from './icons/Merge'
import Split from './icons/Split'
import Undo from './icons/Undo'

const iconSize = { width: '16px', height: '16px' };

const defs = {
  showBtnList: true,
  relAttrForTargetBlank: 'noopener noreferrer',
  lang: 'en',
  mark: {
    align: {
      default: 'left',
      left: 'left',
      center: 'center',
      right: 'right',
    },
    btn: {
      group: 'st-table-btn-list',
      item: 'st-table-btn',
      itemActive: 'st-table-btn-active',
    },
    icon: {
      alignLeft: <AlignLeft style={iconSize} />,
      alignCenter: <AlignCenter style={iconSize} />,
      alignRight: <AlignRight style={iconSize} />,
      merge: <Merge style={iconSize} />,
      split: <Split style={iconSize} />,
      table: <span></span>,
      source: <span></span>,
      td: <span>TD</span>,
      th: <span>TH</span>,
      undo: <Undo style={iconSize} />,
    },
    label: 'st-table-label',
    actionGroup: 'st-table-action-group',
    selector: {
      self: 'st-table-selector',
    },
  },
  message: {
    mergeCells: 'merge cell',
    splitCell: 'split cell',
    changeToTh: 'change to th',
    changeToTd: 'change to td',
    alignLeft: 'align left',
    alignCenter: 'align center',
    alignRight: 'align right',
    addColumnLeft: 'insert column on the left',
    addColumnRight: 'insert column on the right',
    removeColumn: 'remove column',
    addRowTop: 'insert row above',
    addRowBottom: 'insert row below',
    removeRow: 'remove row',
    source: 'Source',
    mergeCellError1: 'All possible cells should be selected so to merge cells into one',
    mergeCellConfirm1:
      "The top left cell's value of the selected range will only be saved. Are you sure you want to continue?",
    pasteError1: "You can't paste here",
    splitError1: 'Cell is not selected',
    splitError2: 'Only one cell should be selected',
    splitError3: "You can't split the cell anymore",
    closeLabel: "close",
    targetBlank: "target",
    targetBlankLabel: 'Opens the linked page in a new window or tab',
    addLinkTitle: 'link',
    updateLinkTitle: 'link',
    addLink: 'add',
    updateLink: 'update',
    removeLink: 'remove',
    linkUrl: 'URL',
    linkLabel: 'label'
  },
}

type CellClickEvent = React.MouseEvent<HTMLTableHeaderCellElement, MouseEvent> & {
  clipboardData?: any;
};

type Point = { x: number; y: number; width: number; height: number }

type Align = 'right' | 'center' | 'left'
type Mode = 'col' | 'row' | 'cell' | null

type Mark = {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

type Col = {
  colspan: number
  rowspan: number
  type: 'td' | 'th'
  value: string
  selected: boolean
  cellClass?: string
  align: Align
  mark: Mark
  x: number
  y: number
}

type Row = {
  col: Col[]
}

type State = {
  mode: Mode
  showMenu: boolean
  point: Point
  selectedRowNo: number
  selectedColNo: number
  tableClass: string
  inputMode: 'table' | 'source'
  cellClass: string
  splited: boolean
  row: Row[]
  history: Row[][]
  menuX: number,
  menuY: number,
  beingInput: boolean
  mousedown: boolean
  openLinkModal: boolean
  tableResult: string
  linkTargetBlank: boolean
  linkLabel: string
  linkUrl: string
  linkClassName: string
  isNewLink: boolean
  selectedTags: { className: string, tag: string }[]
}

type Props = Partial<typeof defs> & { 
  html: string, 
  btns?: { className: string, tag: string, icon: React.ReactNode }[],
  onChange?: (html: string) => void,
}

export class TableEditor extends React.Component<Props, State> {
  tableRef: HTMLDivElement
  selection: Selection

  static defaultProps = defs;

  constructor(props: Props) {
    super(props)

    const row = this.parse(props.html);
    this.state = {
      mode: null,
      showMenu: false,
      splited: false,
      beingInput: false,
      mousedown: false,
      openLinkModal: false,
      point: { x: -1, y: -1, width: 0, height: 0 },
      selectedRowNo: -1,
      selectedColNo: -1,
      row: row,
      tableClass: '',
      history: [row],
      inputMode: 'table',
      tableResult: '',
      cellClass: '',
      menuX: 0,
      menuY: 0,
      linkLabel: '',
      linkUrl: '',
      linkClassName: '',
      linkTargetBlank: false,
      isNewLink: false,
      selectedTags: []
    }
  }

  highestRow() {
    const arr: number[] = []
    const firstRow = this.state.row[0]
    let i = 0
    if (!firstRow) {
      return arr
    }
    const row = firstRow.col
    row.forEach(item => {
      const length = item.colspan
      for (let t = 0; t < length; t++) {
        arr.push(i)
        i++
      }
    })
    return arr
  }

  getTableLength(table: Row[]) {
    return {
      x: this.getRowLength(table[0].col),
      y: this.getColLength(table),
    }
  }

  getRowLength(row: Col[]) {
    let length = 0
    row.forEach(item => {
      length += item.colspan
    })
    return length
  }

  getColLength(table: Row[]) {
    let length = 0
    let rowspan = 0
    table.forEach(row => {
      if (rowspan === 0) {
        rowspan = row.col[0].rowspan
        length += rowspan
      }
      rowspan--
    })
    return length
  }

  getElementByQuery(query: string) {
    if (this.tableRef) {
      return this.tableRef.querySelector(query)
    }
  }

  getElementsByQuery(query: string) {
    if (this.tableRef) {
      return this.tableRef.querySelectorAll(query)
    }
  }

  getSelf() {
    if (this.tableRef) {
      return this.tableRef
    }
  }

  getCellByIndex(x: number, y: number) {
    return this.getElementByQuery(`[data-cell-id='${x}-${y}']`)
  }

  getCellInfoByIndex(x: number, y: number): Point | false {
    const cell = this.getCellByIndex(x, y)
    if (!cell) {
      return false
    }
    const pos = util.offset(cell)
    const left = pos.left
    const top = pos.top
    let returnLeft = -1
    let returnTop = -1
    const width = parseInt(cell.getAttribute('colspan'))
    const height = parseInt(cell.getAttribute('rowspan'))
    const headers = this.getElementsByQuery('.js-table-header th')
    const sides = this.getElementsByQuery('.js-table-side')
    ;[].forEach.call(headers, (header, index) => {
      if (util.offset(header).left === left) {
        returnLeft = index
      }
    })
    ;[].forEach.call(sides, (side, index) => {
      if (util.offset(side).top === top) {
        returnTop = index
      }
    })
    return { x: returnLeft - 1, y: returnTop, width, height }
  }

  getLargePoint(...args: Point[]) {
    const minXArr = []
    const minYArr = []
    const maxXArr = []
    const maxYArr = []
    for (let i = 0, n = args.length; i < n; i++) {
      minXArr.push(args[i].x)
      minYArr.push(args[i].y)
      maxXArr.push(args[i].x + args[i].width)
      maxYArr.push(args[i].y + args[i].height)
    }
    const minX = Math.min(...minXArr)
    const minY = Math.min(...minYArr)
    const maxX = Math.max(...maxXArr)
    const maxY = Math.max(...maxYArr)
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  getSelectedPoints(row: Row[]) {
    const arr: Point[] = []
    row.forEach((item, i) => {
      if (!item.col) {
        return false
      }
      item.col.forEach((obj, t) => {
        if (obj.selected) {
          const point = this.getCellInfoByIndex(t, i)
          if (point) {
            arr.push(point)
          }
        }
      })
    })
    return arr
  }

  getSelectedPoint(row: Row[]) {
    const arr = this.getSelectedPoints(row)
    if (arr && arr[0]) {
      return arr[0]
    }
  }

  getAllPoints(row: Row[]) {
    const arr: Point[] = []
    row.forEach((item, i) => {
      if (!item || !item.col) {
        return
      }
      item.col.forEach((obj, t) => {
        const point = this.getCellInfoByIndex(t, i)
        if (point) {
          arr.push(point)
        }
      })
    })
    return arr
  }

  getCellIndexByPos(x: number, y: number) {
    let a = -1
    let b = -1
    this.state.row.forEach((item, i) => {
      if (!item || !item.col) {
        return
      }
      item.col.forEach((obj, t) => {
        const point = this.getCellInfoByIndex(t, i)
        if (point && point.x === x && point.y === y) {
          a = t
          b = i
        }
      })
    })
    return { row: b, col: a }
  }

  getCellByPos(row: Row[], x: number, y: number) {
    const index = this.getCellIndexByPos(x, y)
    if (!row[index.row]) {
      return
    }
    return row[index.row].col[index.col]
  }

  hitTest(largePoint: Point, point2: Point) {
    if (
      largePoint.x < point2.x + point2.width &&
      point2.x < largePoint.x + largePoint.width &&
      largePoint.y < point2.y + point2.height &&
      point2.y < largePoint.y + largePoint.height
    ) {
      return true
    }
    return false
  }

  markup() {
    const data = this.state
    if (data.splited) {
      this.setState({
        splited: false,
      })
      return
    }
    const points = this.getSelectedPoints(data.row)
    const largePoint = this.getLargePoint(...points)
    const row = produce(this.state.row, row => {
      row.forEach((item, i) => {
        if (!item || !item.col) {
          return false
        }
        item.col.forEach((obj, t) => {
          const point = this.getCellInfoByIndex(t, i)
          const mark = {} as Mark
          if (!point) {
            return
          }
          if (obj.selected) {
            if (point.x === largePoint.x) {
              mark.left = true
            }
            if (point.x + point.width === largePoint.x + largePoint.width) {
              mark.right = true
            }
            if (point.y === largePoint.y) {
              mark.top = true
            }
            if (point.y + point.height === largePoint.y + largePoint.height) {
              mark.bottom = true
            }
          }
          obj.mark = mark
        })
      })
    })
    this.setState({
      row,
    })
  }

  selectRange(row: Row[], point: Point, a: number, b: number) {
    if (!point) {
      return
    }
    row[a].col[b].selected = true
    const points = this.getSelectedPoints(row)
    const point3 = this.getLargePoint(...points)
    row.forEach((item, i) => {
      if (!item || !item.col) {
        return false
      }
      item.col.forEach((obj, t) => {
        const point = this.getCellInfoByIndex(t, i)
        if (point && this.hitTest(point3, point)) {
          obj.selected = true
        }
      })
    })
    return row;
  }

  select(data: State,a: number, b: number) {
    data.row.forEach((item, i) => {
      if (!item || !item.col) {
        return
      }
      item.col.forEach((obj, t) => {
        if (i !== a || t !== b) {
          obj.selected = false
        }
      })
    })
    if (!data.row[a].col[b].selected) {
      data.row[a].col[b].selected = true
    }
    data.point = { x: b, y: a, width: 0, height: 0 }
    return data;
  }

  unselectCells(row: Row[]) {
    row.forEach((item, i) => {
      if (!item || !item.col) {
        return false
      }
      item.col.forEach((obj, t) => {
        obj.selected = false
      })
    })
    return row;
  }

  removeCell(row: Row[], cell: Col) {
    for (let i = 0, n = row.length; i < n; i++) {
      const col = row[i].col
      for (let t = 0, m = col.length; t < m; t++) {
        const obj = col[t]
        if (obj === cell) {
          col.splice(t, 1)
          t--
          m--
        }
      }
    }
    return row;
  }

  removeSelectedCellExcept(row: Row[], cell?: Col) {

    for (let i = 0, n = row.length; i < n; i++) {
      const col = row[i].col
      for (let t = 0, m = col.length; t < m; t++) {
        const obj = col[t]
        if (obj !== cell && obj.selected) {
          col.splice(t, 1)
          t--
          m--
        }
      }
    }
    return row;
  }

  contextmenu(e: any) {
    e.preventDefault()
    this.setState({
      showMenu: true,
      menuX: e.clientX,
      menuY: e.clientY,
    })
  }

  parse(html: string, format = 'html') {
    const arr1: Row[] = []
    const doc = util.parseHTML(html)
    const trs = doc.querySelectorAll('tr')
    ;[].forEach.call(trs, (tr: HTMLTableRowElement) => {
      const ret2 = {} as Row
      const arr2: Col[] = []
      const cells = tr.querySelectorAll('th,td')
      ret2.col = arr2
      ;[].forEach.call(cells, (cell: HTMLTableCellElement) => {
        const obj = {} as Col
        const html = format === 'html' ? cell.innerHTML : cell.innerText
        if (cell.tagName === 'TH') {
          obj.type = 'th'
        } else {
          obj.type = 'td'
        }
        obj.colspan = parseInt(cell.getAttribute('colspan') as string) || 1
        obj.rowspan = parseInt(cell.getAttribute('rowspan') as string) || 1
        obj.value = ''
        if (html) {
          obj.value = html.replace(/{(.*?)}/g, '&lcub;$1&rcub;')
          obj.value = obj.value.replace(/\\/g, '&#92;')
        }
        const classAttr = cell.getAttribute('class')
        let cellClass = ''
        if (classAttr) {
          const classList = classAttr.split(/\s+/)
          classList.forEach(item => {
            const align = this.getAlignByStyle(item)
            if (align) {
              obj.align = align
            } else {
              cellClass += ` ${item}`
            }
          })
        }
        obj.cellClass = cellClass.substr(1)
        arr2.push(obj)
      })
      arr1.push(ret2)
    })
    return arr1
  }

  parseText(text: string) {
    const arr1: Row[] = []
    // replace newline codes inside double quotes to <br> tag
    text = text.replace(/"(([\n\r\t]|.)*?)"/g, (match, str) => str.replace(/[\n\r]/g, '<br>'))
    const rows = text.split(String.fromCharCode(13))
    rows.forEach(row => {
      const ret2 = {} as Row
      const arr2: Col[] = []
      ret2.col = arr2
      const cells = row.split(String.fromCharCode(9))
      cells.forEach(cell => {
        const obj = {} as Col
        obj.type = 'td'
        obj.colspan = 1
        obj.rowspan = 1
        obj.value = ''
        if (cell) {
          obj.value = cell;
        }
        arr2.push(obj)
      })
      arr1.push(ret2)
    })
    return arr1
  }

  getTableClass(html: string) {
    return util.parseHTML(html).getAttribute('class')
  }

  toMarkdown(html: string) {
    const table = util.parseHTML(html)
    let ret = ''
    const trs = table.querySelectorAll('tr')
    ;[].forEach.call(trs, (tr, i) => {
      ret += '| '
      const children = tr.querySelectorAll('td,th')
      ;[].forEach.call(children, child => {
        ret += child.innerHTML
        ret += ' | '
      })
      if (i === 0) {
        ret += '\n| '
        ;[].forEach.call(children, child => {
          ret += '--- | '
        })
      }
      ret += '\n'
    })
    return ret
  }

  getHtml(row: Row[]) {
    let html = renderToStaticMarkup(this.renderHTML(row));
    html = html.replace(/&quot;/g, '"');
    html = html.replace(/data-tmp="(.*?)"/g, '$1');
    html = html.replace(/&lt;/g, '<');
    html = html.replace(/&gt;/g, '>');
    return html;
  }

  getTable(row: Row[]) {
    return this.getHtml(row)
      .replace(/ className=""/g, '')
      .replace(/className="(.*)? "/g, 'className="$1"')
  }

  getMarkdown(row: Row[]) {
    return this.toMarkdown(this.getHtml(row))
  }

  putCaret(elem: HTMLElement) {
    if (!elem) {
      return
    }
    elem.focus()
    if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
      const range = document.createRange()
      range.selectNodeContents(elem)
      range.collapse(false)
      const sel = window.getSelection() as Selection
      sel.removeAllRanges()
      sel.addRange(range)
    } else if (typeof document.body.createTextRange !== 'undefined') {
      const textRange = document.body.createTextRange()
      textRange.moveToElementText(elem)
      textRange.collapse(false)
      textRange.select()
    }
  }

  componentDidUpdate() {
    const table = this.getElementByQuery('table') as HTMLTableElement
    const inner = this.getSelf().parentNode as HTMLElement
    const elem = this.getElementByQuery('.st-table-selected .st-table-editable') as HTMLDivElement
    const { showMenu, openLinkModal, row } = this.state;
    const selectedPoints = this.getSelectedPoints(row)
    if (elem && !showMenu && !openLinkModal && selectedPoints.length === 1) {
      setTimeout(() => {
        this.putCaret(elem)
      }, 1)
    }

    // for scroll
    if (table) {
      inner.style.width = '9999px'
      const tableWidth = table.offsetWidth
      inner.style.width = `${tableWidth}px`
    } else {
      inner.style.width = 'auto'
    }
  }

  undo() {
    const history = produce(this.state.history, history => history)
    let row = produce(this.state.row, row => row);
    if (history.length === 0) {
      return
    }

    while (JSON.stringify(row) === JSON.stringify(this.state.row)) {
      row = history.pop()
    }

    if (row) {
      if (history.length === 0) {
        history.push(row)
      }
      this.setState({
        row,
        history,
      })
      this.forceUpdate()
    }
  }

  insertRow(row: Row[], a: number, newrow: Col[]) {
    if (row[a]) {
      row.splice(a, 0, { col: newrow })
      return row
    } else if (row.length === a) {
      row.push({ col: newrow })
      return row
    }
  }

  insertCellAt(row: Row[], a: number, b: number, item: Col) {
    if (row[a] && row[a].col) {
      row[a].col.splice(b, 0, item)
      return row
    }
    return row;
  }

  replaceCellAt(row: Row[], a: number, b: number, item: Col) {
    if (row[a] && row[a].col) {
      row[a].col[b] = item;
      return row
    }
    return row;
  }

  unselect() {
    const row = this.unselectCells(this.state.row)
    this.setState({
      selectedColNo: -1,
      selectedRowNo: -1,
      showMenu: false,
      row,
    })
  }

  selectRow(e: CellClickEvent, i: number) {
    const newRow = produce(this.state.row, (row) => {
      const newRow = this.unselectCells(row)
      const points = this.getAllPoints(newRow)
      const largePoint = this.getLargePoint(...points)
      const newpoint = { x: i, y: 0, width: 1, height: largePoint.height }
      const targetPoints: Point[] = []
      points.forEach(point => {
        if (this.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const cell = this.getCellByPos(newRow, point.x, point.y)
        cell.selected = true
      })
      return newRow
    });
    this.setState({
      showMenu: false,
      mode: 'col',
      selectedColNo: -1,
      selectedRowNo: i,
      row: newRow
    })
    this.contextmenu(e)
    // this.update()
  }

  selectCol(e: CellClickEvent, i: number) {
    const points = this.getAllPoints(this.state.row)
    const largePoint = this.getLargePoint(...points)
    const newpoint = { x: 0, y: i, width: largePoint.width, height: 1 }
    const targetPoints: Point[] = []
    const row = produce(this.state.row, (row) => {
      const newRow = this.unselectCells(row)
      points.forEach(point => {
        if (this.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const cell = this.getCellByPos(newRow, point.x, point.y)
        cell.selected = true
      })
      return row;
    })

    this.setState({
      showMenu: false,
      mode: 'row',
      selectedRowNo: -1,
      selectedColNo: i,
      row,
    })
    this.contextmenu(e)
    // this.update()
  }

  removeCol(selectedno: number) {
    const data = produce(this.state, data => {
      const points = this.getAllPoints(data.row)
      const largePoint = this.getLargePoint.apply(null, points)
      const newpoint = { x: selectedno, y: 0, width: 1, height: largePoint.height }
      const targetPoints: Point[] = []
      points.forEach(point => {
        if (this.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const cell = this.getCellByPos(data.row, point.x, point.y)
        if (!cell) {
          return
        }
        if (cell.colspan === 1) {
          data.row = this.removeCell(data.row, cell)
        } else {
          cell.colspan = cell.colspan - 1
        }
      })
      data.history = this.generateHistory(data.row)
      return data
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(data.row))
    }
    this.setState({
      ...data,
      showMenu: false,
    });
  }

  removeRow(selectedno: number) {
    const state = produce(this.state, (data) => {
      data.showMenu = false
      const points = this.getAllPoints(data.row)
      const largePoint = this.getLargePoint(...points)
      const newpoint = { x: 0, y: selectedno, width: largePoint.width, height: 1 }
      const nextpoint = { x: 0, y: selectedno + 1, width: largePoint.width, height: 1 }
      const targetPoints = []
      const removeCells = []
      const insertCells = []
      points.forEach(point => {
        if (this.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      points.forEach(point => {
        if (this.hitTest(nextpoint, point)) {
          const cell = this.getCellByPos(data.row, point.x, point.y)
          cell.x = point.x
          if (point.y === nextpoint.y) {
            insertCells.push(cell)
          }
        }
      })
      targetPoints.forEach(point => {
        const cell = this.getCellByPos(data.row, point.x, point.y)
        if (cell.rowspan === 1) {
          removeCells.push(cell)
        } else {
          cell.rowspan = cell.rowspan - 1
          if (selectedno === point.y) {
            cell.x = point.x
            insertCells.push(cell)
          }
        }
      })
      insertCells.sort((a, b) => {
        if (a.x > b.x) {
          return 1
        }
        return -1
      })
      removeCells.forEach(cell => {
        data.row = this.removeCell(data.row, cell)
      })
      data.row.splice(selectedno, 1)
      if (insertCells.length > 0) {
        data.row[selectedno] = { col: insertCells }
      }
      data.history.push(produce(data.row, row => row))
      return data;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state);
  }

  onCellInput(e: CellClickEvent, b: number, a: number) {
    const state = produce(this.state, (data) => {
      if (
        util.hasClass(e.target as HTMLElement, 'st-table-editable') &&
        // @ts-ignore
        e.target.parentNode.getAttribute('data-cell-id') === `${b}-${a}`
      ) {
        data.history.push(produce(data.row, row => row))
        // @ts-ignore
        data.row[a].col[b].value = e.target.innerHTML
      }
      return data;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state);
  }

  onCellKeyup(e: CellClickEvent, b: number, a:number) {
    const state = produce(this.state, (data) => {
      const browser = util.getBrowser()
      if (browser.indexOf('ie') !== -1 || browser === 'edge') {
        if (
          util.hasClass(e.target as HTMLElement, 'st-table-editable') &&
          // @ts-ignore
          e.target.parentNode.getAttribute('data-cell-id') === `${b}-${a}`
        ) {
          data.history.push(produce(data.row, row => row))
          // @ts-ignore
          data.row[a].col[b].value = e.target.innerHTML;
        }
      }
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state);
  }

  shouldComponentUpdate(nextProps: Props, state: State) {
    const { row: prevRow, history: currentH, beingInput: currentInput, mousedown: currentMouseDown, selectedTags: currentTags, ...currentState } = this.state;
    const { row: nextRow, history: prevH, beingInput: nextInput, mousedown: nextMouseDown, selectedTags: nextTags, ...nextState } = state;
    if (!shallowEqualObjects(currentState, nextState)) {
      return true;
    }
    if (prevRow.length !== nextRow.length) {
      return true;
    }
    return prevRow.some((row, x) => {
      if (prevRow[x].col.length !== nextRow[x].col.length) {
        return true;
      }
      return row.col.some((col, y) => {
        const nextCol = nextRow[x].col[y];
        const { value: nextValue, ...nextColState } = nextCol;
        const { value: prevValue, ...prevColState } = col;
        if (shallowEqualObjects(nextColState, prevColState)) {
          return false;
        }
        return true;
      })
    })
  }

  onCompositionStart(e: CellClickEvent) {
    this.setState({
      beingInput: true
    })
  }

  onCompositionEnd(e: CellClickEvent) {
    this.setState({
      beingInput: false
    })
  }

  getCurrentTags(data: State, a: number, b: number) {
    const tags: { tag: string, className: string }[] = [];
    const target = util.getSelectionNode();
    if (!target) {
      return data;
    }

    tags.push({ tag: target.tagName.toLowerCase(), className: target.className || '' });
    let parent = target.parentElement;
    const tag = parent.tagName.toLowerCase();
    const { point } = this.state
    const index = this.getCellIndexByPos(point.x, point.y)
    const cell = this.getCellByIndex(index.col, index.row)
    if (!cell) {
      return data;
    }
    const editableDiv = cell.querySelector('.st-table-editable') as HTMLElement
    while (parent !== editableDiv) {
      if (!parent) {
        break;
      }
      tags.push({
        tag,
        className: parent.className || ''
      });
      parent = parent.parentElement;
    }
    data.selectedTags = tags;
    return data;
  }

  updateTable(e: CellClickEvent, b: number, a: number) {
    const state = produce(this.state, (data) => {
      const type = e.type
      const points = this.getSelectedPoints(data.row)
      const isSmartPhone = util.isSmartPhone()
      if (type === 'mouseup' && data.showMenu) {
        return
      }
      data.mode = 'cell'
      data.selectedRowNo = -1
      data.selectedColNo = -1
      data.showMenu = false
      // @ts-ignore
      if (type === 'keydown' && e.keyCode == 67 && (e.ctrlKey || e.metaKey)) {
        const elem = this.getElementByQuery('.st-table-selected .st-table-editable') as HTMLElement
        util.triggerEvent(elem, 'copy')
      } else if (type === 'mousedown' && !isSmartPhone) {
        if (e.button !== 2 && !e.ctrlKey) {
          data.mousedown = true
          data = this.getCurrentTags(data, a, b)
          if (!data.beingInput) {
            if (!data.row[a].col[b].selected || points.length > 1) {
              data.row = this.unselectCells(data.row)
              data = this.select(data, a, b)
            }
          }
        }
      } else if (type === 'mousemove' && !isSmartPhone) {
        if (data.mousedown) {
          data = this.getCurrentTags(data, a, b)
          data.row = this.selectRange(data.row, data.point, a, b)
        }
      } else if (type === 'mouseup' && !isSmartPhone) {
        data.mousedown = false
        if (points.length !== 1) {
          const elem = this.getElementByQuery('.st-table-selected .st-table-editable') as HTMLElement
          this.putCaret(elem)
        }
      } else if (type === 'contextmenu') {
        e.preventDefault()
        data.mousedown = false
        data.showMenu =  true
        data.menuX = e.clientX
        data.menuY = e.clientY
      } else if (type === 'touchstart') {
        if (points.length !== 1 || !data.row[a].col[b].selected) {
          if (!data.beingInput) {
            this.select(data, a, b)
            // this.update()
          }
        } // todo
      }
      return data;
    });
    this.setState(state);
  }

  copyTable(e: CellClickEvent) {
    const points = this.getSelectedPoints(this.state.row)
    if (points.length <= 1) {
      return
    }
    e.preventDefault()
    let copyText = '<meta name="generator" content="Sheets"><table>'
    this.state.row.forEach((item, i) => {
      if (!item.col) {
        return false
      }
      copyText += '<tr>'
      item.col.forEach(obj => {
        if (obj.selected) {
          copyText += `<${obj.type} colspan="${obj.colspan}" rowspan="${obj.rowspan}">${obj.value}</${obj.type}>`
        }
      })
      copyText += '</tr>'
    })
    copyText += '</table>'
    copyText = copyText.replace(/<table>(<tr><\/tr>)*/g, '<table>')
    copyText = copyText.replace(/(<tr><\/tr>)*<\/table>/g, '</table>')
    if (e.clipboardData) {
      e.clipboardData.setData('text/html', copyText)
    } else if (window.clipboardData) {
      window.clipboardData.setData('Text', copyText)
    }
  }

  pasteTable(e: CellClickEvent) {
    if (e.clipboardData) {
      let html = e.clipboardData.getData('text/html')
      if (!html) {
        html = e.clipboardData.getData('text/plain')
      }
      this.processPaste(e, html)
    } else if (window.clipboardData) {
      this.getClipBoardData(e)
    }
  }

  getClipBoardData(e: CellClickEvent) {
    const savedContent = document.createDocumentFragment()
    const point = this.getSelectedPoint(this.state.row)
    if (!point) {
      return false
    }
    const index = this.getCellIndexByPos(point.x, point.y)
    const cell = this.getCellByIndex(index.col, index.row)
    if (!cell) {
      return false
    }
    const editableDiv = cell.querySelector('.st-table-editable') as HTMLElement
    if (!editableDiv) {
      return false
    }
    while (editableDiv.childNodes.length > 0) {
      savedContent.appendChild(editableDiv.childNodes[0])
    }
    this.waitForPastedData(e, editableDiv, savedContent)
    return true
  }

  waitForPastedData(e: CellClickEvent, elem: HTMLElement, savedContent) {
    if (elem.childNodes && elem.childNodes.length > 0) {
      const pastedData = elem.innerHTML
      elem.innerHTML = ''
      elem.appendChild(savedContent)
      this.processPaste(e, pastedData)
    } else {
      setTimeout(() => {
        this.waitForPastedData(e, elem, savedContent)
      }, 20)
    }
  }

  async processPaste(e, pastedData: string) {
    e.preventDefault()
    const selectedPoint = this.getSelectedPoint(this.state.row)
    const tableHtml = pastedData.match(/<table(([\n\r\t]|.)*?)>(([\n\r\t]|.)*?)<\/table>/i)
    
    if (tableHtml && tableHtml[0]) {
      const newRow = this.parse(tableHtml[0], 'text')
      if (newRow && newRow.length) {
        const prevRow = produce(this.state.row, row => row);
        await this.addRowAndCol(newRow, {
          x: selectedPoint.x,
          y: selectedPoint.y,
          width: 0,
          height: 0,
        });
        const state = produce(this.state, (data) => {
          const row = this.insertTable(data.row, prevRow, newRow, {
            x: selectedPoint.x,
            y: selectedPoint.y,
            width: 0,
            height: 0,
          })
          data.row = row;
          data.history = this.generateHistory(row);
          return data;
        })
        this.setState(state);
        return
      }
    }
    // for excel;
    const row = this.parseText(pastedData)
    if (row && row[0] && row[0].col && row[0].col.length > 1) {
      const prevRow = produce(this.state.row, row => row);
      const state = produce(this.state, (data) => {
        const selectedPoint = this.getSelectedPoint(data.row)
        const newRow = this.insertTable(data.row, prevRow, row, {
          x: selectedPoint.x,
          y: selectedPoint.y,
          width: 0,
          height: 0,
        })
        data.row = newRow;
        data.history = this.generateHistory(row);
        return data;
      })
      this.setState(state);
    } else {
      if (e.clipboardData) {
        const content = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, content)
      } else if (window.clipboardData) {
        const content = window.clipboardData.getData('Text')
        util.replaceSelectionWithHtml(content)
      }
    }
  }

  generateNewCell() {
    return ({ 
      type: 'td' as 'td' | 'th', 
      colspan: 1, 
      rowspan: 1, 
      value: '', 
      selected: false, 
      x: -1, 
      y: -1, 
      align: 'left' as Align, 
      mark: {
        right: false,
        left: false,
        top: false,
        bottom: false
      } 
    });
  }

  generateHistory(row: Row[]) {
    return produce(this.state.history, history => {
      history.push(row)
      return history
    });
  }

  updateResult() {
    const { inputMode, tableResult } = this.state;
    if (inputMode === 'table') {
      const row = this.parse(tableResult);
      this.setState({
        row,
        tableClass: this.getTableClass(tableResult),
        history: this.generateHistory(row)
      })
    }
  }

  insertColRight(selectedno: number) {
    const state = produce(this.state, data => {
      const points = this.getAllPoints(data.row)
      const largePoint = this.getLargePoint(...points)
      const newpoint = { x: selectedno, y: 0, width: 1, height: largePoint.height }
      const targetPoints = []
      points.forEach(point => {
        if (this.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const index = this.getCellIndexByPos(point.x, point.y)
        const cell = this.getCellByPos(data.row, point.x, point.y)
        if (typeof index.row !== 'undefined' && typeof index.col !== 'undefined') {
          if (point.width + point.x - newpoint.x > 1) {
            cell.colspan = cell.colspan + 1
          } else {
            data.row = this.insertCellAt(data.row, index.row, index.col + 1, {
              ...this.generateNewCell(),
              rowspan: cell.rowspan
            })
          }
        }
      })
      return data;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState({
      ...state,
      selectedRowNo: selectedno,
      showMenu: false,
      history: this.generateHistory(state.row),
    })
  }

  insertColLeft(selectedno: number) {
    const points = this.getAllPoints(this.state.row)
    const largePoint = this.getLargePoint(...points)
    const newpoint = { x: selectedno - 1, y: 0, width: 1, height: largePoint.height }
    const targetPoints = []
    points.forEach(point => {
      if (this.hitTest(newpoint, point)) {
        targetPoints.push(point)
      }
    })
    const state = produce(this.state, (data) => {
      if (selectedno === 0) {
        const length = largePoint.height
        for (let i = 0; i < length; i++) {
          data.row = this.insertCellAt(data.row, i, 0, this.generateNewCell())
        }
        data.history = this.generateHistory(data.row);
        return data;
      }
      targetPoints.forEach(point => {
        const index = this.getCellIndexByPos(point.x, point.y)
        const cell = this.getCellByPos(this.state.row, point.x, point.y)
        if (typeof index.row !== 'undefined' && typeof index.col !== 'undefined') {
          if (point.width + point.x - newpoint.x > 1) {
            cell.colspan = cell.colspan + 1
          } else {
            data.row = this.insertCellAt(data.row, index.row, index.col + 1, {
              ...this.generateNewCell(),
              rowspan: cell.rowspan
            })
          }
        }
      })
      return data;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState({
      ...state,
      selectedRowNo: selectedno + 1,
      showMenu: false,
      history: this.generateHistory(state.row),
    })
  }

  beforeUpdated() {
    this.changeSelectOption()
    this.markup()
  }

  insertRowBelow(selectedColNo: number) {
    this.setState({
      showMenu: false,
      selectedColNo
    });
    const points = this.getAllPoints(this.state.row)
    const largePoint = this.getLargePoint(...points)
    const newpoint = { x: 0, y: selectedColNo + 1, width: largePoint.width, height: 1 }
    const targetPoints = []
    const newRow = []
    points.forEach(point => {
      if (this.hitTest(newpoint, point)) {
        targetPoints.push(point)
      }
    })
    const row = produce(this.state.row, row => {
      if (targetPoints.length === 0) {
        const length = largePoint.width
        for (let i = 0; i < length; i++) {
          const newcell = { type: 'td', colspan: 1, rowspan: 1, value: '' }
          newRow.push(newcell)
        }
        return this.insertRow(row, selectedColNo + 1, newRow);
      }
      targetPoints.forEach(point => {
        const index = this.getCellIndexByPos(point.x, point.y)
        const cell = this.getCellByPos(this.state.row, point.x, point.y)
        if (!cell) {
          return
        }
        const newcell = { type: 'td' as 'td' | 'th', colspan: 1, rowspan: 1, value: '' }
        if (typeof index.row !== 'undefined' && typeof index.col !== 'undefined') {
          if (point.height > 1 && point.y <= selectedColNo) {
            cell.rowspan = cell.rowspan + 1
          } else if (index.row === selectedColNo + 1) {
            const length = cell.colspan
            for (let i = 0; i < length; i++) {
              newRow.push({ type: 'td', colspan: 1, rowspan: 1, value: '' })
            }
          } else {
            row = this.insertCellAt(this.state.row, index.row + 1, index.col, {
              ...this.generateNewCell(),
              ...newcell
            })
          }
        }
      })
      return this.insertRow(row, selectedColNo + 1, newRow)
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      row,
      history: this.generateHistory(row)
    });
  }

  insertRowAbove(selectedno: number) {
    const state = produce(this.state, data => {
      data.showMenu = false
      data.selectedColNo = selectedno + 1
      const points = this.getAllPoints(data.row)
      const largePoint = this.getLargePoint(...points)
      const newpoint = { x: 0, y: selectedno - 1, width: largePoint.width, height: 1 }
      const targetPoints = []
      const newRow = []
      points.forEach(point => {
        if (this.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      if (selectedno === 0) {
        const length = largePoint.width
        for (let i = 0; i < length; i++) {
          const newcell = { type: 'td', colspan: 1, rowspan: 1, value: '' }
          newRow.push(newcell)
        }
        this.insertRow(data.row, 0, newRow)
        return data;
      }
      targetPoints.forEach(point => {
        const index = this.getCellIndexByPos(point.x, point.y)
        const cell = this.getCellByPos(data.row, point.x, point.y)
        if (!cell) {
          return
        }
        const newcell = { type: 'td' as 'td' | 'th', colspan: 1, rowspan: 1, value: '' }
        if (typeof index.row !== 'undefined' && typeof index.col !== 'undefined') {
          if (point.height > 1) {
            cell.rowspan = cell.rowspan + 1
          } else if (index.row === selectedno - 1) {
            const length = cell.colspan
            for (let i = 0; i < length; i++) {
              newRow.push({ type: 'td', colspan: 1, rowspan: 1, value: '' })
            }
          } else {
            data.row = this.insertCellAt(data.row, index.row, index.col, {
              ...this.generateNewCell(),
              ...newcell
            })
          }
        }
      })
      data.row = this.insertRow(data.row, selectedno, newRow)
      data.history.push(data.row)
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state);
  }

  mergeCells() {
    const points = this.getSelectedPoints(this.state.row)
    if (!this.isSelectedCellsRectangle()) {
      alert(this.props.message.mergeCellError1)
      return
    }
    if (points.length === 0) {
      return
    }
    if (!confirm(this.props.message.mergeCellConfirm1)) {
      return
    }
    const point = this.getLargePoint(...points)
    const row = produce(this.state.row, (row) => {
      const cell = this.getCellByPos(row, point.x, point.y)
      const newRow = this.removeSelectedCellExcept(row, cell)
      cell.colspan = point.width
      cell.rowspan = point.height
      return newRow;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      showMenu: false,
      row,
      history: this.generateHistory(row)
    })
  }

  splitCell() {
    const data = this.state
    const selectedPoints = this.getSelectedPoints(data.row)
    const length = selectedPoints.length
    if (length === 0) {
      alert(this.props.message.splitError1)
      return
    } else if (length > 1) {
      alert(this.props.message.splitError2)
      return
    }
    const selectedPoint = this.getSelectedPoint(data.row)
    const bound = { x: 0, y: selectedPoint.y, width: selectedPoint.x, height: selectedPoint.height }
    const points = this.getAllPoints(data.row)
    const currentIndex = this.getCellIndexByPos(selectedPoint.x, selectedPoint.y)
    const currentCell = this.getCellByPos(data.row, selectedPoint.x, selectedPoint.y)
    const width = currentCell.colspan
    const height = currentCell.rowspan
    const currentValue = currentCell.value
    const targets = []
    const cells: Col[] = []
    const rows: { row: number, col: number }[][] = []
    if (width === 1 && height === 1) {
      alert(this.props.message.splitError3)
      return
    }
    points.forEach(point => {
      if (this.hitTest(bound, point)) {
        const index = this.getCellIndexByPos(point.x, point.y)
        targets.push(index)
      }
    })
    targets.forEach(item => {
      const row = item.row
      if (item.row < currentIndex.row) {
        return
      }
      if (!rows[row]) {
        rows[row] = []
      }
      rows[row].push(item)
    })
    for (let i = 1, n = rows.length; i < n; i++) {
      if (!rows[i]) {
        continue
      }
      rows[i].sort((a, b) => {
        if (a.col > b.col) {
          return 1
        }
        return -1
      })
    }
    for (let i = selectedPoint.y, n = i + height; i < n; i++) {
      if (!rows[i]) {
        rows[i] = []
        rows[i].push({ row: i, col: -1 })
      }
    }
    let first = true

    const state = produce(this.state, (data) => {
      const currentCell = this.getCellByPos(data.row, selectedPoint.x, selectedPoint.y)
      rows.forEach(row => {
        const index = row[row.length - 1]
        for (let i = 0; i < width; i++) {
          let val = ''
          // スプリットされる前のコルのデータを保存
          if (first === true && i === width - 1) {
            val = currentValue
            first = false
          }
          data.row = this.insertCellAt(data.row, index.row, index.col + 1, {
            ...this.generateNewCell(),
            type: 'td',
            colspan: 1,
            rowspan: 1,
            value: val,
            selected: true,
          })
        }
      })
      data.row = this.removeCell(data.row, currentCell)
      return data;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState({
      ...state,
      showMenu: false,
      history: this.generateHistory(state.row),
      splited: true
    })
  }

  changeCellTypeTo(type) {
    const state = produce(this.state, data => {
      data.row.forEach((item, i) => {
        item.col.forEach((obj, t) => {
          if (obj.selected) {
            obj.type = type
          }
        })
      })
      data.showMenu = false
      data.history.push(produce(data.row, row => row))
      return data;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state);
  }

  align(align: Align) {
    const state = produce(this.state, data => {
      data.row.forEach((item, i) => {
        item.col.forEach((obj, t) => {
          if (obj.selected) {
            obj.align = align
          }
        })
      })
      data.showMenu = false
      data.history.push(data.row)
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state);
  }

  getStyleByAlign(val: string) {
    const { align } = this.props.mark
    if (align.default === val) {
      return ''
    }
    return align[val]
  }

  getAlignByStyle(style: string) {
    const { align } = this.props.mark;
    if (align.right === style) {
      return 'right'
    } else if (align.center === style) {
      return 'center'
    } else if (align.left === style) {
      return 'left'
    }
  }

  isSelectedCellsRectangle() {
    const selectedPoints = this.getSelectedPoints(this.state.row)
    const largePoint = this.getLargePoint(...selectedPoints)
    const points = this.getAllPoints(this.state.row)
    let flag = true
    points.forEach(point => {
      if (this.hitTest(largePoint, point)) {
        const cell = this.getCellByPos(this.state.row, point.x, point.y)
        if (cell && !cell.selected) {
          flag = false
        }
      }
    })
    return flag
  }

  changeInputMode(source: 'table' | 'source') {
    const { tableResult, row } = this.state
    if (source === 'source') {
      this.setState({
        tableResult: this.getTable(row),
      })
    } else {
      this.setState({
        row: this.parse(tableResult),
        tableClass: this.getTableClass(tableResult),
      })
    }
  }

  changeCellClass() {
    const data = this.state
    const cellClass = data.cellClass
    const state = produce(this.state, data => {
      data.row.forEach(item => {
        item.col.forEach(obj => {
          if (obj.selected) {
            obj.cellClass = cellClass
          }
        })
      })
      data.history.push(produce(data.row, row => row))
    });
    this.setState(state);
  }

  changeSelectOption() {
    let cellClass: string
    let flag = true
    const { row } = this.state
    row.forEach(item => {
      item.col.forEach(obj => {
        if (obj.selected) {
          if (!cellClass) {
            cellClass = obj.cellClass
          } else if (cellClass && cellClass !== obj.cellClass) {
            flag = false
          }
        }
      })
    })
    if (flag && cellClass) {
      this.setState({
        cellClass,
      })
    } else {
      this.setState({
        cellClass: '',
      })
    }
  }

  async addRowAndCol(table: Row[], pos: Point) {
    const copiedLength = this.getTableLength(table)
    const currentLength = this.getTableLength(this.state.row);
    let offsetX = pos.x + copiedLength.x - currentLength.x;
    let offsetY = pos.y + copiedLength.y - currentLength.y;
    const length = currentLength.x;
    const row = produce(this.state.row, (row) => {
      while (offsetY > 0) {
        const newRow: Col[] = [];
        for (let i = 0; i < length; i++) {
          const newcell = this.generateNewCell();
          newRow.push(newcell);
        }
        row = this.insertRow(row, currentLength.y, newRow);
        offsetY--;
      }
      if (offsetX > 0) {
        row.forEach((item) => {
          for (let i = 0; i < offsetX; i++) {
            item.col.push(this.generateNewCell());
          }
        });
      }
      return row;
    });
    await new Promise((resolve) => {
      this.setState({
        row
      }, () => {
        requestAnimationFrame(() => {
          resolve();
        });
      })
    });
  }

  insertTable(stateRow: Row[], prevRow: Row[], table: Row[], pos: Point) {
    const copiedLength = this.getTableLength(table)
    const targets: { row: number, col: number}[] = []
    const rows: { row: number, col: number}[][] = []

    const destPos = {} as Point
    const vPos = {
      x: pos.x,
      y: pos.y,
    } as Point;

    vPos.y += copiedLength.y - 1
    vPos.x += copiedLength.x - 1

    stateRow.forEach((item, i) => {
      if (!item.col) {
        return false
      }
      item.col.forEach((obj, t) => {
        const point = this.getCellInfoByIndex(t, i)
        console.log(point)
        if (point && point.x + point.width - 1 === vPos.x && point.y + point.height - 1 === vPos.y) {
          destPos.x = t
          destPos.y = i
        }
      })
    })

    console.log(destPos.x)

    if (typeof destPos.x === 'undefined') {
      alert(this.props.message.pasteError1)
      return prevRow;
    }

    const newRow = this.selectRange(stateRow, this.state.point, destPos.y, destPos.x)
    const selectedPoints = this.getSelectedPoints(newRow)
    const largePoint = this.getLargePoint(...selectedPoints)

    if (largePoint.width !== copiedLength.x || largePoint.height !== copiedLength.y) {
      alert(this.props.message.pasteError1)
      return prevRow;
    }

    const bound = { x: 0, y: largePoint.y, width: largePoint.x, height: largePoint.height }
    const points = this.getAllPoints(stateRow)

    points.forEach(point => {
      if (this.hitTest(bound, point)) {
        const index = this.getCellIndexByPos(point.x, point.y)
        targets.push(index)
      }
    })

    targets.forEach(item => {
      const { row } = item;
      if (item.row < largePoint.y) {
        return
      }
      if (!rows[row]) {
        rows[row] = [];
      }
      rows[row].push(item)
    })
    for (let i = 1, n = rows.length; i < n; i++) {
      if (!rows[i]) {
        continue
      }
      rows[i].sort((a, b) => {
        if (a.col > b.col) {
          return 1
        }
        return -1
      })
    }
    for (let i = largePoint.y, n = i + largePoint.height; i < n; i++) {
      if (!rows[i]) {
        rows[i] = []
        rows[i].push({ row: i, col: -1 })
      }
    }
    let t = 0
    stateRow = this.removeSelectedCellExcept(stateRow);
    rows.forEach((row) => {
      const index = row[row.length - 1]
      if (table[t]) {
        table[t].col.reverse().forEach((cell: Col) => {
          stateRow = this.insertCellAt(stateRow, index.row, index.col + 1, {
            type: 'td',
            align: 'left',
            colspan: cell.colspan,
            rowspan: cell.rowspan,
            value: cell.value,
            selected: true,
            x: -1,
            y: -1,
            mark: {
              top: false,
              right: false,
              bottom: false,
              left: false,
            }
          })
        })
      }
      t++
    });
    return stateRow;
  }

  checkTag(tag: string, className: string) {
    const { selectedTags } = this.state;
    return selectedTags.some((selectedTag) => {
      return selectedTag.tag === tag && selectedTag.className === className;
    })
  }

  unwrapTag(cell: HTMLElement, tag: string, className: string) {
    const pos = util.getCaretPos(cell);
    let node = util.getElementBySelection();
    const length = util.getSelectionLength();
    const nodePos = util.getCaretPos(node);
    if (node.parentElement === cell &&
      node.textContent && nodePos === node.textContent.length && length === 0) {
      util.moveCaretAfter(node);
    } else {
      while (true) {
        const nodeClassName = node.getAttribute('class') || '';
        if (node.tagName.toLowerCase() === tag && nodeClassName === className) {
          util.unwrapTag(node);
          break;
        }
        node = node.parentElement;
      }
      util.setCaretPos(cell, pos, length);
    }
    const row = produce(this.state.row, (row) => {
      const point = this.getSelectedPoint(row)
      const col = this.getCellByPos(row, point.x, point.y)
      col.value = cell.innerHTML;
      return row;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({ row });
  }

  insertTag(tag: string, className: string) {
    const point = this.getSelectedPoint(this.state.row)
    if (!point) {
      return false
    }
    let classAttr = '';
    if (className) {
      classAttr = ` class="${className}"`;
    }
    const index = this.getCellIndexByPos(point.x, point.y)
    const cell = this.getCellByIndex(index.col, index.row) as HTMLElement
    const selection = util.getSelection(cell)
    if (this.checkTag(tag, className)) {
      this.unwrapTag(cell, tag, className);
      return;
    }
    if (tag === 'a') {
      this.openLinkModal({
        className, 
        selection: `${selection}`,
      });
      return
    }
    let insertHtml = `<${tag}${classAttr}>${selection}</${tag}>`;
    util.replaceSelectionWithHtml(insertHtml);
    const row = produce(this.state.row, (row) => {
      const col = this.getCellByPos(row, point.x, point.y)
      col.value = cell.querySelector('.st-table-editable').innerHTML;
      return row;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      row
    });
  }

  openLinkModal({ className, selection }: { className: string, selection: string }) {
    this.selection = util.saveSelection();
    this.setState({
      isNewLink: true,
      openLinkModal: true,
      linkClassName: className,
      linkLabel: `${selection}`,
    })
  }

  insertLink() {
    const { relAttrForTargetBlank } = this.props;
    const { linkClassName, linkUrl, linkLabel, linkTargetBlank } = this.state;
    let classAttr = '';
    if (linkClassName) {
      classAttr = ` class="${linkClassName}"`;
    }
    const insertHtml = `<a href="${linkUrl}"${classAttr}${linkTargetBlank === true ? `target="_blank" rel="${relAttrForTargetBlank}"` : ''}>${linkLabel}</a>`;
    util.restoreSelection(this.selection);
    util.replaceSelectionWithHtml(insertHtml);
    const point = this.getSelectedPoint(this.state.row)
    const index = this.getCellIndexByPos(point.x, point.y)
    const cell = this.getCellByIndex(index.col, index.row)
    const row = produce(this.state.row, (row) => {
      const col = this.getCellByPos(row, point.x, point.y)
      // @ts-ignore
      col.value = cell.querySelector('.st-table-editable').innerHTML;
      return row;
    });
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      row,
      openLinkModal: false,
    });
  }

  updateLink() {

  }

  removeLink() {

  }

  toggleTargetBlank(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      this.setState({
        linkTargetBlank: true
      })
    } else {
      this.setState({
        linkTargetBlank: false
      })
    }
  }
  
  renderCtxMenu() {
    const { message } = this.props
    const { showMenu, mode, selectedRowNo, selectedColNo, menuY, menuX } = this.state
    if (!showMenu) {
      return null;
    }
    return (
      <ul
        className="st-table-menu"
        style={{
          top: `${menuY}px`,
          left: `${menuX}px`,
        }}
      >
        {mode === 'cell' && (
          <>
            <li
              onClick={() => {
                this.mergeCells()
              }}
            >
              {message.mergeCells}
            </li>
            <li
              onClick={() => {
                this.splitCell()
              }}
            >
              {message.splitCell}
            </li>
            <li
              onClick={() => {
                this.changeCellTypeTo('th')
              }}
            >
              {message.changeToTh}
            </li>
            <li
              onClick={() => {
                this.changeCellTypeTo('td')
              }}
            >
              {message.changeToTd}
            </li>
            <li
              onClick={() => {
                this.align('left')
              }}
            >
              {message.alignLeft}
            </li>
            <li
              onClick={() => {
                this.align('center')
              }}
            >
              {message.alignCenter}
            </li>
            <li
              onClick={() => {
                this.align('right')
              }}
            >
              {message.alignRight}
            </li>
          </>
        )}
        {mode === 'col' && (
          <>
            <li
              onClick={() => {
                this.insertColLeft(selectedRowNo)
              }}
            >
              {message.addColumnLeft}
            </li>
            <li
              onClick={() => {
                this.insertColRight(selectedRowNo)
              }}
            >
              {message.addColumnRight}
            </li>
            <li
              onClick={() => {
                this.removeCol(selectedRowNo)
              }}
            >
              {message.removeColumn}
            </li>
          </>
        )}
        {mode === 'row' && (
          <>
            <li
              onClick={() => {
                this.insertRowAbove(selectedColNo)
              }}
            >
              {message.addRowTop}
            </li>
            <li
              onClick={() => {
                this.insertRowBelow(selectedColNo)
              }}
            >
              {message.addRowBottom}
            </li>
            <li
              onClick={() => {
                this.removeRow(selectedColNo)
              }}
            >
              {message.removeRow}
            </li>
          </>
        )}
      </ul>
    )
  }

  renderTable() {
    const { inputMode, selectedRowNo, selectedColNo, row } = this.state
    const highestRow = this.highestRow()

    return (<div className="st-table-outer">
    <div className="st-table-inner">
      <div className="st-table-wrapper" ref={(table) =>{this.tableRef = table}}>
        {inputMode === 'table' && (
          <table className="st-table">
            <tr className="st-table-header js-table-header">
              <th className="st-table-first"></th>
              {highestRow.map((row, i) => {
                return(
                <>
                  {i === selectedRowNo && (
                      <th
                        onClick={() => {
                          this.unselect()
                        }}
                        className="selected"
                      >
                        <span className="st-table-toggle-btn"></span>
                      </th>
                  )}
                {
                  i !== selectedRowNo && (
                    <th
                      onClick={(e) => {
                        this.selectRow(e, i)
                      }}
                    >
                      <span className="st-table-toggle-btn"></span>
                    </th>
                  )
                }
                </>)
              })}
            </tr>
            {row.map((item, i) => {
              return (
                <tr key={`row-${i}`}>
                  {selectedColNo !== i && (
                    <th
                      className="st-table-side js-table-side"
                      onClick={(e) => {
                        this.selectCol(e, i)
                      }}
                    >
                      <span className="st-table-toggle-btn"></span>
                    </th>
                  )}
                  {selectedColNo === i && (
                    <th
                      className="st-table-side js-table-side selected"
                      onClick={() => {
                        this.unselect()
                      }}
                    >
                      <span className="st-table-toggle-btn"></span>
                    </th>
                  )}
                  {row[i].col.map((col, j) => {
                    return (
                      <td
                        key={`col-${j}-${i}`}
                        colSpan={col.colspan}
                        rowSpan={col.rowspan}
                        onCompositionStart={this.onCompositionStart.bind(this)}
                        onCompositionEnd={this.onCompositionEnd.bind(this)}
                        onCopy={this.copyTable.bind(this)}
                        onPaste={this.pasteTable.bind(this)}
                        onContextMenu={(e) => {
                          this.updateTable(e, j, i)
                        }}
                        onInput={(e) => {
                          // @ts-ignore
                          this.onCellInput(e, j, i)
                        }}
                        onKeyUp={(e) => {
                          // @ts-ignore
                          this.onCellKeyup(e, j, i)
                        }}     
                        onClick={(e) => {
                          this.updateTable(e, j, i)
                        }}
                        onMouseDown={(e) => {
                          this.updateTable(e, j, i)
                        }}
                        onMouseUp={(e) => {
                          this.updateTable(e, j, i)
                        }}
                        onMouseMove={(e) => {
                          this.updateTable(e, j, i)
                        }}
                        className={clsx(
                          {
                            'st-table-selected': col.selected,
                            'st-table-th': col.type === 'th',
                            'st-table-border-top': col.mark && col.mark.top,
                            'st-table-border-right': col.mark && col.mark.right,
                            'st-table-border-bottom': col.mark && col.mark.bottom,
                            'st-table-border-left': col.mark && col.mark.left,
                          },
                          col.cellClass
                        )}
                        data-cell-id={`${j}-${i}`}
                      >
                        <div className={clsx('st-table-editable', col.align)} contentEditable dangerouslySetInnerHTML={{ __html: col.value }}>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </table>
        )}
        {inputMode === 'source' && (
          <textarea
            data-bind="tableResult"
            className="st-table-textarea"
            onInput={this.updateResult.bind(this)}
          ></textarea>
        )}
      </div>
      </div>
      </div>
    )
  }

  renderHTML(row: Row[]) {
    const { tableClass } = this.state;

    return (
      <table className={tableClass}>
      {row.map((item) => {
        return (<tr>
          {item.col.map((col) => {
            const className = clsx(this.getStyleByAlign(col.align), col.cellClass);
            if (col.type === 'th') {
              return <th colSpan={col.colspan} rowSpan={col.rowspan} className={className}>{col.value}</th>
            }
            return <td colSpan={col.colspan} rowSpan={col.rowspan} className={className}>{col.value}</td>
          })}
        </tr>)
      })}
      </table>
    )
  }

  renderMenu() {
    const { showBtnList, mark } = this.props;
    const { inputMode } = this.state;

    if (!showBtnList) {
      return null;
    }

    return (
      <div className="st-table-btn-group-list">
        <div className={mark.btn.group}>
          <button type="button" className={mark.btn.item} onClick={this.undo.bind(this)}>
            {mark.icon.undo}
          </button>
        </div>
        <div className={mark.btn.group}>
          <button type="button" className={mark.btn.item} onClick={this.mergeCells.bind(this)}>
            {mark.icon.merge}
          </button>
          <button type="button" className={mark.btn.item} onClick={this.splitCell.bind(this)}>
            {mark.icon.split}
          </button>
        </div>
        <div className={mark.btn.group}>
          <button type="button" className={mark.btn.item} onClick={this.changeCellTypeTo.bind(this,'td')}>
            {mark.icon.td}
          </button>
            <button type="button" className={mark.btn.item} onClick={this.changeCellTypeTo.bind(this, 'th')}>
              {mark.icon.th}
            </button>
        </div>
        <div className={mark.btn.group}>
          <button type="button" className={mark.btn.item} onClick={this.align.bind(this,'left')}>
            {mark.icon.alignLeft}
          </button>
          <button type="button" className={mark.btn.item} onClick={this.align.bind(this, 'center')}>
            {mark.icon.alignCenter}
          </button>
          <button type="button" className={mark.btn.item} onClick={this.align.bind(this, 'right')}>
            {mark.icon.alignRight}
          </button>
        </div>
        {this.props.btns && <div className={mark.btn.group}>
          {this.props.btns.map((btn) => {
            return(<button type="button" className={mark.btn.item} onClick={this.insertTag.bind(this, btn.tag, btn.className)}>
              {btn.icon}
            </button>)
          })}
        </div>}
      </div>
      )
  }

  renderLinkModal() {
    const { isNewLink, linkLabel } = this.state;
    const { mark, message } = this.props;
    return (
      <div className="st-table-modal-wrap">
        <div className="st-table-modal-outer">
          <div className="st-table-modal-inner">
            <div className="st-table-modal-content">
              <span className="st-table-close-btn-wrap">
                <button 
                  type="button" 
                  onClick={() => { this.setState({ openLinkModal: false })}} className="st-table-close-btn">
                  <i className="st-table-close-btn-icon"></i>
                </button>
              </span>
              {isNewLink && 
              <h2 className="st-table-modal-title">
                <i className="st-table-modal-title-icon"></i>{message.addLinkTitle}</h2>
              }
              {!isNewLink && 
              <h2 className="st-table-modal-title">
                <i className="st-table-modal-title-icon"></i>{message.updateLinkTitle}</h2>
              }
              <div className="st-table-modal-body">
                <table className="st-table-modal-table">
                  <tr>
                    <th>{message.linkLabel}</th>
                    <td>
                      <input 
                        type="text" 
                        className="st-table-modal-input" 
                        defaultValue={linkLabel}
                        onChange={(e) => {
                          this.setState({
                            linkLabel: e.target.value
                          })
                        }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th>{message.linkUrl}</th>
                    <td>
                      <input 
                        type="text" 
                        className="st-table-modal-input"
                        onChange={(e) => {
                          this.setState({
                            linkUrl: e.target.value,
                          })
                        }} 
                      />
                    </td>
                  </tr>
                  <tr>
                    <th>{message.targetBlank}</th>
                    <td>
                      <label>
                      <input type="checkbox" value="true" onChange={this.toggleTargetBlank.bind(this)} />
                      {message.targetBlankLabel}
                      </label>
                    </td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ textAlign: 'right' }}>
                      {isNewLink && <button type="button" onClick={this.insertLink.bind(this)} className="st-table-modal-btn">
                        <i className="st-table-modal-link-icon"></i>
                        {message.addLink}
                      </button>}
                      {!isNewLink && <>
                      <button type="button" onClick={this.updateLink.bind(this)} className="st-table-modal-btn">
                        <i className="st-table-modal-link-icon"></i>
                        {message.updateLink}
                      </button>
                      <button type="button" onClick={this.removeLink.bind(this)} className="st-table-modal-btn">
                        <i className="st-table-modal-remove-icon"></i>
                        {message.removeLink}
                      </button>
                      </>}
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { openLinkModal } = this.state;
    return (
      <div className="st-table-container">
        {this.renderCtxMenu()}
        {this.renderMenu()}
        {this.renderTable()}
        {openLinkModal && <div>
          {this.renderLinkModal()}
        </div>}
      </div>
    )
  }
}
