import React, { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import produce from 'immer'
import * as util from './util'
import { acquireClipboardData, acquireText, toHtml } from './clipboard'
import { CTXMenu } from './ctx-menu'
import { LinkModal } from './link-modal'
import { Align, Btn, CellClickEvent, Col, DefaultProps, Mark, Point, Row } from './types'
import { Menu } from './menu'
import { Table } from './table'
import { State, TableContext } from './table-context'

type Props = {
  html: string
  btns?: Btn[]
  onChange?: (html: string) => void
}

export const TableEditor = ({ 
  showTargetBlankUI, 
  showBtnList, 
  icons, 
  mark, 
  message, 
  html, 
  onChange, 
  btns, 
  classNames,
  relAttrForTargetBlank,
}: Props & DefaultProps) => {
  const { align } = mark
  const tableRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)
  const onPasting = useRef(false)
  const range = useRef<Range>(null)
  const { dispatch, state } = useContext(TableContext)
  const [linkModalState, setLinkModalState] = useState({
    linkClassName: '',
    linkLabel: '',
    isNewLink: false,
    openLinkModal: false,
  })
  const {
    mode,
    showMenu,
    point,
    selectedRowNo,
    selectedColNo,
    row,
    history,
    menuX,
    menuY,
    selectedTags,
  } = state

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

  // TODO
  const contextmenu = (e: any) => {
    e.preventDefault()
    dispatch({ type: 'SET_MENU', showMenu: true })
    dispatch({ type: 'SET_MENU_X', menuX: e.clientX })
    dispatch({ type: 'SET_MENU_Y', menuY: e.clientY })
  }

  useEffect(() => {
    const table = getElementByQuery('table') as HTMLTableElement
    const inner = tableRef.current.parentNode as HTMLElement
    const elem = getElementByQuery('.st-table-selected .st-table-editable') as HTMLDivElement
    const selectedPoints = getSelectedPoints(row)
    if (elem && !showMenu && !linkModalState.openLinkModal && selectedPoints.length === 1) {
      setTimeout(() => {
        util.putCaret(elem)
      }, 1)
    }

    if (table) {
      inner.style.width = '9999px'
      const tableWidth = table.offsetWidth
      inner.style.width = `${tableWidth}px`
    } else {
      inner.style.width = 'auto'
    }
  })

  const undo = () => {
    const newHistory = [...produce(history, history => history)]
    let newRow = produce(row, row => row)
    if (history.length === 0) {
      return
    }

    while (JSON.stringify(newRow) === JSON.stringify(row)) {
      newRow = history.pop()
    }

    if (newRow) {
      if (newHistory.length === 0) {
        newHistory.push(newRow)
      }
      dispatch({ type: 'SET_ROW', row: newRow })
      dispatch({ type: 'SET_HISTORY', history: newHistory })
      // this.forceUpdate()
    }
  }

  const unselect = () => {
    const newRow = util.unselectCells(row)
    dispatch({ type: 'SET_SELECTED_COL_NO', index: -1 })
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: -1 })
    dispatch({ type: 'SET_MENU', showMenu: false })
    dispatch({ type: 'SET_ROW', row: newRow })
  }

  const selectRow = (e: CellClickEvent, i: number) => {
    const newRow = produce(row, row => {
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
    dispatch({ type: 'SET_MENU', showMenu: false })
    dispatch({ type: 'SET_MODE', mode: 'col' })
    dispatch({ type: 'SET_SELECTED_COL_NO', index: -1 })
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: i })
    dispatch({ type: 'SET_ROW', row: newRow })
    contextmenu(e)
    // this.update()
  }

  const selectCol = (e: CellClickEvent, i: number) => {
    const points = getAllPoints(row)
    const largePoint = util.getLargePoint(...points)
    const newpoint = { x: 0, y: i, width: largePoint.width, height: 1 }
    const targetPoints: Point[] = []
    const newRow = produce(row, row => {
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
      return row
    })

    dispatch({ type: 'SET_MENU', showMenu: false })
    dispatch({ type: 'SET_MODE', mode: 'row' })
    dispatch({ type: 'SET_SELECTED_ROW_NO', index: -1 })
    dispatch({ type: 'SET_SELECTED_COL_NO', index: i })
    dispatch({ type: 'SET_ROW', row: newRow })
    contextmenu(e)
  }

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
    dispatch({ type: 'SET_MENU', showMenu: false })
  }

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

  const onCompositionStart = () => {
    dispatch({ type: 'SET_BEING_INPUT', beignInput: true })
  }

  const onCompositionEnd = () =>{
    dispatch({ type: 'SET_BEING_INPUT', beignInput: false })

  }

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
          if (!data.beingInput) {
            if (!data.row[a].col[b].selected || points.length > 1) {
              data.row = util.unselectCells(data.row)
              data = util.select(data, a, b)
            }
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
          if (!data.beingInput) {
            util.select(data, a, b)
          }
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
    // this.setState(state)
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
        // this.setState(state)
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

  const generateHistory = (rows: Row[]) => {
    return produce(state.history, history => {
      history.push(rows)
      return history
    })
  }

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
        console.log(targetPoints)
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

  // beforeUpdated() {
  //   this.changeSelectOption()
  //   this.markup()
  // }

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

  const changeCellTypeTo = (type: 'td' | 'th') => {
    const newState = produce(state, data => {
      data.row.forEach(row => {
        row.col.forEach(col => {
          if (col.selected) {
            col.type = type
          }
        })
      })
      data.history.push(produce(data.row, row => row))
      return data
    })
    if (onChange) {
      onChange(util.getHtml(state.row, align))
    }
    dispatch({ type: "SET_MENU", showMenu: false })
    dispatch({ type: "SET_ROW", row: newState.row })
    dispatch({ type: "SET_HISTORY", history: generateHistory(newState.row) })
  }

  const alignCell = (align: Align) => {
    const newState = produce(state, data => {
      data.row.forEach(row => {
        row.col.forEach(col => {
          if (col.selected) {
            col.align = align
          }
        })
      })
      data.showMenu = false
    })
    if (onChange) {
      onChange(util.getHtml(newState.row, align))
    }
    dispatch({ type: "SET_MENU", showMenu: false })
    dispatch({ type: "SET_ROW", row: newState.row })
    dispatch({ type: "SET_HISTORY", history: generateHistory(newState.row) })
  }

  const addRowAndCol = async(oldRows: Row[], points: Point) => {
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
      // this.setState(
      //   {
      //     row: rows,
      //   },
      //   () => {
      //     requestAnimationFrame(() => {
      //       resolve()
      //     })
      //   }
      // )
    })
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

  const checkTag = (tag: string, className: string) => {
    return selectedTags.some(selectedTag => {
      return selectedTag.tag === tag && selectedTag.className === className
    })
  }

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
    // this.setState({ row })
  }

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
    if (checkTag(tag, className)) {
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

  const renderCtxMenu = () => {
    if (!showMenu || !ctxMenuRef.current) {
      return null
    }
    return createPortal(
      <CTXMenu
        onAlign={alignCell}
        onChangeCellTypeTo={changeCellTypeTo}
        onInsertColLeft={insertColLeft}
        onInsertColRight={insertColRight}
        onInsertRowAbove={insertRowAbove}
        onInsertRowBelow={insertRowBelow}
        onMergeCells={mergeCells}
        onRemoveCol={removeCol}
        onRemoveRow={removeRow}
        onSplitCell={splitCell}
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

  const renderLinkModal = () => {
    if (!modalRef.current || !linkModalState.openLinkModal) {
      return null
    }
    return createPortal(
      <LinkModal
        isNewLink={linkModalState.isNewLink}
        showTargetBlankUI={showTargetBlankUI}
        message={message}
        onClose={() => {
          setLinkModalState({
            ...linkModalState,
            openLinkModal: false,
          })
        }}
        onInsertLink={insertLink}
      />,
      modalRef.current,
    )
  }

  return (
    <div className="st-table-container">
      <Menu
        btns={btns}
        open={showBtnList}
        classNames={classNames}
        icons={icons}
        onUndo={undo}
        onAlign={alignCell}
        onChangeCellTypeTo={changeCellTypeTo}
        onInsertTag={insertTag}
        onMergeCells={mergeCells}
        onSplitCell={splitCell}
      />
      {renderCtxMenu()}
      <Table
        ref={(ref) => tableRef.current = ref}
        selectedRowIndex={selectedRowNo}
        selectedColIndex={selectedColNo}
        rows={row}
        topRows={util.getHighestRow(state.row[0])}
        onCellInput={onCellInput}
        onCellKeyup={onCellKeyup}
        onCompositionEnd={onCompositionEnd}
        onCompositionStart={onCompositionStart}
        onUnselect={unselect}
        onSelectCol={selectCol}
        onSelectRow={selectRow}
        onUpdateTable={updateTable}
        onCopyTable={copyTable}
        onPasteTable={pasteTable}
      />
      {renderLinkModal()}
    </div>
  )

}