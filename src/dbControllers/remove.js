import db from '../database'

export default id =>
    db.transaction(tx =>
        tx.executeSql(
            'delete from items where id = ?',
            [id],
            (_, result) => console.log('result on remove: ', result),
            (_, error) => console.log('error on delete: ', error)
        )
    )
