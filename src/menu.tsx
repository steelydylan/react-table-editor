import React from "react"
import ReactTooltip from "react-tooltip"
import { Btn } from "./types"

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
  onUndo: () => void
  onMergeCells: () => void
  onSplitCell: () => void
  onAlign: (align: 'left' | 'center' | 'right') => void
  onChangeCellTypeTo: (cell: 'td' | 'th') => void
  onInsertTag: (tagName: string, className: string) => void
}

export const Menu: React.FC<Props> = ({ 
  classNames, 
  icons, 
  btns, 
  open,
  onUndo,
  onMergeCells,
  onSplitCell,
  onAlign,
  onChangeCellTypeTo,
  onInsertTag,
}) => {
  if (!open) {
    return null
  }
  return (
    <div className="st-table-btn-group-list">
      <div className={classNames.btn.group}>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={onUndo}
          data-tip="操作を一つ前に戻す"
        >
          {icons.undo}
        </button>
      </div>
      <div className={classNames.btn.group}>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={onMergeCells}
          data-tip="選択したセルを結合"
        >
          {icons.merge}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={onSplitCell}
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
          onClick={() => onChangeCellTypeTo('td')}
          data-tip="通常のセルに変更"
        >
          {icons.td}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => onChangeCellTypeTo('th')}
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
          onClick={() => onAlign('left')}
          data-tip="左揃え"
        >
          {icons.alignLeft}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => onAlign('center')}
          data-tip="中央揃え"
        >
          {icons.alignCenter}
          <ReactTooltip effect="solid" place="bottom" />
        </button>
        <button
          type="button"
          className={classNames.btn.item}
          onClick={() => onAlign('right')}
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
                onClick={() => onInsertTag(btn.tag, btn.className)}
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
