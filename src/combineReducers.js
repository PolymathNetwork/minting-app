/**
 * @see https://codesandbox.io/s/rm7587n34m?from-embed
 *
 * A size-optimized refactor of Redux's combineReducers.
 * All safeguards removed. Use at your own risk.
 * https://github.com/reduxjs/redux/blob/master/src/combineReducers.js
 */

const combineReducers = reducers => (state, action) => {
  let hasChanged
  const nextState = Object.keys(reducers).reduce((result, key) => {
    result[key] = reducers[key](state[key], action)
    hasChanged = hasChanged || result[key] !== state[key]
    return result
  }, {})
  return hasChanged ? nextState : state
}

export default combineReducers
