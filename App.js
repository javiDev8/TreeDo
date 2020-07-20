import { StatusBar } from 'expo-status-bar'
import React, { Component } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import db from './src/database'
import Item from './src/item'

export default class App extends Component {
    componentDidMount() {
	console.log( 'on app mount' )
        db.transaction(tx =>
	    tx.executeSql(
		`create table if not exists items (
		    id integer primary key not null,
		    parentId integer,
		    textContent text,
		    done integer default 0,
		    childrenAmount integer default 0,
		    doneChildrenAmount integer default 0
		)`,
		// 'drop table items'
		// [],
		// (_, result) => console.log( 'result on create: ', result ),
		// (_, error) => console.log( 'error on create: ', error ),
	    )
        )
    }

    render() {
        return (
            <View style={{ padding: 30 }}>
                <Text style={{ fontSize: 40, alignSelf: 'center' }}>
                    TreeDo
                </Text>
                <Item id={0} data={{ open: true }} />
            </View>
        )
    }
}
