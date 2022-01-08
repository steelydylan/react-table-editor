import React, { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import produce from 'immer'
import * as util from './util'
import { acquireClipboardData, acquireText, toHtml } from './clipboard'
import { CTXMenu } from './ctx-menu'
import { LinkModal } from './link-modal'
import { Align, Btn, CellClickEvent, Col, DefaultProps, Point, Row, State } from './types'
import { Menu } from './menu'
import { Table } from './table'
import { TableContext } from './table-context'

type Props = {
  html: string
  btns?: Btn[]
  onChange?: (html: string) => void
  children?: React.ReactNode
}

export const TableEditor = React.forwardRef<HTMLDivElement, Props & DefaultProps>(({ 
  showBtnList, 
  icons, 
  message, 
  mark,
  btns, 
  classNames,
  children,
  onChange,
}, ref) => {

  const { 
    dispatch, 
    state, 
    getCellIndexByPos, 
    getCellByIndex, 
    getSelectedPoints,
    getSelectedPoint,
    getCellInfoByIndex,
    getElementByQuery,
    getAllPoints,
  } = useContext(TableContext)
  const {
    point,
    selectedRowNo,
    selectedColNo,
    row,
    history,
  } = state
  const { align } = mark
  const onPasting = useRef(false)

  const getCurrentTags = (data: State) => {
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
    const index = getCellIndexByPos(point.x, point.y)
    const cell = getCellByIndex(index.col, index.row)
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

  const selectRange = (rows: Row[], point: Point, rowIndex: number, colIndex: number) => {
    if (!point) {
      return
    }
    rows[rowIndex].col[colIndex].selected = true
    const points = getSelectedPoints(rows)
    const point3 = util.getLargePoint(...points)
    rows.forEach((item, i) => {
      if (!item || !item.col) {
        return false
      }
      item.col.forEach((col, t) => {
        const point = getCellInfoByIndex(t, i)
        if (point && util.hitTest(point3, point)) {
          col.selected = true
        }
      })
    })
    return rows
  }

  const updateTable = (e: CellClickEvent, b: number, a: number) => {
    const newState = produce(state, data => {
      const type = e.type
      const points = getSelectedPoints(data.row)
      const isSmartPhone = util.isSmartPhone()
      if (type === 'mouseup' && data.showMenu) {
        return
      }
      data.mode = 'cell'
      data.selectedRowNo = -1
      data.selectedColNo = -1
      data.showMenu = false
      if (type === 'keydown' && (e as any).keyCode == 67 && (e.ctrlKey || e.metaKey)) {
        const elem = getElementByQuery('.st-table-selected .st-table-editable') as HTMLElement
        util.triggerEvent(elem, 'copy')
      } else if (type === 'mousedown' && !isSmartPhone) {
        if (e.button !== 2 && !e.ctrlKey) {
          data.mousedown = true
          data = getCurrentTags(data)
          if (!data.row[a].col[b].selected || points.length > 1) {
            data.row = util.unselectCells(data.row)
            data = util.select(data, a, b)
          }
        }
      } else if (type === 'mousemove' && !isSmartPhone) {
        if (data.mousedown) {
          data = getCurrentTags(data)
          data.row = selectRange(data.row, data.point, a, b)
        }
      } else if (type === 'mouseup' && !isSmartPhone) {
        data.mousedown = false
        if (points.length !== 1) {
          const elem = getElementByQuery(
            '.st-table-selected .st-table-editable'
          ) as HTMLElement
          // util.putCaret(elem)
        }
      } else if (type === 'contextmenu') {
        e.preventDefault()
        data.mousedown = false
        data.showMenu = true
        data.menuX = e.clientX
        data.menuY = e.clientY
      } else if (type === 'touchstart') {
        if (points.length !== 1 || !data.row[a].col[b].selected) {
          util.select(data, a, b)
        } // todo
      }
      return data
    })
    dispatch({ type: 'SET_MOUSEDOWN', mousedown: newState.mousedown })
    dispatch({ type: 'SET_MENU', showMenu: newState.showMenu })
    dispatch({ type: 'SET_MENU_X', menuX: newState.menuX })
    dispatch({ type: 'SET_MENU_Y', menuY: newState.menuY })
    dispatch({ type: 'SET_ROW', row: newState.row })
    dispatch({ type: 'SET_SELECTED_TAGS', selectedTags: newState.selectedTags })
    dispatch({ type: 'SET_SELECTED_COL_NO', index: newState.selectedColNo })
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: newState.selectedRowNo })
    dispatch({ type: 'SET_MODE', mode: newState.mode })
  }

  const onCellInput = (e: CellClickEvent, b: number, a: number) => {
    if (onPasting.current) {
      return
    }
    const newState = produce(state, data => {
      if (
        util.hasClass(e.target as HTMLElement, 'st-table-editable') &&
        (e.target as any).parentNode.getAttribute('data-cell-id') === `${b}-${a}`
      ) {
        data.history.push(produce(data.row, row => row))
        data.row[a].col[b].value = (e.target as any).innerHTML
      }
      return data
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: "SET_ROW", row: newState.row })
    dispatch({ type: "SET_HISTORY", history: newState.history })
  }

  const onCellKeyup = (e: CellClickEvent, b: number, a: number) => {
    if (onPasting.current) {
      return
    }
    const newState = produce(state, data => {
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
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: 'SET_ROW', row: newState.row })
    dispatch({ type: 'SET_HISTORY', history: newState.history })
  }

  const addRowAndCol = async (oldRows: Row[], points: Point) => {
    const copiedLength = util.getTableLength(oldRows)
    const currentLength = util.getTableLength(state.row)
    const offsetX = points.x + copiedLength.x - currentLength.x
    let offsetY = points.y + copiedLength.y - currentLength.y
    const length = currentLength.x
    const rows = produce(state.row, rows => {
      while (offsetY > 0) {
        const newCols: Col[] = []
        for (let i = 0; i < length; i++) {
          const newcell = util.generateNewCell()
          newCols.push(newcell)
        }
        rows = util.insertRow(rows, currentLength.y, newCols)
        offsetY--
      }
      if (offsetX > 0) {
        rows.forEach(row => {
          for (let i = 0; i < offsetX; i++) {
            row.col.push(util.generateNewCell())
          }
        })
      }
      return rows
    })
    await new Promise<void>(resolve => {
      dispatch({ type: 'SET_ROW', row: rows })
      requestAnimationFrame(() => {
        resolve()
      })
    })
  }

  const copyTable = (e: React.ClipboardEvent<HTMLTableDataCellElement>) => {
    const points = getSelectedPoints(row)
    if (points.length <= 1) {
      return
    }
    e.preventDefault()
    let copyText = '<meta name="generator" content="Sheets"><table>'
    row.forEach((item, i) => {
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

  const pasteTable = async (e: React.ClipboardEvent<HTMLTableDataCellElement>) => {
    try {
      const clipboardData = acquireClipboardData(e)
      if (clipboardData) {
        const content = acquireText(clipboardData)
        const html = clipboardData.getData('text/html') || toHtml(content)
        e.preventDefault()
        const success = await processPaste(html)
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
    onPasting.current = true
    getClipBoardData()
  }

  const getClipBoardData = () => {
    const savedContent = document.createDocumentFragment()
    const point = getSelectedPoint(state.row)
    if (!point) {
      return false
    }
    const index = getCellIndexByPos(point.x, point.y)
    const cell = getCellByIndex(index.col, index.row)
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
    waitForPastedData(editableDiv, savedContent)
    return true
  }

  const insertTable = (stateRow: Row[], prevRow: Row[], table: Row[], pos: Point) => {
    const copiedLength = util.getTableLength(table)
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
        const point = getCellInfoByIndex(t, i)
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
      alert(message.pasteError1)
      return prevRow
    }

    const newRow = selectRange(stateRow, state.point, destPos.y, destPos.x)
    const selectedPoints = getSelectedPoints(newRow)
    const largePoint = util.getLargePoint(...selectedPoints)

    if (largePoint.width !== copiedLength.x || largePoint.height !== copiedLength.y) {
      alert(message.pasteError1)
      return prevRow
    }

    const bound = { x: 0, y: largePoint.y, width: largePoint.x, height: largePoint.height }
    const points = getAllPoints(stateRow)

    points.forEach(point => {
      if (util.hitTest(bound, point)) {
        const index = getCellIndexByPos(point.x, point.y)
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
    stateRow = util.removeSelectedCellExcept(stateRow)
    rows.forEach(row => {
      const index = row[row.length - 1]
      if (table[t]) {
        table[t].col.reverse().forEach((cell: Col) => {
          stateRow = util.insertCellAt(stateRow, index.row, index.col + 1, {
            ...util.generateNewCell(),
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

  const waitForPastedData = async (elem: HTMLElement, savedContent: HTMLElement | DocumentFragment) => {
    if (elem.childNodes && elem.childNodes.length > 0) {
      const pastedData = elem.innerHTML
      elem.innerHTML = ''
      elem.appendChild(savedContent)
      const canPaste = await processPaste(pastedData)
      onPasting.current = false
      if (!canPaste) {
        requestAnimationFrame(() => {
          util.insertHtmlAtCursor(pastedData)
        })
      }
    } else {
      setTimeout(() => {
        waitForPastedData(elem, savedContent)
      }, 20)
    }
  }

  const processPaste = async (pastedData: string) => {
    const selectedPoint = getSelectedPoint(state.row)
    const tableHtml = pastedData.match(/<table(([\n\r\t]|.)*?)>(([\n\r\t]|.)*?)<\/table>/i)

    if (tableHtml && tableHtml[0]) {
      const newRow = util.parse(tableHtml[0], 'text')
      if (newRow && newRow.length) {
        const prevRow = produce(state.row, row => row)
        await addRowAndCol(newRow, {
          x: selectedPoint.x,
          y: selectedPoint.y,
          width: 0,
          height: 0,
        })
        const newState = produce(state, data => {
          const row = insertTable(data.row, prevRow, newRow, {
            x: selectedPoint.x,
            y: selectedPoint.y,
            width: 0,
            height: 0,
          })
          data.row = row
          data.history = util.generateHistory(history, row)
          return data
        })
        if (onChange) {
          onChange(util.getHtml(state.row, align))
        }
        dispatch({ type: 'SET_ROW', row: newState.row })
        dispatch({ type: 'SET_HISTORY', history: newState.history })
        return true
      }
    }
    // for excel;
    const row = util.parseText(pastedData)
    if (row && row[0] && row[0].col && row[0].col.length > 1) {
      const prevRow = produce(state.row, row => row)
      const newState = produce(state, data => {
        const selectedPoint = getSelectedPoint(data.row)
        const newRow = insertTable(data.row, prevRow, row, {
          x: selectedPoint.x,
          y: selectedPoint.y,
          width: 0,
          height: 0,
        })
        data.row = newRow
        data.history = util.generateHistory(history, row)
        return data
      })
      if (onChange) {
        onChange(util.getHtml(newState.row, align))
      }
      dispatch({ type: 'SET_ROW', row: newState.row })
      dispatch({ type: 'SET_HISTORY', history: newState.history })
      return true
    }
    return false
  }

  return (
    <>
      <Menu
        btns={btns}
        open={showBtnList}
        classNames={classNames}
        icons={icons}
      />
      {children}
      <Table
        ref={ref}
        selectedRowIndex={selectedRowNo}
        selectedColIndex={selectedColNo}
        rows={row}
        topRows={util.getHighestRow(state.row[0])}
        onCellInput={onCellInput}
        onCellKeyup={onCellKeyup}
        onUpdateTable={updateTable}
        onCopyTable={copyTable}
        onPasteTable={pasteTable}
      />
    </>
  )
})
