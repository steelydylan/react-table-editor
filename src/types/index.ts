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
