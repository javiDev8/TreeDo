import db from '../database'

export default (parentId, textContent) =>
    new Promise((resolve, reject) =>
        db.transaction(tx =>
            tx.executeSql(
                'insert into items (parentId, textContent) values (?,?)',
                [parentId, textContent],
                (_, result) => resolve(result.insertId),
                (_, error) => console.log('error on insert: ', error)
            )
        )
    )
