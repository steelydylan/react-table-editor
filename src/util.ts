export function before(el: HTMLElement, html: string) {
  el.insertAdjacentHTML('beforebegin', html)
}

export function removeElement(el: HTMLElement) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

export function offset(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top + document.body.scrollTop,
    left: rect.left + document.body.scrollLeft,
  }
}

export function parseHTML(string: string, wrap?: boolean) {
  const tmp = document.implementation.createHTMLDocument('')
  tmp.body.innerHTML = wrap ? `<div>${string}</div>` : string
  return tmp.body.children[0]
}

export function hasClass(el: HTMLElement, className: string) {
  if (el.classList) {
    return el.classList.contains(className)
  } else {
    return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className)
  }
}

export function getSelection(ele: HTMLElement) {
  if (window.getSelection && window.getSelection().toString()) {
    return window.getSelection()
  } else if (document.getSelection && document.getSelection().toString()) {
    return document.getSelection()
  } else if (ele && typeof ele.selectionStart === 'number') {
    return (ele as any).value.substr(ele.selectionStart, ele.selectionEnd - ele.selectionStart)
  }
  return ''
}

export function triggerEvent(el: HTMLElement, eventName: string, options?: any) {
  let event
  if (window.CustomEvent) {
    event = new CustomEvent(eventName, { cancelable: true })
  } else {
    event = document.createEvent('CustomEvent')
    event.initCustomEvent(eventName, false, false, options)
  }
  el.dispatchEvent(event)
}

export function removeIndentNewline(str: string) {
  return str.replace(/(\n|\t)/g, '')
}

export function isSmartPhone() {
  const agent = navigator.userAgent
  if (
    agent.indexOf('iPhone') > 0 ||
    agent.indexOf('iPad') > 0 ||
    agent.indexOf('ipod') > 0 ||
    agent.indexOf('Android') > 0
  ) {
    return true
  }
  return false
}

export function getBrowser() {
  const ua = window.navigator.userAgent.toLowerCase()
  const ver = window.navigator.appVersion.toLowerCase()
  let name = 'unknown'

  if (ua.indexOf('msie') != -1) {
    if (ver.indexOf('msie 6.') != -1) {
      name = 'ie6'
    } else if (ver.indexOf('msie 7.') != -1) {
      name = 'ie7'
    } else if (ver.indexOf('msie 8.') != -1) {
      name = 'ie8'
    } else if (ver.indexOf('msie 9.') != -1) {
      name = 'ie9'
    } else if (ver.indexOf('msie 10.') != -1) {
      name = 'ie10'
    } else {
      name = 'ie'
    }
  } else if (ua.indexOf('trident/7') != -1) {
    name = 'ie11'
  } else if (ua.indexOf('edge') != -1) {
    name = 'edge'
  } else if (ua.indexOf('chrome') != -1) {
    name = 'chrome'
  } else if (ua.indexOf('safari') != -1) {
    name = 'safari'
  } else if (ua.indexOf('opera') != -1) {
    name = 'opera'
  } else if (ua.indexOf('firefox') != -1) {
    name = 'firefox'
  }
  return name
}

export function saveSelection() {
  if (window.getSelection) {
    const sel = window.getSelection()
    if (sel.getRangeAt && sel.rangeCount) {
      return sel.getRangeAt(0).cloneRange()
    }
  } else if (document.selection && document.selection.createRange) {
    return document.selection.createRange()
  }
  return null
}

export function restoreSelection(range: Range) {
  if (window.getSelection) {
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  } else if (document.selection && (range as any).select) {
    ;(range as any).select()
  }
}

export function getSelectionNode() {
  const node = document.getSelection().anchorNode
  if (!node) {
    return null
  }
  return (node.nodeType === 3 ? node.parentNode : node) as HTMLElement
}

export function insertHtmlAtCursor(html: string) {
  let range
  if (window.getSelection && window.getSelection().getRangeAt) {
    range = window.getSelection().getRangeAt(0)
    range.deleteContents()
    const div = document.createElement('div')
    div.innerHTML = html
    const frag = document.createDocumentFragment()
    let child
    while ((child = div.firstChild)) {
      frag.appendChild(child)
    }
    range.insertNode(frag)
  } else if (document.selection && document.selection.createRange) {
    range = document.selection.createRange()
    range.pasteHTML(html)
  }
}

