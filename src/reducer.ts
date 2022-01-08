import { Action, Row, State } from "./types"

export const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'SET_MENU':
      return {
        ...state,
        showMenu: action.showMenu
      }
    case 'SET_SPLITED':
      return {
        ...state,
        count: action.splited,
      }
    case 'SET_MOUSEDOWN':
      return {
        ...state,
        mousedown: action.mousedown
      }
    case 'SET_POINT':
      return {
        ...state,
        point: action.point,
      }
    case 'SET_SELECTED_ROW_NO':
      return {
        ...state,
        selectedRowNo: action.index,
      }
    case 'SET_SELECTED_COL_NO':
      return {
        ...state,
        selectedColNo: action.index,
      }
    case 'SET_ROW':
      return {
        ...state,
        row: action.row,
      }
    case 'SET_MENU_X':
      return {
        ...state,
        menuX: action.menuX,
      }
    case 'SET_MENU_Y':
      return {
        ...state,
        menuY: action.menuY,
      }
    case 'SET_HISTORY':
      return {
        ...state,
        history: action.history,
      }
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
      }
    case 'SET_SELECTED_TAGS':
      return {
        ...state,
        selectedTags: action.selectedTags,
      }
    default:
      return state
  }
}

export const initialState: State = {
  mode: null,
  showMenu: false,
  splited: false,
  mousedown: false,
  point: { x: -1, y: -1, width: 0, height: 0 },
  selectedRowNo: -1,
  selectedColNo: -1,
  row: [],
  tableClass: '',
  history: [[]] as Row[][],
  tableResult: '',
  cellClass: '',
  menuX: 0,
  menuY: 0,
  selectedTags: [],
}
