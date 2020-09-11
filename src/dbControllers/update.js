import db from '../database'

export default (id, textContent) => {
    console.log('on update db controller')
    db.transaction(tx =>
        tx.executeSql(
            'update items set textContent = ? where id = ?',
            [textContent, id],
            (_, result) => console.log('result on update: ', result),
            (_, error) => console.log('error on update: ', error)
        )
    )
}
