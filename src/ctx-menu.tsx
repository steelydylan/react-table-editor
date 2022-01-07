import React from "react"

type Props = {
  menuY: number;
  menuX: number;
  mode: 'col' | 'cell' | 'row'
  onMergeCells: () => void
  onSplitCell: () => void
  onChangeCellTypeTo: (item: 'td' | 'th') => void
  onAlign: (align: 'left' | 'center' | 'right') => void
  onInsertColLeft: (index: number) => void
  onInsertColRight: (index: number) => void
  onRemoveCol: (index: number) => void
  onInsertRowAbove: (index: number) => void
  onInsertRowBelow: (index: number) => void
  onRemoveRow: (index: number) => void
  selectedRowIndex: number
  selectedColIndex: number
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
  }
}

export const CTXMenu: React.FC<Props> = ({ 
  menuY, 
  menuX, 
  mode, 
  onMergeCells, 
  onSplitCell, 
  onChangeCellTypeTo, 
  onAlign, 
  onInsertColLeft, 
  onInsertColRight,
  onRemoveCol,
  onInsertRowAbove,
  onInsertRowBelow,
  onRemoveRow,
  selectedRowIndex,
  selectedColIndex,
  message,
}) => {
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
            onClick={onMergeCells}
          >
            {message.mergeCells}
          </li>
          <li
            onClick={onSplitCell}
          >
            {message.splitCell}
          </li>
          <li
            onClick={() => {
              onChangeCellTypeTo('th')
            }}
          >
            {message.changeToTh}
          </li>
          <li
            onClick={() => {
              onChangeCellTypeTo('td')
            }}
          >
            {message.changeToTd}
          </li>
          <li
            onClick={() => {
              onAlign('left')
            }}
          >
            {message.alignLeft}
          </li>
          <li
            onClick={() => {
              onAlign('center')
            }}
          >
            {message.alignCenter}
          </li>
          <li
            onClick={() => {
              onAlign('right')
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
              onInsertColLeft(selectedRowIndex)
            }}
          >
            {message.addColumnLeft}
          </li>
          <li
            onClick={() => {
              onInsertColRight(selectedRowIndex)
            }}
          >
            {message.addColumnRight}
          </li>
          <li
            onClick={() => {
              onRemoveCol(selectedRowIndex)
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
              onInsertRowAbove(selectedColIndex)
            }}
          >
            {message.addRowTop}
          </li>
          <li
            onClick={() => {
              onInsertRowBelow(selectedColIndex)
            }}
          >
            {message.addRowBottom}
          </li>
          <li
            onClick={() => {
              onRemoveRow(selectedColIndex)
            }}
          >
            {message.removeRow}
          </li>
        </>
      )}
    </ul>
  )
}
