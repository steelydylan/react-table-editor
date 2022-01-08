import React, { useContext } from "react"
import { TableContext } from "./table-context"

type Props = {
  menuY: number;
  menuX: number;
  mode: 'col' | 'cell' | 'row'
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
  selectedRowIndex,
  selectedColIndex,
  message,
}) => {
  const { 
    mergeCells, 
    splitCell, 
    changeCellTypeTo, 
    alignCell, 
    insertColLeft, 
    insertColRight, 
    removeCol, 
    insertRowAbove, 
    insertRowBelow,
    removeRow
  } = useContext(TableContext)

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
            onClick={mergeCells}
          >
            {message.mergeCells}
          </li>
          <li
            onClick={splitCell}
          >
            {message.splitCell}
          </li>
          <li
            onClick={() => {
              changeCellTypeTo('th')
            }}
          >
            {message.changeToTh}
          </li>
          <li
            onClick={() => {
              changeCellTypeTo('td')
            }}
          >
            {message.changeToTd}
          </li>
          <li
            onClick={() => {
              alignCell('left')
            }}
          >
            {message.alignLeft}
          </li>
          <li
            onClick={() => {
              alignCell('center')
            }}
          >
            {message.alignCenter}
          </li>
          <li
            onClick={() => {
              alignCell('right')
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
              insertColLeft(selectedRowIndex)
            }}
          >
            {message.addColumnLeft}
          </li>
          <li
            onClick={() => {
              insertColRight(selectedRowIndex)
            }}
          >
            {message.addColumnRight}
          </li>
          <li
            onClick={() => {
              removeCol(selectedRowIndex)
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
              insertRowAbove(selectedColIndex)
            }}
          >
            {message.addRowTop}
          </li>
          <li
            onClick={() => {
              insertRowBelow(selectedColIndex)
            }}
          >
            {message.addRowBottom}
          </li>
          <li
            onClick={() => {
              removeRow(selectedColIndex)
            }}
          >
            {message.removeRow}
          </li>
        </>
      )}
    </ul>
  )
}
