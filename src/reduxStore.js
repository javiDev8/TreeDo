import { createStore } from 'react-redux'

export default createStore((focusedItemId = 0, id) => {
    focusedItemId = id
    return id
})
