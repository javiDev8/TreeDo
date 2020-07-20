import db from './database'

export default function downRecursive(id, query) {
    // db.transaction(tx => console.log( 'executeSql on recursive: ', tx.executeSql ))
    db.transaction(tx => {
        tx.executeSql(
            'select id from items where parentId = ?',
            [id],
            (_, { rows }) => {
                rows._array.forEach(item => downRecursive(item.id))
            },
            (_, error) => console.log('error on downRecursive: ', error)
        )
        tx.executeSql(query, [id], null, (_, error) =>
            console.log('error on recursive action: ', error)
        )
    })
}
