import * as React from 'react'
import clsx from 'clsx'

type Props = {
  align: 'right' | 'center' | 'left'
  value: string
  unique: string
}

export default class CellInner extends React.Component<Props> {
  element: HTMLDivElement

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.unique !== this.props.unique ||
      this.element?.innerHTML !== nextProps.value ||
      nextProps.align !== this.props.align
    )
  }

  render() {
    const { value, align } = this.props
    return (
      <div
        ref={element => (this.element = element)}
        className={clsx('st-table-editable', align)}
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
      ></div>
    )
  }
}
