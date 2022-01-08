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