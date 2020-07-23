import db from './database'

export default function downRecursive(id, transaction) {
    db.transaction(
        tx => {
            tx.executeSql(
                'select id from items where parentId = ?',
                [id],
                (_, { rows }) => {
                    rows._array.forEach(item => downRecursive(item.id, transaction))
                },
                (_, error) => console.log('error on downRecursive: ', error)
            )
        },
        null,
        transaction(id)
    )
}