export function replaceSelectionWithHtml(html: string) {
  let range: Range
  const selection = window.getSelection()
  if (selection.getRangeAt) {
    range = selection.getRangeAt(0)
  } else if (document.selection && document.selection.createRange) {
    range = document.selection.createRange()
  }
  range.deleteContents()
  const div = document.createElement('div')
  div.innerHTML = html
  const frag = document.createDocumentFragment()
  let child
  while ((child = div.firstChild)) {
    frag.appendChild(child)
  }
  const temp = getFirstfirstElementChild(frag)
  const newrange = document.createRange()
  range.insertNode(temp)
  try {
    newrange.setStart(temp.firstChild, 0)
    newrange.setEnd(temp.lastChild, temp.lastChild.textContent.length)
  } catch {
    console.warn('failed to get range')
  }
  clearSelection()
  selection.addRange(newrange)
}

export function moveCaretAfter(node) {
  if (window.getSelection && window.getSelection().getRangeAt) {
    const selection = window.getSelection()
    const range = selection.getRangeAt(0)
    const newnode = node.cloneNode(true)
    const frag = document.createDocumentFragment()
    node.remove()
    frag.appendChild(newnode)
    const lastChild = frag.appendChild(document.createTextNode('\u200B'))
    const newrange = document.createRange()
    range.insertNode(frag)
    newrange.setStartAfter(lastChild)
    newrange.setEndAfter(lastChild)
    selection.removeAllRanges()
    selection.addRange(newrange)
  }
}

export function unwrapTag(element: HTMLElement) {
  const parent = element.parentNode
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }
  parent.removeChild(element)
}

export function getElementBySelection() {
  if (window.getSelection) {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      return selection.getRangeAt(0).startContainer.parentNode
    }
  } else if (document.selection) {
    return document.selection.createRange().parentElement()
  }
}

export function clearSelection() {
  if (window.getSelection) {
    if (window.getSelection().empty) {
      // Chrome
      window.getSelection().empty()
    } else if (window.getSelection().removeAllRanges) {
      // Firefox
      window.getSelection().removeAllRanges()
    }
  } else if (document.selection) {
    // IE?
    document.selection.empty()
  }
}

export function replaceSelectionWithText(ele: any, text: string) {
  const selectionStart = ele.selectionStart
  ele.value = `${ele.value.substring(0, selectionStart)}${text}${ele.value.substring(
    ele.selectionEnd
  )}`
  ele.focus()
  ele.setSelectionRange(selectionStart, selectionStart + text.length)
}

export function getSelectionLength() {
  if (window.getSelection) {
    return window.getSelection().toString().length
  } else if (document.selection) {
    return document.selection().toString().length
  }
}

export function setCaretPos(el: HTMLElement, pos: number, length?: number) {
  // Loop through all child nodes
  const nodes = [].slice.call(el.childNodes)
  for (let i = 0, n = nodes.length; i < n; i++) {
    const node = nodes[i]
    if (node.nodeType === 3) {
      // we have a text node
      if (node.length >= pos) {
        // finally add our range
        const range = document.createRange()
        const sel = window.getSelection()

        if (length) {
          range.setStart(node, 0)
          range.setEnd(node, length)
        } else {
          range.setStart(node, pos)
          range.collapse(true)
        }
        sel.removeAllRanges()
        sel.addRange(range)
        return -1 // we are done
      } else {
        pos -= node.length
      }
    } else {
      pos = setCaretPos(node, pos)
      if (pos === -1) {
        return -1 // no need to finish the for loop
      }
    }
  }
  return pos // needed because of recursion stuff
}

export function replaceWhiteSpaceWithNbsp(el: HTMLElement) {
  // Loop through all child nodes
  const nodes = [].slice.call(el.childNodes)
  for (let i = 0, n = nodes.length; i < n; i++) {
    const node = nodes[i]
    if (node.nodeType === 3) {
      // we have a text node
      node.textContent = node.textContent.replace(/ /g, '\u00A0')
    }
  }
}

export function getCaretPos(element: HTMLElement) {
  let caretOffset = 0
  if (window.getSelection) {
    const range = window.getSelection().getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(element)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    caretOffset = preCaretRange.toString().length
  } else if (document.selection && document.selection.createRange) {
    const textRange = document.selection.createRange()
    const preCaretTextRange = document.body.createTextRange()
    preCaretTextRange.moveToElementText(element)
    preCaretTextRange.setEndPoint('EndToEnd', textRange)
    caretOffset = preCaretTextRange.text.length
  }
  return caretOffset
}

export function getFirstfirstElementChild(ele: HTMLElement | DocumentFragment) {
  let node
  const nodes = ele.childNodes
  let i = 0
  if (nodes && nodes.length) {
    while ((node = nodes[i++])) {
      if (node.nodeType === 1) {
        return node
      }
    }
  }
  return null
}

export function generateRandomId() {
  return (
    '_' +
    Math.random()
      .toString(36)
      .substr(2, 9)
  )
}
