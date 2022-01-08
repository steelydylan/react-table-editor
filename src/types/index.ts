import React from "react"

export type Btn = { 
  className: string; 
  tag: string; 
  icon: React.ReactNode; 
  tooltip: string 
}

export type CellClickEvent = React.MouseEvent<HTMLTableHeaderCellElement, MouseEvent> & {
  clipboardData?: any
}

export type Point = { x: number; y: number; width: number; height: number }

export type Align = 'right' | 'center' | 'left'
export type Mode = 'col' | 'row' | 'cell' | null

export type Mark = {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export type Tag = {
  className: string; 
  tag: string;
}

export type Col = {
  key: string
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

export type Row = {
  col: Col[]
}

export type DefaultProps = {
  showBtnList: boolean
  relAttrForTargetBlank: string
  lang: string
  mark: {
    align: {
      default: Align
      left: Align
      center: Align
      right: Align
    },
  },
  classNames: {
    btn: {
      group: string
      item: string
      itemActive: string
    },
    label: string
    actionGroup: string
    selector: {
      self: string
    },
  },
  icons: {
    alignLeft: React.ReactNode
    alignCenter: React.ReactNode
    alignRight: React.ReactNode
    merge: React.ReactNode
    split: React.ReactNode
    td: React.ReactNode
    th: React.ReactNode
    undo: React.ReactNode
  },
  message: {
    mergeCells: string
    splitCell: string
    changeToTh: string
    changeToTd: string
    alignLeft: string
    alignCenter: string
    alignRight: string
    addColumnLeft: string
    addColumnRight: string
    removeColumn: string
    addRowTop: string
    addRowBottom: string
    removeRow: string
    source: string
    mergeCellError1: string
    mergeCellConfirm1: string
    pasteError1: string
    splitError1: string
    splitError2: string
    splitError3: string
    closeLabel: string
    targetBlank: string
    targetBlankLabel: string
    addLinkTitle: string
    updateLinkTitle: string
    addLink: string
    updateLink: string
    removeLink: string
    linkUrl: string
    linkLabel: string
  },
  showTargetBlankUI: boolean,
}

export type Action =
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
  selectedTags: Tag[]
}

export type TableContextType = {
  state: State
  undo: () => void
  unselect: () => void
  insertLink: (props: { linkUrl: string, linkLabel: string, linkTargetBlank: boolean }) => void
  insertTag: (tag: string, className: string) => void
  alignCell: (align: Align) => void
  changeCellTypeTo: (type: 'td' | 'th') => void
  splitCell: () => void
  mergeCells: () => void
  removeCol: (index: number) => void
  selectCol: (index: number) => void
  removeRow: (index: number) => void
  selectRow: (index: number) => void
  insertColLeft: (index: number) => void
  insertColRight: (index: number) => void
  insertRowAbove: (index: number) => void
  insertRowBelow: (index: number) => void
  contextmenu: (x: number, y: number) => void
  getCellIndexByPos: (x: number, y: number) => { row: number; col: number; }
  getCellByIndex: (x: number, y: number) => Element
  getSelectedPoints: (rows: Row[]) => Point[]
  getSelectedPoint: (rows: Row[]) => Point
  getAllPoints: (rows: Row[]) => Point[]
  getCellInfoByIndex: (x: number, y: number) => Point | false 
  getElementByQuery: (query: string) => Element
  dispatch: React.Dispatch<Action>
}
