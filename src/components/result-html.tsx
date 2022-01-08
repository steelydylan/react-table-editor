import clsx from "clsx"
import React from "react"
import xss from "xss"
import { Align, Row } from "../types"

const xssOption = {
  whiteList: {
    a: ['href', 'target', 'rel'],
  },
}

type Props = {
  rows: Row[]
  align: {
    default: Align
    left: Align
    center: Align
    right: Align
  },
}


export const ResultHTML: React.FC<Props> = ({ rows, align }) => {
  const getStyleByAlign = (val: string) => {
    if (align.default === val) {
      return ''
    }
    return align[val]
  }

  return (
    <table>
      <tbody>
        {rows.map((item, rowIndex) => {
          return (
            <tr key={`row-${rowIndex}`}>
              {item.col.map((col, colIndex) => {
                const className = clsx(getStyleByAlign(col.align), col.cellClass)
                if (col.type === 'th') {
                  return (
                    <th
                      key={`col-${rowIndex}-${colIndex}`}
                      colSpan={col.colspan}
                      rowSpan={col.rowspan}
                      className={className}
                      dangerouslySetInnerHTML={{ __html: xss(col.value, xssOption) }}
                    />
                  )
                }
                return (
                  <td
                    key={`col-${rowIndex}-${colIndex}`}
                    colSpan={col.colspan}
                    rowSpan={col.rowspan}
                    className={className}
                    dangerouslySetInnerHTML={{ __html: xss(col.value, xssOption) }}
                  />
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}