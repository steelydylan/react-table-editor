import { parse } from 'papaparse'

function hasClipboardData(target: any): target is { clipboardData: DataTransfer } {
  return target && target.clipboardData
}

export function acquireClipboardData(event?: any) {
  if (hasClipboardData(event)) {
    return event.clipboardData
  }
  if (hasClipboardData(window)) {
    return window.clipboardData
  }
  return undefined
}

export function acquireText(clipboardData?: DataTransfer) {
  if (!clipboardData) {
    return undefined
  }
  const text = clipboardData.getData('text')
  if (text) {
    return text
  }
  return clipboardData.getData('text/plain')
}

export function toHtml(tsv: string): string {
  const result = parse<string[]>(tsv)
  if (result.errors.length > 0) {
    return tsv
  }
  return `<table><tr>${result.data
    .reduce((acc, datum) => [...acc, `<td>${datum.join('</td><td>')}</td>`], [])
    .join('</tr><tr>')}</tr></table>`
}
