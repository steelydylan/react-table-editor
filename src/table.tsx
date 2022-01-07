import clsx from "clsx"
import React from "react"
import CellInner from "./cell-inner"
import { CellClickEvent, Row } from "./types"

type Props = {
  inputMode: "table" | "source"
  topRows: number[]
  rows: Row[]
  selectedRowIndex: number
  selectedColIndex: number
  onUnselect: () => void
  onUpdateSource: () => void
  onSelectCol: (e: CellClickEvent, index: number) => void
  onSelectRow: (e: CellClickEvent, index: number) => void
  onUpdateTable: (e: CellClickEvent, i: number, j: number) => void
  onCompositionStart: () => void
  onCompositionEnd: () => void
  onCopyTable: (e: CellClickEvent) => void
  onPasteTable: (e: CellClickEvent) => void
  onCellInput: (e: CellClickEvent, i: number, j: number) => void
  onCellKeyup: (e: CellClickEvent, i: number, j: number) => void
}

export const Table = React.forwardRef<HTMLDivElement, Props>(({ 
  inputMode, 
  topRows, 
  rows,
  selectedRowIndex, 
  selectedColIndex,
  onUnselect,
  onUpdateSource,
  onSelectCol,
  onSelectRow,
  onUpdateTable,
  onCompositionStart,
  onCompositionEnd,
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
          {inputMode === 'table' && (
            <table className="st-table">
              <thead>
                <tr className="st-table-header js-table-header">
                  <th className="st-table-first"></th>
                  {topRows.map((row, i) => {
                    return (
                      <React.Fragment key={`head-${i}`}>
                        {i === selectedRowIndex && (
                          <th
                            onClick={onUnselect}
                            className="selected"
                          >
                            <span className="st-table-toggle-btn"></span>
                          </th>
                        )}
                        {i !== selectedRowIndex && (
                          <th
                            onClick={e => {
                              onSelectRow(e, i)
                            }}
                          >
                            <span className="st-table-toggle-btn"></span>
                          </th>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((item, i) => {
                  return (
                    <tr key={`row-${i}`}>
                      {selectedColIndex !== i && (
                        <th
                          className="st-table-side js-table-side"
                          onClick={e => {
                            onSelectCol(e, i)
                          }}
                        >
                          <span className="st-table-toggle-btn"></span>
                        </th>
                      )}
                      {selectedColIndex === i && (
                        <th
                          className="st-table-side js-table-side selected"
                          onClick={onUnselect}
                        >
                          <span className="st-table-toggle-btn"></span>
                        </th>
                      )}
                      {rows[i].col.map((col, j) => {
                        return (
                          <td
                            key={`row-${i}-col-${j}-${col.key}`}
                            colSpan={col.colspan}
                            rowSpan={col.rowspan}
                            onCompositionStart={onCompositionStart}
                            onCompositionEnd={onCompositionEnd}
                            onCopy={onCopyTable}
                            onPaste={onPasteTable}
                            onContextMenu={e => {
                              onUpdateTable(e, j, i)
                            }}
                            onInput={e => {
                              onCellInput(e as any, j, i)
                            }}
                            onKeyUp={e => {
                              onCellKeyup(e as any, j, i)
                            }}
                            onClick={e => {
                              onUpdateTable(e, j, i)
                            }}
                            onMouseDown={e => {
                              onUpdateTable(e, j, i)
                            }}
                            onMouseUp={e => {
                              onUpdateTable(e, j, i)
                            }}
                            onMouseMove={e => {
                              onUpdateTable(e, j, i)
                            }}
                            className={clsx(
                              {
                                'st-table-selected': col.selected,
                                'st-table-th': col.type === 'th',
                                'st-table-border-top': col.mark && col.mark.top,
                                'st-table-border-right': col.mark && col.mark.right,
                                'st-table-border-bottom': col.mark && col.mark.bottom,
                                'st-table-border-left': col.mark && col.mark.left,
                              },
                              col.cellClass
                            )}
                            data-cell-id={`${j}-${i}`}
                          >
                            <CellInner unique={col.key} align={col.align} value={col.value} />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {inputMode === 'source' && (
            <textarea
              className="st-table-textarea"
              onInput={onUpdateSource}
            ></textarea>
          )}
        </div>
      </div>
    </div>
  )
})