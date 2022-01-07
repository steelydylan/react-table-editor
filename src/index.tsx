import * as React from 'react'
import { createPortal } from 'react-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { shallowEqualObjects } from 'shallow-equal'
import produce from 'immer'
import * as util from './util'
import AlignCenter from './icons/AlignCenter'
import AlignLeft from './icons/AlignLeft'
import AlignRight from './icons/AlignRight'
import Merge from './icons/Merge'
import Split from './icons/Split'
import Undo from './icons/Undo'
import { acquireClipboardData, acquireText, toHtml } from './clipboard'
import { CTXMenu } from './ctx-menu'
import { LinkModal } from './link-modal'
import { Align, Btn, CellClickEvent, Col, Mark, Mode, Point, Row } from './types'
import { Menu } from './menu'
import { ResultHTML } from './result-html'
import { Table } from './table'

const iconSize = { width: '16px', height: '16px' }

const defs = {
  showBtnList: true,
  relAttrForTargetBlank: 'noopener',
  lang: 'en',
  mark: {
    align: {
      default: 'left' as Align,
      left: 'left' as Align,
      center: 'center' as Align,
      right: 'right' as Align,
    },
  },
  classNames: {
    btn: {
      group: 'st-table-btn-list',
      item: 'st-table-btn',
      itemActive: 'st-table-btn-active',
    },
    label: 'st-table-label',
    actionGroup: 'st-table-action-group',
    selector: {
      self: 'st-table-selector',
    },
  },
  icons: {
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
    closeLabel: 'close',
    targetBlank: 'target',
    targetBlankLabel: 'Opens the linked page in a new window or tab',
    addLinkTitle: 'link',
    updateLinkTitle: 'link',
    addLink: 'add',
    updateLink: 'update',
    removeLink: 'remove',
    linkUrl: 'URL',
    linkLabel: 'label',
  },
  showTargetBlankUI: false,
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
  menuX: number
  menuY: number
  beingInput: boolean
  mousedown: boolean
  openLinkModal: boolean
  tableResult: string
  linkTargetBlank: boolean
  linkLabel: string
  linkUrl: string
  linkClassName: string
  isNewLink: boolean
  selectedTags: { className: string; tag: string }[]
}

type Props = Partial<typeof defs> & {
  html: string
  btns?: Btn[]
  onChange?: (html: string) => void
}

export class TableEditor extends React.Component<Props, State> {
  tableRef: HTMLDivElement
  modalRef: HTMLDivElement
  ctxMenuRef: HTMLDivElement
  onPasting = false
  range: Range
  static defaultProps = defs

