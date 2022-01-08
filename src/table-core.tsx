import clsx from "clsx"
import React from "react"
import { shallowEqualObjects } from 'shallow-equal'
import CellInner from "./cell-inner"
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
  onCompositionStart: () => void
  onCompositionEnd: () => void
  onCopyTable: (e: React.ClipboardEvent<HTMLTableDataCellElement>) => void
  onPasteTable: (e: React.ClipboardEvent<HTMLTableDataCellElement>) => void
  onCellInput: (e: CellClickEvent, i: number, j: number) => void
  onCellKeyup: (e: CellClickEvent, i: number, j: number) => void
}

const shouldUpdate = (prevProps: Props, newProps: Props) => {
  const {
    rows: prevRow,
    onUnselect,
    onSelectRow,
    onUpdateTable,
    onCompositionStart,
    onCompositionEnd,
    onCopyTable,
    onPasteTable,
    onCellInput,
    onCellKeyup,
    onSelectCol,
    ...currentState
  } = prevProps
  const {
    rows: nextRow,
    onUnselect: a,
    onSelectRow: b,
    onUpdateTable: c,
    onCompositionStart: d,
    onCompositionEnd: e,
    onCopyTable: f,
    onPasteTable: g,
    onCellInput: h,
    onCellKeyup: i,
    onSelectCol: k,
    ...nextState
  } = newProps
  if (!shallowEqualObjects(currentState, nextState)) {
    return false
  }
  if (prevRow.length !== nextRow.length) {
    return false
  }
  return prevRow.some((row, x) => {
    if (prevRow[x].col.length !== nextRow[x].col.length) {
      return false
    }
    return row.col.some((col, y) => {
      const nextCol = nextRow[x].col[y]
      const { value: _nextValue, ...nextColState } = nextCol
      const { value: _prevValue, ...prevColState } = col
      if (shallowEqualObjects(nextColState, prevColState)) {
        return true
      }
      return false
    })
  })
}

export const TableCore = React.memo(({
  topRows,
  selectedRowIndex,
  selectedColIndex,
  onUnselect,
  onSelectRow,
  onSelectCol,
  onCompositionStart,
  onCompositionEnd,
  onCopyTable,
  onPasteTable,
  onUpdateTable,
  onCellInput,
  onCellKeyup,
  rows,
}: Props) => {
  return (
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
  )
}, shouldUpdate)
