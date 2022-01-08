import React, { useContext } from "react"
import ReactTooltip from "react-tooltip"
import { TableContext } from "./table-context"
import { Btn } from "../types"

type Props = {
  classNames: {
    btn: {
      group: string
      item: string
    }
  }
  icons: {
    undo: React.ReactNode
    merge: React.ReactNode
    td: React.ReactNode
    th: React.ReactNode
    split: React.ReactNode
    alignLeft: React.ReactNode
    alignCenter: React.ReactNode
    alignRight: React.ReactNode
  }
  btns?: Btn[]
  open: boolean
}

export const Menu: React.FC<Props> = ({ 
  classNames, 
  icons, 
  btns, 
  open,
}) => {
  const { undo, mergeCells, splitCell, changeCellTypeTo, alignCell, insertTag } = useContext(TableContext)
  if (!open) {
    return null
  }
  return (
    <div className="st-table-btn-group-list">
      <div className={classNames.btn.group}>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={undo}
          data-tip="操作を一つ前に戻す"
        >
          {icons.undo}
        </button>
      </div>
      <div className={classNames.btn.group}>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={mergeCells}
          data-tip="選択したセルを結合"
        >
          {icons.merge}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={splitCell}
          data-tip="選択したセルを分割"
        >
          {icons.split}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
      </div>
      <div className={classNames.btn.group}>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => changeCellTypeTo('td')}
          data-tip="通常のセルに変更"
        >
          {icons.td}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => changeCellTypeTo('th')}
          data-tip="見出しのセルに変更"
        >
          {icons.th}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
      </div>
      <div className={classNames.btn.group}>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => alignCell('left')}
          data-tip="左揃え"
        >
          {icons.alignLeft}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => alignCell('center')}
          data-tip="中央揃え"
        >
          {icons.alignCenter}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => alignCell('right')}
          data-tip="右揃え"
        >
          {icons.alignRight}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
      </div>
      {btns && (
        <div className={classNames.btn.group}>
          {btns.map((btn, index) => {
            return (
              <button
                key={`btn-${index}`}
                type="button"
                className={classNames.btn.item}
                onClick={() => insertTag(btn.tag, btn.className)}
                data-tip={btn.tooltip}
              >
                {btn.icon}
                <ReactTooltip effect="solid" place="bottom" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