  constructor(props: Props) {
    super(props)

    const modal = document.createElement('div')
    document.body.appendChild(modal)
    this.modalRef = modal

    const menu = document.createElement('div')
    document.body.appendChild(menu)
    this.ctxMenuRef = menu

    const row = this.parse(props.html)
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
      linkTargetBlank: true,
      isNewLink: false,
      selectedTags: [],
    }
  }

  componentWillUnmount() {
    document.body.removeChild(this.modalRef)
    document.body.removeChild(this.ctxMenuRef)
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

  getTableLength(rows: Row[]) {
    return {
      x: this.getRowLength(rows[0].col),
      y: this.getColLength(rows),
    }
  }

  getRowLength(cols: Col[]) {
    let length = 0
    cols.forEach(item => {
      length += item.colspan
    })
    return length
  }

  getColLength(rows: Row[]) {
    let length = 0
    let rowspan = 0
    rows.forEach(row => {
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
    const cell = this.getCellByIndex(x, y) as HTMLElement
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

  getLargePoint(...points: Point[]) {
    const minXArr = []
    const minYArr = []
    const maxXArr = []
    const maxYArr = []
    for (let i = 0, n = points.length; i < n; i++) {
      minXArr.push(points[i].x)
      minYArr.push(points[i].y)
      maxXArr.push(points[i].x + points[i].width)
      maxYArr.push(points[i].y + points[i].height)
    }
    const minX = Math.min(...minXArr)
    const minY = Math.min(...minYArr)
    const maxX = Math.max(...maxXArr)
    const maxY = Math.max(...maxYArr)
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  getSelectedPoints(rows: Row[]) {
    const arr: Point[] = []
    rows.forEach((item, i) => {
      if (!item.col) {
        return false
      }
      item.col.forEach((col, t) => {
        if (col.selected) {
          const point = this.getCellInfoByIndex(t, i)
          if (point) {
            arr.push(point)
          }
        }
      })
    })
    return arr
  }

  getSelectedPoint(rows: Row[]) {
    const points = this.getSelectedPoints(rows)
    if (points && points[0]) {
      return points[0]
    }
  }

  getAllPoints(rows: Row[]) {
    const points: Point[] = []
    rows.forEach((row, i) => {
      if (!row || !row.col) {
        return
      }
      row.col.forEach((_col, t) => {
        const point = this.getCellInfoByIndex(t, i)
        if (point) {
          points.push(point)
        }
      })
    })
    return points
  }

  getCellIndexByPos(x: number, y: number) {
    let colIndex = -1
    let rowIndex = -1
    const { row } = this.state
    row.forEach((row, i) => {
      if (!row || !row.col) {
        return
      }
      row.col.forEach((_col, t) => {
        const point = this.getCellInfoByIndex(t, i)
        if (point && point.x === x && point.y === y) {
          colIndex = t
          rowIndex = i
        }
      })
    })
    return { row: rowIndex, col: colIndex }
  }

  getCellByPos(rows: Row[], x: number, y: number) {
    const cellIndex = this.getCellIndexByPos(x, y)
    if (!rows[cellIndex.row]) {
      return
    }
    return rows[cellIndex.row].col[cellIndex.col]
  }

  hitTest(largePoint: Point, targetPoint: Point) {
    if (
      largePoint.x < targetPoint.x + targetPoint.width &&
      targetPoint.x < largePoint.x + largePoint.width &&
      largePoint.y < targetPoint.y + targetPoint.height &&
      targetPoint.y < largePoint.y + largePoint.height
    ) {
      return true
    }
    return false
  }

  markup() {
    const { splited, row: stateRow } = this.state
    if (splited) {
      this.setState({
        splited: false,
      })
      return
    }
    const points = this.getSelectedPoints(stateRow)
    const largePoint = this.getLargePoint(...points)
    const row = produce(stateRow, row => {
      row.forEach((item, i) => {
        if (!item || !item.col) {
          return false
        }
        item.col.forEach((col, t) => {
          const point = this.getCellInfoByIndex(t, i)
          const mark = {} as Mark
          if (!point) {
            return
          }
          if (col.selected) {
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
          col.mark = mark
        })
      })
    })
    this.setState({
      row,
    })
  }

  selectRange(rows: Row[], point: Point, rowIndex: number, colIndex: number) {
    if (!point) {
      return
    }
    rows[rowIndex].col[colIndex].selected = true
    const points = this.getSelectedPoints(rows)
    const point3 = this.getLargePoint(...points)
    rows.forEach((item, i) => {
      if (!item || !item.col) {
        return false
      }
      item.col.forEach((col, t) => {
        const point = this.getCellInfoByIndex(t, i)
        if (point && this.hitTest(point3, point)) {
          col.selected = true
        }
      })
    })
    return rows
  }

  select(state: State, rowIndex: number, colIndex: number) {
    state.row.forEach((item, i) => {
      if (!item || !item.col) {
        return
      }
      item.col.forEach((obj, t) => {
        if (i !== rowIndex || t !== colIndex) {
          obj.selected = false
        }
      })
    })
    if (!state.row[rowIndex].col[colIndex].selected) {
      state.row[rowIndex].col[colIndex].selected = true
    }
    state.point = { x: colIndex, y: rowIndex, width: 0, height: 0 }
    return state
  }

  unselectCells(rows: Row[]) {
    rows.forEach(row => {
      if (!row || !row.col) {
        return false
      }
      row.col.forEach(col => {
        col.selected = false
      })
    })
    return rows
  }

  removeCell(rows: Row[], cell: Col) {
    for (let i = 0, n = rows.length; i < n; i++) {
      const { col: cols } = rows[i]
      for (let t = 0, m = cols.length; t < m; t++) {
        const col = cols[t]
        if (col === cell) {
          cols.splice(t, 1)
          t--
          m--
        }
      }
    }
    return rows
  }

  removeSelectedCellExcept(rows: Row[], cell?: Col) {
    for (let i = 0, n = rows.length; i < n; i++) {
      const { col: cols } = rows[i]
      for (let t = 0, m = cols.length; t < m; t++) {
        const col = cols[t]
        if (col !== cell && col.selected) {
          cols.splice(t, 1)
          t--
          m--
        }
      }
    }
    return rows
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
    const rows: Row[] = []
    const doc = util.parseHTML(html, true)
    const trs = doc.querySelectorAll('tr')
      ;[].forEach.call(trs, (tr: HTMLTableRowElement) => {
        const row = {} as Row
        const cols: Col[] = []
        const cells = tr.querySelectorAll('th,td')
        row.col = cols
          ;[].forEach.call(cells, (cell: HTMLTableCellElement) => {
            const col = {} as Col
            const html = format === 'html' ? cell.innerHTML : cell.innerText
            if (cell.tagName === 'TH') {
              col.type = 'th'
            } else {
              col.type = 'td'
            }
            col.colspan = parseInt(cell.getAttribute('colspan') as string) || 1
            col.rowspan = parseInt(cell.getAttribute('rowspan') as string) || 1
            col.value = ''
            if (html) {
              col.value = html.replace(/{(.*?)}/g, '&lcub;$1&rcub;')
              col.value = col.value.replace(/\\/g, '&#92;')
            }
            const classAttr = cell.getAttribute('class')
            let cellClass = ''
            if (classAttr) {
              const classList = classAttr.split(/\s+/)
              classList.forEach(item => {
                const align = this.getAlignByStyle(item)
                if (align) {
                  col.align = align
                } else {
                  cellClass += ` ${item}`
                }
              })
            }
            col.cellClass = cellClass.substr(1)
            cols.push(col)
          })
        rows.push(row)
      })
    return rows
  }

  parseText(text: string) {
    const rows: Row[] = []
    // replace newline codes inside double quotes to <br> tag
    text = text.replace(/"(([\n\r\t]|.)*?)"/g, (match, str) => str.replace(/[\n\r]/g, '<br>'))
    const splits = text.split(/\r\n|\n|\r/)
    splits.forEach(split => {
      const row = {} as Row
      const cols: Col[] = []
      row.col = cols
      const cells = split.split(String.fromCharCode(9))
      cells.forEach(cell => {
        const obj = {} as Col
        obj.type = 'td'
        obj.colspan = 1
        obj.rowspan = 1
        obj.value = ''
        if (cell) {
          obj.value = cell
        }
        cols.push(obj)
      })
      rows.push(row)
    })
    return rows
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
            ;[].forEach.call(children, () => {
              ret += '--- | '
            })
        }
        ret += '\n'
      })
    return ret
  }

  getHtml(rows: Row[]) {
    let html = renderToStaticMarkup(this.renderHTML(rows))
    html = html.replace(/&quot;/g, '"')
    html = html.replace(/data-tmp="(.*?)"/g, '$1')
    html = html.replace(/&lt;/g, '<')
    html = html.replace(/&gt;/g, '>')
    return html
  }

  getTable(rows: Row[]) {
    return this.getHtml(rows)
      .replace(/ className=""/g, '')
      .replace(/className="(.*)? "/g, 'className="$1"')
  }

  getMarkdown(rows: Row[]) {
    return this.toMarkdown(this.getHtml(rows))
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
    const { showMenu, openLinkModal, row } = this.state
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
    const history = [...produce(this.state.history, history => history)]
    let row = produce(this.state.row, row => row)
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

  insertRow(rows: Row[], rowIndex: number, newCols: Col[]) {
    if (rows[rowIndex]) {
      rows.splice(rowIndex, 0, { col: newCols })
      return rows
    } else if (rows.length === rowIndex) {
      rows.push({ col: newCols })
      return rows
    }
  }

  insertCellAt(rows: Row[], rowIndex: number, colIndex: number, col: Col) {
    if (rows[rowIndex] && rows[rowIndex].col) {
      rows[rowIndex].col.splice(colIndex, 0, col)
      return rows
    }
    return rows
  }

  replaceCellAt(rows: Row[], rowIndex: number, colIndex: number, col: Col) {
    if (rows[rowIndex] && rows[rowIndex].col) {
      rows[rowIndex].col[colIndex] = col
      return rows
    }
    return rows
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
    const newRow = produce(this.state.row, row => {
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
    })
    this.setState({
      showMenu: false,
      mode: 'col',
      selectedColNo: -1,
      selectedRowNo: i,
      row: newRow,
    })
    this.contextmenu(e)
    // this.update()
  }

  selectCol(e: CellClickEvent, i: number) {
    const points = this.getAllPoints(this.state.row)
    const largePoint = this.getLargePoint(...points)
    const newpoint = { x: 0, y: i, width: largePoint.width, height: 1 }
    const targetPoints: Point[] = []
    const row = produce(this.state.row, row => {
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
      return row
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
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(data.row))
    }
    this.setState({
      ...data,
      showMenu: false,
    })
  }

  removeRow(selectedno: number) {
    const state = produce(this.state, data => {
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
      return data
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state)
  }

  onCellInput(e: CellClickEvent, b: number, a: number) {
    if (this.onPasting) {
      return
    }
    const state = produce(this.state, data => {
      if (
        util.hasClass(e.target as HTMLElement, 'st-table-editable') &&
        (e.target as any).parentNode.getAttribute('data-cell-id') === `${b}-${a}`
      ) {
        data.history.push(produce(data.row, row => row))
        data.row[a].col[b].value = (e.target as any).innerHTML
      }
      return data
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state)
  }

  onCellKeyup(e: CellClickEvent, b: number, a: number) {
    if (this.onPasting) {
      return
    }
    const state = produce(this.state, data => {
      const browser = util.getBrowser()
      if (browser.indexOf('ie') !== -1 || browser === 'edge') {
        if (
          util.hasClass(e.target as HTMLElement, 'st-table-editable') &&
          (e.target as any).parentNode.getAttribute('data-cell-id') === `${b}-${a}`
        ) {
          data.history.push(produce(data.row, row => row))
          data.row[a].col[b].value = (e.target as any).innerHTML
        }
      }
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state)
  }

  shouldComponentUpdate(nextProps: Props, state: State) {
    const {
      row: prevRow,
      history: currentH,
      beingInput: currentInput,
      mousedown: currentMouseDown,
      selectedTags: currentTags,
      ...currentState
    } = this.state
    const {
      row: nextRow,
      history: prevH,
      beingInput: nextInput,
      mousedown: nextMouseDown,
      selectedTags: nextTags,
      ...nextState
    } = state
    if (!shallowEqualObjects(currentState, nextState)) {
      return true
    }
    if (prevRow.length !== nextRow.length) {
      return true
    }
    return prevRow.some((row, x) => {
      if (prevRow[x].col.length !== nextRow[x].col.length) {
        return true
      }
      return row.col.some((col, y) => {
        const nextCol = nextRow[x].col[y]
        const { value: _nextValue, ...nextColState } = nextCol
        const { value: _prevValue, ...prevColState } = col
        if (shallowEqualObjects(nextColState, prevColState)) {
          return false
        }
        return true
      })
    })
  }

  onCompositionStart() {
    this.setState({
      beingInput: true,
    })
  }

  onCompositionEnd() {
    this.setState({
      beingInput: false,
    })
  }

  getCurrentTags(data: State) {
    const tags: { tag: string; className: string }[] = []
    const target = util.getSelectionNode()
    data.selectedTags = []
    if (!target || !target.tagName) {
      return data
    }
    if (util.hasClass(target, 'st-table-editable')) {
      return data
    }

    tags.push({ tag: target.tagName.toLowerCase(), className: target.className || '' })
    let parent = target.parentElement
    const tag = parent.tagName.toLowerCase()
    const { point } = this.state
    const index = this.getCellIndexByPos(point.x, point.y)
    const cell = this.getCellByIndex(index.col, index.row)
    if (!cell) {
      data.selectedTags = tags
      return data
    }
    const editableDiv = cell.querySelector('.st-table-editable') as HTMLElement

    while (parent !== editableDiv) {
      if (!parent) {
        break
      }
      tags.push({
        tag,
        className: parent.className || '',
      })
      parent = parent.parentElement
    }
    data.selectedTags = tags
    return data
  }

  updateTable(e: CellClickEvent, b: number, a: number) {
    const state = produce(this.state, data => {
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
      if (type === 'keydown' && (e as any).keyCode == 67 && (e.ctrlKey || e.metaKey)) {
        const elem = this.getElementByQuery('.st-table-selected .st-table-editable') as HTMLElement
        util.triggerEvent(elem, 'copy')
      } else if (type === 'mousedown' && !isSmartPhone) {
        if (e.button !== 2 && !e.ctrlKey) {
          data.mousedown = true
          data = this.getCurrentTags(data)
          if (!data.beingInput) {
            if (!data.row[a].col[b].selected || points.length > 1) {
              data.row = this.unselectCells(data.row)
              data = this.select(data, a, b)
            }
          }
        }
      } else if (type === 'mousemove' && !isSmartPhone) {
        if (data.mousedown) {
          data = this.getCurrentTags(data)
          data.row = this.selectRange(data.row, data.point, a, b)
        }
      } else if (type === 'mouseup' && !isSmartPhone) {
        data.mousedown = false
        if (points.length !== 1) {
          const elem = this.getElementByQuery(
            '.st-table-selected .st-table-editable'
          ) as HTMLElement
          this.putCaret(elem)
        }
      } else if (type === 'contextmenu') {
        e.preventDefault()
        data.mousedown = false
        data.showMenu = true
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
      return data
    })
    this.setState(state)
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

  async pasteTable(e: CellClickEvent) {
    try {
      const clipboardData = acquireClipboardData(e)
      if (clipboardData) {
        const content = acquireText(clipboardData)
        const html = clipboardData.getData('text/html') || toHtml(content)
        e.preventDefault()
        const success = await this.processPaste(html)
        if (!success) {
          requestAnimationFrame(() => {
            document.execCommand('insertText', false, content)
          })
        }
        return
      }
    } catch (error) {
      // console.log(error)
    }
    this.onPasting = true
    this.getClipBoardData()
  }

  getClipBoardData() {
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
    this.waitForPastedData(editableDiv, savedContent)
    return true
  }

  async waitForPastedData(elem: HTMLElement, savedContent: HTMLElement | DocumentFragment) {
    if (elem.childNodes && elem.childNodes.length > 0) {
      const pastedData = elem.innerHTML
      elem.innerHTML = ''
      elem.appendChild(savedContent)
      const canPaste = await this.processPaste(pastedData)
      this.onPasting = false
      if (!canPaste) {
        requestAnimationFrame(() => {
          util.insertHtmlAtCursor(pastedData)
        })
      }
    } else {
      setTimeout(() => {
        this.waitForPastedData(elem, savedContent)
      }, 20)
    }
  }

  async processPaste(pastedData: string) {
    const selectedPoint = this.getSelectedPoint(this.state.row)
    const tableHtml = pastedData.match(/<table(([\n\r\t]|.)*?)>(([\n\r\t]|.)*?)<\/table>/i)

    if (tableHtml && tableHtml[0]) {
      const newRow = this.parse(tableHtml[0], 'text')
      if (newRow && newRow.length) {
        const prevRow = produce(this.state.row, row => row)
        await this.addRowAndCol(newRow, {
          x: selectedPoint.x,
          y: selectedPoint.y,
          width: 0,
          height: 0,
        })
        const state = produce(this.state, data => {
          const row = this.insertTable(data.row, prevRow, newRow, {
            x: selectedPoint.x,
            y: selectedPoint.y,
            width: 0,
            height: 0,
          })
          data.row = row
          data.history = this.generateHistory(row)
          return data
        })
        this.props.onChange(this.getHtml(state.row))
        this.setState(state)
        return true
      }
    }
    // for excel;
    const row = this.parseText(pastedData)
    if (row && row[0] && row[0].col && row[0].col.length > 1) {
      const prevRow = produce(this.state.row, row => row)
      const state = produce(this.state, data => {
        const selectedPoint = this.getSelectedPoint(data.row)
        const newRow = this.insertTable(data.row, prevRow, row, {
          x: selectedPoint.x,
          y: selectedPoint.y,
          width: 0,
          height: 0,
        })
        data.row = newRow
        data.history = this.generateHistory(row)
        return data
      })
      this.props.onChange(this.getHtml(state.row))
      this.setState(state)
      return true
    }
    return false
  }

  generateNewCell() {
    return {
      key: util.generateRandomId(),
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
        bottom: false,
      },
    }
  }

  generateHistory(rows: Row[]) {
    return produce(this.state.history, history => {
      history.push(rows)
      return history
    })
  }

  updateResult() {
    const { inputMode, tableResult } = this.state
    if (inputMode === 'table') {
      const rows = this.parse(tableResult)
      this.setState({
        row: rows,
        tableClass: this.getTableClass(tableResult),
        history: this.generateHistory(rows),
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
              rowspan: cell.rowspan,
            })
          }
        }
      })
      return data
    })
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
    const state = produce(this.state, data => {
      if (selectedno === 0) {
        const length = largePoint.height
        for (let i = 0; i < length; i++) {
          data.row = this.insertCellAt(data.row, i, 0, this.generateNewCell())
        }
        data.history = this.generateHistory(data.row)
        return data
      }
      targetPoints.forEach(point => {
        const index = this.getCellIndexByPos(point.x, point.y)
        const cell = this.getCellByPos(data.row, point.x, point.y)
        if (typeof index.row !== 'undefined' && typeof index.col !== 'undefined') {
          if (point.width + point.x - newpoint.x > 1) {
            cell.colspan = cell.colspan + 1
          } else {
            data.row = this.insertCellAt(data.row, index.row, index.col + 1, {
              ...this.generateNewCell(),
              rowspan: cell.rowspan,
            })
          }
        }
      })
      return data
    })
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
      selectedColNo,
    })
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
        return this.insertRow(row, selectedColNo + 1, newRow)
      }
      targetPoints.forEach(point => {
        const index = this.getCellIndexByPos(point.x, point.y)
        const cell = this.getCellByPos(row, point.x, point.y)
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
              ...newcell,
            })
          }
        }
      })
      return this.insertRow(row, selectedColNo + 1, newRow)
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      row,
      history: this.generateHistory(row),
    })
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
        return data
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
              ...newcell,
            })
          }
        }
      })
      data.row = this.insertRow(data.row, selectedno, newRow)
      data.history.push(data.row)
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state)
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
    const row = produce(this.state.row, row => {
      const cell = this.getCellByPos(row, point.x, point.y)
      const newRow = this.removeSelectedCellExcept(row, cell)
      cell.colspan = point.width
      cell.rowspan = point.height
      return newRow
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      showMenu: false,
      row,
      history: this.generateHistory(row),
    })
  }

  splitCell() {
    const { row: stateRow } = this.state
    const selectedPoints = this.getSelectedPoints(stateRow)
    const length = selectedPoints.length
    if (length === 0) {
      alert(this.props.message.splitError1)
      return
    } else if (length > 1) {
      alert(this.props.message.splitError2)
      return
    }
    const selectedPoint = this.getSelectedPoint(stateRow)
    const bound = { x: 0, y: selectedPoint.y, width: selectedPoint.x, height: selectedPoint.height }
    const points = this.getAllPoints(stateRow)
    const currentIndex = this.getCellIndexByPos(selectedPoint.x, selectedPoint.y)
    const currentCell = this.getCellByPos(stateRow, selectedPoint.x, selectedPoint.y)
    const width = currentCell.colspan
    const height = currentCell.rowspan
    const currentValue = currentCell.value
    const targets = []
    const rows: { row: number; col: number }[][] = []
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

    const state = produce(this.state, data => {
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
      return data
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState({
      ...state,
      showMenu: false,
      history: this.generateHistory(state.row),
      splited: true,
    })
  }

  changeCellTypeTo(type: 'td' | 'th') {
    const state = produce(this.state, data => {
      data.row.forEach(row => {
        row.col.forEach(col => {
          if (col.selected) {
            col.type = type
          }
        })
      })
      data.showMenu = false
      data.history.push(produce(data.row, row => row))
      return data
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state)
  }

  align(align: Align) {
    const state = produce(this.state, data => {
      data.row.forEach(row => {
        row.col.forEach(col => {
          if (col.selected) {
            col.align = align
          }
        })
      })
      data.showMenu = false
      data.history.push(data.row)
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(state.row))
    }
    this.setState(state)
  }

  getStyleByAlign(val: string) {
    const { align } = this.props.mark
    if (align.default === val) {
      return ''
    }
    return align[val]
  }

  getAlignByStyle(style: string) {
    const { align } = this.props.mark
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
    const { cellClass } = this.state
    const state = produce(this.state, data => {
      data.row.forEach(row => {
        row.col.forEach(col => {
          if (col.selected) {
            col.cellClass = cellClass
          }
        })
      })
      data.history.push(produce(data.row, row => row))
    })
    this.setState(state)
  }

  changeSelectOption() {
    let cellClass: string
    let flag = true
    const { row: rows } = this.state
    rows.forEach(row => {
      row.col.forEach(col => {
        if (col.selected) {
          if (!cellClass) {
            cellClass = col.cellClass
          } else if (cellClass && cellClass !== col.cellClass) {
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

  async addRowAndCol(oldRows: Row[], points: Point) {
    const copiedLength = this.getTableLength(oldRows)
    const currentLength = this.getTableLength(this.state.row)
    const offsetX = points.x + copiedLength.x - currentLength.x
    let offsetY = points.y + copiedLength.y - currentLength.y
    const length = currentLength.x
    const rows = produce(this.state.row, rows => {
      while (offsetY > 0) {
        const newCols: Col[] = []
        for (let i = 0; i < length; i++) {
          const newcell = this.generateNewCell()
          newCols.push(newcell)
        }
        rows = this.insertRow(rows, currentLength.y, newCols)
        offsetY--
      }
      if (offsetX > 0) {
        rows.forEach(row => {
          for (let i = 0; i < offsetX; i++) {
            row.col.push(this.generateNewCell())
          }
        })
      }
      return rows
    })
    await new Promise<void>(resolve => {
      this.setState(
        {
          row: rows,
        },
        () => {
          requestAnimationFrame(() => {
            resolve()
          })
        }
      )
    })
  }

  insertTable(stateRow: Row[], prevRow: Row[], table: Row[], pos: Point) {
    const copiedLength = this.getTableLength(table)
    const targets: { row: number; col: number }[] = []
    const rows: { row: number; col: number }[][] = []

    const destPos = {} as Point
    const vPos = {
      x: pos.x,
      y: pos.y,
    } as Point

    vPos.y += copiedLength.y - 1
    vPos.x += copiedLength.x - 1

    stateRow.forEach((row, i) => {
      if (!row.col) {
        return false
      }
      row.col.forEach((col, t) => {
        const point = this.getCellInfoByIndex(t, i)
        if (
          point &&
          point.x + point.width - 1 === vPos.x &&
          point.y + point.height - 1 === vPos.y
        ) {
          destPos.x = t
          destPos.y = i
        }
      })
    })

    if (typeof destPos.x === 'undefined') {
      alert(this.props.message.pasteError1)
      return prevRow
    }

    const newRow = this.selectRange(stateRow, this.state.point, destPos.y, destPos.x)
    const selectedPoints = this.getSelectedPoints(newRow)
    const largePoint = this.getLargePoint(...selectedPoints)

    if (largePoint.width !== copiedLength.x || largePoint.height !== copiedLength.y) {
      alert(this.props.message.pasteError1)
      return prevRow
    }

    const bound = { x: 0, y: largePoint.y, width: largePoint.x, height: largePoint.height }
    const points = this.getAllPoints(stateRow)

    points.forEach(point => {
      if (this.hitTest(bound, point)) {
        const index = this.getCellIndexByPos(point.x, point.y)
        targets.push(index)
      }
    })

    targets.forEach(target => {
      const { row } = target
      if (target.row < largePoint.y) {
        return
      }
      if (!rows[row]) {
        rows[row] = []
      }
      rows[row].push(target)
    })
    for (let i = 1, n = rows.length; i < n; i++) {
      if (!rows[i]) {
        continue
      }
      rows[i].sort((rowA, rowB) => {
        if (rowA.col > rowB.col) {
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
    stateRow = this.removeSelectedCellExcept(stateRow)
    rows.forEach(row => {
      const index = row[row.length - 1]
      if (table[t]) {
        table[t].col.reverse().forEach((cell: Col) => {
          stateRow = this.insertCellAt(stateRow, index.row, index.col + 1, {
            ...this.generateNewCell(),
            type: 'td',
            align: 'left',
            colspan: cell.colspan,
            rowspan: cell.rowspan,
            value: cell.value,
            selected: true,
          })
        })
      }
      t++
    })
    return stateRow
  }

  checkTag(tag: string, className: string) {
    const { selectedTags } = this.state
    return selectedTags.some(selectedTag => {
      return selectedTag.tag === tag && selectedTag.className === className
    })
  }

  unwrapTag(cell: HTMLElement, tag: string, className: string) {
    const pos = util.getCaretPos(cell)
    let node = util.getElementBySelection()
    const length = util.getSelectionLength()
    const nodePos = util.getCaretPos(node)
    if (
      node.parentElement === cell &&
      node.textContent &&
      nodePos === node.textContent.length &&
      length === 0
    ) {
      util.moveCaretAfter(node)
    } else {
      while (true) { // eslint-disable-line
        if (!node) {
          break
        }
        const nodeClassName = node.getAttribute('class') || ''
        if (node.tagName.toLowerCase() === tag && nodeClassName === className) {
          util.unwrapTag(node)
          break
        }
        node = node.parentElement
      }
      util.setCaretPos(cell, pos, length)
    }
    const row = produce(this.state.row, row => {
      const point = this.getSelectedPoint(row)
      const col = this.getCellByPos(row, point.x, point.y)
      col.value = cell.innerHTML
      return row
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({ row })
  }

  insertTag(tag: string, className: string) {
    const point = this.getSelectedPoint(this.state.row)
    if (!point) {
      return false
    }
    let classAttr = ''
    if (className) {
      classAttr = ` class="${className}"`
    }
    const index = this.getCellIndexByPos(point.x, point.y)
    const cell = this.getCellByIndex(index.col, index.row) as HTMLElement
    const selection = util.getSelection(cell)
    if (this.checkTag(tag, className)) {
      this.unwrapTag(cell, tag, className)
      return
    }
    if (tag === 'a') {
      this.openLinkModal({
        className,
        selection: `${selection}`,
      })
      return
    }
    const insertHtml = `<${tag}${classAttr}>${selection}</${tag}>`
    util.replaceSelectionWithHtml(insertHtml)
    const row = produce(this.state.row, row => {
      const col = this.getCellByPos(row, point.x, point.y)
      col.value = cell.querySelector('.st-table-editable').innerHTML
      return row
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      row,
    })
  }

  openLinkModal({ className, selection }: { className: string; selection: string }) {
    this.range = util.saveSelection()
    this.setState({
      isNewLink: true,
      openLinkModal: true,
      linkClassName: className,
      linkLabel: `${selection}`,
    })
  }

  insertLink({ linkUrl, linkLabel, linkTargetBlank }: { linkUrl: string, linkLabel: string, linkTargetBlank: boolean }) {
    const { relAttrForTargetBlank } = this.props
    const { linkClassName } = this.state
    let classAttr = ''
    if (linkClassName) {
      classAttr = ` class="${linkClassName}"`
    }
    const insertHtml = `<a href="${linkUrl}"${classAttr}${linkTargetBlank === true
        ? ` target="_blank" rel="${relAttrForTargetBlank}"`
        : ` target="_parent" rel="${relAttrForTargetBlank}"`
      }>${linkLabel}</a>`

    util.restoreSelection(this.range)
    util.replaceSelectionWithHtml(insertHtml)
    const point = this.getSelectedPoint(this.state.row)
    const index = this.getCellIndexByPos(point.x, point.y)
    const cell = this.getCellByIndex(index.col, index.row)
    const row = produce(this.state.row, row => {
      const col = this.getCellByPos(row, point.x, point.y)
      col.value = cell.querySelector('.st-table-editable').innerHTML
      return row
    })
    if (this.props.onChange) {
      this.props.onChange(this.getHtml(row))
    }
    this.setState({
      row,
      openLinkModal: false,
    })
  }

  renderCtxMenu(): React.ReactPortal | null {
    const { message } = this.props
    const { showMenu, mode, selectedRowNo, selectedColNo, menuY, menuX } = this.state
    if (!showMenu) {
      return null
    }
    return createPortal(
      <CTXMenu
        onAlign={this.align}
        onChangeCellTypeTo={this.changeCellTypeTo}
        onInsertColLeft={this.insertColLeft}
        onInsertColRight={this.insertColRight}
        onInsertRowAbove={this.insertRowAbove}
        onInsertRowBelow={this.insertRowBelow}
        onMergeCells={this.mergeCells}
        onRemoveCol={this.removeCol}
        onRemoveRow={this.removeRow}
        onSplitCell={this.splitCell}
        menuX={menuX}
        menuY={menuY}
        mode={mode}
        selectedRowIndex={selectedRowNo}
        selectedColIndex={selectedColNo}
        message={message}
      />,
      this.ctxMenuRef
    )
  }

  renderTable() {
    const { inputMode, selectedRowNo, selectedColNo, row } = this.state
    const highestRow = this.highestRow()

    return (
      <Table
        inputMode={inputMode}
        selectedRowIndex={selectedRowNo}
        selectedColIndex={selectedColNo}
        rows={row}
        topRows={highestRow}
        onCellInput={this.onCellInput}
        onCellKeyup={this.onCellKeyup}
        onCompositionEnd={this.onCompositionEnd}
        onCompositionStart={this.onCompositionStart}
        onUnselect={this.unselect}
        onUpdateSource={this.updateResult}
        onSelectCol={this.selectCol}
        onSelectRow={this.selectRow}
        onUpdateTable={this.updateTable}
        onCopyTable={this.copyTable}
        onPasteTable={this.pasteTable}
      />
    )
  }

  renderHTML(rows: Row[]) {
    const { tableClass } = this.state
    const { align } = this.props.mark

    return (<ResultHTML
      tableClass={tableClass}
      rows={rows}
      align={align}
    />)
  }

  renderLinkModal(): React.ReactPortal {
    const { isNewLink } = this.state
    const { message, showTargetBlankUI } = this.props
    return createPortal(
      <LinkModal
        isNewLink={isNewLink}
        showTargetBlankUI={showTargetBlankUI}
        message={message}
        onClose={() => {
          this.setState({
            openLinkModal: false
          })
        }}
        onInsertLink={this.insertLink}
      />,
      this.modalRef
    )
  }

  render() {
    const { openLinkModal } = this.state
    const { showBtnList, icons, classNames } = this.props
  
    return (
      <div className="st-table-container">
        {this.renderCtxMenu()}
        {this.renderTable()}
        <Menu 
          open={showBtnList}
          classNames={classNames}
          icons={icons}
          onUndo={this.undo}
          onAlign={this.align}
          onChangeCellTypeTo={this.changeCellTypeTo}
          onInsertTag={this.insertTag}
          onMergeCells={this.mergeCells}
          onSplitCell={this.splitCell}
        />
        {openLinkModal && <div>{this.renderLinkModal()}</div>}
      </div>
    )
  }
}
