import React, { useReducer, createContext } from 'react'
import SvgAlignCenter from './icons/AlignCenter'
import SvgAlignLeft from './icons/AlignLeft'
import SvgAlignRight from './icons/AlignRight'
import SvgMerge from './icons/Merge'
import SvgSplit from './icons/Split'
import SvgUndo from './icons/Undo'
import { TableEditor } from './table-editor'
import { Btn, DefaultProps, Point, Row } from './types'

type Action =
  { type: 'SET_MENU', showMenu: boolean } |
  { type: 'SET_SPLITED', splited: boolean } |
  { type: 'SET_MOUSEDOWN', mousedown: boolean } |
  { type: 'SET_POINT', point: Point } |
  { type: 'SET_SELECTED_ROW_NO', index: number } |
  { type: 'SET_SELECTED_COL_NO', index: number } |
  { type: 'SET_ROW', row: Row[] } |
  { type: 'SET_MENU_X', menuX: number } |
  { type: 'SET_MENU_Y', menuY: number } |
  { type: 'SET_HISTORY', history: Row[][] } |
  { type: 'SET_MODE', mode: 'col' | 'row' | 'cell' | null } |
  { type: 'SET_SELECTED_TAGS', selectedTags: { className: string; tag: string }[] }

export type State = {
  mode: 'col' | 'row' | 'cell' | null
  showMenu: boolean
  splited: boolean
  mousedown: boolean
  point: { x: number; y: number; width: number; height: number; }
  selectedRowNo: number
  selectedColNo: number
  row: Row[]
  tableClass: string
  history: Row[][]
  tableResult: string
  cellClass: string
  menuX: number
  menuY: number
  selectedTags: { className: string; tag: string }[]
}

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'SET_MENU':
      return {
        ...state,
        showMenu: action.showMenu
      }
    case 'SET_SPLITED':
      return {
        ...state,
        count: action.splited,
      }
    case 'SET_MOUSEDOWN':
      return {
        ...state,
        mousedown: action.mousedown
      }
    case 'SET_POINT':
      return {
        ...state,
        point: action.point,
      }
    case 'SET_SELECTED_ROW_NO':
      return {
        ...state,
        selectedRowNo: action.index,
      }
    case 'SET_SELECTED_COL_NO':
      return {
        ...state,
        selectedColNo: action.index,
      }
    case 'SET_ROW':
      return {
        ...state,
        row: action.row,
      }
    case 'SET_MENU_X':
      return {
        ...state,
        menuX: action.menuX,
      }
    case 'SET_MENU_Y':
      return {
        ...state,
        menuY: action.menuY,
      }
    case 'SET_HISTORY':
      return {
        ...state,
        history: action.history,
      }
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
      }
    case 'SET_SELECTED_TAGS':
      return {
        ...state,
        selectedTags: action.selectedTags,
      }
    default:
      return state
  }
}

export const TableContext = createContext({} as {
  state: State
  dispatch: React.Dispatch<Action>
})

const initialState: State = {
  mode: null,
  showMenu: false,
  splited: false,
  mousedown: false,
  point: { x: -1, y: -1, width: 0, height: 0 },
  selectedRowNo: -1,
  selectedColNo: -1,
  row: [],
  tableClass: '',
  history: [[]] as Row[][],
  tableResult: '',
  cellClass: '',
  menuX: 0,
  menuY: 0,
  selectedTags: [],
}

type Props = {
  html: string
  btns?: Btn[]
  onChange?: (html: string) => void
}

const iconSize = { width: '20px', height: '20px' }

const defs: DefaultProps = {
  showBtnList: true,
  relAttrForTargetBlank: 'noopener',
  lang: 'en',
  mark: {
    align: {
      default: 'left',
      left: 'left',
      center: 'center',
      right: 'right',
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
    alignLeft: <SvgAlignLeft style={iconSize} />,
    alignCenter: <SvgAlignCenter style={iconSize} />,
    alignRight: <SvgAlignRight style={iconSize} />,
    merge: <SvgMerge style={iconSize} />,
    split: <SvgSplit style={iconSize} />,
    td: <span>TD</span>,
    th: <span>TH</span>,
    undo: <SvgUndo style={iconSize} />,
  },
  message: {
    mergeCells: 'Merge selected cells',
    splitCell: 'Split selected cell',
    changeToTh: 'Change to th',
    changeToTd: 'Change to td',
    alignLeft: 'Align left',
    alignCenter: 'Align center',
    alignRight: 'Align right',
    addColumnLeft: 'Insert a new column before',
    addColumnRight: 'Insert a new column after',
    removeColumn: 'Delete selected columns',
    addRowTop: 'Insert a new row before',
    addRowBottom: 'Insert a new row after',
    removeRow: 'Delete selected rows',
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

export const TableContextComponent: React.FC<Props & Partial<DefaultProps>> = ({ html, btns, onChange, ...props }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const mergedProps = { ...defs, ...props }
  return (
      <TableContext.Provider value={{ state, dispatch }}>
        <TableEditor
          html={html}
          btns={btns}
          onChange={onChange}
          {...mergedProps}
        />
      </TableContext.Provider>
  )
}
