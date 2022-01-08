import React, { useReducer, createContext, useRef, useState, useEffect } from 'react'
import { TableEditor } from './table-editor'
import * as util from './util'
import { Align, Btn, DefaultProps, Point, Row, State, TableContextType } from './types'
import produce from 'immer'
import { initialState, reducer } from './reducer'
import { createPortal } from 'react-dom'
import { LinkModal } from './link-modal'
import { CTXMenu } from './ctx-menu'
import { defaultProps } from './default-props'

export const TableContext = createContext({} as TableContextType)

type Props = {
  html: string
  btns?: Btn[]
  onChange?: (html: string) => void
}

export const TableContextComponent: React.FC<Props & Partial<DefaultProps>> = ({ html, btns, onChange, children, ...props }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const {
    row,
    history,
    selectedTags,
    menuX,
    menuY,
    mode,
    selectedColNo,
    selectedRowNo,
    showMenu,
  } = state
  const mergedProps = { ...defaultProps, ...props }
  const { message, relAttrForTargetBlank, showTargetBlankUI } = mergedProps
  const { align } = mergedProps.mark
  const range = useRef<Range>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)
  const [linkModalState, setLinkModalState] = useState({
    linkClassName: '',
    linkLabel: '',
    isNewLink: false,
    openLinkModal: false,
  })

  useEffect(() => {
    const modal = document.createElement('div')
    document.body.appendChild(modal)
    modalRef.current = modal

    const menu = document.createElement('div')
    document.body.appendChild(menu)
    ctxMenuRef.current = menu

    dispatch({ type: 'SET_ROW', row: util.parse(html) })
    dispatch({ type: 'SET_HISTORY', history: [row] })
    return () => {
      document.body.removeChild(modalRef.current)
      document.body.removeChild(ctxMenuRef.current)
    }
  }, [])

  const getElementByQuery = (query: string) => {
    if (tableRef.current) {
      return tableRef.current.querySelector(query)
    }
  }

  const getElementsByQuery = (query: string) => {
    if (tableRef.current) {
      return tableRef.current.querySelectorAll(query)
    }
  }

  const getCellByIndex = (x: number, y: number) => {
    return getElementByQuery(`[data-cell-id='${x}-${y}']`)
  }

  const getCellInfoByIndex = (x: number, y: number): Point | false => {
    const cell = getCellByIndex(x, y) as HTMLElement
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
    const headers = getElementsByQuery('.js-table-header th')
    const sides = getElementsByQuery('.js-table-side')
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

  const getSelectedPoints = (rows: Row[]) => {
    const arr: Point[] = []
    rows.forEach((item, i) => {
      if (!item.col) {
        return false
      }
      item.col.forEach((col, t) => {
        if (col.selected) {
          const point = getCellInfoByIndex(t, i)
          if (point) {
            arr.push(point)
          }
        }
      })
    })
    return arr
  }

  const getSelectedPoint = (rows: Row[]) => {
    const points = getSelectedPoints(rows)
    if (points && points[0]) {
      return points[0]
    }
  }

  const getAllPoints = (rows: Row[]) => {
    const points: Point[] = []
    rows.forEach((row, i) => {
      if (!row || !row.col) {
        return
      }
      row.col.forEach((_col, t) => {
        const point = getCellInfoByIndex(t, i)
        if (point) {
          points.push(point)
        }
      })
    })
    return points
  }

  const getCellIndexByPos = (x: number, y: number) => {
    let colIndex = -1
    let rowIndex = -1
    row.forEach((row, i) => {
      if (!row || !row.col) {
        return
      }
      row.col.forEach((_col, t) => {
        const point = getCellInfoByIndex(t, i)
        if (point && point.x === x && point.y === y) {
          colIndex = t
          rowIndex = i
        }
      })
    })
    return { row: rowIndex, col: colIndex }
  }

  const getCellByPos = (rows: Row[], x: number, y: number) => {
    const cellIndex = getCellIndexByPos(x, y)
    if (!rows[cellIndex.row]) {
      return
    }
    return rows[cellIndex.row].col[cellIndex.col]
  }

  // 操作を元に戻す
  const undo = () => {
    const newHistory = [...produce(history, history => history)]
    let newRow = produce(row, row => row)
    if (history.length === 0) {
      return
    }

    while (JSON.stringify(newRow) === JSON.stringify(row)) {
      newRow = newHistory.pop()
    }

    if (newRow) {
      if (newHistory.length === 0) {
        newHistory.push(newRow)
      }
      dispatch({ type: 'SET_ROW', row: newRow })
      dispatch({ type: 'SET_HISTORY', history: newHistory })
    }
  }

  // 選択状態を解除する
  const unselect = () => {
    const newRow = produce(row, row => util.unselectCells(row))
    dispatch({ type: 'SET_SELECTED_COL_NO', index: -1 })
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: -1 })
    dispatch({ type: 'SET_MENU', showMenu: false })
    dispatch({ type: 'SET_ROW', row: newRow })
  }

  // 行を選択する
  const selectRow = (i: number) => {
    const newRow = produce(state.row, row => {
      const newRow = util.unselectCells(row)
      const points = getAllPoints(newRow)
      const largePoint = util.getLargePoint(...points)
      const newpoint = { x: i, y: 0, width: 1, height: largePoint.height }
      const targetPoints: Point[] = []
      points.forEach(point => {
        if (util.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const cell = getCellByPos(newRow, point.x, point.y)
        cell.selected = true
      })
      return newRow
    })
    dispatch({ type: 'SET_MODE', mode: 'col' })
    dispatch({ type: 'SET_SELECTED_COL_NO', index: -1 })
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: i })
    dispatch({ type: 'SET_ROW', row: newRow })
  }

  // 列を選択する
  const selectCol = (i: number) => {
    const points = getAllPoints(state.row)
    const largePoint = util.getLargePoint(...points)
    const newpoint = { x: 0, y: i, width: largePoint.width, height: 1 }
    const targetPoints: Point[] = []
    const newRow = produce(state.row, row => {
      const newRow = util.unselectCells(row)
      points.forEach(point => {
        if (util.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const cell = getCellByPos(newRow, point.x, point.y)
        cell.selected = true
      })
      return newRow
    })

    dispatch({ type: 'SET_MODE', mode: 'row' })
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: -1 })
    dispatch({ type: 'SET_SELECTED_COL_NO', index: i })
    dispatch({ type: 'SET_ROW', row: newRow })
  }

  // 列を削除する
  const removeCol = (selectedno: number) => {
    const data = produce(state, data => {
      const points = getAllPoints(data.row)
      const largePoint = util.getLargePoint.apply(null, points)
      const newpoint = { x: selectedno, y: 0, width: 1, height: largePoint.height }
      const targetPoints: Point[] = []
      points.forEach(point => {
        if (util.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const cell = getCellByPos(data.row, point.x, point.y)
        if (!cell) {
          return
        }
        if (cell.colspan === 1) {
          data.row = util.removeCell(data.row, cell)
        } else {
          cell.colspan = cell.colspan - 1
        }
      })
      data.history = util.generateHistory(data.history, data.row)
      return data
    })
    if (onChange) {
      onChange(util.getHtml(data.row, align))
    }
    dispatch({ type: 'SET_ROW', row: data.row })
    dispatch({ type: 'SET_HISTORY', history: data.history })
  }

  // 行を削除する
  const removeRow = (selectedno: number) => {
    const newState = produce(state, data => {
      const points = getAllPoints(data.row)
      const largePoint = util.getLargePoint(...points)
      const newpoint = { x: 0, y: selectedno, width: largePoint.width, height: 1 }
      const nextpoint = { x: 0, y: selectedno + 1, width: largePoint.width, height: 1 }
      const targetPoints = []
      const removeCells = []
      const insertCells = []
      points.forEach(point => {
        if (util.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      points.forEach(point => {
        if (util.hitTest(nextpoint, point)) {
          const cell = getCellByPos(data.row, point.x, point.y)
          cell.x = point.x
          if (point.y === nextpoint.y) {
            insertCells.push(cell)
          }
        }
      })
      targetPoints.forEach(point => {
        const cell = getCellByPos(data.row, point.x, point.y)
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
        data.row = util.removeCell(data.row, cell)
      })
      data.row.splice(selectedno, 1)
      if (insertCells.length > 0) {
        data.row[selectedno] = { col: insertCells }
      }
      data.history.push(produce(data.row, row => row))
      return data
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }

    dispatch({ type: "SET_ROW", row: newState.row })
    dispatch({ type: "SET_HISTORY", history: newState.history })
    dispatch({ type: "SET_MENU", showMenu: false })
  }

  // 履歴作成
  const generateHistory = (rows: Row[]) => {
    return produce(state.history, history => {
      history.push(rows)
      return history
    })
  }

  // 右に列を追加
  const insertColRight = (selectedno: number) => {
    const newState = produce(state, data => {
      const points = getAllPoints(data.row)
      const largePoint = util.getLargePoint(...points)
      const newpoint = { x: selectedno, y: 0, width: 1, height: largePoint.height }
      const targetPoints = []
      points.forEach(point => {
        if (util.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      targetPoints.forEach(point => {
        const index = getCellIndexByPos(point.x, point.y)
        const cell = getCellByPos(data.row, point.x, point.y)
        if (typeof index.row !== 'undefined' && typeof index.col !== 'undefined') {
          if (point.width + point.x - newpoint.x > 1) {
            cell.colspan = cell.colspan + 1
          } else {
            data.row = util.insertCellAt(data.row, index.row, index.col + 1, {
              ...util.generateNewCell(),
              rowspan: cell.rowspan,
            })
          }
        }
      })
      return data
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: selectedno })
    dispatch({ type: 'SET_MENU', showMenu: false })
    dispatch({ type: 'SET_ROW', row: newState.row })
    dispatch({ type: 'SET_HISTORY', history: util.generateHistory(history, newState.row) })
  }

  // 左に列を追加
  const insertColLeft = (selectedno: number) => {
    const points = getAllPoints(state.row)
    const largePoint = util.getLargePoint(...points)
    const newpoint = { x: selectedno - 1, y: 0, width: 1, height: largePoint.height }
    const targetPoints = []
    points.forEach(point => {
      if (util.hitTest(newpoint, point)) {
        targetPoints.push(point)
      }
    })
    const newState = produce(state, data => {
      if (selectedno === 0) {
        const length = largePoint.height
        for (let i = 0; i < length; i++) {
          data.row = util.insertCellAt(data.row, i, 0, util.generateNewCell())
        }
        return data
      }
      targetPoints.forEach(point => {
        const index = getCellIndexByPos(point.x, point.y)
        const cell = getCellByPos(data.row, point.x, point.y)
        if (typeof index.row !== 'undefined' && typeof index.col !== 'undefined') {
          if (point.width + point.x - newpoint.x > 1) {
            cell.colspan = cell.colspan + 1
          } else {
            data.row = util.insertCellAt(data.row, index.row, index.col + 1, {
              ...util.generateNewCell(),
              rowspan: cell.rowspan,
            })
          }
        }
      })
      return data
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: selectedno + 1 })
    dispatch({ type: 'SET_MENU', showMenu: false })
    dispatch({ type: 'SET_ROW', row: newState.row })
    dispatch({ type: 'SET_HISTORY', history: util.generateHistory(history, newState.row) })
  }

  // 下に行を追加
  const insertRowBelow = (selectedColNo: number) => {
    dispatch({ type: 'SET_MENU', showMenu: false })
    dispatch({ type: 'SET_SELECTED_COL_NO', index: selectedColNo })
    const points = getAllPoints(state.row)
    const largePoint = util.getLargePoint(...points)
    const newpoint = { x: 0, y: selectedColNo + 1, width: largePoint.width, height: 1 }
    const targetPoints = []
    const newRow = []
    points.forEach(point => {
      if (util.hitTest(newpoint, point)) {
        targetPoints.push(point)
      }
    })
    const row = produce(state.row, row => {
      if (targetPoints.length === 0) {
        const length = largePoint.width
        for (let i = 0; i < length; i++) {
          const newcell = { type: 'td', colspan: 1, rowspan: 1, value: '' }
          newRow.push(newcell)
        }
        return util.insertRow(row, selectedColNo + 1, newRow)
      }
      targetPoints.forEach(point => {
        const index = getCellIndexByPos(point.x, point.y)
        const cell = getCellByPos(row, point.x, point.y)
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
            row = util.insertCellAt(state.row, index.row + 1, index.col, {
              ...util.generateNewCell(),
              ...newcell,
            })
          }
        }
      })
      return util.insertRow(row, selectedColNo + 1, newRow)
    })
    if (onChange) {
      onChange(util.getHtml(row, align))
    }
    dispatch({ type: 'SET_ROW', row })
    dispatch({ type: 'SET_HISTORY', history: util.generateHistory(history, row) })
  }

  // 上に行を追加
  const insertRowAbove = (selectedno: number) => {
    const newState = produce(state, data => {
      data.showMenu = false
      data.selectedColNo = selectedno + 1
      const points = getAllPoints(data.row)
      const largePoint = util.getLargePoint(...points)
      const newpoint = { x: 0, y: selectedno - 1, width: largePoint.width, height: 1 }
      const targetPoints = []
      const newRow = []
      points.forEach(point => {
        if (util.hitTest(newpoint, point)) {
          targetPoints.push(point)
        }
      })
      if (selectedno === 0) {
        const length = largePoint.width
        for (let i = 0; i < length; i++) {
          const newcell = { type: 'td', colspan: 1, rowspan: 1, value: '' }
          newRow.push(newcell)
        }
        util.insertRow(data.row, 0, newRow)
        return data
      }
      targetPoints.forEach(point => {
        const index = getCellIndexByPos(point.x, point.y)
        const cell = getCellByPos(data.row, point.x, point.y)
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
            data.row = util.insertCellAt(data.row, index.row, index.col, {
              ...util.generateNewCell(),
              ...newcell,
            })
          }
        }
      })
      data.row = util.insertRow(data.row, selectedno, newRow)
      data.history.push(data.row)
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: 'SET_ROW', row: newState.row })
    dispatch({ type: 'SET_HISTORY', history: newState.history })
  }

  const isSelectedCellsRectangle = () => {
    const selectedPoints = getSelectedPoints(state.row)
    const largePoint = util.getLargePoint(...selectedPoints)
    const points = getAllPoints(state.row)
    let flag = true
    points.forEach(point => {
      if (util.hitTest(largePoint, point)) {
        const cell = getCellByPos(state.row, point.x, point.y)
        if (cell && !cell.selected) {
          flag = false
        }
      }
    })
    return flag
  }

  // セルを結合
  const mergeCells = () => {
    const points = getSelectedPoints(state.row)
    if (!isSelectedCellsRectangle()) {
      alert(message.mergeCellError1)
      return
    }
    if (points.length === 0) {
      return
    }
    if (!confirm(message.mergeCellConfirm1)) {
      return
    }
    const point = util.getLargePoint(...points)
    const row = produce(state.row, row => {
      const cell = getCellByPos(row, point.x, point.y)
      const newRow = util.removeSelectedCellExcept(row, cell)
      cell.colspan = point.width
      cell.rowspan = point.height
      return newRow
    })
    if (onChange) {
      onChange(util.getHtml(row, align))
    }
    dispatch({ type: "SET_MENU", showMenu: false })
    dispatch({ type: "SET_ROW", row })
    dispatch({ type: "SET_HISTORY", history: generateHistory(row) })
  }

  // セルの結合を解除
  const splitCell = () => {
    const { row: stateRow } = state
    const selectedPoints = getSelectedPoints(stateRow)
    const length = selectedPoints.length
    if (length === 0) {
      alert(message.splitError1)
      return
    } else if (length > 1) {
      alert(message.splitError2)
      return
    }
    const selectedPoint = getSelectedPoint(stateRow)
    const bound = { x: 0, y: selectedPoint.y, width: selectedPoint.x, height: selectedPoint.height }
    const points = getAllPoints(stateRow)
    const currentIndex = getCellIndexByPos(selectedPoint.x, selectedPoint.y)
    const currentCell = getCellByPos(stateRow, selectedPoint.x, selectedPoint.y)
    const width = currentCell.colspan
    const height = currentCell.rowspan
    const currentValue = currentCell.value
    const targets = []
    const rows: { row: number; col: number }[][] = []
    if (width === 1 && height === 1) {
      alert(message.splitError3)
      return
    }
    points.forEach(point => {
      if (util.hitTest(bound, point)) {
        const index = getCellIndexByPos(point.x, point.y)
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

    const newState = produce(state, data => {
      const currentCell = getCellByPos(data.row, selectedPoint.x, selectedPoint.y)
      rows.forEach(row => {
        const index = row[row.length - 1]
        for (let i = 0; i < width; i++) {
          let val = ''
          // スプリットされる前のコルのデータを保存
          if (first === true && i === width - 1) {
            val = currentValue
            first = false
          }
          data.row = util.insertCellAt(data.row, index.row, index.col + 1, {
            ...util.generateNewCell(),
            type: 'td',
            colspan: 1,
            rowspan: 1,
            value: val,
            selected: true,
          })
        }
      })
      data.row = util.removeCell(data.row, currentCell)
      return data
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: "SET_MENU", showMenu: false })
    dispatch({ type: "SET_ROW", row: newState.row })
    dispatch({ type: "SET_HISTORY", history: generateHistory(newState.row) })
    dispatch({ type: "SET_SPLITED", splited: true })
  }

  // セルのタイプをtdもしくはthに
  const changeCellTypeTo = (type: 'td' | 'th') => {
    const newState = produce(state, data => {
      data.row.forEach(row => {
        row.col.forEach(col => {
          if (col.selected) {
            col.type = type
          }
        })
      })
      return data
    })
    if (onChange) {
      onChange(util.getHtml(state.row, align))
    }
    dispatch({ type: "SET_MENU", showMenu: false })
    dispatch({ type: "SET_ROW", row: newState.row })
    dispatch({ type: "SET_HISTORY", history: generateHistory(newState.row) })
  }

  // セルの文字位置を変更
  const alignCell = (align: Align) => {
    const newState = produce(state, data => {
      data.row.forEach(row => {
        row.col.forEach(col => {
          if (col.selected) {
            col.align = align
          }
        })
      })
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: "SET_MENU", showMenu: false })
    dispatch({ type: "SET_ROW", row: newState.row })
    dispatch({ type: "SET_HISTORY", history: generateHistory(newState.row) })
  }

  // タグを解除
  const unwrapTag = (cell: HTMLElement, tag: string, className: string) => {
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
    const newRow = produce(state.row, row => {
      const point = getSelectedPoint(row)
      const col = getCellByPos(row, point.x, point.y)
      col.value = cell.innerHTML
      return row
    })
    if (onChange) {
      onChange(util.getHtml(newRow, align))
    }
    dispatch({ type: 'SET_ROW', row: newRow })
  }

  // タグを挿入
  const insertTag = (tag: string, className: string) => {
    const point = getSelectedPoint(row)
    if (!point) {
      return false
    }
    let classAttr = ''
    if (className) {
      classAttr = ` class="${className}"`
    }
    const index = getCellIndexByPos(point.x, point.y)
    const cell = getCellByIndex(index.col, index.row) as HTMLElement
    const selection = util.getSelection(cell)
    if (util.checkTag(selectedTags, tag, className)) {
      unwrapTag(cell, tag, className)
      return
    }
    if (tag === 'a') {
      handleOpenLinkModal({
        className,
        selection: `${selection}`,
      })
      return
    }
    const insertHtml = `<${tag}${classAttr}>${selection}</${tag}>`
    util.replaceSelectionWithHtml(insertHtml)
    const newRow = produce(row, row => {
      const col = getCellByPos(row, point.x, point.y)
      col.value = cell.querySelector('.st-table-editable').innerHTML
      return row
    })
    if (onChange) {
      onChange(util.getHtml(newRow, align))
    }
    dispatch({ type: 'SET_ROW', row: newRow })
  }

  const handleOpenLinkModal = ({ className, selection }: { className: string; selection: string }) => {
    range.current = util.saveSelection()
    setLinkModalState({
      openLinkModal: true,
      linkClassName: className,
      linkLabel: `${selection}`,
      isNewLink: true
    })
  }

  // リンク挿入
  const insertLink = ({ linkUrl, linkLabel, linkTargetBlank }: { linkUrl: string, linkLabel: string, linkTargetBlank: boolean }) => {
    let classAttr = ''
    if (linkModalState.linkClassName) {
      classAttr = ` class="${linkModalState.linkClassName}"`
    }
    const insertHtml = `<a href="${linkUrl}"${classAttr}${linkTargetBlank === true
      ? ` target="_blank" rel="${relAttrForTargetBlank}"`
      : ` target="_parent" rel="${relAttrForTargetBlank}"`
      }>${linkLabel}</a>`

    util.restoreSelection(range.current)
    util.replaceSelectionWithHtml(insertHtml)
    const point = getSelectedPoint(row)
    const index = getCellIndexByPos(point.x, point.y)
    const cell = getCellByIndex(index.col, index.row)
    const newRow = produce(row, row => {
      const col = getCellByPos(row, point.x, point.y)
      col.value = cell.querySelector('.st-table-editable').innerHTML
      return row
    })
    if (onChange) {
      onChange(util.getHtml(newRow, align))
    }
    dispatch({ type: 'SET_ROW', row: newRow })
    setLinkModalState({
      ...linkModalState,
      openLinkModal: false,
    })
  }

  // コンテキストメニュー表示
  const contextmenu = (x: number, y: number) => {
    dispatch({ type: 'SET_MENU', showMenu: true })
    dispatch({ type: 'SET_MENU_X', menuX: x })
    dispatch({ type: 'SET_MENU_Y', menuY: y })
  }

  const renderLinkModal = () => {
    if (!modalRef.current || !linkModalState.openLinkModal) {
      return null
    }
    return createPortal(
      <LinkModal
        isNewLink={linkModalState.isNewLink}
        showTargetBlankUI={showTargetBlankUI}
        linkLabel={linkModalState.linkLabel}
        message={message}
        onClose={() => {
          setLinkModalState({
            ...linkModalState,
            openLinkModal: false,
          })
        }}
      />,
      modalRef.current,
    )
  }

  const renderCtxMenu = () => {
    if (!showMenu || !ctxMenuRef.current) {
      return null
    }
    return createPortal(
      <CTXMenu
        menuX={menuX}
        menuY={menuY}
        mode={mode}
        selectedRowIndex={selectedRowNo}
        selectedColIndex={selectedColNo}
        message={message}
      />,
      ctxMenuRef.current
    )
  }

  return (
    <TableContext.Provider
      value={{
        state,
        undo,
        unselect,
        insertLink,
        insertTag,
        alignCell,
        changeCellTypeTo,
        splitCell,
        mergeCells,
        selectCol,
        selectRow,
        removeCol,
        removeRow,
        dispatch,
        insertColLeft,
        insertColRight,
        insertRowAbove,
        insertRowBelow,
        getCellIndexByPos,
        getCellByIndex,
        getSelectedPoints,
        getSelectedPoint,
        getCellInfoByIndex,
        getElementByQuery,
        getAllPoints,
        contextmenu
      }}
    >
      <div className="st-table-container">
        <TableEditor
          ref={tableRef}
          html={html}
          btns={btns}
          onChange={onChange}
          {...mergedProps}
        >
          {children}
        </TableEditor>
        {renderLinkModal()}
        {renderCtxMenu()}
      </div>
    </TableContext.Provider>
  )
}
