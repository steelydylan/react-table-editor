import React from "react"
import SvgAlignCenter from "./icons/AlignCenter"
import SvgAlignLeft from "./icons/AlignLeft"
import SvgAlignRight from "./icons/AlignRight"
import SvgMerge from "./icons/Merge"
import SvgSplit from "./icons/Split"
import SvgUndo from "./icons/Undo"
import { DefaultProps } from "./types"

const iconSize = { width: '20px', height: '20px' }

export const defaultProps: DefaultProps = {
  showBtnList: true,
  relAttrForTargetBlank: 'noopener',
  lang: 'en',
  mark: {
    align: {
      default: 'left',
      left: 'left',
      center: 'center',
      right: 'right',
    },
  },
  classNames: {
    btn: {
      group: 'st-table-btn-list',
      item: 'st-table-btn',
      itemActive: 'st-table-btn-active',
    },
    label: 'st-table-label',
    actionGroup: 'st-table-action-group',
    selector: {
      self: 'st-table-selector',
    },
  },
  icons: {
    alignLeft: <SvgAlignLeft style={iconSize} />,
    alignCenter: <SvgAlignCenter style={iconSize} />,
    alignRight: <SvgAlignRight style={iconSize} />,
    merge: <SvgMerge style={iconSize} />,
    split: <SvgSplit style={iconSize} />,
    td: <span>TD</span>,
    th: <span>TH</span>,
    undo: <SvgUndo style={iconSize} />,
  },
  message: {
    mergeCells: 'Merge selected cells',
    splitCell: 'Split selected cell',
    changeToTh: 'Change to th',
    changeToTd: 'Change to td',
    alignLeft: 'Align left',
    alignCenter: 'Align center',
    alignRight: 'Align right',
    addColumnLeft: 'Insert a new column before',
    addColumnRight: 'Insert a new column after',
    removeColumn: 'Delete selected columns',
    addRowTop: 'Insert a new row before',
    addRowBottom: 'Insert a new row after',
    removeRow: 'Delete selected rows',
    source: 'Source',
    mergeCellError1: 'All possible cells should be selected so to merge cells into one',
    mergeCellConfirm1:
      "The top left cell's value of the selected range will only be saved. Are you sure you want to continue?",
    pasteError1: "You can't paste here",
    splitError1: 'Cell is not selected',
    splitError2: 'Only one cell should be selected',
    splitError3: "You can't split the cell anymore",
    closeLabel: 'close',
    targetBlank: 'target',
    targetBlankLabel: 'Opens the linked page in a new window or tab',
    addLinkTitle: 'link',
    updateLinkTitle: 'link',
    addLink: 'add',
    updateLink: 'update',
    removeLink: 'remove',
    linkUrl: 'URL',
    linkLabel: 'label',
  },
  showTargetBlankUI: false,
}
