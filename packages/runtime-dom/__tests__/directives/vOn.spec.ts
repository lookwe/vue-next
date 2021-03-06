import { patchEvent } from '../../src/modules/events'
import { withModifiers, withKeys } from '@vue/runtime-dom'

function triggerEvent(
  target: Element,
  event: string,
  process?: (e: any) => any
) {
  const e = document.createEvent('HTMLEvents')
  e.initEvent(event, true, true)
  if (event === 'click') {
    ;(e as any).button = 0
  }
  if (process) process(e)
  target.dispatchEvent(e)
  return e
}

describe('runtime-dom: v-on directive', () => {
  test('it should support "stop" and "prevent"', () => {
    const parent = document.createElement('div')
    const child = document.createElement('input')
    parent.appendChild(child)
    const childNextValue = withModifiers(jest.fn(), ['prevent', 'stop'])
    patchEvent(child, 'click', null, childNextValue, null)
    const parentNextValue = jest.fn()
    patchEvent(parent, 'click', null, parentNextValue, null)
    expect(triggerEvent(child, 'click').defaultPrevented).toBe(true)
    expect(parentNextValue).not.toBeCalled()
  })

  test('it should support "self"', () => {
    const parent = document.createElement('div')
    const child = document.createElement('input')
    parent.appendChild(child)
    const fn = jest.fn()
    const handler = withModifiers(fn, ['self'])
    patchEvent(parent, 'click', null, handler, null)
    triggerEvent(child, 'click')
    expect(fn).not.toBeCalled()
  })

  test('it should support key modifiers and system modifiers', () => {
    const el = document.createElement('div')
    const fn = jest.fn()
    // <div @keyup.ctrl.esc="test"/>
    const nextValue = withKeys(withModifiers(fn, ['ctrl']), ['esc'])
    patchEvent(el, 'keyup', null, nextValue, null)
    triggerEvent(el, 'keyup', e => (e.key = 'a'))
    expect(fn).not.toBeCalled()
    triggerEvent(el, 'keyup', e => {
      e.ctrlKey = false
      e.key = 'esc'
    })
    expect(fn).not.toBeCalled()
    triggerEvent(el, 'keyup', e => {
      e.ctrlKey = true
      e.key = 'Escape'
    })
    expect(fn).toBeCalled()
  })

  test('it should support "exact" modifier', () => {
    const el = document.createElement('div')
    // Case 1: <div @keyup.exact="test"/>
    const fn1 = jest.fn()
    const next1 = withModifiers(fn1, ['exact'])
    patchEvent(el, 'keyup', null, next1, null)
    triggerEvent(el, 'keyup')
    expect(fn1.mock.calls.length).toBe(1)
    triggerEvent(el, 'keyup', e => (e.ctrlKey = true))
    expect(fn1.mock.calls.length).toBe(1)
    // Case 2: <div @keyup.ctrl.a.exact="test"/>
    const fn2 = jest.fn()
    const next2 = withKeys(withModifiers(fn2, ['ctrl', 'exact']), ['a'])
    patchEvent(el, 'keyup', null, next2, null)
    triggerEvent(el, 'keyup', e => (e.key = 'a'))
    expect(fn2).not.toBeCalled()
    triggerEvent(el, 'keyup', e => {
      e.key = 'a'
      e.ctrlKey = true
    })
    expect(fn2.mock.calls.length).toBe(1)
    triggerEvent(el, 'keyup', e => {
      // should not trigger if has other system modifiers
      e.key = 'a'
      e.ctrlKey = true
      e.altKey = true
    })
    expect(fn2.mock.calls.length).toBe(1)
  })

  it('should support mouse modifiers', () => {
    const buttons = ['left', 'middle', 'right'] as const
    const buttonCodes = { left: 0, middle: 1, right: 2 }
    buttons.forEach(button => {
      const el = document.createElement('div')
      const fn = jest.fn()
      const handler = withModifiers(fn, [button])
      patchEvent(el, 'mousedown', null, handler, null)
      buttons.filter(b => b !== button).forEach(button => {
        triggerEvent(el, 'mousedown', e => (e.button = buttonCodes[button]))
      })
      expect(fn).not.toBeCalled()
      triggerEvent(el, 'mousedown', e => (e.button = buttonCodes[button]))
      expect(fn).toBeCalled()
    })
  })
})
