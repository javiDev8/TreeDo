import db from '../database'

export default (id, done) => {
    db.transaction(tx =>
        tx.executeSql(
            'update items set done = ? where id = ?',
            [done ? 1 : 0, id],
	    null,
            (_, error) => console.log('error on check: ', error)
        )
    )
}
