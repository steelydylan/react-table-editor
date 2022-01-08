import React from "react"
import { TableCore } from "./table-core"
import { CellClickEvent, Row } from "./types"

type Props = {
  topRows: number[]
  rows: Row[]
  selectedRowIndex: number
  selectedColIndex: number
  onUnselect: () => void
  onSelectCol: (e: CellClickEvent, index: number) => void
  onSelectRow: (e: CellClickEvent, index: number) => void
  onUpdateTable: (e: CellClickEvent, i: number, j: number) => void
  onCopyTable: (e: React.ClipboardEvent<HTMLTableDataCellElement>) => void
  onPasteTable: (e: React.ClipboardEvent<HTMLTableDataCellElement>) => void
  onCellInput: (e: CellClickEvent, i: number, j: number) => void
  onCellKeyup: (e: CellClickEvent, i: number, j: number) => void
}

export const Table = React.forwardRef<HTMLDivElement, Props>(({
  topRows,
  rows,
  selectedRowIndex,
  selectedColIndex,
  onUnselect,
  onSelectCol,
  onSelectRow,
  onUpdateTable,
  onCopyTable,
  onPasteTable,
  onCellInput,
  onCellKeyup,
}, ref) => {
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
            onUnselect={onUnselect}
            onSelectCol={onSelectCol}
            onSelectRow={onSelectRow}
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
