import React, { useContext } from "react"
import { TableContext } from "./table-context"
import { TableCore } from "./table-core"
import { CellClickEvent, Row } from "./types"

type Props = {
  topRows: number[]
  rows: Row[]
  selectedRowIndex: number
  selectedColIndex: number
  onUpdateTable: (e: CellClickEvent, i: number, j: number) => void
  onCopyTable: (e: React.ClipboardEvent<HTMLTableCellElement>) => void
  onPasteTable: (e: React.ClipboardEvent<HTMLTableCellElement>) => void
  onCellInput: (e: CellClickEvent, i: number, j: number) => void
  onCellKeyup: (e: CellClickEvent, i: number, j: number) => void
}

export const Table = React.forwardRef<HTMLDivElement, Props>(({
  topRows,
  rows,
  selectedRowIndex,
  selectedColIndex,
  onUpdateTable,
  onCopyTable,
  onPasteTable,
  onCellInput,
  onCellKeyup,
}, ref) => {
  const { unselect, selectCol, selectRow, state, contextmenu } = useContext(TableContext)
  const handleSelectCol = React.useCallback((e: CellClickEvent, index: number) => {
    e.preventDefault()
    contextmenu(e.clientX, e.clientY)
    selectCol(index)
  }, [selectCol])
  const handleSelectRow = React.useCallback((e: CellClickEvent, index: number) => {
    e.preventDefault()
    contextmenu(e.clientX, e.clientY)
    selectRow(index)
  }, [selectRow])

  return (
    <div className="st-table-outer">
      <div className="st-table-inner">
        <div
          className="st-table-wrapper"
          ref={ref}
        >
          <TableCore
            topRows={topRows}
            rows={rows}
            selectedRowIndex={selectedRowIndex}
            selectedColIndex={selectedColIndex}
            onUnselect={unselect}
            onSelectCol={handleSelectCol}
            onSelectRow={handleSelectRow}
            onUpdateTable={onUpdateTable}
            onCopyTable={onCopyTable}
            onPasteTable={onPasteTable}
            onCellInput={onCellInput}
            onCellKeyup={onCellKeyup}
          />
        </div>
      </div>
    </div>
  )
})
